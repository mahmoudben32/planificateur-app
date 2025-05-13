import { Tournee, tourneeSchema } from './tournee.model';
import { z } from 'zod';
import { TourneePostDto } from './tournee.model';

export interface Journee {
  reference: string;
  date: string;
  planificateurEmail: string;
  coutTotal: number;
  tournees: Tournee[];
}

export const journeeSchema = z.object({
    reference: z.string(),
    date: z.string(),
    planificateurEmail: z.string(),
    coutTotal: z.number(),
    tournees: z.array(z.lazy(() => tourneeSchema)),
  });

  export interface JourneePostDto {
    reference: string;
    date: string;
    planificateurEmail: string;
    coutTotal: number;
    tournees: TourneePostDto[];
  }