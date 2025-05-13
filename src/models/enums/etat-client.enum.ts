import { z } from "zod";

export enum EtatClient {
  LIVRABLE = "LIVRABLE",
  A_LIVRER = "A_LIVRER",
  LIVRE = "LIVRE",
  INSCRIT = "INSCRIT"
}

export const EtatClientSchema = z.enum([
  EtatClient.LIVRABLE,
  EtatClient.A_LIVRER,
  EtatClient.LIVRE,
  EtatClient.INSCRIT
]);
