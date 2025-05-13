import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { signal } from '@angular/core';

import { TourneesComponent } from './tournees.component';

import { DataService } from '../../services/data.service';
import { PlanificationService } from '../../services/planification.service';

import { EquipeLivreurs } from '../../../models/interfaces/equipe-livreurs.model';
import { Livreur } from '../../../models/interfaces/livreur.model';
import { Commande } from '../../../models/interfaces/commande.model';



class DataServiceStub {
  journees        = signal<any[]>([{ reference: 'J1', date: '2025-05-09' }]);
  equipesLivreurs = signal<EquipeLivreurs[]>([
    { idEquipe: 1, status: 'PRET' } as EquipeLivreurs,
  ]);
  livreurs        = signal<Livreur[]>([
    { trigramme: 'ABC', nom: 'Alice'  } as Livreur,
    { trigramme: 'XYZ', nom: 'Xavier' } as Livreur,
  ]);
  commandes       = signal<Commande[]>([
    { reference: 'CMD1' } as Commande,
    { reference: 'CMD2' } as Commande,
  ]);

  /*  méthodes spyées  */
  deleteJournee    = jasmine.createSpy('deleteJournee').and.returnValue(of(void 0));
  refreshJournees  = jasmine.createSpy('refreshJournees');
  refreshCommandes = jasmine.createSpy('refreshCommandes');
  refreshEquipes   = jasmine.createSpy('refreshEquipes');
  refreshLivreurs  = jasmine.createSpy('refreshLivreurs');
}

class PlanificationServiceStub {
  savedLayers = signal<any[]>([{}]); // signal non-vide au départ
}

/* ------------------------------------------------------------------
 * Suite de tests
 * ----------------------------------------------------------------*/
describe('TourneesComponent', () => {
  let fixture:   ComponentFixture<TourneesComponent>;
  let component: TourneesComponent;
  let dataStub:  DataServiceStub;
  let planif:    PlanificationServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, TourneesComponent], // composant standalone
      providers: [
        { provide: DataService,         useClass: DataServiceStub },
        { provide: PlanificationService, useClass: PlanificationServiceStub },
      ],
    })
      //  pour éviter les erreurs de binding
      .overrideComponent(TourneesComponent, { set: { template: '' } })
      .compileComponents();

    fixture   = TestBed.createComponent(TourneesComponent);
    component = fixture.componentInstance;
    dataStub  = TestBed.inject(DataService)          as unknown as DataServiceStub;
    planif    = TestBed.inject(PlanificationService) as unknown as PlanificationServiceStub;
    fixture.detectChanges();
  });

  /* ------------------------------------------------------------
   * Tests basiques
   * ---------------------------------------------------------- */
  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });

  it('#getEquipeById renvoie la bonne équipe', () => {
    const equipe = component.getEquipeById('1');
    expect(equipe?.idEquipe).toBe(1);
  });

  it('#getLivreursFromIds mappe correctement les trigrammes', () => {
    const livreurs = component.getLivreursFromIds(['ABC', 'XYZ']);
    expect(livreurs.length).toBe(2);
    expect(livreurs[0].nom).toBe('Alice');
  });

  it('#getCommandeByReference renvoie la commande voulue', () => {
    const cmd = component.getCommandeByReference('CMD2');
    expect(cmd?.reference).toBe('CMD2');
  });

  /* ------------------------------------------------------------
   * deleteJournee
   * ---------------------------------------------------------- */
  it('#deleteJournee annule si confirm() renvoie false', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.deleteJournee('J1');

    expect(dataStub.deleteJournee).not.toHaveBeenCalled();
    expect(planif.savedLayers().length).toBe(1); // inchangé
  });

  it('#deleteJournee supprime et rafraîchit si confirm() renvoie true', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);

    component.deleteJournee('J1');
    tick(); // flush observable retourné par of()

    expect(dataStub.deleteJournee).toHaveBeenCalledWith('J1');
    expect(dataStub.refreshJournees).toHaveBeenCalled();
    expect(dataStub.refreshCommandes).toHaveBeenCalled();
    expect(planif.savedLayers().length).toBe(0); // vidé
  }));
});
