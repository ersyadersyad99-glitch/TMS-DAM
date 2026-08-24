import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const drivers = pgTable('drivers', {
  id:        varchar('id', { length: 50 }).primaryKey(),
  name:      varchar('name', { length: 255 }).notNull(),
  phone:     varchar('phone', { length: 50 }),
  license:   varchar('license', { length: 100 }),
  // 'available' | 'on_trip' | 'off'
  status:    varchar('status', { length: 30 }).notNull().default('available'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Driver = typeof drivers.$inferSelect;
export type NewDriver = typeof drivers.$inferInsert;
