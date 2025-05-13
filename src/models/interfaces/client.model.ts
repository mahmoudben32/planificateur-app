import { Adresse, adresseSchema } from './adresse.model';
import { EtatClient, EtatClientSchema } from '../enums/etat-client.enum';
import { Commande, commandeSchema } from './commande.model';
import { z } from 'zod';
import { GeoPosition } from './geo-position.model';

export interface Client {
  code: string;
  email: string;
  prenom: string;
  nom: string;
  adresse: Adresse;
  coords: GeoPosition;
  etat: EtatClient;
}

export const clientSchema = z.object({
  code: z.string(),
  email: z.string(),
  prenom: z.string(),
  nom: z.string(),
  adresse: adresseSchema,
  coords: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  etat: EtatClientSchema,
});