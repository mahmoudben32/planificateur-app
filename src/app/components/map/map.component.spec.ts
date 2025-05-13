import { TestBed, ComponentFixture } from '@angular/core/testing';
import { MapComponent } from './map.component';
import { CartoService } from '../../services/carto.service';
import * as L from 'leaflet';

// Jasmine spy helpers for Leaflet marker
const createMockMarker = () => L.marker([0, 0]);

/**
 * A minimal mock for CartoService that only stubs `latLngToMarker`, which is
 * all that MapComponent relies on.
 */
class CartoServiceStub {
  latLngToMarker = jasmine.createSpy('latLngToMarker').and.returnValue(createMockMarker());
}

describe('TESTS MapComponent', () => {
  let fixture: ComponentFixture<MapComponent>;
  let component: MapComponent;
  let cartoService: CartoServiceStub;
  const entrepotMarker = createMockMarker();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapComponent], // MapComponent is standalone
      providers: [{ provide: CartoService, useClass: CartoServiceStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    cartoService = TestBed.inject(CartoService) as unknown as CartoServiceStub;

    // Adjust stub to return the persistent entrepôt marker each call.
    (cartoService.latLngToMarker as jasmine.Spy).and.returnValue(entrepotMarker);

    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should compute the default center correctly', () => {
    const center = component.center();
    expect(center.lat).toBeCloseTo(45.14852, 5);
    expect(center.lng).toBeCloseTo(5.7369725, 5);
  });

  it('should expose map options with correct center and zoom', () => {
    const opts = component.options();
    expect(opts.zoom).toBe(14);
    expect(opts.center.lat).toBeCloseTo(45.14852, 5);
    expect(opts.center.lng).toBeCloseTo(5.7369725, 5);
  });

  it('should build the entrepôt marker using CartoService', () => {
    component['getEntrepotMarker']();
    expect(cartoService.latLngToMarker).toHaveBeenCalled();
  });

  describe('#showLayers', () => {
    const extraMarker = L.marker([1, 1]);

    it('keeps entrepôt marker by default', () => {
      component.showLayers([extraMarker]);
      const layers = component.layers();

      expect(layers.length).toBe(2);
      expect(layers).toContain(entrepotMarker);
      expect(layers).toContain(extraMarker);
    });

    it('can omit entrepôt marker when keepEntrepot is false', () => {
      component.showLayers([extraMarker], false);
      const layers = component.layers();

      expect(layers.length).toBe(1);
      expect(layers).not.toContain(entrepotMarker);
      expect(layers).toContain(extraMarker);
    });
  });

  describe('#clearLayers', () => {
    beforeEach(() => {
      // Seed layers so that clearLayers has something to remove
      component.showLayers([L.marker([2, 2])]);
    });

    it('keeps entrepôt marker by default', () => {
      component.clearLayers();
      const layers = component.layers();

      expect(layers.length).toBe(1);
      expect(layers).toContain(entrepotMarker);
    });

    it('can clear all layers when keepEntrepot is false', () => {
      component.clearLayers(false);
      const layers = component.layers();

      expect(layers.length).toBe(0);
    });
  });
});
