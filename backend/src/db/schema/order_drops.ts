import { pgTable, uuid, varchar, integer, date, timestamp } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';

export const orderDrops = pgTable('order_drops', {
  id:      uuid('id').primaryKey().defaultRandom(),
  orderId: varchar('order_id', { length: 30 })
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),

  seq:      integer('seq').notNull(),          // drop sequence (1-based)
  province: varchar('province', { length: 100 }),
  city:     varchar('city', { length: 100 }),
  district: varchar('district', { length: 100 }),
  store:    varchar('store', { length: 200 }),
  pic:      varchar('pic', { length: 150 }),
  phone:    varchar('phone', { length: 50 }),

  /**
   * Drop status:
   *   pending → active → done
   */
  status:  varchar('status', { length: 20 }).notNull().default('pending'),

  // Proof of Delivery — stored filename/path after upload
  podFile: varchar('pod_file', { length: 500 }),

  // Tanggal POD Aktual per drop point (Actual Delivered Date per drop)
  podDate: date('pod_date'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type OrderDrop = typeof orderDrops.$inferSelect;
export type NewOrderDrop = typeof orderDrops.$inferInsert;
