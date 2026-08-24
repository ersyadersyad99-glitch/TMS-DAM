import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const vendors = pgTable('vendors', {
  id:          varchar('id', { length: 50 }).primaryKey(),
  name:        varchar('name', { length: 255 }).notNull(),
  contact:     varchar('contact', { length: 100 }),
  address:     text('address'),
  bankAccount: varchar('bank_account', { length: 255 }),
  pic:         varchar('pic', { length: 150 }),
  phone:       varchar('phone', { length: 50 }),
  email:       varchar('email', { length: 150 }),
  city:        varchar('city', { length: 100 }),
  status:      varchar('status', { length: 30 }).default('active'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
});

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
