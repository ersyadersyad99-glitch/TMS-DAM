import { db as globalDb, type DB } from '../db/index.js';
import { orders, drivers, fleet } from '../db/schema/index.js';
import { eq, and, ne, isNull } from 'drizzle-orm';
import { z } from 'zod';

export const assignSchema = z.object({
  orderId: z.string().min(1),
  driverId: z.string().optional(),
  fleetId: z.string().optional(),
  driverName: z.string().optional(),
  fleetPlate: z.string().optional(),
  vendorName: z.string().optional(),
  serviceType: z.string().optional().default('FTL'),
});

export type AssignInput = z.infer<typeof assignSchema>;

export const assignmentsService = {
  /**
   * List orders that are ready for assignment:
   * Supports optional db argument for multi-tenant or single-argument invocation.
   */
  async getAssignableOrders(db?: DB) {
    const targetDb = db || globalDb;
    const rows = await targetDb
      .select()
      .from(orders)
      .where(and(
        ne(orders.status, 'selesai'),
        ne(orders.status, 'delivered'),
        isNull(orders.driverId)
      ));
    return rows;
  },

  /**
   * Assign a driver + fleet to an order atomically without FK violations
   * Supports 1-argument (input) or 2-argument (db, input) invocation signature.
   */
  async assign(db: DB | AssignInput, input?: AssignInput) {
    let targetDb: DB;
    let payload: AssignInput;

    if (db && 'orderId' in db) {
      payload = db as AssignInput;
      targetDb = globalDb;
    } else {
      targetDb = (db as DB) || globalDb;
      payload = input as AssignInput;
    }

    if (!targetDb) {
      targetDb = globalDb;
    }

    const [order] = await targetDb
      .select()
      .from(orders)
      .where(eq(orders.id, payload.orderId))
      .limit(1);

    if (!order) {
      throw Object.assign(new Error('Order not found'), { status: 404 });
    }

    const isValidUuid = (val: any): val is string => typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

    await targetDb.transaction(async (tx) => {
      // Check if driverId and fleetId exist in DB to avoid FK violations
      const validDriver = isValidUuid(payload.driverId)
        ? await tx.select({ id: drivers.id }).from(drivers).where(eq(drivers.id, payload.driverId)).limit(1).then((r: any[]) => r[0])
        : null;

      const validFleet = isValidUuid(payload.fleetId)
        ? await tx.select({ id: fleet.id }).from(fleet).where(eq(fleet.id, payload.fleetId)).limit(1).then((r: any[]) => r[0])
        : null;

      // 1. Update Order assignment details
      const updatePayload: Record<string, any> = {
        status: 'picked_up',
        serviceType: payload.serviceType || 'FTL',
        updatedAt: new Date(),
      };
      if (validDriver && payload.driverId) updatePayload.driverId = payload.driverId;
      if (validFleet && payload.fleetId) updatePayload.fleetId = payload.fleetId;
      if (payload.driverName) updatePayload.driverName = payload.driverName;
      if (payload.fleetPlate) updatePayload.fleetPlate = payload.fleetPlate;
      if (payload.vendorName) updatePayload.vendorName = payload.vendorName;

      await tx
        .update(orders)
        .set(updatePayload)
        .where(eq(orders.id, payload.orderId));

      // 2. Safely update driver status if driver exists
      if (validDriver) {
        await tx
          .update(drivers)
          .set({ status: 'on_trip', updatedAt: new Date() })
          .where(eq(drivers.id, validDriver.id));
      }

      // 3. Safely update fleet status if fleet exists
      if (validFleet) {
        await tx
          .update(fleet)
          .set({ status: 'on_trip', updatedAt: new Date() })
          .where(eq(fleet.id, validFleet.id));
      }
    });

    return {
      success: true,
      orderId: payload.orderId,
      driverId: payload.driverId,
      fleetId: payload.fleetId,
      serviceType: payload.serviceType,
    };
  },
};
