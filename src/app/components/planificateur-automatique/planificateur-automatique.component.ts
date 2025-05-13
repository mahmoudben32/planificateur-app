// =======================
// Imports
// =======================
import { Component, inject, signal, computed, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LatLng, latLng, Layer } from 'leaflet';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';

import { MapComponent } from '../map/map.component';
import { PlanificationService } from '../../services/planification.service';
import { DataService } from '../../services/data.service';
import { EquipeLivreurs } from '../../../models/interfaces/equipe-livreurs.model';
import { Commande } from '../../../models/interfaces/commande.model';
import { planificateurSchema } from '../../../models/interfaces/planificateur.model';
import { CartoService } from '../../services/carto.service';
import { Tournee } from '../../../models/interfaces/tournee.model';

// =======================
// Décorateur du composant
// =======================
@Component({
  selector: 'app-planificateur-automatique',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MapComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
  ],
  templateUrl: './planificateur-automatique.component.html',
  styleUrls: ['./planificateur-automatique.component.scss']
})
export class PlanificateurAutomatiqueComponent {

  // =======================
  // ViewChilds & Services
  // =======================
  @ViewChild(MapComponent) mapRef!: MapComponent;
  private planificationService = inject(PlanificationService);
  private dataService = inject(DataService);
  private cartoService = inject(CartoService);


  // =======================
  // États & Signaux
  // =======================
  readonly Math = Math;
  entrepot = signal<LatLng>(latLng(45.14852, 5.7369725)); // Position par défaut de l'entrepôt
  commandesOuvertes = this.dataService.commandesOuvertes; // Commandes ouvertes
  availableEquipeLivreurs = computed(() =>
    this.dataService.equipesLivreurs().filter(eq => eq.status === 'PRET')
  ); // Équipes prêtes pour la planification
  loadDate = new Date(this.planificationService.getTomorrowDate()); // Initialize with tomorrow's date
  planningDate = signal<string>(this.planificationService.getTomorrowDate()); // Date de planification
  canCreateTournee = signal<boolean>(true);
  allSelectedEquipesHaveCamion = computed(() => {
    const map = this.equipeCamionMap();
    return this.selectedEquipes().every(equipe => map.has(equipe.idEquipe));
  });
  
  // Sélection des commandes et des équipes
  nombreCommandesUtilisees = signal<number>(0); // Nombre de commandes à utiliser
  selectedStrategy = signal<'balanced' | 'custom'>('balanced'); // Stratégie de planification
  displayedCommandes = signal<Commande[]>([]); // Commandes affichées actuellement
  selectedEquipes = signal<EquipeLivreurs[]>([]); // Équipes sélectionnées pour la planification
  desiredSizes = signal<number[]>([]); // Répartition personnalisée des commandes par équipe

  
  // Données des tournées et de la carte
  createdTourneesSignal = signal<LatLng[][]>([]); // Tournées créées (chemins)
  teamIdToColor = signal<Map<number, string>>(new Map()); // Couleur associée à chaque équipe
  polylineColorMap = computed(() => Array.from(this.teamIdToColor().values()));
  tourneeStats = signal<Map<number, { distanceKm: number; commandes: number; timeMin: number, cout?:number }>>(new Map());
  totalDistanceKm = computed(() => {
    let sum = 0;
    for (const stat of this.tourneeStats().values()) {
      sum += stat.distanceKm;
    }
    return Math.round(sum);
  });
  plannedTournees = signal<Tournee[]>([]);
  public totalCostEuros = computed(() => {
    let sum = 0;
    for (const stat of this.tourneeStats().values()) {
      sum += stat.cout?? 0;
    }
    return Math.round(sum);  
  });

calculateEquipeCost(equipeId: number): string {
  const stat = this.tourneeStats().get(equipeId);
  if (!stat) return '0.00';
  
  const camion = this.getCamionForEquipe(equipeId);
  const cost = stat.distanceKm * camion.typeCamion.prixAuKm;
  
  return cost.toFixed(2);
}
  // Helper method to get the right camion for an équipe
  private getCamionForEquipe(idEquipe: number) {
    const camionCode = this.equipeCamionMap().get(idEquipe);
    return this.camions().find(c => c.code === camionCode) || this.camions()[0];
  }

  // Attribution des camions
  readonly camions = this.dataService.camions; // Liste des camions disponibles
  equipeCamionMap = signal<Map<number, string>>(new Map()); // Association équipe <-> camion

  // Mode chargement & affichage carte
  loadedCommandesSignal = signal<Commande[]>([]); // Commandes chargées pour une date
  isLoadMode = signal<boolean>(false); // Mode consultation d'une journée existante
  mapCommandes = computed<Commande[]>(() =>
    this.isLoadMode()
      ? this.loadedCommandesSignal() // Afficher les commandes de la tournée chargée
      : this.displayedCommandes()   // Afficher les commandes ouvertes pour la planification
  );


  //Modal
  feedbackOpen = signal<boolean>(false);
  feedbackMessage = signal<string>('');


  // =======================
  // Constructeur & Effets
  // =======================
  constructor() {
    // Initialisation du nombre de commandes et des commandes affichées (Existing)
    this.nombreCommandesUtilisees.set(this.commandesOuvertes().length);
    this.displayedCommandes.set(this.selectedCommandesAuto());
    this.checkIfJourneeExistsForDate(this.planningDate());

    
    effect(() => {
      const avail = this.availableEquipeLivreurs();
      const totalCmds = this.nombreCommandesUtilisees();


      if (avail.length && this.selectedEquipes().length === 0) {

        this.selectedEquipes.set(avail);
      }

      const selected = this.selectedEquipes();
      const newSizes = this.distributeEvenly(totalCmds, selected.length || 1);
      this.desiredSizes.set(newSizes);
    });

    effect(() => {
      // as soon as selectedEquipes is nonempty and we haven't filled the map yet…
      const sel = this.selectedEquipes();
      if (!sel.length || this.equipeCamionMap().size) return;

      const map = new Map<number,string>();
      const used = new Set<string>();
      sel.forEach(e => {
        const free = this.camions().find(c => !used.has(c.code));
        if (free) {
          map.set(e.idEquipe, free.code);
          used.add(free.code);
        }
      });
      this.equipeCamionMap.set(map);
    });
  }
   

  // =======================
  // Hooks du cycle de vie
  // =======================

  // Affiche les commandes sur la carte après l'initialisation de la vue
  ngAfterViewInit() {
    this.showCommandesOnMap();
    this.mapRef.updateLayers(this.planificationService.savedLayers(), true);
  }

  // =======================
  // Sélection & Répartition des commandes
  // =======================

  // Commandes sélectionnées automatiquement pour la planification
  selectedCommandesAuto = computed(() =>
    this.commandesOuvertes().slice(0, this.nombreCommandesUtilisees())
  );

  // Répartit les commandes de façon équilibrée entre les équipes
  private distributeEvenly(total: number, parts: number): number[] {
    const base = Math.floor(total / parts);
    const remainder = total % parts;
    const result = Array(parts).fill(base);
    for (let i = 0; i < remainder; i++) result[i]++;
    return result;
  }

  // Met à jour la taille souhaitée pour une équipe (mode custom)
  updateSize(index: number, value: number) {
    const arr = [...this.desiredSizes()];
    arr[index] = value;
    this.desiredSizes.set(arr);
  }

  // Helpers pour la stratégie personnalisée
  customTotal = computed(() =>
    this.desiredSizes().reduce((sum, val) => sum + val, 0)
  );
  isCustomInvalid(): boolean {
    if (this.selectedStrategy() !== 'custom') return false;
    const total = this.customTotal();
    const expected = this.nombreCommandesUtilisees();
    const anyTooLarge = this.desiredSizes().some(size => size > 50);
    return total !== expected || anyTooLarge;
  }
  hasTeamOverLimit(): boolean {
    return this.desiredSizes().some(size => size > 50);
  }

  // =======================
  // Sélection & gestion des équipes
  // =======================

  // TrackBy pour les listes d'équipes
  trackByEquipe(index: number, equipe: EquipeLivreurs): number {
    return equipe?.idEquipe ?? index;
  }

  // Vérifie si une équipe est sélectionnée
  isEquipeSelected(equipe: EquipeLivreurs): boolean {
    return this.selectedEquipes().some(e => e.idEquipe === equipe.idEquipe);
  }

  // Ajoute ou retire une équipe de la sélection
  toggleEquipe(equipe: EquipeLivreurs) {
    if (this.isLoadMode()) return;
    const current = this.selectedEquipes();
    const idx = current.findIndex(e => e.idEquipe === equipe.idEquipe);
    const newList = idx > -1 ? current.filter((_, i) => i !== idx) : [...current, equipe];
    this.selectedEquipes.set(newList);

    const totalCmds = this.nombreCommandesUtilisees();
    const newSizes = this.distributeEvenly(totalCmds, newList.length || 1);
    this.desiredSizes.set(newSizes);
  }

  // Attribution d'un camion à une équipe (un camion ne peut être attribué qu'à une seule équipe)
  setEquipeCamion(equipeId: number, camionCode: string) {
    const map = new Map(this.equipeCamionMap());
    for (const [otherId, code] of map.entries()) {
      if (otherId !== equipeId && code === camionCode) {
        map.delete(otherId);
      }
    }
    if (camionCode) {
      map.set(equipeId, camionCode);
    } else {
      map.delete(equipeId);
    }
    this.equipeCamionMap.set(map);
  }

  // Récupère l'image du camion par code
  getCamionImage(camionCode: string): string | undefined {
    const camion = this.camions().find(c => c.code === camionCode);
    return camion?.typeCamion.image;
  }

  // Récupère l'alt du camion par code
  getCamionAlt(camionCode: string): string | undefined {
    const camion = this.camions().find(c => c.code === camionCode);
    return camion ? `${camion.typeCamion.nom} (${camion.immatriculation})` : '';
  }

  // =======================
  // Logique de planification/création
  // =======================

  async creerTournees() {
    this.isLoadMode.set(false);
    const equipes = this.selectedEquipes();
    const entrepot = this.entrepot();
    const commandes = this.selectedCommandesAuto();
    const camions = equipes.map(e =>
      this.camions().find(c => c.code === this.equipeCamionMap().get(e.idEquipe))!
    );
    const customSizes = this.selectedStrategy() === 'custom' ? this.desiredSizes() : undefined;
  
    try {
      console.log('strategy:', this.selectedStrategy());
    console.log('desiredSizes:', this.desiredSizes());

      const result = await this.planificationService.generateTourneesPreview(
        equipes,
        commandes,
        entrepot,
        this.selectedStrategy(),
        camions,
        customSizes
      );
      // 2) Traitement ORS et post-processing

      this.createdTourneesSignal.set(result.routes);
      this.teamIdToColor.set(result.teamIdToColor);
      this.plannedTournees.set(result.tournees);

  
      // Stats
      const stats = new Map<number, { distanceKm: number; commandes: number; timeMin: number,cout?:number }>();
      for (let i = 0; i < result.routes.length; i++) {
        const equipe = equipes[i];
        const route = result.routes[i];
        if (!route || !equipe) continue;
        const commandesCount = route.length - 2;
        const distanceKm = await this.cartoService.getDistanceFromORS(route);
        const timeMin = this.getEstimatedTime(distanceKm, commandesCount);
        const camionCode = this.equipeCamionMap().get(equipe.idEquipe);
        const camion = this.camions().find(c => c.code === camionCode);
        const cout = distanceKm * (camion?.typeCamion.prixAuKm || 0);
        stats.set(equipe.idEquipe, {
          distanceKm: Math.round(distanceKm),
          commandes: commandesCount,
          timeMin,
          cout:Math.round(cout)
        });
      }
      this.tourneeStats.set(stats);
      // affiche les tournées sur la carte
      await this.showTourneesOnMap();
      this.feedbackMessage.set('Tournées générées. Cliquez sur "Valider Journée" pour les sauvegarder.');
      this.feedbackOpen.set(true);
    } catch (err: any) {
      this.feedbackMessage.set(`Erreur lors de la génération : ${err.message}`);
      this.feedbackOpen.set(true);
    }
  }
  async validerJournee() {
    // Appel POST vers votre backend
    try {
      await this.planificationService.validateJournee(
        this.plannedTournees(),
        this.planningDate()
      );
       // retire les commandes planifiées de l'affichage
      const plannedRefs = new Set(this.plannedTournees().flatMap(t => t.commandeReferences));
      const remainingCommandes = this.displayedCommandes().filter(c => !plannedRefs.has(c.reference));
      this.displayedCommandes.set(remainingCommandes);
      // met à jour canCreateTournee
      await this.checkIfJourneeExistsForDate(this.planningDate());
      //  Tout est OK
      this.isLoadMode.set(true);
      this.feedbackMessage.set('Journée validée et enregistrée avec succès !');
      this.feedbackOpen.set(true);
    } catch (err: any) {
      this.feedbackMessage.set(`Erreur lors de la validation : ${err.message}`);
      this.feedbackOpen.set(true);
    }
  }
  

  // Vérifie si une journée de planification existe déjà pour une date donnée
  async checkIfJourneeExistsForDate(date: string) {
    const exists = await this.planificationService.checkIfJourneeExists(date);
    this.canCreateTournee.set(!exists);
  }

  // =======================
  // Chargement de tournées existantes
  // =======================

  // Charge les tournées pour une date sélectionnée
  async loadTourneesForSelectedDate() {
    const formattedDate = this.formatDate(this.loadDate);
    const result = await this.planificationService.loadTournees(
      formattedDate,
      this.entrepot()
    );
    this.createdTourneesSignal.set(result.routes);
    this.teamIdToColor.set(result.teamIdToColor);
    this.selectedEquipes.set(result.equipes);
    const stats = new Map<number, { distanceKm: number; commandes: number; timeMin: number; cout?: number }>();
  
  for (const equipe of result.equipes) {
    if (result.stats && result.stats.has(equipe.idEquipe)) {
      stats.set(equipe.idEquipe, result.stats.get(equipe.idEquipe)!);
    } else {
      const i = result.equipes.findIndex(e => e.idEquipe === equipe.idEquipe);
      if (i >= 0 && i < result.routes.length) {
        const route = result.routes[i];
        if (route) {
          const commandesCount = route.length - 2;
          const distanceKm = await this.cartoService.getDistanceFromORS(route);
          const camionCode = this.equipeCamionMap().get(equipe.idEquipe) ?? '';
          const camion = this.camions().find(c => c.code === camionCode);
          
          const jour = this.dataService.journees().find(j => j.date?.startsWith(formattedDate));
          const tournee = jour?.tournees?.find(t => t.equipeLivreursId === String(equipe.idEquipe));
          const cout = tournee?.cout || 0;

          const timeMin = this.getEstimatedTime(distanceKm, commandesCount);
          stats.set(equipe.idEquipe, {
            distanceKm: Math.round(distanceKm),
            commandes: commandesCount,
            timeMin,
            cout: Math.round(cout)
          });
        }
      }
    }
  }
  
  this.tourneeStats.set(stats);
  console.log("Stats after setting:", this.tourneeStats());
  
    this.loadedCommandesSignal.set(result.loaded);
    this.isLoadMode.set(true);
    this.displayedCommandes.set(result.loaded);
    this.mapRef.clearLayers(true);
    await this.showTourneesOnMap();
  }

  // Gestion du changement de date pour le chargement
  onLoadDateChange(event: any) {
    this.loadDate = event.value;
  }

  // =======================
  // Affichage sur la carte
  // =======================

  // Affiche les commandes actuellement sélectionnées sur la carte
  showCommandesOnMap() {
    const commandes = this.displayedCommandes();
    const commandeMarkers = commandes.map(cmd =>
      this.cartoService.latLngToMarker(
        latLng(cmd.client.coords.lat, cmd.client.coords.lng),
        'destination'
      )
    );
    this.mapRef.showLayers([...commandeMarkers], true);
  }

  // Affiche les tournées planifiées sur la carte
  async showTourneesOnMap() {
    const tournees = this.createdTourneesSignal();
    const equipes = this.selectedEquipes();
    const newMarkers: Layer[] = [];
    const newPolylines: Layer[] = [];
    for (let i = 0; i < tournees.length; i++) {
      const tour = tournees[i];
      const teamId = equipes[i]?.idEquipe;
      const pl = await this.cartoService.createPolylineForTournee(tour, teamId).toPromise();
      if (pl) newPolylines.push(pl);
      for (let j = 1; j < tour.length - 1; j++) {
        const p = tour[j];
        newMarkers.push(
          this.cartoService.latLngToMarker(p, 'destination', teamId)
        );
      }
    }
    this.mapRef.clearLayers(true);
    this.mapRef.showLayers([...newMarkers, ...newPolylines], true);
    this.planificationService.updateSavedLayers([...newMarkers, ...newPolylines]);
  }

  // Affiche la tournée d'une seule équipe sur la carte
  async showEquipeTournee(equipe: EquipeLivreurs) {
    const tournees = this.createdTourneesSignal();
    const equipes = this.selectedEquipes();
    const index = equipes.findIndex(eq => eq.idEquipe === equipe.idEquipe);
    if (index === -1) return;
    const tour = tournees[index];
    if (!tour) return;
    const layers: Layer[] = [];
    const teamId = equipe.idEquipe;
    const pl = await this.cartoService.createPolylineForTournee(tour, teamId).toPromise();
    if (pl) layers.push(pl);
    for (let j = 1; j < tour.length - 1; j++) {
      const p = tour[j];
      layers.push(
        this.cartoService.latLngToMarker(p, 'destination', teamId)
      );
    }
    this.mapRef.clearLayers(true);
    this.mapRef.showLayers(layers, true);
  }

  // Affiche toutes les commandes ouvertes sur la carte
  showCommandesOuvertesOnMap() {
    const commandes = this.commandesOuvertes();
    const markers = commandes.map(cmd =>
      this.cartoService.latLngToMarker(
        latLng(cmd.client.coords.lat, cmd.client.coords.lng),
        'destination'
      )
    );
    this.mapRef.showLayers(markers, true);
  }

  // =======================
  // Méthodes utilitaires
  // =======================

  // Récupère la couleur d'une équipe
  getEquipeColor(equipeId: number): string {
    return this.planificationService.getEquipeColor(equipeId);
  }

  // Estime le temps total d'une tournée
  getEstimatedTime(distanceKm: number, commandesCount: number): number {
    const speed = 40;
    const travelTime = distanceKm / speed * 60;
    const deliveryTime = commandesCount * 10;
    return Math.round(travelTime + deliveryTime);
  }

  // Formate une date en yyyy-mm-dd
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Vérifie si une équipe a une tournée
  hasTournee(equipe: EquipeLivreurs): boolean {
    const equipes = this.selectedEquipes();
    const tournees = this.createdTourneesSignal();
    const index = equipes.findIndex(eq => eq.idEquipe === equipe.idEquipe);
    return index !== -1 && !!tournees[index] && tournees[index].length > 0;
  }

  // helper function for ui
  evenEquipeIndices(): number[] {
    const equipes = this.selectedEquipes();
    const indices: number[] = [];
    for (let i = 0; i < equipes.length; i += 2) {
      indices.push(i);
    }
    return indices;
  }


}
