import type { DB } from '../../db/index.js';
import { locations } from '../../db/schema/index.js';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';

export const locationSchema = z.object({
  province: z.string().min(1),
  city:     z.string().min(1),
  store:    z.string().optional(),
});

export type LocationInput = z.infer<typeof locationSchema>;

export const locationsService = {
  /** Get all unique provinces */
  async getProvinces(db: DB): Promise<string[]> {
    const rows = await db
      .selectDistinct({ province: locations.province })
      .from(locations)
      .orderBy(asc(locations.province));
    return rows.map((r) => r.province);
  },

  /** Get all cities for a given province */
  async getCities(db: DB, province: string): Promise<string[]> {
    const rows = await db
      .selectDistinct({ city: locations.city })
      .from(locations)
      .where(eq(locations.province, province))
      .orderBy(asc(locations.city));
    return rows.map((r) => r.city);
  },

  /** Get all stores for a given city */
  async getStores(db: DB, city: string): Promise<string[]> {
    const rows = await db
      .select({ store: locations.store })
      .from(locations)
      .where(eq(locations.city, city))
      .orderBy(asc(locations.store));
    return rows.map((r) => r.store).filter(Boolean) as string[];
  },

  /** Add a new location entry */
  async create(db: DB, input: LocationInput) {
    const [loc] = await db.insert(locations).values(input).returning();
    return loc;
  },

  /** Remove a location entry */
  async delete(db: DB, id: string) {
    const [loc] = await db.delete(locations).where(eq(locations.id, id)).returning();
    if (!loc) throw Object.assign(new Error('Location not found'), { status: 404 });
    return { deleted: true };
  },
};
