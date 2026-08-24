import { pgTable, varchar, integer, date, timestamp, uuid } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { clients } from './clients.js';

export const invoices = pgTable('invoices', {
  id:       varchar('id', { length: 50 }).primaryKey(), // e.g. INV-DP-001

  orderId:  varchar('order_id', { length: 30 })
    .references(() => orders.id)
    .notNull(),

  clientId: varchar('client_id', { length: 50 })
    .references(() => clients.id),

  clientName:  varchar('client_name', { length: 255 }),
  paymentType: varchar('payment_type', { length: 50 }),
  topDays:     integer('top_days'),

  type:      varchar('type', { length: 20 }).notNull(),
  amount:    integer('amount').notNull(),     // in IDR
  issueDate: date('issue_date').notNull(),
  dueDate:   date('due_date').notNull(),
  status:    varchar('status', { length: 20 }).notNull().default('unpaid'),
  paidAt:    timestamp('paid_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
