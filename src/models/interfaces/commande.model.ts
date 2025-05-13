import { EtatCommande, EtatCommandeSchema } from '../enums/etat-commande.enum';
import { Client, clientSchema } from './client.model';
import { z } from 'zod';

export interface Commande {
  reference: string;
  etat: EtatCommande;
  dateDeCreation: string | null;
  note: number | null;
  commentaire: string | null;
  tdmTheorique: number | null;
  dateDeLivraison: string | null;
  client: Client;
  ligneReferences: string[];
}

export const commandeSchema: z.ZodType<Commande> = z.object({
  reference: z.string(),
  etat: EtatCommandeSchema,
  dateDeCreation: z.string().nullable(),
  note: z.number().nullable(),
  commentaire: z.string().nullable(),
  tdmTheorique : z.number().nullable(),
  dateDeLivraison: z.string().nullable(),
  client: clientSchema,
  ligneReferences: z.array(z.string()),
});