import { z } from 'zod';

export interface GeoPosition {
  lat: number;
  lng: number;
}

export const geoPositionSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});
