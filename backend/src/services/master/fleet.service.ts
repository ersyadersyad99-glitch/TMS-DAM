import { db } from '../../db/index.js';
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
  async list(filters?: { status?: string; search?: string }) {
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

  async getById(id: string) {
    const [unit] = await db.select().from(fleet).where(eq(fleet.id, id)).limit(1);
    return unit ?? null;
  },

  async create(input: FleetInput) {
    const [unit] = await db.insert(fleet).values(input).returning();
    return unit;
  },

  async update(id: string, input: Partial<FleetInput>) {
    const [unit] = await db
      .update(fleet)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(fleet.id, id))
      .returning();
    if (!unit) throw Object.assign(new Error('Fleet unit not found'), { status: 404 });
    return unit;
  },

  async updateStatus(id: string, status: string) {
    const [unit] = await db
      .update(fleet)
      .set({ status, updatedAt: new Date() })
      .where(eq(fleet.id, id))
      .returning();
    if (!unit) throw Object.assign(new Error('Fleet unit not found'), { status: 404 });
    return unit;
  },

  async delete(id: string) {
    const [unit] = await db.delete(fleet).where(eq(fleet.id, id)).returning();
    if (!unit) throw Object.assign(new Error('Fleet unit not found'), { status: 404 });
    return { deleted: true };
  },
};
