import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DataService } from './data.service';
import { Livreur } from '../../models/interfaces/livreur.model';
import { EquipeLivreurs } from '../../models/interfaces/equipe-livreurs.model';
import { EtatCommande } from '../../models/enums/etat-commande.enum';
import { StatusEquipeLivreurs } from '../../models/enums/status-equipe-livreurs.enum';

describe('TESTS DataService )', () => {
  let service: DataService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        DataService,
      ],
    });

    service = TestBed.inject(DataService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Répondre à toutes les requêtes encore ouvertes
    http.match(() => true).forEach((req) => req.flush([]));
    http.verify();
  });

  it('charge les données initiales à la création', () => {
    const endpoints = ['livreurs', 'equipes', 'journees', 'commandes', 'camions'];

    endpoints.forEach((ep) => {
      const req = http.match(`http://localhost:8080/api/${ep}`)[0];
      expect(req).toBeDefined();
      req.flush([]);
    });
  });

  it('rafraîchit les livreurs via refreshLivreurs()', () => {
    http.match(() => true).forEach((req) => req.flush([]));

    service.refreshLivreurs();
    const reqs = http.match('http://localhost:8080/api/livreurs');
    const last = reqs[reqs.length - 1];
    expect(last.request.method).toBe('GET');
    last.flush([]);
  });

  it('met à jour un livreur via updateLivreur()', (done) => {
    http.match(() => true).forEach((req) => req.flush([]));

    const livreur: Livreur = {
      trigramme: 'ABC',
      affecte: false,
      apermis: true,
      equipeId: null,
      email: 'abc@example.com',
      nom: 'Durand',
      prenom: 'Alice',
      entrepotNom: 'Entrepot A',
      photo: 'photo.jpg',
      telephone: '0601020304',
    };

    service.updateLivreur(livreur).subscribe((res) => {
      expect(res).toEqual(livreur);
      done();
    });

    const req = http.expectOne('http://localhost:8080/api/livreur/ABC');
    expect(req.request.method).toBe('PUT');
    req.flush(livreur);
  });

  it('filtre correctement les commandes ouvertes', () => {
    http.match(() => true).forEach((req) => req.flush([]));

    const commandes = [
      { reference: 'CMD1', etat: EtatCommande.OUVERTE },
      { reference: 'CMD2', etat: EtatCommande.LIVREE },
    ] as any;

    spyOn(service, 'commandes').and.returnValue(commandes);
    const result = service.commandesOuvertes();
    expect(result.length).toBe(1);
    expect(result[0].etat).toBe(EtatCommande.OUVERTE);
  });

  // test pour  crée une équipe via createEquipe()

  // test pour mettre à jour le statut d'une équipe via updateEquipeStatus()

});
