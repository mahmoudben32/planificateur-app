import { Injectable, inject, signal } from '@angular/core';
import { LatLng, Layer } from 'leaflet';
import { DataService } from './data.service';
import { CartoService } from './carto.service';
import { KMeansService } from './kmeans.service';
import { EquipeLivreurs } from '../../models/interfaces/equipe-livreurs.model';
import { Commande } from '../../models/interfaces/commande.model';
import { EtatTournee } from '../../models/enums/etat-tournee.enum';
import { Camion } from '../../models/interfaces/camion.model';
import { Tournee, TourneePostDto } from '../../models/interfaces/tournee.model';
import { Journee, JourneePostDto } from '../../models/interfaces/journee.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PlanificationService {
  private dataService = inject(DataService);
  private cartoService = inject(CartoService);
  private kmeansService = inject(KMeansService);


  savedLayers = signal<Layer[]>([]);

  updateSavedLayers(layers :Layer[]){
    this.savedLayers.set([...layers]);
  }

  getTomorrowDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().substring(0, 10);
  }

  getEquipeColor(id: number): string {
    return this.cartoService.getColorForTeam(id);
  }

  private genRef(prefix: string, items: { reference: string }[], pad: number): string {
    if (!items.length) return `${prefix}${'1'.padStart(pad, '0')}`;
    const nums = items
      .map(i => parseInt(i.reference.replace(prefix, ''), 10))
      .filter(n => !isNaN(n));
    const max = Math.max(...nums);
    return `${prefix}${(max + 1).toString().padStart(pad, '0')}`;
  }

  generateJourneeReference(journees: Journee[]): string {
    return this.genRef('JRN', journees, 8);
  }

  generateTourneeReference(tournees: Tournee[]): string {
    return this.genRef('TRN', tournees, 3);
  }

  async loadTournees(
    date: string,
    entrepot: LatLng
  ): Promise<{ routes: LatLng[][]; teamIdToColor: Map<number,string>; equipes: EquipeLivreurs[]; remaining: Commande[]; loaded: Commande[];
    stats: Map<number, { distanceKm: number; commandes: number; timeMin: number; cout: number }>
   }> {

    const stats = new Map<number, { distanceKm: number; commandes: number; timeMin: number; cout: number }>();


    const commandes = this.dataService.commandes();
    const used = this.dataService.journees().flatMap(j => j.tournees?.flatMap(t => t.commandeReferences) ?? []);
    const jour = this.dataService.journees().find(j => j.date?.startsWith(date));
    

    
    if (!jour) {
      return { routes: [], teamIdToColor: new Map(), equipes: [], remaining: commandes.filter(c => !used.includes(c.reference)), loaded: [],stats };
    }

    const mapEq = new Map<number,EquipeLivreurs>(this.dataService.equipesLivreurs().map(e => [e.idEquipe, e]));
    const routes: LatLng[][] = [];
    const colors = new Map<number,string>();
    const equipes: EquipeLivreurs[] = [];
    const loaded: Commande[] = [];

    for (const eq of equipes) {
      const tournee = jour.tournees!.find(t => t.equipeLivreursId === String(eq.idEquipe));
      
      if (tournee) {
        const commandesCount = tournee.commandeReferences.length;
        
        stats.set(eq.idEquipe, {
          distanceKm: tournee.distanceAParcourir,
          commandes: commandesCount,
          timeMin: tournee.dureeTheorique,
          cout: tournee.cout
        });
      }
    }

    for (const t of jour.tournees ?? []) {
      const cmds = t.commandeReferences
        .map(r => commandes.find(c => c.reference === r))
        .filter((c): c is Commande => !!c);
      const eq = mapEq.get(+t.equipeLivreursId!);
      if (!eq) continue;

      loaded.push(...cmds);
      const resp = await this.cartoService.getOptimizationAutmatique(cmds, [eq], entrepot).toPromise();
      const path = resp.routes[0].steps.map((s:any) => new LatLng(s.location[1], s.location[0]));
      routes.push(path);
      colors.set(eq.idEquipe, this.getEquipeColor(eq.idEquipe));
      equipes.push(eq);
    }

    return {
      routes,
      teamIdToColor: colors,
      equipes,
      remaining: commandes.filter(c => !used.includes(c.reference)),
      loaded,
      stats
    };
  }

  async checkIfJourneeExists(date: string): Promise<boolean> {
    this.dataService.refreshJournees();
    await firstValueFrom(this.dataService.isDataLoaded$);
    return this.dataService.journees().some(j => j.date?.startsWith(date));
  }



  async generateTourneesPreview(
    equipes: EquipeLivreurs[],
    commandes: Commande[],
    entrepot: LatLng,
    strategy: 'balanced' | 'custom',
    camions: Camion[],
    customSizes?: number[]
  ): Promise<{
    routes: LatLng[][],
    teamIdToColor: Map<number, string>,
    tournees: Tournee[],
  }> {
    const colorMap = new Map<number, string>();
    const routes: LatLng[][] = [];
    const tournees: Tournee[] = [];

    const coords = commandes.map(c => [c.client.coords.lat, c.client.coords.lng]);
    const { clusters } = this.kmeansService.kmeans(coords, equipes.length, strategy, customSizes);
    console.log('Custom sizes:', customSizes);
  
    const raw: Commande[][] = Array.from({ length: equipes.length }, () => []);
    commandes.forEach((c, i) => {
      const cid = clusters[i];
      if (cid != null) raw[cid].push(c);
    });
  
    const existing = this.dataService.journees().flatMap(j => j.tournees ?? []);
  
    for (let i = 0; i < raw.length; i++) {
      const cluster = raw[i];
      const equipe = equipes[i];
      if (!cluster.length) continue;
  
      const trnRef = this.generateTourneeReference([...existing, ...tournees]);
      const resp = await this.cartoService.getOptimizationAutmatique(cluster, [equipe], entrepot).toPromise();
      if (!resp?.routes?.length) continue;
  
      const route = resp.routes[0];
      const path = route.steps.map((s: any) => new LatLng(s.location[1], s.location[0]));
      const refs = route.steps.filter((s: any) => s.type === 'job').map((s: any) => cluster[s.job - 1].reference);
  
      const distanceKm = await this.cartoService.getDistanceFromORS(path);
      const commandesCount = path.length - 2;
      const travelTimeMin = (distanceKm / 40) * 60;
      const deliveryTimeMin = commandesCount * 10;
      const totalTimeMin = Math.round(travelTimeMin + deliveryTimeMin);
      const coutTournee = camions[i].typeCamion.prixAuKm * distanceKm;
  
      routes.push(path);
      colorMap.set(equipe.idEquipe, this.getEquipeColor(equipe.idEquipe));
  
      tournees.push({
        reference: trnRef,
        etat: EtatTournee.PLANIFIEE,
        lettre: String.fromCharCode(65 + i),
        distanceAParcourir: Math.round(distanceKm),
        tempsAssemblageReel: 0,
        dureeTheorique: totalTimeMin,
        equipeLivreursId: String(equipe.idEquipe),
        camion: camions[i],
        cout: Math.round(coutTournee),
        commandeReferences: refs,
        journeeReference: ''
      });
    }
  
    return { routes, teamIdToColor: colorMap, tournees };
  }



  async validateJournee(tournees: Tournee[], date: string): Promise<void> {
    let coutTotalJournee = 0;
    const journees = this.dataService.journees();
    const jourRef = this.generateJourneeReference(journees);
  
    tournees.forEach(t => t.journeeReference = jourRef);
    tournees.forEach(t => coutTotalJournee += t.cout);

  
    const dto: TourneePostDto[] = tournees.map(t => ({
      reference: t.reference,
      etat: t.etat,
      lettre: t.lettre,
      distanceAParcourir: t.distanceAParcourir,
      tempsAssemblageReel: t.tempsAssemblageReel,
      dureeTheorique: t.dureeTheorique,
      cout: t.cout,
      equipeLivreursId: t.equipeLivreursId,
      camionCode: t.camion?.code ?? null,
      commandeReferences: t.commandeReferences,
      journeeReference: jourRef
    }));
    const post: JourneePostDto = {
      reference: jourRef,
      date,
      planificateurEmail: this.dataService.planificateurEmail()?? '',
      coutTotal: Math.round(coutTotalJournee),
      tournees: dto
    };
  
    await firstValueFrom(this.dataService.createJournee(post));
  }
  
  
  

  
}