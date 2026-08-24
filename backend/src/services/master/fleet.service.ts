import type { DB } from '../../db/index.js';
import { fleet } from '../../db/schema/index.js';
import { eq, ilike, desc } from 'drizzle-orm';
import { z } from 'zod';

export const fleetSchema = z.object({
  plate:    z.string().min(1),
  type:     z.string().optional(),
  capacity: z.string().optional(),
  status:   z.enum(['available', 'on_trip', 'maintenance']).optional().default('available'),
});

export type FleetInput = z.infer<typeof fleetSchema>;

export const fleetService = {
  async list(db: DB, filters?: { status?: string; search?: string }) {
    return db
      .select()
      .from(fleet)
      .where(
        filters?.status ? eq(fleet.status, filters.status) :
        filters?.search ? ilike(fleet.plate, `%${filters.search}%`) :
        undefined,
      )
      .orderBy(desc(fleet.createdAt));
  },

  async getById(db: DB, id: string) {
    const [unit] = await db.select().from(fleet).where(eq(fleet.id, id)).limit(1);
    return unit ?? null;
  },

  async create(db: DB, input: any) {
    const id = input.id || `f-${Date.now()}`;
    const [unit] = await db.insert(fleet).values({
      id,
      plate: input.plate,
      type: input.type,
      capacity: input.capacity,
      vendor: input.vendor,
      status: input.status || 'available',
    }).onConflictDoUpdate({
      target: fleet.id,
      set: {
        plate: input.plate,
        type: input.type,
        capacity: input.capacity,
        vendor: input.vendor,
        status: input.status,
        updatedAt: new Date(),
      }
    }).returning();
    return unit;
  },

  async update(db: DB, id: string, input: Partial<FleetInput>) {
    const [unit] = await db
      .update(fleet)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(fleet.id, id))
      .returning();
    if (!unit) throw Object.assign(new Error('Fleet unit not found'), { status: 404 });
    return unit;
  },

  async updateStatus(db: DB, id: string, status: string) {
    const [unit] = await db
      .update(fleet)
      .set({ status, updatedAt: new Date() })
      .where(eq(fleet.id, id))
      .returning();
    if (!unit) throw Object.assign(new Error('Fleet unit not found'), { status: 404 });
    return unit;
  },

  async delete(db: DB, id: string) {
    const [unit] = await db.delete(fleet).where(eq(fleet.id, id)).returning();
    if (!unit) throw Object.assign(new Error('Fleet unit not found'), { status: 404 });
    return { deleted: true };
  },
};
