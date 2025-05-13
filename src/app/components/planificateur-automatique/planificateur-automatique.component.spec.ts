import {
  TestBed,
  ComponentFixture,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import * as L from 'leaflet';
import { signal } from '@angular/core';
import { latLng, LatLng } from 'leaflet';

import { PlanificateurAutomatiqueComponent } from './planificateur-automatique.component';

import { PlanificationService } from '../../services/planification.service';
import { DataService } from '../../services/data.service';
import { CartoService } from '../../services/carto.service';

import { EquipeLivreurs } from '../../../models/interfaces/equipe-livreurs.model';
import { Commande } from '../../../models/interfaces/commande.model';
import { StatusEquipeLivreurs } from '../../../models/enums/status-equipe-livreurs.enum';

/* ------------------------------------------------------------------
 * Doubles de test
 * ----------------------------------------------------------------*/
class CartoServiceStub {
  latLngToMarker = jasmine
    .createSpy('latLngToMarker')
    .and.callFake((p: LatLng) => L.marker(p));

  createPolylineForTournee = jasmine
    .createSpy('createPolylineForTournee')
    .and.callFake((tour: LatLng[]) => ({
      toPromise: () => Promise.resolve(L.polyline(tour)),
    }));

  getDistanceFromORS = jasmine
    .createSpy('getDistanceFromORS')
    .and.returnValue(Promise.resolve(10));
}

class DataServiceStub {
  equipesLivreurs = signal<EquipeLivreurs[]>([
    { idEquipe: 1, status: StatusEquipeLivreurs.PRET } as EquipeLivreurs,
    { idEquipe: 2, status: StatusEquipeLivreurs.NON_DISPONIBLE } as EquipeLivreurs,
  ]);

  commandesOuvertes = signal<Commande[]>([
    { reference: 'C1', client: { coords: { lat: 0, lng: 0 } } } as Commande,
    { reference: 'C2', client: { coords: { lat: 1, lng: 1 } } } as Commande,
  ]);

  camions = signal<any[]>([
    {
      code: 'TR1',
      typeCamion: { image: '', nom: 'Truck', prixAuKm: 1 },
      kilometrage: 100,
      immatriculation: 'AA-111-AA',
    },
  ]);

  journees = signal<any[]>([]);
}

class PlanificationServiceStub {
  /* ------ synchrones ------ */
  getTomorrowDate = jasmine
    .createSpy('getTomorrowDate')
    .and.returnValue(
      new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    );

  getEquipeColor = jasmine.createSpy('getEquipeColor').and.returnValue('#ff0000');

  savedLayers       = jasmine.createSpy('savedLayers').and.returnValue([]);
  updateSavedLayers = jasmine.createSpy('updateSavedLayers');

  /* ------ async ------ */
  generateTourneesPreview = jasmine
    .createSpy('generateTourneesPreview')
    .and.callFake(() =>
      Promise.resolve({
        routes: [[latLng(0, 0), latLng(1, 1), latLng(0, 0)]],
        teamIdToColor: new Map<number, string>([[1, '#ff0000']]),
        tournees: [{ commandeReferences: ['C1'], equipeLivreursId: '1' }],
      })
    );

  loadTournees = jasmine.createSpy('loadTournees').and.callFake(() =>
    Promise.resolve({
      routes: [[latLng(0, 0), latLng(0, 1), latLng(0, 0)]],
      teamIdToColor: new Map<number, string>([[1, '#ff0000']]),
      equipes: [
        { idEquipe: 1, status: StatusEquipeLivreurs.PRET } as EquipeLivreurs,
      ],
      loaded: [
        { reference: 'C1', client: { coords: { lat: 0, lng: 0 } } } as Commande,
      ],
      stats: new Map<number, { distanceKm: number; commandes: number; timeMin: number; cout: number }>(),
    })
  );

  validateJournee      = jasmine.createSpy('validateJournee').and.returnValue(Promise.resolve());
  checkIfJourneeExists = jasmine.createSpy('checkIfJourneeExists').and.returnValue(Promise.resolve(false));
}

/* ------------------------------------------------------------------
 * Suite de tests
 * ----------------------------------------------------------------*/
describe('PlanificateurAutomatiqueComponent', () => {
  let fixture:   ComponentFixture<PlanificateurAutomatiqueComponent>;
  let component: PlanificateurAutomatiqueComponent;
  let planif:    PlanificationServiceStub;

  beforeEach(async () => {
    /* --- on neutralise ngAfterViewInit pour éviter les appels à mapRef --- */
    spyOn(PlanificateurAutomatiqueComponent.prototype as any, 'ngAfterViewInit')
      .and.callFake(() => {});

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        LeafletModule,
        PlanificateurAutomatiqueComponent, // composant standalone
      ],
      providers: [
        { provide: CartoService,        useClass: CartoServiceStub },
        { provide: DataService,         useClass: DataServiceStub },
        { provide: PlanificationService, useClass: PlanificationServiceStub },
      ],
    })
      // ► pas de template → pas de ViewChild → pas d’erreur de mapRef
      .overrideComponent(PlanificateurAutomatiqueComponent, { set: { template: '' } })
      .compileComponents();

    fixture   = TestBed.createComponent(PlanificateurAutomatiqueComponent);
    component = fixture.componentInstance;
    planif    = TestBed.inject(PlanificationService) as unknown as PlanificationServiceStub;

    fixture.detectChanges(); // ne déclenchera PAS le code de ngAfterViewInit (stubé)
  });

  /* ------------------------------------------------------------
   * Basique
   * ---------------------------------------------------------- */
  it('crée le composant', () => {
    expect(component).toBeTruthy();
  });

  it('filtre uniquement les équipes PRET', () => {
    const list = component.availableEquipeLivreurs();
    expect(list.length).toBe(1);
    expect(list[0].idEquipe).toBe(1);
  });

  /* ------------------------------------------------------------
   * Génération de tournée (creerTournees)
   * ---------------------------------------------------------- */
  it('creerTournees() génère une tournée et calcule les stats', fakeAsync(async () => {
    await component.creerTournees();
    tick();

    expect(planif.generateTourneesPreview).toHaveBeenCalled();
    expect(component.createdTourneesSignal().length).toBe(1);
    expect(component.tourneeStats().size).toBe(1);
  }));


});
