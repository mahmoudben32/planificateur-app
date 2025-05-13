import { Employe, employeSchema } from './employe.model';
import { Entrepot, entrepotSchema } from './entrepot.model';
import { Tournee, tourneeSchema } from './tournee.model';
import { Journee, journeeSchema } from './journee.model';
import { z } from 'zod';

export interface Planificateur extends Employe {
  tournees: Tournee[];
  jours: Journee[];
}

export const planificateurSchema: z.ZodType<Planificateur> = employeSchema.merge(
  z.object({
    tournees: z.array(z.lazy(() => tourneeSchema)),
    jours: z.array(z.lazy(() => journeeSchema)),
  })
);