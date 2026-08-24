import type { DB } from '../db/index.js';
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
   * - No driver assigned yet
   * - Not finished
   */
  async getAssignableOrders(db: DB) {
    const rows = await db
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
   */
  async assign(db: DB, input: AssignInput) {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1);

    if (!order) {
      throw Object.assign(new Error('Order not found'), { status: 404 });
    }

    await db.transaction(async (tx) => {
      // Check if driverId and fleetId exist in DB to avoid FK violations
      const validDriver = input.driverId
        ? await tx.select({ id: drivers.id }).from(drivers).where(eq(drivers.id, input.driverId)).limit(1).then((r: any[]) => r[0])
        : null;

      const validFleet = input.fleetId
        ? await tx.select({ id: fleet.id }).from(fleet).where(eq(fleet.id, input.fleetId)).limit(1).then((r: any[]) => r[0])
        : null;

      // 1. Update Order assignment details
      await tx
        .update(orders)
        .set({
          driverId: validDriver ? input.driverId : undefined,
          fleetId: validFleet ? input.fleetId : undefined,
          driverName: input.driverName || undefined,
          fleetPlate: input.fleetPlate || undefined,
          vendorName: input.vendorName || undefined,
          serviceType: input.serviceType || 'FTL',
          status: 'picked_up',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.orderId));

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
      orderId: input.orderId,
      driverId: input.driverId,
      fleetId: input.fleetId,
      serviceType: input.serviceType,
    };
  },
};
