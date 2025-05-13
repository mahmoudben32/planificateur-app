import { z } from "zod";

export enum EtatCommande {
  OUVERTE = "OUVERTE",
  PLANIFIEE = "PLANIFIEE",
  EN_LIVRAISON = "EN_LIVRAISON",
  LIVREE = "LIVREE",
  NOTE = "NOTE",
}

export const EtatCommandeSchema = z.enum([
  EtatCommande.OUVERTE,
  EtatCommande.PLANIFIEE,
  EtatCommande.EN_LIVRAISON,
  EtatCommande.LIVREE,
  EtatCommande.NOTE,
]);