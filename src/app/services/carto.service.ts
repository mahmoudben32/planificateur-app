import { inject, Injectable } from '@angular/core';
import { circleMarker, CircleMarker, GeoJSON,Icon,icon,LatLng, marker, Marker, polyline, Polyline } from 'leaflet';
import { EquipeLivreurs } from '../../models/interfaces/equipe-livreurs.model';
import { Commande } from '../../models/interfaces/commande.model';
import { Adresse } from '../../models/interfaces/adresse.model';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CartoService {

  private readonly apiKey = '5b3ce3597851110001cf6248bcf05f5c9e6943378190c10a202f8b08';

  private http = inject(HttpClient);

  getOptimizationAutmatique(
    commandes: Commande[],
    availableEquipes: EquipeLivreurs[],
    entrepot: LatLng
  ): Observable<any> {
    const baseCapacity = Math.floor(commandes.length / availableEquipes.length);
    const remainder = commandes.length % availableEquipes.length;

    interface Vehicle { 
      id: number;
      profile: string;
      start: [number, number];
      end: [number, number];
      capacity: number[];
    }

    const vehicles: Vehicle[] = availableEquipes.map((e, idx) => ({
      id: e.idEquipe,
      profile: 'driving-car',
      start: [entrepot.lng, entrepot.lat],
      end: [entrepot.lng, entrepot.lat],
      capacity: [ idx < remainder ? baseCapacity + 1 : baseCapacity ]
    }));

    const jobs = commandes.map((l,i) => ({
      id: i + 1, // ors exige un number
      location: [l.client.coords.lng, l.client.coords.lat],
      delivery: [1]
    }));

    const body = { vehicles, jobs, geometry: true };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.apiKey
    });

    return this.http
      .post<any>(
        'https://api.openrouteservice.org/optimization',
        body,
        { headers }
      )
      .pipe(
        tap(data => console.log('ORS optimization response:', data)),
        catchError(err => {
          console.error('ORS optimization error:', err);
          return of(null);
        })
      );
  }


  private readonly markerColors = [
    'blue', 'red', 'green', 'orange',
    'yellow', 'violet', 'grey', 'black'
  ];
  private teamColorMap = new Map<number, string>();

getColorForTeam(teamId: number): string {
  if (!this.teamColorMap.has(teamId)) {
    const idx = teamId % this.markerColors.length;
    this.teamColorMap.set(teamId, this.markerColors[idx]);
  }
  return this.teamColorMap.get(teamId)!;
}


latLngToMarker(
  latLng: LatLng,
  entrDest: 'entrepot' | 'destination',
  teamId?: number
): Marker {
  let colorName: string;
  let iconUrl: string;
  let iconRetinaUrl: string;

  if (entrDest === 'entrepot') {
    iconUrl = 'assets/images/entrepot.png';
    iconRetinaUrl = 'assets/images/entrepot.png';
  } else {
    colorName = teamId != null
      ? this.getColorForTeam(teamId)
      : this.markerColors[0];
    iconUrl = `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${colorName}.png`;
    iconRetinaUrl = `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${colorName}.png`;
  }

  return marker([latLng.lat, latLng.lng], {
    icon: icon({
      ...Icon.Default.prototype.options,
      iconUrl,
      iconRetinaUrl,
      shadowUrl: 'assets/marker-shadow.png'
    })
  });
}


circleMarkerForTeam(latlng: LatLng, color: string): CircleMarker {
  return circleMarker(latlng, {
    radius: 6,
    color: 'black', 
    fillColor: color,
    fillOpacity: 1,
    weight: 1
  });
}


getLatLngsFromCommandes(commandes: Commande[]): LatLng[] {
  const latLngs: LatLng[] = [];
  for (const commande of commandes) {
    const result = new LatLng(commande.client.coords.lat, commande.client.coords.lng)
    
      latLngs.push(result);
    
  }
  return latLngs;
}


createMarkersForAvailableCommandes(commandes: Commande[]): Marker[] {
  const latLngs = this.getLatLngsFromCommandes(commandes);
  return latLngs.map(lat => this.latLngToMarker(lat, 'destination'));
} 

getItinerary(latlngTable: LatLng[]): Observable<{ polyline: Polyline | null, distanceKm: number }> {
  const coordinates = latlngTable.map(p => [p.lng, p.lat] as [number, number]);
  const body = { coordinates };
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Authorization: this.apiKey
  });

  return this.http
    .post<any>(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      body,
      { headers }
    )
    .pipe(
      map(res => {
        if (!res?.features?.length) {
          console.error('Invalid ORS itinerary:', res);
          return { polyline: null, distanceKm: 0 };
        }

        const coords: [number, number][] = res.features[0].geometry.coordinates;
        const latlngs = coords.map(([lng, lat]) => new LatLng(lat, lng));
        const distanceMeters = res.features[0].properties.summary.distance;
        const polylineResult = polyline(latlngs, {
          color: '#3388ff'
        });

        return {
          polyline: polylineResult,
          distanceKm: distanceMeters / 1000
        };
      }),
      catchError(err => {
        console.error('ORS itinerary error:', err);
        return of({ polyline: null, distanceKm: 0 });
      })
    );
}

getDistanceFromORS(latlngTable: LatLng[]): Promise<number> {
  return new Promise(resolve => {
    this.getItinerary(latlngTable).subscribe(res => {
      resolve(res?.distanceKm ?? 0);
    });
  });
}




createPolylineForTournee(
  tournee: LatLng[],
  teamId?: number
): Observable<Polyline | null> {
  if (tournee.length < 2) {
    return of(null);
  }

  return this.getItinerary(tournee).pipe(
    map(data => {
      if (!data?.polyline) {
        console.error('Invalid itinerary result:', data);
        return null;
      }
      const color = teamId != null ? this.getColorForTeam(teamId) : '#3388ff';
      data.polyline.setStyle({ color }); 
      return data.polyline;
    }),
    catchError(err => {
      console.error('Polyline creation error:', err);
      return of(null);
    })
  );
}

  
}