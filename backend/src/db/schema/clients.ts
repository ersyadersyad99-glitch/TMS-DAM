import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const clients = pgTable('clients', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      varchar('name', { length: 255 }).notNull(),
  contact:   varchar('contact', { length: 100 }),
  address:   text('address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
