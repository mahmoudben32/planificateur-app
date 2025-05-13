import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { GestionDequipesComponent } from './gestion-dequipes.component';
import { DataService } from '../../services/data.service';
import { StatusEquipeLivreurs } from '../../../models/enums/status-equipe-livreurs.enum';
import { Livreur } from '../../../models/interfaces/livreur.model';
import { EquipeLivreurs } from '../../../models/interfaces/equipe-livreurs.model';


describe('TESTS GestionDequipesComponent', () => {
  let component: GestionDequipesComponent;
  let fixture: ComponentFixture<GestionDequipesComponent>;
  let dsSpy: jasmine.SpyObj<DataService>;

  /* ------------------------------------------------------------------
   *  Données factices partagées
   * ----------------------------------------------------------------*/
  const fakeLivreurs: Livreur[] = [
    {
      trigramme: 'L1',
      nom: 'Martin',
      prenom: 'Paul',
      email: 'l1@test.fr',
      telephone: '0600000001',
      apermis: true,
      affecte: false,
      equipeId: null,
      photo: '',
      entrepotNom: 'ENT'
    },
    {
      trigramme: 'L2',
      nom: 'Durand',
      prenom: 'Emma',
      email: 'l2@test.fr',
      telephone: '0600000002',
      apermis: true,
      affecte: false,
      equipeId: null,
      photo: '',
      entrepotNom: 'ENT'
    }
  ];

  const fakeEquipe: EquipeLivreurs = {
    idEquipe: 1,
    status: StatusEquipeLivreurs.PRET,
    livreurIds: ['L1', 'L2']
  };

  /* ------------------------------------------------------------------
   *  Configuration du TestBed
   * ----------------------------------------------------------------*/
  beforeEach(async () => {
    dsSpy = jasmine.createSpyObj(
      'DataService',
      [
        'createEquipe',
        'refreshEquipes',
        'refreshLivreurs',
        'markLivreursAffecte',
        'updateEquipeStatus',
        'deleteEquipe'
      ],
      {
        // propriétés (getters) retournant des signaux → des fonctions
        livreurs: () => fakeLivreurs,
        equipesLivreurs: () => [fakeEquipe]
      }
    );

    await TestBed.configureTestingModule({
      imports: [GestionDequipesComponent],
      providers: [{ provide: DataService, useValue: dsSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(GestionDequipesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /* ------------------------------------------------------------------
   * 1. Création d’une équipe
   * ----------------------------------------------------------------*/
  it('crée une équipe quand le formulaire est valide', () => {
    dsSpy.createEquipe.and.returnValue(of(fakeEquipe));

    component.equipeForm.set({
      livreur1: 'L1',
      livreur2: 'L2',
      status: StatusEquipeLivreurs.PRET
    });

    component.creerEquipe();

    expect(dsSpy.createEquipe).toHaveBeenCalledWith({
      status: StatusEquipeLivreurs.PRET,
      livreurIds: ['L1', 'L2']
    });
    expect(dsSpy.markLivreursAffecte).toHaveBeenCalledWith(['L1', 'L2']);
  });

  /* ------------------------------------------------------------------
   * 2. Pré‑remplissage du formulaire lors de la modification
   * ----------------------------------------------------------------*/
  it('pré‑remplit le formulaire avec les données de l’équipe sélectionnée', () => {
    component.modifierEquipe(1);

    const form = component.equipeForm();
    expect(form.livreur1).toBe('L1');
    expect(form.livreur2).toBe('L2');
    expect(form.status).toBe(StatusEquipeLivreurs.PRET);
  });

  /* ------------------------------------------------------------------
   * 3. Enregistrement des modifications
   * ----------------------------------------------------------------*/
  it('appelle updateEquipeStatus avec le bon statut', () => {
    dsSpy.updateEquipeStatus.and.returnValue(of(fakeEquipe));

    component.editingEquipeId.set(1);
    component.equipeForm.set({
      livreur1: 'L1',
      livreur2: 'L2',
      status: StatusEquipeLivreurs.NON_DISPONIBLE
    });

    component.enregistrerModification();

    expect(dsSpy.updateEquipeStatus).toHaveBeenCalledWith(1, StatusEquipeLivreurs.NON_DISPONIBLE);
  });

  /* ------------------------------------------------------------------
   * 4. Signal « dispo »
   * ----------------------------------------------------------------*/
  it('calcule correctement les livreurs disponibles', () => {
    // L1 est déjà affecté, L2 ne l’est pas
    fakeLivreurs[0].affecte = true;

    // On force Angular à recalculer les signaux
    fixture.detectChanges();

    const dispo = component.dispo();
    expect(dispo.length).toBe(1);
    expect(dispo[0].trigramme).toBe('L2');
  });
});
