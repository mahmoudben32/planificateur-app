import { Produit, produitSchema } from './produit.model';
import { Commande, commandeSchema } from './commande.model';
import { z } from 'zod';

export interface Ligne {
  reference: string;
  quantite: number;
  optionAssemblage: boolean | null;
  montant: number;
  produit: Produit | null;
  commande: Commande | null;
}

export const ligneSchema = z.object({
    reference: z.string(),
    quantite: z.number(),
    optionAssemblage: z.boolean().nullable(),
    montant: z.number(),
    produit: z.lazy(() => produitSchema).nullable(),
    commande: z.lazy(() => commandeSchema).nullable(),
  });