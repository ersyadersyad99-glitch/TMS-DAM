import { db } from '../db/index.js';
import { orders, invoices, travelFunds, travelFundItems } from '../db/schema/index.js';
import { eq, inArray, and, gte, lte, sum, count, sql } from 'drizzle-orm';

const ACTIVE_STATUSES = ['aktif', 'transit', 'menunggu_dp'] as const;

export const dashboardService = {
  /**
   * Returns the main KPI cards shown on the dashboard:
   * - activeOrders
   * - pendingReceivable (unpaid pelunasan invoices)
   * - unpaidDP (unpaid DP invoices)
   * - travelFundOut (cash disbursed and not yet finalized)
   * - margin (revenue − travel costs for completed orders)
   */
  async getStats() {
    const [
      activeOrdersResult,
      pendingReceivableResult,
      unpaidDPResult,
      travelFundOutResult,
      marginResult,
    ] = await Promise.all([
      // 1. Active order count
      db
        .select({ value: count() })
        .from(orders)
        .where(inArray(orders.status, [...ACTIVE_STATUSES])),

      // 2. Pending receivables: unpaid pelunasan invoices
      db
        .select({ value: sum(invoices.amount) })
        .from(invoices)
        .where(and(eq(invoices.type, 'pelunasan'), eq(invoices.status, 'unpaid'))),

      // 3. Unpaid DP invoice sum
      db
        .select({ value: sum(invoices.amount) })
        .from(invoices)
        .where(and(eq(invoices.type, 'dp'), eq(invoices.status, 'unpaid'))),

      // 4. Travel fund cash out (dicairkan / pengajuan)
      db
        .select({ value: sum(travelFunds.disbursedAmount) })
        .from(travelFunds)
        .where(inArray(travelFunds.status, ['dicairkan', 'pengajuan'])),

      // 5. Margin: revenue (selesai orders) − costs (finalized travel funds)
      db.execute<{ revenue: string; cost: string }>(sql`
        SELECT
          (SELECT COALESCE(SUM(total_value), 0) FROM orders WHERE status = 'selesai') AS revenue,
          (SELECT COALESCE(SUM(total_realized), 0) FROM travel_funds WHERE status = 'realisasi_selesai') AS cost
      `),
    ]);

    const revenue = Number(marginResult.rows[0]?.revenue ?? 0);
    const cost = Number(marginResult.rows[0]?.cost ?? 0);

    return {
      activeOrders:       Number(activeOrdersResult[0]?.value ?? 0),
      pendingReceivable:  Number(pendingReceivableResult[0]?.value ?? 0),
      unpaidDP:           Number(unpaidDPResult[0]?.value ?? 0),
      travelFundOut:      Number(travelFundOutResult[0]?.value ?? 0),
      margin:             revenue - cost,
    };
  },

  /**
   * P&L breakdown per completed trip.
   * Returns: { orderId, revenue, cost, margin }[]
   */
  async getPLPerTrip() {
    const rows = await db.execute<{
      order_id: string;
      total_value: number;
      total_realized: number | null;
    }>(sql`
      SELECT
        o.id AS order_id,
        o.total_value,
        tf.total_realized
      FROM orders o
      LEFT JOIN travel_funds tf ON tf.order_id = o.id AND tf.status = 'realisasi_selesai'
      WHERE o.status = 'selesai'
      ORDER BY o.date DESC
    `);

    return rows.rows.map((r) => ({
      orderId: r.order_id,
      revenue: Number(r.total_value),
      cost:    Number(r.total_realized ?? 0),
      margin:  Number(r.total_value) - Number(r.total_realized ?? 0),
    }));
  },

  /**
   * 7-day cashflow summary.
   * Calculates daily cash IN (invoices paid) and cash OUT (travel funds disbursed).
   */
  async getCashflow() {
    const rows = await db.execute<{
      day: string;
      cash_in: string;
      cash_out: string;
    }>(sql`
      SELECT
        day,
        COALESCE(MAX(cash_in), 0)  AS cash_in,
        COALESCE(MAX(cash_out), 0) AS cash_out
      FROM (
        SELECT DATE(paid_at) AS day, SUM(amount) AS cash_in, 0 AS cash_out
        FROM invoices
        WHERE paid_at >= NOW() - INTERVAL '7 days' AND status = 'paid'
        GROUP BY DATE(paid_at)

        UNION ALL

        SELECT DATE(disbursed_at) AS day, 0 AS cash_in, SUM(disbursed_amount) AS cash_out
        FROM travel_funds
        WHERE disbursed_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(disbursed_at)
      ) sub
      GROUP BY day
      ORDER BY day ASC
    `);

    return rows.rows.map((r) => ({
      date:   r.day,
      masuk:  Number(r.cash_in),
      keluar: Number(r.cash_out),
    }));
  },
};
