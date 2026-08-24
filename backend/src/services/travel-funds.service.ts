import type { DB } from '../db/index.js';
import { travelFunds, travelFundItems, drivers, orders } from '../db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

export const createTravelFundSchema = z.object({
  orderId:       z.string().min(1),
  driverId:      z.string().uuid().optional(),
  requestAmount: z.number().int().positive(),
  requestDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const addItemSchema = z.object({
  category:    z.string().optional().default('Uang Jalan Driver'),
  description: z.string().min(1),
  amount:      z.number().int().positive(),
  hasReceipt:  z.boolean().optional().default(false),
  receiptFile: z.string().optional(),
});

export type CreateTravelFundInput = z.infer<typeof createTravelFundSchema>;
export type AddItemInput          = z.infer<typeof addItemSchema>;

async function generateTravelFundId(db: DB): Promise<string> {
  const result = await db.$count(travelFunds);
  const seq = result + 1;
  return `UJ-${String(seq).padStart(3, '0')}`;
}

export const travelFundsService = {
  /** List all travel funds with optional status filter */
  async list(db: DB, filters: { status?: string; orderId?: string }) {
    const rows = await db
      .select({
        fund:   travelFunds,
        driver: drivers,
        order:  orders,
      })
      .from(travelFunds)
      .leftJoin(drivers, eq(travelFunds.driverId, drivers.id))
      .leftJoin(orders,  eq(travelFunds.orderId,  orders.id))
      .where(and(
        filters.status  ? eq(travelFunds.status,  filters.status)  : undefined,
        filters.orderId ? eq(travelFunds.orderId, filters.orderId) : undefined,
      ))
      .orderBy(desc(travelFunds.createdAt));

    const allItems = await db.select().from(travelFundItems);

    return rows.map((r) => {
      const fundItems = allItems.filter(item => item.travelFundId === r.fund.id);
      return {
        ...r.fund,
        driverName: (r.fund as any).driverName || r.order?.driverName || r.driver?.name || null,
        fleetPlate: r.order?.fleetPlate || null,
        date: r.fund.requestDate || (r.fund.createdAt ? r.fund.createdAt.toISOString().split('T')[0] : null),
        disbursedDate: r.fund.disbursedAt ? r.fund.disbursedAt.toISOString().split('T')[0] : null,
        items: fundItems,
        realizations: fundItems,
        driver: r.driver,
        order: r.order,
      };
    });
  },

  /** Get travel fund detail with all realization items */
  async getById(db: DB, id: string) {
    const [row] = await db
      .select({ fund: travelFunds, driver: drivers, order: orders })
      .from(travelFunds)
      .leftJoin(drivers, eq(travelFunds.driverId, drivers.id))
      .leftJoin(orders,  eq(travelFunds.orderId,  orders.id))
      .where(eq(travelFunds.id, id))
      .limit(1);

    if (!row) return null;

    const items = await db
      .select()
      .from(travelFundItems)
      .where(eq(travelFundItems.travelFundId, id));

    return { ...row.fund, driver: row.driver, order: row.order, items, realizations: items };
  },

  /** Create or sync a travel fund request */
  async create(db: DB, input: any) {
    const id = input.id || await generateTravelFundId(db);
    const today = new Date().toISOString().split('T')[0];
    await db.insert(travelFunds).values({
      id,
      orderId: input.orderId,
      driverId: input.driverId,
      requestAmount: input.requestAmount || 0,
      disbursedAmount: input.disbursedAmount || 0,
      totalRealized: input.totalRealized || 0,
      balance: input.balance || 0,
      requestDate: input.requestDate || today,
      status: input.status || 'pengajuan',
    }).onConflictDoUpdate({
      target: travelFunds.id,
      set: {
        status: input.status,
        disbursedAmount: input.disbursedAmount,
        totalRealized: input.totalRealized,
        balance: input.balance,
        updatedAt: new Date(),
      }
    });

    const itemsList = input.items || input.realizations;
    if (itemsList && Array.isArray(itemsList)) {
      await db.delete(travelFundItems).where(eq(travelFundItems.travelFundId, id));
      if (itemsList.length > 0) {
        await db.insert(travelFundItems).values(
          itemsList.map((item: any) => ({
            travelFundId: id,
            category: item.category || 'Uang Jalan Driver',
            description: item.desc || item.description || '',
            amount: item.amount || 0,
            hasReceipt: item.hasReceipt || Boolean(item.receipt || item.receiptFile),
            receiptFile: item.receiptFile || (typeof item.receipt === 'string' ? item.receipt : null),
          }))
        );
      }
    }

    return this.getById(db, id);
  },

  /**
   * Disburse the travel fund:
   * - Sets disbursedAmount = requestAmount
   * - Sets status = dicairkan
   * - Records disbursedAt timestamp
   */
  async disburse(db: DB, id: string) {
    const [fund] = await db.select().from(travelFunds).where(eq(travelFunds.id, id)).limit(1);
    if (!fund) throw Object.assign(new Error('Travel fund not found'), { status: 404 });
    if (fund.status !== 'pengajuan') {
      throw Object.assign(new Error(`Cannot disburse — current status: ${fund.status}`), { status: 409 });
    }

    await db.update(travelFunds).set({
      status:          'dicairkan',
      disbursedAmount: fund.requestAmount,
      balance:         fund.requestAmount,
      disbursedAt:     new Date(),
      updatedAt:       new Date(),
    }).where(eq(travelFunds.id, id));

    return this.getById(db, id);
  },

  /**
   * Add a realization expense item.
   * Recalculates totalRealized and balance after insertion.
   */
  async addItem(db: DB, fundId: string, input: AddItemInput) {
    const [fund] = await db.select().from(travelFunds).where(eq(travelFunds.id, fundId)).limit(1);
    if (!fund) throw Object.assign(new Error('Travel fund not found'), { status: 404 });
    if (fund.status !== 'dicairkan') {
      throw Object.assign(new Error('Can only add items when status is dicairkan'), { status: 409 });
    }

    await db.transaction(async (tx) => {
      await tx.insert(travelFundItems).values({
        travelFundId: fundId,
        category:     input.category ?? 'Uang Jalan Driver',
        description:  input.description,
        amount:       input.amount,
        hasReceipt:   input.hasReceipt,
        receiptFile:  input.receiptFile,
      });

      const newTotal = fund.totalRealized + input.amount;
      const newBalance = fund.disbursedAmount - newTotal;

      await tx.update(travelFunds).set({
        totalRealized: newTotal,
        balance:       newBalance,
        updatedAt:     new Date(),
      }).where(eq(travelFunds.id, fundId));
    });

    return this.getById(db, fundId);
  },

  /**
   * Finalize realization:
   * - Sets status = realisasi_selesai
   * - Records finalizedAt
   */
  async finalize(db: DB, id: string) {
    const [fund] = await db.select().from(travelFunds).where(eq(travelFunds.id, id)).limit(1);
    if (!fund) throw Object.assign(new Error('Travel fund not found'), { status: 404 });
    if (fund.status !== 'dicairkan') {
      throw Object.assign(new Error('Can only finalize when status is dicairkan'), { status: 409 });
    }

    await db.update(travelFunds).set({
      status:      'realisasi_selesai',
      finalizedAt: new Date(),
      updatedAt:   new Date(),
    }).where(eq(travelFunds.id, id));

    return this.getById(db, id);
  },
};
