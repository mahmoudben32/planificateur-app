import { z } from 'zod';

export interface Employe {
  trigramme: string;
  email: string;
  nom: string;
  prenom: string;
  photo: string | null;
  telephone: string;
  entrepotNom: string | null;
}

export const employeSchema = z.object({
  trigramme: z.string(),
  email: z.string(),
  nom: z.string(),
  prenom: z.string(),
  photo: z.string().nullable(),
  telephone: z.string(),
  entrepotNom: z.string(),
});