import { pgTable, varchar, integer, date, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { drivers } from './drivers.js';

export const travelFunds = pgTable('travel_funds', {
  id:      varchar('id', { length: 30 }).primaryKey(), // e.g. UJ-001

  orderId: varchar('order_id', { length: 30 })
    .references(() => orders.id)
    .notNull(),

  driverId: uuid('driver_id').references(() => drivers.id),

  requestAmount:   integer('request_amount').notNull(),
  disbursedAmount: integer('disbursed_amount').notNull().default(0),
  totalRealized:   integer('total_realized').notNull().default(0),
  // Positive = driver returns surplus; Negative = company owes driver extra
  balance:         integer('balance').notNull().default(0),

  /**
   * Fund status:
   *   pengajuan        — requested, awaiting approval
   *   dicairkan        — approved & cash disbursed
   *   realisasi_selesai — realization finalized
   */
  status: varchar('status', { length: 30 }).notNull().default('pengajuan'),

  requestDate:  date('request_date').notNull(),
  disbursedAt:  timestamp('disbursed_at'),
  finalizedAt:  timestamp('finalized_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const travelFundItems = pgTable('travel_fund_items', {
  id:           uuid('id').primaryKey().defaultRandom(),
  travelFundId: varchar('travel_fund_id', { length: 30 })
    .references(() => travelFunds.id, { onDelete: 'cascade' })
    .notNull(),
  category:    varchar('category', { length: 50 }).notNull().default('Uang Jalan Driver'),
  description:  varchar('description', { length: 255 }).notNull(),
  amount:       integer('amount').notNull(),
  hasReceipt:   boolean('has_receipt').notNull().default(false),
  receiptFile:  varchar('receipt_file', { length: 500 }),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
});

export type TravelFund = typeof travelFunds.$inferSelect;
export type NewTravelFund = typeof travelFunds.$inferInsert;
export type TravelFundItem = typeof travelFundItems.$inferSelect;
export type NewTravelFundItem = typeof travelFundItems.$inferInsert;
