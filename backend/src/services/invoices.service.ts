import { db } from '../db/index.js';
import { invoices, orders, orderDrops, clients } from '../db/schema/index.js';
import { eq, and, ilike, or, desc, asc } from 'drizzle-orm';

export const invoicesService = {
  /**
   * List invoices with optional filters.
   */
  async list(filters: {
    status?: string;
    type?: string;
    clientId?: string;
    search?: string;
  }) {
    return db
      .select({
        invoice: invoices,
        client:  clients,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(
        filters.status   ? eq(invoices.status,   filters.status)   : undefined,
        filters.type     ? eq(invoices.type,      filters.type)     : undefined,
        filters.clientId ? eq(invoices.clientId,  filters.clientId) : undefined,
        filters.search
          ? or(
              ilike(invoices.id,      `%${filters.search}%`),
              ilike(invoices.orderId, `%${filters.search}%`),
              ilike(clients.name,     `%${filters.search}%`),
            )
          : undefined,
      ))
      .orderBy(desc(invoices.createdAt));
  },

  /** Get invoice detail with linked order and POD file list */
  async getById(id: string) {
    const [row] = await db
      .select({ invoice: invoices, client: clients })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.id, id))
      .limit(1);

    if (!row) return null;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, row.invoice.orderId))
      .limit(1);

    const podFiles = order
      ? await db
          .select({ podFile: orderDrops.podFile, seq: orderDrops.seq })
          .from(orderDrops)
          .where(and(eq(orderDrops.orderId, order.id), eq(orderDrops.status, 'done')))
          .orderBy(asc(orderDrops.seq))
      : [];

    return {
      ...row.invoice,
      client: row.client,
      order,
      podFiles: podFiles.map((p) => p.podFile).filter(Boolean),
    };
  },

  /**
   * Mark invoice as paid.
   * Sets status = 'paid' and records paidAt timestamp.
   */
  async markPaid(id: string) {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!inv) throw Object.assign(new Error('Invoice not found'), { status: 404 });
    if (inv.status === 'paid') {
      throw Object.assign(new Error('Invoice is already marked as paid'), { status: 409 });
    }

    await db.update(invoices).set({
      status:    'paid',
      paidAt:    new Date(),
      updatedAt: new Date(),
    }).where(eq(invoices.id, id));

    // If this is a pelunasan invoice, check if the order is now fully paid
    if (inv.type === 'pelunasan') {
      await db.update(orders).set({
        paymentStatus: 'lunas',
        updatedAt:     new Date(),
      }).where(eq(orders.id, inv.orderId));
    }

    return this.getById(id);
  },
};
