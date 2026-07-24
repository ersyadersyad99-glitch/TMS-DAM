import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

/**
 * Flat table storing the province → city → store hierarchy.
 * Province and city are always filled; store is optional.
 * A row with store=null represents a city entry.
 * A row with store filled represents a store in that city.
 */
export const locations = pgTable('locations', {
  id:        uuid('id').primaryKey().defaultRandom(),
  province:  varchar('province', { length: 100 }).notNull(),
  city:      varchar('city', { length: 100 }).notNull(),
  store:     varchar('store', { length: 200 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
