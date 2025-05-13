import { EtatTournee, EtatTourneeSchema } from '../enums/etat-tournee.enum';
import { Camion, camionSchema } from './camion.model';
import { z } from 'zod';

export interface Tournee {
  reference: string;
  etat: EtatTournee;
  lettre: string;
  distanceAParcourir: number ;
  tempsAssemblageReel: number | null;
  equipeLivreursId: string;
  camion: Camion ;
  dureeTheorique: number;
  cout :number;
  journeeReference: string;
  commandeReferences: string[];
}

export const tourneeSchema: z.ZodType<Tournee> = z.object({
  reference: z.string(),
  etat: EtatTourneeSchema,
  lettre: z.string(),
  distanceAParcourir: z.number(),
  tempsAssemblageReel: z.number().nullable(),
  equipeLivreursId: z.string(),
  camion: camionSchema,
  dureeTheorique: z.number(),
  cout: z.number(),
  journeeReference: z.string(),
  commandeReferences: z.array(z.string()),
});

export interface TourneePostDto {
  reference: string;
  etat: EtatTournee;
  lettre: string ;
  distanceAParcourir: number;
  tempsAssemblageReel: number | null;
  equipeLivreursId: string;
  camionCode: string;
  dureeTheorique: number;
  cout :number;
  commandeReferences: string[];
  journeeReference: string;
}