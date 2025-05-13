import { TestBed, ComponentFixture } from '@angular/core/testing';
import { TableauDeBordComponent } from './tableau-de-bord.component';
import { signal } from '@angular/core';
import { DataService } from '../../services/data.service';
import { EtatCommande } from '../../../models/enums/etat-commande.enum';
import { Livreur } from '../../../models/interfaces/livreur.model';
import { Commande } from '../../../models/interfaces/commande.model';

/**
 * ################
 * # STUB SERVICE #
 * ################
 */

class DataServiceStub {
  equipesLivreurs = signal<any[]>([]);

  livreurs = signal<Livreur[]>([
    { trigramme: 'ABC', nom: 'Alice', prenom: 'B.', tel: '' } as unknown as Livreur,
    { trigramme: 'DEF', nom: 'Daniel', prenom: 'E.', tel: '' } as unknown as Livreur,
  ]);

  commandes = signal<Commande[]>([
    { etat: EtatCommande.LIVREE } as unknown as Commande,
    { etat: EtatCommande.PLANIFIEE } as unknown as Commande,
    { etat: EtatCommande.EN_LIVRAISON } as unknown as Commande,
  ]);
}

/**
 * ################
 * #  TEST SUITE  #
 * ################
 */

describe('TESTS TableauDeBordComponent', () => {
  let fixture: ComponentFixture<TableauDeBordComponent>;
  let component: TableauDeBordComponent;
  let dataStub: DataServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableauDeBordComponent], // standalone
      providers: [{ provide: DataService, useClass: DataServiceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(TableauDeBordComponent);
    component = fixture.componentInstance;
    dataStub = TestBed.inject(DataService) as unknown as DataServiceStub;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute counts correctly', () => {
    expect(component.totalCommandes()).toBe(3);
    expect(component.terminees()).toBe(1);
    expect(component.enAttente()).toBe(1);
    expect(component.enCours()).toBe(1);
  });

  it('should update computed counts when commandes signal changes', () => {
    dataStub.commandes.set([
      { etat: EtatCommande.LIVREE } as unknown as Commande,
      { etat: EtatCommande.LIVREE } as unknown as Commande,
    ]);

    expect(component.totalCommandes()).toBe(2);
    expect(component.terminees()).toBe(2);
    expect(component.enAttente()).toBe(0);
    expect(component.enCours()).toBe(0);
  });

  it('getLivreurById should return matching livreur', () => {
    const liv = component.getLivreurById('ABC');
    expect(liv?.nom).toBe('Alice');
  });

  it('getLivreursFromIds should map ids to livreurs', () => {
    const list = component.getLivreursFromIds(['ABC', 'DEF']);
    expect(list.length).toBe(2);
    expect(list.map(l => l.trigramme)).toEqual(['ABC', 'DEF']);
  });
});
