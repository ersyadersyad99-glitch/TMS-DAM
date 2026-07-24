import { db } from '../../db/index.js';
import { clients } from '../../db/schema/index.js';
import { eq, ilike, desc } from 'drizzle-orm';
import { z } from 'zod';

export const clientSchema = z.object({
  name:    z.string().min(1, 'Name is required'),
  contact: z.string().optional(),
  address: z.string().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;

export const clientsService = {
  async list(search?: string) {
    return db
      .select()
      .from(clients)
      .where(search ? ilike(clients.name, `%${search}%`) : undefined)
      .orderBy(desc(clients.createdAt));
  },

  async getById(id: string) {
    const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return client ?? null;
  },

  async create(input: ClientInput) {
    const [client] = await db.insert(clients).values(input).returning();
    return client;
  },

  async update(id: string, input: Partial<ClientInput>) {
    const [client] = await db
      .update(clients)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    if (!client) throw Object.assign(new Error('Client not found'), { status: 404 });
    return client;
  },

  async delete(id: string) {
    const [client] = await db.delete(clients).where(eq(clients.id, id)).returning();
    if (!client) throw Object.assign(new Error('Client not found'), { status: 404 });
    return { deleted: true };
  },
};
