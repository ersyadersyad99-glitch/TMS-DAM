import type { DB } from '../db/index.js';
import { getGlobalDb } from '../db/index.js';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import {
  orders,
  orderDrops,
  invoices,
  clients,
  drivers,
  fleet,
  vendors,
  uploadedFiles,
} from '../db/schema/index.js';
import { eq, and, inArray, ilike, or, desc, asc, sql } from 'drizzle-orm';
import { z } from 'zod';

// ─── Bulk import types ─────────────────────────────────────────────────────

export interface BulkOrderRow {
  rowNum: number;
  doNumber?: string;
  soNumber?: string;
  clientName: string;
  vendor?: string;
  driver?: string;
  nopol?: string;

  tanggalPickup: string;
  tipeLayanan: string;
  jenisArmada?: string;
  kubikasi?: string;
  tonase?: string;
  tipePembayaran: string;
  tarifSelling: number;
  tarifBuying?: number;
  ppn?: boolean;
  biayaTKBM?: number;
  biayaKrani?: number;
  biayaLain?: number;
  provinsiAsal: string;
  kotaAsal: string;
  kecamatanAsal?: string;
  gudangAsal?: string;
  tanggalETD?: string;
  tanggalETA?: string;
  provinsiTujuan: string;
  kotaTujuan: string;
  kecamatanTujuan?: string;
  tokoTujuan?: string;
  picPenerima?: string;
  noTelpPIC?: string;
  catatan?: string;
}

export interface BulkValidationResult {
  rowNum: number;
  errors: string[];
  soNumber?: string;
  // resolved
  clientId?: string;
  clientNameResolved?: string;
  vendorId?: string;
  vendorNameResolved?: string;
  driverId?: string;
  driverNameResolved?: string;
  fleetId?: string;
  fleetPlateResolved?: string;
}

export interface BulkImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  success: Array<{
    doId: string;
    soNumber?: string;
    clientName: string;
    vendorName?: string;
    driverName?: string;
    fleetPlate?: string;
    kotaTujuan: string;
  }>;
  failed: Array<{ rowNum: number; soNumber?: string; clientName: string; errors: string[] }>;
}



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

export const toStr = (val: any): string => (val != null && val !== undefined ? String(val).trim() : '');

// ─── Helper: generate DO id ────────────────────────────────────────────────

async function generateOrderId(db: DB): Promise<string> {
  const year = new Date().getFullYear();
  try {
    const maxResult = await db.execute<{ max_seq: string }>(
      sql`SELECT MAX(CAST(SUBSTRING(id FROM 'DO-[0-9]+-([0-9]+)') AS INTEGER)) AS max_seq FROM orders WHERE id LIKE ${`DO-${year}-%`}`
    );
    const rawMax = maxResult.rows[0]?.max_seq;
    const maxSeq = rawMax ? Number(rawMax) : 0;
    return `DO-${year}-${String(maxSeq + 1).padStart(3, '0')}`;
  } catch (e) {
    const result = await db.execute<{ cnt: string }>(
      sql`SELECT COUNT(*) AS cnt FROM orders WHERE id LIKE ${`DO-${year}-%`}`
    );
    const count = Number(result.rows[0]?.cnt ?? 0) + 1;
    return `DO-${year}-${String(count).padStart(3, '0')}`;
  }
}

// ─── Service ───────────────────────────────────────────────────────────────

export const ordersService = {
  /**
   * List orders with optional filters:
   * - status: order status
   * - clientId: UUID
   * - search: searches DO id or client name
   */
  async list(db: DB, filters: {
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
      origin: {
        province: r.order.originProvince,
        city: r.order.originCity,
        district: r.order.originDistrict,
        store: r.order.originStore,
      },
      client: r.client,
      driver: r.driver,
      fleet:  r.fleet,
      drops:  (dropsMap[r.order.id] ?? []).map(d => ({
        ...d,
        pod: d.podFile || (d as any).pod || null,
      })),
    }));
  },

  /** Get a single order with full detail (drops, invoices) */
  async getById(db: DB, id: string) {
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

    const drops = await db
      .select()
      .from(orderDrops)
      .where(eq(orderDrops.orderId, id))
      .orderBy(asc(orderDrops.seq));

    const invoiceList = await db
      .select()
      .from(invoices)
      .where(eq(invoices.orderId, id));

    return {
      ...row.order,
      origin: {
        province: row.order.originProvince,
        city: row.order.originCity,
        district: row.order.originDistrict,
        store: row.order.originStore,
      },
      client:   row.client,
      driver:   row.driver,
      fleet:    row.fleet,
      drops:    drops.map(d => ({
        ...d,
        pod: d.podFile || (d as any).pod || null,
      })),
      invoices: invoiceList,
    };
  },

  /** Create a new order */
  async create(db: DB, input: any, createdBy?: string) {
    const id = input.id || await generateOrderId(db);
    const costBreakdownStr = input.costBreakdown ? JSON.stringify(input.costBreakdown) : undefined;
    const vendorPayDetailsStr = input.vendorPaymentDetails ? JSON.stringify(input.vendorPaymentDetails) : undefined;
    const isValidUuid = (val: any): val is string => typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

    await db.transaction(async (tx) => {
      // Validate Foreign Keys safely to avoid PostgreSQL code 22P02 / 23503 errors
      let validClient = isValidUuid(input.clientId)
        ? await tx.select({ id: clients.id }).from(clients).where(eq(clients.id, input.clientId)).limit(1).then(r => r[0])
        : null;

      if (!validClient && input.clientName) {
        validClient = await tx.select({ id: clients.id }).from(clients).where(eq(clients.name, input.clientName)).limit(1).then(r => r[0]);
      }

      const validDriver = input.driverId
        ? await tx.select({ id: drivers.id }).from(drivers).where(eq(drivers.id, input.driverId)).limit(1).then(r => r[0])
        : (input.driverName ? await tx.select({ id: drivers.id }).from(drivers).where(eq(drivers.name, input.driverName)).limit(1).then(r => r[0]) : null);

      const validFleet = input.fleetId
        ? await tx.select({ id: fleet.id }).from(fleet).where(eq(fleet.id, input.fleetId)).limit(1).then(r => r[0])
        : (input.fleetPlate ? await tx.select({ id: fleet.id }).from(fleet).where(eq(fleet.plate, input.fleetPlate)).limit(1).then(r => r[0]) : null);

      // 1. Insert order header
      await tx.insert(orders).values({
        id,
        soNumber: input.soNumber,
        clientName: input.clientName,
        clientId: validClient ? validClient.id : undefined,
        date: input.date,
        pickupDate: input.pickupDate,
        etdDate: input.etdDate,
        etaDate: input.etaDate,

        totalValue: input.totalValue,
        dpAmount: input.dpAmount,
        finalAmount: input.finalAmount,
        buyingPrice: input.buyingPrice || (input.costBreakdown ? (input.costBreakdown as any).buyingPrice : undefined),

        status: input.status || 'menunggu_dp',
        paymentStatus: input.paymentStatus || 'belum_dp',
        paymentType: input.paymentType || '70:30',
        invoicePending: input.invoicePending ?? false,
        topDays: input.topDays,

        serviceType: input.serviceType || 'FTL',
        unitType: input.unitType,
        kubikasi: input.kubikasi,
        tonase: input.tonase,
        weight: input.weight,

        originProvince: input.origin?.province || input.originProvince,
        originCity: input.origin?.city || input.originCity,
        originDistrict: input.origin?.district || input.originDistrict,
        originStore: input.origin?.store || input.originStore,

        driverId: validDriver ? validDriver.id : (input.driverId || undefined),
        driverName: input.driverName,
        fleetId: validFleet ? validFleet.id : (input.fleetId || undefined),
        fleetPlate: input.fleetPlate,
        vendorName: input.vendorName,

        vendorPaymentStatus: input.vendorPaymentStatus || 'unpaid',
        vendorPaymentDate: input.vendorPaymentDate,
        vendorPaymentDetails: vendorPayDetailsStr,
        costBreakdown: costBreakdownStr,

        notes: input.notes,
        createdBy: undefined,
      }).onConflictDoUpdate({
        target: orders.id,
        set: {
          status: input.status,
          paymentStatus: input.paymentStatus,
          originProvince: input.origin?.province || input.originProvince,
          originCity: input.origin?.city || input.originCity,
          originDistrict: input.origin?.district || input.originDistrict,
          originStore: input.origin?.store || input.originStore,
          driverName: input.driverName,
          fleetPlate: input.fleetPlate,
          vendorName: input.vendorName,
          buyingPrice: input.buyingPrice,
          vendorPaymentStatus: input.vendorPaymentStatus,
          vendorPaymentDate: input.vendorPaymentDate,
          vendorPaymentDetails: vendorPayDetailsStr,
          costBreakdown: costBreakdownStr,
          updatedAt: new Date(),
        }
      });

      // 2. Insert drop points
      if (input.drops && Array.isArray(input.drops)) {
        await tx.delete(orderDrops).where(eq(orderDrops.orderId, id));
        await tx.insert(orderDrops).values(
          input.drops.map((d: any, i: number) => ({
            orderId: id,
            seq: d.seq || (i + 1),
            province: d.province,
            city: d.city,
            district: d.district,
            store: d.store,
            pic: d.pic,
            phone: d.phone,
            status: d.pod || d.podFile ? 'done' : 'pending',
            podFile: d.pod || d.podFile || null,
            podDate: d.podDate || null,
          }))
        );
      }


      // 3. Auto-generate DP 70% invoice for 70:30 payment type orders
      const isTop = input.paymentType && input.paymentType.startsWith('TOP');
      if (!isTop) {
        const dpId = `INV-DP-${id}`;
        const issueDate = input.date || new Date().toISOString().split('T')[0];
        const dueDateObj = new Date(issueDate);
        dueDateObj.setDate(dueDateObj.getDate() + 2);
        const dueDateStr = dueDateObj.toISOString().split('T')[0];
        const dpAmount = input.dpAmount || Math.round((input.totalValue || 0) * 0.7);

        await tx.insert(invoices).values({
          id: dpId,
          orderId: id,
          clientId: validClient ? validClient.id : undefined,
          clientName: input.clientName,
          paymentType: input.paymentType || '70:30',
          type: 'dp',
          amount: dpAmount,
          issueDate: issueDate,
          dueDate: dueDateStr,
          status: (input.paymentStatus === 'dp_lunas' || input.paymentStatus === 'lunas') ? 'paid' : 'unpaid',
        }).onConflictDoUpdate({
          target: invoices.id,
          set: {
            clientName: input.clientName,
            amount: dpAmount,
            status: (input.paymentStatus === 'dp_lunas' || input.paymentStatus === 'lunas') ? 'paid' : 'unpaid',
            updatedAt: new Date(),
          }
        });
      }
    });

    return this.getById(db, id);
  },

  /** Update order status, optionally setting podDate when status = delivered */
  async updateStatus(db: DB, id: string, status: string, podDate?: string) {
    const updatePayload: Record<string, any> = { status, updatedAt: new Date() };
    if (status === 'delivered' && podDate) {
      updatePayload.podDate = podDate;
    }
    await db.update(orders).set(updatePayload).where(eq(orders.id, id));
    return this.getById(db, id);
  },

  /**
   * Mark DP as paid:
   * - Sets paymentStatus = dp_lunas
   * - If status = menunggu_dp → aktif
   */
  async markDPPaid(db: DB, id: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });

    await db.transaction(async (tx) => {
      await tx.update(orders).set({
        paymentStatus: 'dp_lunas',
        status: order.status === 'menunggu_dp' ? 'aktif' : order.status,
        updatedAt: new Date(),
      }).where(eq(orders.id, id));

      await tx.update(invoices).set({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date(),
      }).where(and(eq(invoices.orderId, id), eq(invoices.type, 'dp')));
    });
  },

  /**
   * Close order:
   * - Sets status = selesai, paymentStatus = dp_lunas
   * - Auto-generates pelunasan invoice due +3 days
   */
  async closeOrder(db: DB, id: string) {
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

      // Create pelunasan invoice — include clientName and paymentType
      await tx.insert(invoices).values({
        id:          `INV-LNS-${id}`,
        orderId:     id,
        clientId:    order.clientId,
        clientName:  order.clientName,
        type:        'pelunasan',
        paymentType: order.paymentType,
        amount:      order.finalAmount,
        issueDate:   today,
        dueDate:     dueDate.toISOString().split('T')[0],
        status:      'unpaid',
      }).onConflictDoNothing();
    });

    return this.getById(db, id);
  },

  /** Save file buffer as persistent Base64 in PostgreSQL database (both Tenant DB and Central Auth DB).
   *  Auto-converts JPG/PNG/WEBP images into a clean single-page PDF document.
   */
  async saveUploadedFile(db: DB, filename: string, mimeType: string, fileBuffer: Buffer): Promise<string> {
    let pdfFilename = path.basename(filename);
    let pdfMimeType = mimeType || 'application/pdf';
    let pdfBuffer = fileBuffer;

    // Auto-convert images (JPG, PNG, WEBP) to PDF
    const isImage = mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(pdfFilename);
    if (isImage) {
      try {
        const pdfDoc = await PDFDocument.create();
        let embedImg;
        if (mimeType === 'image/png' || pdfFilename.toLowerCase().endsWith('.png')) {
          embedImg = await pdfDoc.embedPng(fileBuffer);
        } else {
          embedImg = await pdfDoc.embedJpg(fileBuffer);
        }
        const page = pdfDoc.addPage([embedImg.width, embedImg.height]);
        page.drawImage(embedImg, { x: 0, y: 0, width: embedImg.width, height: embedImg.height });
        const pdfBytes = await pdfDoc.save();
        pdfBuffer = Buffer.from(pdfBytes);
        pdfMimeType = 'application/pdf';
        pdfFilename = pdfFilename.replace(/\.[^/.]+$/, '') + '.pdf';
      } catch (e) {
        console.warn('[PDF Image Conversion Warning]', e);
      }
    }

    const cleanFilename = path.basename(pdfFilename);
    const base64Data = pdfBuffer.toString('base64');
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Save to BOTH Tenant DB (e.g. tmsf_gercepin) AND Central Auth DB (tms_db / tmsfdb)
    const targetDbs = [db, getGlobalDb()];
    for (const targetDb of targetDbs) {
      try {
        await targetDb.insert(uploadedFiles).values({
          id: fileId,
          filename: cleanFilename,
          mimeType: pdfMimeType,
          data: base64Data,
        }).onConflictDoUpdate({
          target: uploadedFiles.filename,
          set: {
            mimeType: pdfMimeType,
            data: base64Data,
            createdAt: new Date(),
          },
        });
      } catch (e) {
        console.warn('[File DB Save Warning]', e);
      }
    }

    return cleanFilename;
  },

  /** Get uploaded file from PostgreSQL database by filename */
  async getUploadedFile(db: DB, filename: string) {
    const cleanFilename = path.basename(filename);
    const [record] = await db
      .select()
      .from(uploadedFiles)
      .where(or(
        eq(uploadedFiles.filename, cleanFilename),
        eq(uploadedFiles.filename, filename)
      ))
      .limit(1);
    return record || null;
  },

  /** Upload or cancel/remove POD file for a specific drop point.
   *  Also persists podDate (actual delivered date) when provided.
   */
  async uploadPOD(db: DB, orderId: string, dropId: string, filename: string | null, podDate?: string | null) {
    const isDone = Boolean(filename && filename.trim());
    const isUuid = typeof dropId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dropId);

    const patchSet: Record<string, any> = {
      podFile:   isDone ? filename : null,
      status:    isDone ? 'done' : 'pending',
      updatedAt: new Date(),
    };
    if (podDate !== undefined) {
      patchSet.podDate = podDate || null;
    }

    if (isUuid) {
      await db
        .update(orderDrops)
        .set(patchSet)
        .where(and(eq(orderDrops.id, dropId), eq(orderDrops.orderId, orderId)));
    } else {
      const drops = await db
        .select()
        .from(orderDrops)
        .where(eq(orderDrops.orderId, orderId))
        .orderBy(asc(orderDrops.seq));

      const seqIndex = Number(dropId) || 1;
      const targetDrop = drops.find(d => d.seq === seqIndex || d.id === dropId) || drops[0];
      if (targetDrop) {
        await db
          .update(orderDrops)
          .set(patchSet)
          .where(eq(orderDrops.id, targetDrop.id));
      }
    }
  },

  /**
   * Update only the podDate (Actual Delivered Date) for a specific drop point.
   * Called via PATCH /api/orders/:id/drops/:dropId/pod-date
   */
  async updateDropPodDate(db: DB, orderId: string, dropId: string, podDate: string | null) {
    const isUuid = typeof dropId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dropId);

    if (isUuid) {
      await db
        .update(orderDrops)
        .set({ podDate: podDate || null, updatedAt: new Date() })
        .where(and(eq(orderDrops.id, dropId), eq(orderDrops.orderId, orderId)));
    } else {
      const drops = await db
        .select()
        .from(orderDrops)
        .where(eq(orderDrops.orderId, orderId))
        .orderBy(asc(orderDrops.seq));
      const seqIndex = Number(dropId);
      const targetDrop = drops.find(d => d.id === dropId || (seqIndex && d.seq === seqIndex) || String(d.seq) === String(dropId)) || drops[0];
      if (targetDrop) {
        await db
          .update(orderDrops)
          .set({ podDate: podDate || null, updatedAt: new Date() })
          .where(eq(orderDrops.id, targetDrop.id));
      }

    }
  },

  // ─── BULK IMPORT ──────────────────────────────────────────────────────────

  /**
   * Validate bulk rows without creating any orders.
   * Preloads master data once and validates in memory (O(n) lookup).
   */
  async bulkValidateRows(db: DB, rows: BulkOrderRow[]): Promise<{
    validationResults: BulkValidationResult[];
    validCount: number;
    errorCount: number;
  }> {
    const VALID_SERVICES = ['FTL', 'LTL', 'FCL', 'LCL', 'AIR FREIGHT'];
    const VALID_PAYMENTS = ['70:30', 'TOP 14 Hari', 'TOP 21 Hari', 'TOP 30 Hari', 'TOP 45 Hari'];

    // ── Preload master data ONCE ───────────────────────────────────────────
    const allClients = await db.select({ id: clients.id, name: clients.name, status: clients.status }).from(clients);
    const clientMap = new Map(allClients.map(c => [c.name.toLowerCase().replace(/\s+/g, ' ').trim(), c]));

    const allVendors = await db.select({ id: vendors.id, name: vendors.name, status: vendors.status }).from(vendors);
    const vendorMap = new Map(allVendors.map(v => [v.name.toLowerCase().replace(/\s+/g, ' ').trim(), v]));

    const allDrivers = await db.select({ id: drivers.id, name: drivers.name, status: drivers.status }).from(drivers);
    const driverMap = new Map(allDrivers.map(d => [d.name.toLowerCase().replace(/\s+/g, ' ').trim(), d]));

    const allFleet = await db.select({ id: fleet.id, plate: fleet.plate, status: fleet.status }).from(fleet);
    const fleetMap = new Map(allFleet.map(f => [f.plate.toLowerCase().replace(/[^a-z0-9]/g, '').trim(), f]));

    // Check existing doNumbers in DB if provided
    const uploadedDoNumbers = [...new Set(rows.map(r => toStr(r.doNumber)).filter(Boolean))];
    const existingDoOrders = uploadedDoNumbers.length > 0
      ? await db.select({ id: orders.id }).from(orders).where(inArray(orders.id, uploadedDoNumbers))
      : [];
    const existingDoSet = new Set(existingDoOrders.map(o => o.id));

    // Check for duplicate soNumbers within the upload (group by soNumber)
    const soNumberCounts = new Map<string, number>();
    for (const row of rows) {
      const cleanSo = toStr(row.soNumber);
      if (cleanSo) {
        soNumberCounts.set(cleanSo, (soNumberCounts.get(cleanSo) || 0) + 1);
      }
    }

    // Check existing soNumbers in DB (only those that appear in upload)
    const uploadedSoNumbers = [...soNumberCounts.keys()].filter(Boolean);
    const existingOrders = uploadedSoNumbers.length > 0
      ? await db.select({ soNumber: orders.soNumber }).from(orders).where(inArray(orders.soNumber, uploadedSoNumbers))
      : [];
    const existingSoSet = new Set(existingOrders.map(o => o.soNumber).filter(Boolean));

    // ── Validate each row ─────────────────────────────────────────────────
    const results: BulkValidationResult[] = rows.map(row => {
      const errors: string[] = [];

      // Duplicate custom DO ID check
      const cleanDoNum = toStr(row.doNumber);
      if (cleanDoNum && existingDoSet.has(cleanDoNum)) {
        errors.push(`No. DO "${row.doNumber}" sudah ada di database`);
      }

      // Required fields
      if (!row.tanggalPickup) errors.push('Tanggal Pickup wajib diisi');
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(toStr(row.tanggalPickup))) errors.push('Format Tanggal Pickup harus YYYY-MM-DD');

      if (!row.tipeLayanan) errors.push('Tipe Layanan wajib diisi');
      else if (!VALID_SERVICES.includes(toStr(row.tipeLayanan).toUpperCase())) {
        errors.push(`Tipe Layanan "${row.tipeLayanan}" tidak valid. Gunakan: ${VALID_SERVICES.join(', ')}`);
      }

      if (!row.clientName) {
        errors.push('Nama Klien wajib diisi');
      }

      if (!row.tipePembayaran) errors.push('Tipe Pembayaran wajib diisi');
      else if (!VALID_PAYMENTS.includes(toStr(row.tipePembayaran))) {
        errors.push(`Tipe Pembayaran "${row.tipePembayaran}" tidak valid. Gunakan: ${VALID_PAYMENTS.join(', ')}`);
      }

      if (!row.tarifSelling || isNaN(Number(row.tarifSelling)) || Number(row.tarifSelling) <= 0) {
        errors.push('Tarif Selling harus berupa angka positif');
      }

      if (!row.provinsiAsal) errors.push('Provinsi Asal wajib diisi');
      if (!row.kotaAsal) errors.push('Kota Asal wajib diisi');
      if (!row.provinsiTujuan) errors.push('Provinsi Tujuan wajib diisi');
      if (!row.kotaTujuan) errors.push('Kota Tujuan wajib diisi');

      // Client lookup & validation
      let resolvedClient: { id: string; name: string } | undefined;
      if (row.clientName) {
        const cleanClientName = toStr(row.clientName).toLowerCase().replace(/\s+/g, ' ').trim();
        const found = clientMap.get(cleanClientName);
        if (!found) {
          errors.push(`Klien "${row.clientName}" tidak ditemukan di master data`);
        } else if (found.status?.toLowerCase() !== 'active') {
          errors.push(`Klien "${row.clientName}" tidak aktif`);
        } else {
          resolvedClient = found;
        }
      }

      // Vendor lookup & validation (optional if column omitted, but validated against master if filled)
      let resolvedVendor: { id: string; name: string } | undefined;
      if (row.vendor) {
        const cleanVendorName = toStr(row.vendor).toLowerCase().replace(/\s+/g, ' ').trim();
        const found = vendorMap.get(cleanVendorName);
        if (!found) {
          errors.push(`Vendor "${row.vendor}" tidak ditemukan di master vendor`);
        } else if (found.status?.toLowerCase() === 'inactive') {
          errors.push(`Vendor "${row.vendor}" tidak aktif`);
        } else {
          resolvedVendor = found;
        }
      }

      // Driver lookup & validation (optional if column omitted, but validated against master if filled)
      let resolvedDriver: { id: string; name: string } | undefined;
      if (row.driver) {
        const cleanDriverName = toStr(row.driver).toLowerCase().replace(/\s+/g, ' ').trim();
        const found = driverMap.get(cleanDriverName);
        if (!found) {
          errors.push(`Driver "${row.driver}" tidak ditemukan di master driver`);
        } else if (found.status?.toLowerCase() === 'off') {
          errors.push(`Driver "${row.driver}" sedang tidak aktif (off)`);
        } else {
          resolvedDriver = found;
        }
      }

      // Nopol / Fleet lookup & validation (optional if column omitted, but validated against master if filled)
      let resolvedFleet: { id: string; plate: string } | undefined;
      if (row.nopol) {
        const cleanPlate = toStr(row.nopol).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        const found = fleetMap.get(cleanPlate);
        if (!found) {
          errors.push(`Nopol / Armada "${row.nopol}" tidak ditemukan di master armada`);
        } else if (found.status?.toLowerCase() === 'maintenance') {
          errors.push(`Armada "${row.nopol}" sedang dalam perawatan (maintenance)`);
        } else {
          resolvedFleet = found;
        }
      }

      // Duplicate soNumber check (against DB)
      const cleanSoNum = toStr(row.soNumber);
      if (cleanSoNum && existingSoSet.has(cleanSoNum)) {
        errors.push(`No. SO "${row.soNumber}" sudah ada di database`);
      }

      return {
        rowNum: row.rowNum,
        errors,
        soNumber: row.soNumber ? String(row.soNumber) : undefined,
        clientId: resolvedClient?.id,
        clientNameResolved: resolvedClient?.name,
        vendorId: resolvedVendor?.id,
        vendorNameResolved: resolvedVendor?.name,
        driverId: resolvedDriver?.id,
        driverNameResolved: resolvedDriver?.name,
        fleetId: resolvedFleet?.id,
        fleetPlateResolved: resolvedFleet?.plate,
      };
    });

    // Post-process multi-drop groups: if ANY row in a multi-drop group has an error, invalidate all rows in that group
    const groupBadRows = new Map<string, number[]>();
    results.forEach((r, idx) => {
      const key = toStr(r.soNumber) || toStr(rows[idx].doNumber);
      if (key && r.errors.length > 0) {
        if (!groupBadRows.has(key)) groupBadRows.set(key, []);
        groupBadRows.get(key)!.push(r.rowNum);
      }
    });

    results.forEach((r, idx) => {
      const key = toStr(r.soNumber) || toStr(rows[idx].doNumber);
      if (key && groupBadRows.has(key) && r.errors.length === 0) {
        const badRows = groupBadRows.get(key)!.join(', ');
        r.errors.push(`Multi-drop pada No. SO/DO "${key}" memilik error pada baris ${badRows}`);
      }
    });

    const errorCount = results.filter(r => r.errors.length > 0).length;
    return {
      validationResults: results,
      validCount: results.length - errorCount,
      errorCount,
    };
  },

  /**
   * Bulk create orders from validated rows.
   * Groups rows by soNumber or doNumber for multi-drop support.
   * Pre-generates all DO IDs atomically based on MAX existing sequence.
   * Processes in batches of 50 for database stability.
   */
  async bulkCreate(db: DB, rows: BulkOrderRow[], validationResults: BulkValidationResult[], createdBy: string): Promise<BulkImportResult> {
    const BATCH_SIZE = 50;
    const successList: BulkImportResult['success'] = [];
    const failedList: BulkImportResult['failed'] = [];

    // Only process valid rows
    const validRowNums = new Set(validationResults.filter(r => r.errors.length === 0).map(r => r.rowNum));
    const validRows = rows.filter(r => validRowNums.has(r.rowNum));
    const errorRows = rows.filter(r => !validRowNums.has(r.rowNum));

    // Add already-errored rows to failed list
    for (const row of errorRows) {
      const vr = validationResults.find(v => v.rowNum === row.rowNum);
      failedList.push({
        rowNum: row.rowNum,
        soNumber: row.soNumber,
        clientName: row.clientName,
        errors: vr?.errors ?? ['Validation gagal'],
      });
    }

    if (validRows.length === 0) {
      return {
        totalRows: rows.length,
        successCount: 0,
        failedCount: failedList.length,
        success: [],
        failed: failedList,
      };
    }

    // ── Group rows by soNumber or doNumber (multi-drop support) ─────────────
    const orderGroups = new Map<string, BulkOrderRow[]>();
    let singleOrderCounter = 0;
    for (const row of validRows) {
      const key = toStr(row.soNumber) || toStr(row.doNumber) || `__single_${singleOrderCounter++}_${row.rowNum}`;
      if (!orderGroups.has(key)) orderGroups.set(key, []);
      orderGroups.get(key)!.push(row);
    }

    const ordersToCreate = [...orderGroups.entries()]; // [key, rows[]]

    // ── Pre-generate all DO IDs atomically using MAX ─────────────────────
    const year = new Date().getFullYear();
    let maxSeq = 0;
    try {
      const maxResult = await db.execute<{ max_seq: string }>(
        sql`SELECT MAX(CAST(SUBSTRING(id FROM 'DO-[0-9]+-([0-9]+)') AS INTEGER)) AS max_seq FROM orders WHERE id LIKE ${`DO-${year}-%`}`
      );
      const rawMax = maxResult.rows[0]?.max_seq;
      maxSeq = rawMax ? Number(rawMax) : 0;
    } catch (e) {
      const countResult = await db.execute<{ cnt: string }>(
        sql`SELECT COUNT(*) AS cnt FROM orders WHERE id LIKE ${`DO-${year}-%`}`
      );
      maxSeq = Number(countResult.rows[0]?.cnt ?? 0);
    }

    const preGeneratedIds = ordersToCreate.map((_, i) =>
      `DO-${year}-${String(maxSeq + i + 1).padStart(3, '0')}`
    );

    // ── Process in batches of 50 ──────────────────────────────────────────
    for (let batchStart = 0; batchStart < ordersToCreate.length; batchStart += BATCH_SIZE) {
      const batch = ordersToCreate.slice(batchStart, batchStart + BATCH_SIZE);
      const batchIds = preGeneratedIds.slice(batchStart, batchStart + BATCH_SIZE);

      // Process each order in batch sequentially
      for (let i = 0; i < batch.length; i++) {
        const [soKey, groupRows] = batch[i];
        const firstRow = groupRows[0];
        const doId = toStr(firstRow.doNumber) || batchIds[i];
        const vr = validationResults.find(v => v.rowNum === firstRow.rowNum);

        try {
          const ppnFee = firstRow.ppn ? Math.round(firstRow.tarifSelling * 0.011) : 0;
          const totalValue = Math.round(
            firstRow.tarifSelling +
            ppnFee +
            (firstRow.biayaTKBM || 0) +
            (firstRow.biayaKrani || 0) +
            (firstRow.biayaLain || 0)
          );
          const isTop = firstRow.tipePembayaran.startsWith('TOP');
          const topDaysMatch = firstRow.tipePembayaran.match(/(\d+)/);
          const topDays = topDaysMatch ? Number(topDaysMatch[1]) : undefined;
          const dpAmount = isTop ? 0 : Math.round(totalValue * 0.7);
          const finalAmount = isTop ? totalValue : Math.round(totalValue * 0.3);

          const orderInput: any = {
            id: doId,
            soNumber: firstRow.soNumber,
            clientId: vr?.clientId,
            clientName: vr?.clientNameResolved || firstRow.clientName,

            // Vendor, Driver, Fleet master data mapping
            vendorName: vr?.vendorNameResolved || firstRow.vendor,
            driverId: vr?.driverId,
            driverName: vr?.driverNameResolved || firstRow.driver,
            fleetId: vr?.fleetId,
            fleetPlate: vr?.fleetPlateResolved || firstRow.nopol,

            date: firstRow.tanggalPickup,
            pickupDate: firstRow.tanggalPickup,
            etdDate: firstRow.tanggalETD,
            etaDate: firstRow.tanggalETA,
            totalValue,
            dpAmount,
            finalAmount,
            buyingPrice: firstRow.tarifBuying || 0,
            status: 'delivered',
            paymentStatus: isTop ? 'dp_lunas' : 'dp_lunas',
            paymentType: firstRow.tipePembayaran,
            invoicePending: true,
            topDays,
            serviceType: firstRow.tipeLayanan,
            unitType: firstRow.jenisArmada,
            kubikasi: firstRow.kubikasi,
            tonase: firstRow.tonase,
            originProvince: firstRow.provinsiAsal,
            originCity: firstRow.kotaAsal,
            originDistrict: firstRow.kecamatanAsal,
            originStore: firstRow.gudangAsal,
            notes: firstRow.catatan,
            costBreakdown: {
              baseFreight: firstRow.tarifSelling,
              buyingPrice: firstRow.tarifBuying || 0,
              ppnFee,
              tkbmFee: firstRow.biayaTKBM || 0,
              kraniFee: firstRow.biayaKrani || 0,
              otherFee: firstRow.biayaLain || 0,
            },
            drops: groupRows.map((dropRow, idx) => ({
              seq: idx + 1,
              province: dropRow.provinsiTujuan,
              city: dropRow.kotaTujuan,
              district: dropRow.kecamatanTujuan,
              store: dropRow.tokoTujuan,
              pic: dropRow.picPenerima,
              phone: dropRow.noTelpPIC,
            })),
          };

          await this.create(db, orderInput, createdBy);

          successList.push({
            doId,
            soNumber: firstRow.soNumber,
            clientName: vr?.clientNameResolved || firstRow.clientName,
            vendorName: vr?.vendorNameResolved || firstRow.vendor,
            driverName: vr?.driverNameResolved || firstRow.driver,
            fleetPlate: vr?.fleetPlateResolved || firstRow.nopol,
            kotaTujuan: groupRows.map(r => r.kotaTujuan).join(', '),
          });
        } catch (err: any) {
          const rowNums = groupRows.map(r => r.rowNum);
          failedList.push({
            rowNum: firstRow.rowNum,
            soNumber: firstRow.soNumber,
            clientName: firstRow.clientName,
            errors: [`Baris ${rowNums.join(',')}: ${err?.message ?? 'Gagal membuat order'}`],
          });
        }
      }
    }

    return {
      totalRows: rows.length,
      successCount: successList.length,
      failedCount: failedList.length,
      success: successList,
      failed: failedList,
    };
  },
};

