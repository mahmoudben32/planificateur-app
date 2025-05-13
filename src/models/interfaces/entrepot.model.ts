import { Adresse, adresseSchema } from './adresse.model';
import { GeoPosition, geoPositionSchema } from './geo-position.model';
import { Camion, camionSchema } from './camion.model';
import { Livreur, livreurSchema } from './livreur.model';
import { Planificateur, planificateurSchema } from './planificateur.model';
import { z } from 'zod';

export interface Entrepot {
  nom: string;
  lettre: string;
  photo: string | null;
  adresse: Adresse;
  coords: GeoPosition;
  camions: Camion[];
  livreurs: Livreur[];
  planificateur: Planificateur | null;
}

export const entrepotSchema = z.object({
  nom: z.string(),
  lettre: z.string(),
  photo: z.string().nullable(),
  adresse: adresseSchema,
  coords: geoPositionSchema,
  camions: z.array(z.lazy(() => camionSchema)),
  livreurs: z.array(z.lazy(() => livreurSchema)),
  planificateur: z.lazy(() => planificateurSchema).nullable(),
});