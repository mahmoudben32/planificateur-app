import { Employe, employeSchema } from './employe.model';
import { Entrepot, entrepotSchema } from './entrepot.model';
import { z } from 'zod';

export interface Livreur extends Employe {
  affecte: boolean;
  apermis: boolean;
  equipeId: number | null;
}

export const livreurSchema: z.ZodType<Livreur> = employeSchema.merge(
  z.object({
    affecte: z.boolean(),
    apermis: z.boolean(),
    equipeId: z.number().nullable(),
  })
);