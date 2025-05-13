import { z } from "zod";

export enum StatusEquipeLivreurs {
  EN_LIVRAISON = "EN_LIVRAISON",
  PRET = "PRET",
  NON_DISPONIBLE = "NON_DISPONIBLE",
}

export const StatusEquipeLivreursSchema = z.enum([
  StatusEquipeLivreurs.EN_LIVRAISON,
  StatusEquipeLivreurs.PRET,
  StatusEquipeLivreurs.NON_DISPONIBLE,
]);