import type { DB } from '../db/index.js';
import { invoices, orders, orderDrops, clients } from '../db/schema/index.js';
import { eq, and, ilike, or, desc, asc } from 'drizzle-orm';

export const invoicesService = {
  /**
   * List invoices with optional filters.
   * Flattens output so frontend receives clean flat invoice objects with `date` & `clientName`.
   */
  async list(db: DB, filters: {
    status?: string;
    type?: string;
    clientId?: string;
    search?: string;
  }) {
    const rows = await db
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
              ilike(invoices.clientName, `%${filters.search}%`),
              ilike(clients.name,     `%${filters.search}%`),
            )
          : undefined,
      ))
      .orderBy(desc(invoices.createdAt));

    return rows.map((r) => ({
      ...r.invoice,
      date: r.invoice.issueDate || (r.invoice.createdAt ? r.invoice.createdAt.toISOString().split('T')[0] : null),
      clientName: r.invoice.clientName || r.client?.name || '—',
    }));
  },

  /** Get invoice detail with linked order and POD file list */
  async getById(db: DB, id: string) {
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
      date: row.invoice.issueDate || (row.invoice.createdAt ? row.invoice.createdAt.toISOString().split('T')[0] : null),
      clientName: row.invoice.clientName || row.client?.name || '—',
      client: row.client,
      order,
      podFiles: podFiles.map((p) => p.podFile).filter(Boolean),
    };
  },

  /**
   * Mark invoice as paid.
   * Sets status = 'paid' and records paidAt timestamp.
   */
  async markPaid(db: DB, id: string) {
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
    if (inv.type === 'pelunasan' || inv.type === 'top_full') {
      await db.update(orders).set({
        paymentStatus: 'lunas',
        updatedAt:     new Date(),
      }).where(eq(orders.id, inv.orderId));
    }

    return this.getById(db, id);
  },

  /** Create new invoice */
  async create(db: DB, input: any) {
    const today = new Date().toISOString().split('T')[0];
    const validClient = input.clientId
      ? await db.select({ id: clients.id }).from(clients).where(eq(clients.id, input.clientId)).limit(1).then(r => r[0])
      : null;
    const validOrder = input.orderId
      ? await db.select({ id: orders.id }).from(orders).where(eq(orders.id, input.orderId)).limit(1).then(r => r[0])
      : null;

    if (!validOrder) {
      console.warn(`Cannot insert invoice ${input.id}: orderId ${input.orderId} does not exist in orders table.`);
      return null;
    }

    await db.insert(invoices).values({
      id: input.id,
      orderId: validOrder.id,
      clientId: validClient ? validClient.id : undefined,
      clientName: input.clientName,
      paymentType: input.paymentType,
      topDays: input.topDays,
      type: input.type || 'dp',
      amount: input.amount || 0,
      issueDate: input.date || input.issueDate || today,
      dueDate: input.dueDate || today,
      status: input.status || 'unpaid',
    }).onConflictDoUpdate({
      target: invoices.id,
      set: {
        clientName: input.clientName,
        amount: input.amount || 0,
        status: input.status || 'unpaid',
        updatedAt: new Date(),
      }
    });
    return this.getById(db, input.id);
  },
};
