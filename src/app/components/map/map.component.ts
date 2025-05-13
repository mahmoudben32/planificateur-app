import {Component, computed, effect, inject, input, model, OnChanges, signal} from '@angular/core';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { LatLng, latLng, Layer, tileLayer, Marker } from 'leaflet';
import { CartoService } from '../../services/carto.service';
import { Commande } from '../../../models/interfaces/commande.model';
import { EquipeLivreurs } from '../../../models/interfaces/equipe-livreurs.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [LeafletModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent{
  private cartoService = inject(CartoService);

  latitude = model<number>(45.14852);
  longitude = model<number>(5.7369725);
  zoom = model<number>(14);

  center = computed(() => latLng(this.latitude(), this.longitude()));
  options = computed(() => ({
    layers: [
      tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: 'Map data © OpenStreetMap contributors'
      })
    ],
    zoom: this.zoom(),
    center: this.center()
  }));

  layers = signal<Layer[]>([]);


  private getEntrepotMarker(): Layer {
    return this.cartoService.latLngToMarker(
      latLng(this.latitude(), this.longitude()),
      'entrepot'
    );
  }

  showLayers(layers: Layer[], keepEntrepot = true) {
    if (keepEntrepot) {
      this.layers.set([this.getEntrepotMarker(), ...layers]);
    } else {
      this.layers.set([...layers]);
    }
  }
  updateLayers(layers: Layer[], keepEntrepot = true) {
    if (keepEntrepot) {
      this.layers.update((oldLayers) => [this.getEntrepotMarker(),...oldLayers,...layers]);
    } else {
      this.layers.update((oldLayers) => [...oldLayers,...layers]);
    }
  }

  clearLayers(keepEntrepot = true) {
    if (keepEntrepot) {
      this.layers.set([this.getEntrepotMarker()]);
    } else {
      this.layers.set([]);
    }
  }

}