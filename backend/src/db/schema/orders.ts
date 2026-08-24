import { pgTable, varchar, integer, date, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { clients } from './clients.js';
import { drivers } from './drivers.js';
import { fleet } from './fleet.js';
import { users } from './auth.js';

export const orders = pgTable('orders', {
  id:            varchar('id', { length: 30 }).primaryKey(), // e.g. DO-2025-001
  soNumber:      varchar('so_number', { length: 50 }),
  clientName:    varchar('client_name', { length: 255 }),

  clientId:      varchar('client_id', { length: 50 })
    .references(() => clients.id),

  date:          date('date').notNull(),
  pickupDate:    date('pickup_date'),
  etdDate:       date('etd_date'),
  etaDate:       date('eta_date'),
  podDate:       date('pod_date'),  // Actual delivery date (Tanggal POD)

  totalValue:    integer('total_value').notNull(),           // full order value in IDR
  dpAmount:      integer('dp_amount').notNull().default(0),  // 70% of totalValue
  finalAmount:   integer('final_amount').notNull().default(0), // 30% of totalValue
  buyingPrice:   integer('buying_price').default(0),

  status:        varchar('status', { length: 30 }).notNull().default('menunggu_dp'),
  paymentStatus: varchar('payment_status', { length: 30 }).notNull().default('belum_dp'),
  paymentType:   varchar('payment_type', { length: 50 }).default('70:30'),
  invoicePending: boolean('invoice_pending').default(false),
  topDays:       integer('top_days'),

  // Unit & Spec
  serviceType:   varchar('service_type', { length: 50 }).default('FTL'),
  unitType:      varchar('unit_type', { length: 50 }),
  kubikasi:      varchar('kubikasi', { length: 50 }),
  tonase:        varchar('tonase', { length: 50 }),
  weight:        varchar('weight', { length: 50 }),

  // Origin location
  originProvince: varchar('origin_province', { length: 100 }),
  originCity:     varchar('origin_city', { length: 100 }),
  originDistrict: varchar('origin_district', { length: 100 }),
  originStore:    varchar('origin_store', { length: 200 }),

  // Assignment
  driverId:   varchar('driver_id', { length: 50 }).references(() => drivers.id),
  driverName: varchar('driver_name', { length: 150 }),
  fleetId:    varchar('fleet_id', { length: 50 }).references(() => fleet.id),
  fleetPlate: varchar('fleet_plate', { length: 50 }),
  vendorName: varchar('vendor_name', { length: 150 }),

  // Vendor payment tracking
  vendorPaymentStatus: varchar('vendor_payment_status', { length: 30 }).default('unpaid'),
  vendorPaymentDate:   date('vendor_payment_date'),
  vendorPaymentDetails: text('vendor_payment_details'),

  costBreakdown: text('cost_breakdown'),
  notes:     text('notes'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
