import { pgTable, varchar, integer, date, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { clients } from './clients.js';
import { drivers } from './drivers.js';
import { fleet } from './fleet.js';
import { users } from './auth.js';

export const orders = pgTable('orders', {
  id:            varchar('id', { length: 30 }).primaryKey(), // e.g. DO-2025-001

  clientId:      uuid('client_id')
    .references(() => clients.id)
    .notNull(),

  date:          date('date').notNull(),
  totalValue:    integer('total_value').notNull(),           // full order value in IDR
  dpAmount:      integer('dp_amount').notNull(),             // 70% of totalValue
  finalAmount:   integer('final_amount').notNull(),          // 30% of totalValue

  /**
   * Order status flow:
   *   menunggu_dp → aktif → transit → selesai
   *   (dapat dibatalkan = dibatalkan)
   */
  status:        varchar('status', { length: 30 }).notNull().default('menunggu_dp'),

  /**
   * Payment status:
   *   belum_dp → dp_lunas → lunas
   */
  paymentStatus: varchar('payment_status', { length: 30 }).notNull().default('belum_dp'),

  // Origin location
  originProvince: varchar('origin_province', { length: 100 }),
  originCity:     varchar('origin_city', { length: 100 }),
  originStore:    varchar('origin_store', { length: 200 }),

  // Assignment — nullable until a driver and fleet are assigned
  driverId: uuid('driver_id').references(() => drivers.id),
  fleetId:  uuid('fleet_id').references(() => fleet.id),

  // Service Type: Consol, Charter, Full
  serviceType: varchar('service_type', { length: 50 }).default('Charter'),

  notes:     text('notes'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
