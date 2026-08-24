import { db as globalDb } from '../db/index.js';
import type { DB } from '../db/index.js';
import { users } from '../db/schema/auth.js';
import { auth } from '../auth/index.js';
import { eq, ilike, desc } from 'drizzle-orm';
import { z } from 'zod';

export const createUserSchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(6),
  role:     z.enum(['admin', 'dispatcher', 'finance', 'viewer']).default('viewer'),
});

export const updateUserSchema = z.object({
  name:   z.string().min(1).optional(),
  role:   z.enum(['admin', 'dispatcher', 'finance', 'viewer']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const usersService = {
  /**
   * Users live in the shared auth DB (globalDb).
   * Each tenant shares the same user table.
   */
  async list(filters?: { role?: string; search?: string }) {
    return globalDb
      .select({
        id:        users.id,
        name:      users.name,
        email:     users.email,
        role:      users.role,
        status:    users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(
        filters?.role   ? eq(users.role, filters.role) :
        filters?.search ? ilike(users.name, `%${filters.search}%`) :
        undefined,
      )
      .orderBy(desc(users.createdAt));
  },

  async getById(id: string) {
    const [user] = await globalDb
      .select({
        id:        users.id,
        name:      users.name,
        email:     users.email,
        role:      users.role,
        status:    users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  },

  /**
   * Create a new user via Better Auth (handles password hashing)
   * then set our custom role field.
   */
  async create(input: CreateUserInput) {
    const result = await auth.api.signUpEmail({
      body: {
        name:     input.name,
        email:    input.email,
        password: input.password,
      },
    });

    if (!result?.user?.id) {
      throw new Error('Failed to create user account');
    }

    // Update the custom role field (Better Auth sets it to default 'viewer')
    await globalDb.update(users).set({ role: input.role }).where(eq(users.id, result.user.id));

    return this.getById(result.user.id);
  },

  async update(id: string, input: UpdateUserInput) {
    const [user] = await globalDb
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    return this.getById(id);
  },

  async toggleStatus(id: string) {
    const [current] = await globalDb.select({ status: users.status }).from(users).where(eq(users.id, id)).limit(1);
    if (!current) throw Object.assign(new Error('User not found'), { status: 404 });
    const newStatus = current.status === 'active' ? 'inactive' : 'active';
    await globalDb.update(users).set({ status: newStatus, updatedAt: new Date() }).where(eq(users.id, id));
    return this.getById(id);
  },

  async delete(id: string) {
    const [user] = await globalDb.delete(users).where(eq(users.id, id)).returning();
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    return { deleted: true };
  },
};
