import type { DB } from '../../db/index.js';
import { clients } from '../../db/schema/index.js';
import { eq, ilike, desc } from 'drizzle-orm';
import { z } from 'zod';

export const clientSchema = z.object({
  name:        z.string().min(1, 'Name is required'),
  contact:     z.string().optional(),
  address:     z.string().optional(),
  bankAccount: z.string().optional(),
  pic:         z.string().optional(),
  phone:       z.string().optional(),
  email:       z.string().optional(),
  city:        z.string().optional(),
  status:      z.string().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;

export const clientsService = {
  async list(db: DB, search?: string) {
    return db
      .select()
      .from(clients)
      .where(search ? ilike(clients.name, `%${search}%`) : undefined)
      .orderBy(desc(clients.createdAt));
  },

  async getById(db: DB, id: string) {
    const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return client ?? null;
  },

  async create(db: DB, input: any) {
    const id = input.id || `c-${Date.now()}`;
    const [client] = await db.insert(clients).values({
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
      target: clients.id,
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
    return client;
  },

  async update(db: DB, id: string, input: Partial<ClientInput>) {
    const [client] = await db
      .update(clients)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    if (!client) throw Object.assign(new Error('Client not found'), { status: 404 });
    return client;
  },

  async delete(db: DB, id: string) {
    const [client] = await db.delete(clients).where(eq(clients.id, id)).returning();
    if (!client) throw Object.assign(new Error('Client not found'), { status: 404 });
    return { deleted: true };
  },
};
