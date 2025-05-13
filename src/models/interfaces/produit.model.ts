import { z } from 'zod';

export interface Produit {
  reference: string;
  photo: string | null;
  titre: string;
  description: string;
  prix: number;
  optionAssemblage: boolean | null;
  tdmTheorique: number | null;
}

export const produitSchema: z.ZodType<Produit> = z.object({
    reference: z.string(),
    photo: z.string().nullable(),
    titre: z.string(),
    description: z.string(),
    prix: z.number(),
    optionAssemblage: z.boolean().nullable(),
    tdmTheorique: z.number().nullable(),
  });