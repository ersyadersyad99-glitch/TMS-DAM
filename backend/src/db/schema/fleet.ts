import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const fleet = pgTable('fleet', {
  id:        uuid('id').primaryKey().defaultRandom(),
  plate:     varchar('plate', { length: 20 }).notNull().unique(),
  type:      varchar('type', { length: 100 }),      // e.g. Truk Fuso
  capacity:  varchar('capacity', { length: 50 }),   // e.g. 8 Ton
  // 'available' | 'on_trip' | 'maintenance'
  status:    varchar('status', { length: 30 }).notNull().default('available'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Fleet = typeof fleet.$inferSelect;
export type NewFleet = typeof fleet.$inferInsert;
