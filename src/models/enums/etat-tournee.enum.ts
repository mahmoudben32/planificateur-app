import { z } from "zod";

export enum EtatTournee {
  EN_COURS = "EN_COURS",
  PLANIFIEE = "PLANIFIEE",
  COMPLETEE = "COMPLETEE",
}

export const EtatTourneeSchema = z.enum([
  EtatTournee.EN_COURS,
  EtatTournee.PLANIFIEE,
  EtatTournee.COMPLETEE,
]);