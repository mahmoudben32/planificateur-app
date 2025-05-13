import { z } from 'zod';
import { TypeCamion } from './type-camion.model';
import { typeCamionSchema } from './type-camion.model';


export interface Camion {
  code: string;
  immatriculation: string;
  entrepotNom: string | null;
  kilometrage: number | null;
  typeCamion: TypeCamion;
}

export const camionSchema: z.ZodType<Camion> = z.object({
  code: z.string(),
  immatriculation: z.string(),
  entrepotNom: z.string().nullable(),
  kilometrage: z.number().nullable(),
  typeCamion: typeCamionSchema,
});