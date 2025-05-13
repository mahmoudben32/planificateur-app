import { StatusEquipeLivreurs, StatusEquipeLivreursSchema } from '../enums/status-equipe-livreurs.enum';
import { z } from 'zod';

export interface EquipeLivreurs {
  idEquipe: number;
  status: StatusEquipeLivreurs;
  livreurIds: string[];
  tourneesIds?: number[] | null;
}

export const equipeLivreursSchema: z.ZodType<EquipeLivreurs> = z.object({
  idEquipe: z.number(),
  status: StatusEquipeLivreursSchema,
  livreurIds: z.array(z.string()),
  tourneesIds: z.array(z.number()).nullable().optional(),
});