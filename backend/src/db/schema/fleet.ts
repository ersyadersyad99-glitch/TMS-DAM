import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const fleet = pgTable('fleet', {
  id:        varchar('id', { length: 50 }).primaryKey(),
  plate:     varchar('plate', { length: 50 }).notNull(),
  type:      varchar('type', { length: 100 }),      // e.g. Truk Fuso
  capacity:  varchar('capacity', { length: 50 }),   // e.g. 8 Ton
  vendor:    varchar('vendor', { length: 255 }),
  // 'available' | 'on_trip' | 'maintenance'
  status:    varchar('status', { length: 30 }).notNull().default('available'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Fleet = typeof fleet.$inferSelect;
export type NewFleet = typeof fleet.$inferInsert;
