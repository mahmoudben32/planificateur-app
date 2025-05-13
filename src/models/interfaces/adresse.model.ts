import { z } from 'zod';

export interface Adresse {
  adresse: string;
  codePostal: string;
  ville: string;
}

export const adresseSchema: z.ZodType<Adresse> = z.object({
  adresse: z.string(),
  codePostal: z.string().regex(/^\d{5}$/),
  ville: z.string(),
});
