import { db } from '../db/index.js';
import { orders, drivers, fleet } from '../db/schema/index.js';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

export const assignSchema = z.object({
  orderId:     z.string().min(1),
  driverId:    z.string().uuid(),
  fleetId:     z.string().uuid(),
  serviceType: z.enum(['Consol', 'Charter', 'Full']).optional().default('Charter'),
});

export type AssignInput = z.infer<typeof assignSchema>;

export const assignmentsService = {
  /**
   * List orders that are ready for assignment:
   * - status: aktif or menunggu_dp
   * - paymentStatus: dp_lunas
   * - No driver assigned yet
   */
  async getAssignableOrders() {
    return db.query.orders.findMany({
      where: (o, { and, or, eq, isNull }) =>
        and(
          or(eq(o.status, 'aktif'), eq(o.status, 'menunggu_dp')),
          eq(o.paymentStatus, 'dp_lunas'),
          isNull(o.driverId),
        ),
      with: {
        client: true,
        drops:  { orderBy: (d, { asc }) => [asc(d.seq)] },
      },
    });
  },

  /**
   * Assign a driver + fleet to an order atomically:
   * 1. Validate driver is available
   * 2. Validate fleet is available
   * 3. Update order: set driverId, fleetId, status → transit
   * 4. Update driver status → on_trip
   * 5. Update fleet status  → on_trip
   */
  async assign(input: AssignInput) {
    const [driver] = await db
      .select()
      .from(drivers)
      .where(eq(drivers.id, input.driverId))
      .limit(1);

    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });
    if (driver.status !== 'available') {
      throw Object.assign(
        new Error(`Driver is not available (current status: ${driver.status})`),
        { status: 409 },
      );
    }

    const [fleetUnit] = await db
      .select()
      .from(fleet)
      .where(eq(fleet.id, input.fleetId))
      .limit(1);

    if (!fleetUnit) throw Object.assign(new Error('Fleet unit not found'), { status: 404 });
    if (fleetUnit.status !== 'available') {
      throw Object.assign(
        new Error(`Fleet unit is not available (current status: ${fleetUnit.status})`),
        { status: 409 },
      );
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1);

    if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
    if (order.driverId) {
      throw Object.assign(new Error('Order already has a driver assigned'), { status: 409 });
    }

    await db.transaction(async (tx) => {
      await tx.update(orders).set({
        driverId:  input.driverId,
        fleetId:   input.fleetId,
        status:    'transit',
        updatedAt: new Date(),
      }).where(eq(orders.id, input.orderId));

      await tx.update(drivers).set({
        status:    'on_trip',
        updatedAt: new Date(),
      }).where(eq(drivers.id, input.driverId));

      await tx.update(fleet).set({
        status:    'on_trip',
        updatedAt: new Date(),
      }).where(eq(fleet.id, input.fleetId));
    });

    return { success: true, orderId: input.orderId, driverId: input.driverId, fleetId: input.fleetId };
  },
};
