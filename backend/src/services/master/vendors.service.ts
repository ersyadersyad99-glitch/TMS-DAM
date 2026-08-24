import type { DB } from '../../db/index.js';
import { vendors } from '../../db/schema/index.js';
import { eq, ilike, desc } from 'drizzle-orm';

export const vendorsService = {
  async list(db: DB, search?: string) {
    return db
      .select()
      .from(vendors)
      .where(search ? ilike(vendors.name, `%${search}%`) : undefined)
      .orderBy(desc(vendors.createdAt));
  },

  async getById(db: DB, id: string) {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
    return vendor ?? null;
  },

  async create(db: DB, input: any) {
    const id = input.id || `v-${Date.now()}`;
    const [vendor] = await db.insert(vendors).values({
      id,
      name: input.name,
      contact: input.contact || input.phone,
      address: input.address || input.city,
      bankAccount: input.bankAccount,
      pic: input.pic,
      phone: input.phone,
      email: input.email,
      city: input.city,
      status: input.status || 'active',
    }).onConflictDoUpdate({
      target: vendors.id,
      set: {
        name: input.name,
        contact: input.contact || input.phone,
        address: input.address || input.city,
        bankAccount: input.bankAccount,
        pic: input.pic,
        phone: input.phone,
        email: input.email,
        city: input.city,
        status: input.status || 'active',
        updatedAt: new Date(),
      }
    }).returning();
    return vendor;
  },

  async delete(db: DB, id: string) {
    await db.delete(vendors).where(eq(vendors.id, id));
    return { deleted: true };
  },
};
