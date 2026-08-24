import type { DB } from '../../db/index.js';
import { drivers } from '../../db/schema/index.js';
import { eq, ilike, desc } from 'drizzle-orm';
import { z } from 'zod';

export const driverSchema = z.object({
  name:    z.string().min(1),
  phone:   z.string().optional(),
  license: z.string().optional(),
  status:  z.enum(['available', 'on_trip', 'off']).optional().default('available'),
});

export type DriverInput = z.infer<typeof driverSchema>;

export const driversService = {
  async list(db: DB, filters?: { status?: string; search?: string }) {
    return db
      .select()
      .from(drivers)
      .where(
        filters?.status ? eq(drivers.status, filters.status) :
        filters?.search ? ilike(drivers.name, `%${filters.search}%`) :
        undefined,
      )
      .orderBy(desc(drivers.createdAt));
  },

  async getById(db: DB, id: string) {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
    return driver ?? null;
  },

  async create(db: DB, input: any) {
    const id = input.id || `d-${Date.now()}`;
    const [driver] = await db.insert(drivers).values({
      id,
      name: input.name,
      phone: input.phone,
      license: input.license,
      status: input.status || 'available',
    }).onConflictDoUpdate({
      target: drivers.id,
      set: {
        name: input.name,
        phone: input.phone,
        license: input.license,
        status: input.status,
        updatedAt: new Date(),
      }
    }).returning();
    return driver;
  },

  async update(db: DB, id: string, input: Partial<DriverInput>) {
    const [driver] = await db
      .update(drivers)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(drivers.id, id))
      .returning();
    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });
    return driver;
  },

  async updateStatus(db: DB, id: string, status: string) {
    const [driver] = await db
      .update(drivers)
      .set({ status, updatedAt: new Date() })
      .where(eq(drivers.id, id))
      .returning();
    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });
    return driver;
  },

  async delete(db: DB, id: string) {
    const [driver] = await db.delete(drivers).where(eq(drivers.id, id)).returning();
    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });
    return { deleted: true };
  },
};
