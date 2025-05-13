import { TestBed } from '@angular/core/testing';
import { PlanificationService } from './planification.service';
import { CartoService } from './carto.service';
import { DataService } from './data.service';
import { KMeansService } from './kmeans.service';
import { Layer } from 'leaflet';

describe('TESTS PlanificationService', () => {
  let service: PlanificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PlanificationService,
        { provide: CartoService, useValue: { getColorForTeam: (id: number) => `color-${id}` } },
        { provide: DataService, useValue: {} },
        { provide: KMeansService, useValue: {} }
      ]
    });

    service = TestBed.inject(PlanificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update saved layers', () => {
    const layers: Layer[] = [{} as Layer];
    service.updateSavedLayers(layers);
    expect(service.savedLayers()).toEqual(layers);
  });

  it('should return tomorrow\'s date', () => {
    const tomorrow = service.getTomorrowDate();
    const expected = new Date();
    expected.setDate(expected.getDate() + 1);
    expect(tomorrow).toBe(expected.toISOString().substring(0, 10));
  });

  it('should return a color for a team', () => {
    const color = service.getEquipeColor(2);
    expect(color).toBe('color-2');
  });

  it('should generate journee reference', () => {
    const ref = service.generateJourneeReference([{ reference: 'JRN00000001' } as any]);
    expect(ref).toBe('JRN00000002');
  });

  it('should generate tournee reference', () => {
    const ref = service.generateTourneeReference([{ reference: 'TRN001' } as any]);
    expect(ref).toBe('TRN002');
  });
});
