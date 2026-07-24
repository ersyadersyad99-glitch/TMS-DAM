import { db } from '../db/index.js';
import {
  orders,
  orderDrops,
  invoices,
  clients,
  drivers,
  fleet,
} from '../db/schema/index.js';
import { eq, and, inArray, ilike, or, desc, asc, sql } from 'drizzle-orm';
import { z } from 'zod';

// ─── Validation schemas ────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  clientId:       z.string().uuid(),
  date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalValue:     z.number().int().positive(),
  originProvince: z.string().min(1),
  originCity:     z.string().min(1),
  originStore:    z.string().optional(),
  notes:          z.string().optional(),
  drops: z.array(z.object({
    province: z.string().min(1),
    city:     z.string().min(1),
    store:    z.string().optional(),
  })).min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ─── Helper: generate DO id ────────────────────────────────────────────────

async function generateOrderId(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db.execute<{ cnt: string }>(
    sql`SELECT COUNT(*) AS cnt FROM orders WHERE id LIKE ${`DO-${year}-%`}`
  );
  const seq = Number(result.rows[0]?.cnt ?? 0) + 1;
  return `DO-${year}-${String(seq).padStart(3, '0')}`;
}

// ─── Service ───────────────────────────────────────────────────────────────

export const ordersService = {
  /**
   * List orders with optional filters:
   * - status: order status
   * - clientId: UUID
   * - search: searches DO id or client name
   */
  async list(filters: {
    status?: string;
    clientId?: string;
    search?: string;
  }) {
    const rows = await db
      .select({
        order:  orders,
        client: clients,
        driver: drivers,
        fleet:  fleet,
      })
      .from(orders)
      .leftJoin(clients, eq(orders.clientId, clients.id))
      .leftJoin(drivers, eq(orders.driverId, drivers.id))
      .leftJoin(fleet,   eq(orders.fleetId,  fleet.id))
      .where(and(
        filters.status   ? eq(orders.status, filters.status)     : undefined,
        filters.clientId ? eq(orders.clientId, filters.clientId) : undefined,
        filters.search
          ? or(
              ilike(orders.id, `%${filters.search}%`),
              ilike(clients.name, `%${filters.search}%`),
            )
          : undefined,
      ))
      .orderBy(desc(orders.createdAt));

    // Attach drop progress to each order
    const orderIds = rows.map((r) => r.order.id);
    const dropsMap: Record<string, typeof orderDrops.$inferSelect[]> = {};
    if (orderIds.length > 0) {
      const allDrops = await db
        .select()
        .from(orderDrops)
        .where(inArray(orderDrops.orderId, orderIds))
        .orderBy(asc(orderDrops.seq));
      for (const drop of allDrops) {
        if (!dropsMap[drop.orderId]) dropsMap[drop.orderId] = [];
        dropsMap[drop.orderId].push(drop);
      }
    }

    return rows.map((r) => ({
      ...r.order,
      client: r.client,
      driver: r.driver,
      fleet:  r.fleet,
      drops:  dropsMap[r.order.id] ?? [],
    }));
  },

  /** Get a single order with full detail (drops, invoices) */
  async getById(id: string) {
    const [row] = await db
      .select({
        order:  orders,
        client: clients,
        driver: drivers,
        fleet:  fleet,
      })
      .from(orders)
      .leftJoin(clients, eq(orders.clientId, clients.id))
      .leftJoin(drivers, eq(orders.driverId, drivers.id))
      .leftJoin(fleet,   eq(orders.fleetId,  fleet.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (!row) return null;

    const [drops, orderInvoices] = await Promise.all([
      db.select().from(orderDrops).where(eq(orderDrops.orderId, id)).orderBy(asc(orderDrops.seq)),
      db.select().from(invoices).where(eq(invoices.orderId, id)),
    ]);

    return {
      ...row.order,
      client:   row.client,
      driver:   row.driver,
      fleet:    row.fleet,
      drops,
      invoices: orderInvoices,
    };
  },

  /** Create a new order + auto-generate DP invoice */
  async create(input: CreateOrderInput, createdBy: string) {
    const id       = await generateOrderId();
    const dp       = Math.round(input.totalValue * 0.7);
    const final    = input.totalValue - dp;
    const dueDate  = new Date(input.date);
    dueDate.setDate(dueDate.getDate() + 2);

    await db.transaction(async (tx) => {
      // 1. Create order
      await tx.insert(orders).values({
        id,
        clientId:       input.clientId,
        date:           input.date,
        totalValue:     input.totalValue,
        dpAmount:       dp,
        finalAmount:    final,
        status:         'menunggu_dp',
        paymentStatus:  'belum_dp',
        originProvince: input.originProvince,
        originCity:     input.originCity,
        originStore:    input.originStore,
        notes:          input.notes,
        createdBy,
      });

      // 2. Insert drop points
      await tx.insert(orderDrops).values(
        input.drops.map((d, i) => ({
          orderId:  id,
          seq:      i + 1,
          province: d.province,
          city:     d.city,
          store:    d.store,
          status:   'pending' as const,
        })),
      );

      // 3. Auto-generate DP invoice
      const [client] = await tx.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);
      await tx.insert(invoices).values({
        id:        `INV-DP-${id}`,
        orderId:   id,
        clientId:  input.clientId,
        type:      'dp',
        amount:    dp,
        issueDate: input.date,
        dueDate:   dueDate.toISOString().split('T')[0],
        status:    'unpaid',
      });
    });

    return this.getById(id);
  },

  /** Update order status */
  async updateStatus(id: string, status: string) {
    await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id));
    return this.getById(id);
  },

  /**
   * Mark DP as paid:
   * - Sets paymentStatus = dp_lunas
   * - If status = menunggu_dp → aktif
   */
  async markDPPaid(id: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });

    await db.update(orders).set({
      paymentStatus: 'dp_lunas',
      status: order.status === 'menunggu_dp' ? 'aktif' : order.status,
      updatedAt: new Date(),
    }).where(eq(orders.id, id));
  },

  /**
   * Close order:
   * - Sets status = selesai, paymentStatus = dp_lunas
   * - Auto-generates pelunasan invoice due +3 days
   */
  async closeOrder(id: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const today = new Date().toISOString().split('T')[0];

    await db.transaction(async (tx) => {
      await tx.update(orders).set({
        status:        'selesai',
        paymentStatus: 'dp_lunas',
        updatedAt:     new Date(),
      }).where(eq(orders.id, id));

      // Create pelunasan invoice
      await tx.insert(invoices).values({
        id:        `INV-LNS-${id}`,
        orderId:   id,
        clientId:  order.clientId,
        type:      'pelunasan',
        amount:    order.finalAmount,
        issueDate: today,
        dueDate:   dueDate.toISOString().split('T')[0],
        status:    'unpaid',
      });
    });

    return this.getById(id);
  },

  /** Upload POD file for a specific drop point */
  async uploadPOD(orderId: string, dropId: string, filename: string) {
    await db
      .update(orderDrops)
      .set({ podFile: filename, status: 'done', updatedAt: new Date() })
      .where(and(eq(orderDrops.id, dropId), eq(orderDrops.orderId, orderId)));
  },
};
