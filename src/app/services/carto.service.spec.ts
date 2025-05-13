/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';

import { of } from 'rxjs';
import { LatLng, polyline } from 'leaflet';

import { CartoService } from './carto.service';

/* ------------------------------------------------------------------
 * 1. Données factices
 * ----------------------------------------------------------------*/
const ENTREPOT = new LatLng(45.0, 3.0);

const COMMANDES: any[] = [
  { client: { coords: { lat: 45.01, lng: 3.01 } } },
  { client: { coords: { lat: 45.02, lng: 3.02 } } },
  { client: { coords: { lat: 45.03, lng: 3.03 } } },
];

const EQUIPES: any[] = [
  { idEquipe: 10 },
  { idEquipe: 20 },
];

/* ------------------------------------------------------------------
 * 2. Suite de tests
 * ----------------------------------------------------------------*/
describe('TESTS  CartoService ', () => {
  let service: CartoService;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),          // HttpClient
        provideHttpClientTesting(),   // backend mock
      ],
    });
    service = TestBed.inject(CartoService);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpCtrl.verify());

  /* --------------------------------------------------------------
   * A. getOptimizationAutmatique
   * ------------------------------------------------------------*/
  it('construit correctement la requête ORS optimisation', (done) => {
    service
      .getOptimizationAutmatique(COMMANDES as any, EQUIPES as any, ENTREPOT)
      .subscribe({
        next: (resp) => {
          expect(resp).toEqual({ ok: true });
          done();
        },
        error: done.fail,
      });

    const req = httpCtrl.expectOne(
      'https://api.openrouteservice.org/optimization',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe(service['apiKey']);

    const body = req.request.body;
    expect(body.vehicles.length).toBe(2);
    expect(body.jobs.length).toBe(3);

    req.flush({ ok: true });
  });

  /* --------------------------------------------------------------
   * B. getItinerary
   * ------------------------------------------------------------*/


  it('convertit la réponse ORS GeoJSON en polyline + distance', (done) => {
    const pts = [ENTREPOT, new LatLng(45.1, 3.1)];

    service.getItinerary(pts).subscribe({
      next: (res) => {
        expect(res.distanceKm).toBeCloseTo(12);
        expect(res.polyline?.getLatLngs().length).toBe(2);
        done();
      },
      error: done.fail,
    });

    const req = httpCtrl.expectOne(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
    );
    req.flush({
      features: [
        {
          geometry: { coordinates: [[3.0, 45.0], [3.1, 45.1]] },
          properties: { summary: { distance: 12000 } },
        },
      ],
    });
  });

  /* --------------------------------------------------------------
   * C. createPolylineForTournee
   * ------------------------------------------------------------*/



  it('renvoie null si la tournée a moins de 2 points', (done) => {
    service.createPolylineForTournee([ENTREPOT]).subscribe({
      next: (pl) => {
        expect(pl).toBeNull();
        done();
      },
    });
  });


  it('recolore la polyline selon la team', (done) => {
    (service as any).teamColorMap.clear();

    const fakePL = polyline([ENTREPOT, new LatLng(45.05, 3.05)]);
    spyOn(service, 'getItinerary').and.returnValue(
      of({ polyline: fakePL, distanceKm: 5 }),
    );

    service
      .createPolylineForTournee(
        [ENTREPOT, new LatLng(45.05, 3.05)],
        10,
      )
      .subscribe({
        next: (pl) => {
          expect(service.getItinerary).toHaveBeenCalled();
          expect(pl).toBe(fakePL);
          expect((pl as any).options.color).toBe('green');
          done();
        },
        error: done.fail,
      });
  });

  it('devrait retourner une couleur pour une équipe', () => {
    const color = service.getColorForTeam(0);
    expect(typeof color).toBe('string');
  });
  it('devrait retourner un marker Leaflet avec coordonnées et popup', () => {
    const latLng = new LatLng(45.1, 3.1);
    const marker = service.latLngToMarker(latLng, { nom: 'Client A' } as any);
    expect(marker.getLatLng()).toEqual(latLng);
  });



});
