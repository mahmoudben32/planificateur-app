import { z } from 'zod';

export interface TypeCamion {
    nom: string;
    volume: number;
  prixAuKm: number;
  image: string;
}

export const typeCamionSchema: z.ZodType<TypeCamion> = z.object({
    nom: z.string(),
    volume: z.number(),
    prixAuKm: z.number(),
    image: z.string(),
  });