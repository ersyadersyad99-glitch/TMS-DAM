import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { ordersService, type BulkOrderRow } from '../services/orders.service.js';
import { upload } from '../lib/upload.js';
import multer from 'multer';
import * as XLSX from 'xlsx';

// Multer config for Excel bulk upload (memory storage, max 10MB)
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (allowed.includes(file.mimetype) || ext === 'xlsx' || ext === 'xls') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file Excel (.xlsx / .xls) yang diperbolehkan'));
    }
  },
});

// Column header mapping from Excel template to internal field names
const COLUMN_MAP: Record<string, keyof BulkOrderRow> = {
  'No. DO': 'doNumber',
  'NO DO': 'doNumber',
  'NO. DO': 'doNumber',
  'No DO': 'doNumber',
  'Tanggal Pickup': 'tanggalPickup',
  'Tipe Layanan': 'tipeLayanan',
  'Nama Klien': 'clientName',
  'No. SO (Referensi)': 'soNumber',
  'No SO': 'soNumber',
  'No. SO': 'soNumber',

  'Jenis Armada': 'jenisArmada',
  'Kubikasi': 'kubikasi',
  'Tonase': 'tonase',
  'Tipe Pembayaran': 'tipePembayaran',
  'Tarif Selling (Rp)': 'tarifSelling',
  'Tarif Buying (Rp)': 'tarifBuying',
  'PPN 1.1%': 'ppn',
  'Biaya TKBM (Rp)': 'biayaTKBM',
  'Biaya Krani (Rp)': 'biayaKrani',
  'Biaya Lain (Rp)': 'biayaLain',
  'Provinsi Asal': 'provinsiAsal',
  'Kota Asal': 'kotaAsal',
  'Kecamatan Asal': 'kecamatanAsal',
  'Gudang / Toko Asal': 'gudangAsal',
  'Tgl ETD': 'tanggalETD',
  'Tgl ETA': 'tanggalETA',
  'Provinsi Tujuan': 'provinsiTujuan',
  'Kota Tujuan': 'kotaTujuan',
  'Kecamatan Tujuan': 'kecamatanTujuan',
  'Toko / Gudang Tujuan': 'tokoTujuan',
  'PIC Penerima': 'picPenerima',
  'No. Telp PIC': 'noTelpPIC',
  'Catatan': 'catatan',
};

/** Parse uploaded Excel buffer into BulkOrderRow[] */
function parseExcelBuffer(buffer: Buffer): BulkOrderRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rawRows
    .filter(row => {
      // Skip completely empty rows
      return Object.values(row).some(v => v !== '' && v !== null && v !== undefined);
    })
    .map((row, idx) => {
      const mapped: any = { rowNum: idx + 2 }; // +2 because row 1 is header

      for (const [excelCol, fieldName] of Object.entries(COLUMN_MAP)) {
        let val = row[excelCol];

        // Normalize date fields (Excel may return Date objects or serial numbers)
        if (['tanggalPickup', 'tanggalETD', 'tanggalETA'].includes(fieldName)) {
          if (val instanceof Date) {
            val = val.toISOString().split('T')[0];
          } else if (typeof val === 'number') {
            // Excel serial date
            const date = XLSX.SSF.parse_date_code(val);
            if (date) {
              val = `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
            }
          } else if (typeof val === 'string' && val.trim()) {
            val = val.trim();
          }
        }

        // Normalize numeric fields
        if (['tarifSelling', 'tarifBuying', 'biayaTKBM', 'biayaKrani', 'biayaLain'].includes(fieldName)) {
          val = val === '' || val === null || val === undefined ? undefined : Number(String(val).replace(/[^0-9.-]/g, ''));
        }

        // Normalize boolean fields (Y/y/ya/1 = true)
        if (fieldName === 'ppn') {
          val = ['y', 'ya', 'yes', '1', 'true'].includes(String(val).toLowerCase().trim());
        }

        if (val !== '' && val !== null && val !== undefined) {
          mapped[fieldName] = val;
        }
      }

      return mapped as BulkOrderRow;
    });
}


const router = Router();

/** GET /api/orders — list with optional filters */
router.get('/', requireAuth, requirePermission('orders.read'), async (req, res, next) => {
  try {
    const { status, clientId, search } = req.query as Record<string, string>;
    const data = await ordersService.list(req.db, { status, clientId, search });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/orders/:id — single order with drops and invoices */
router.get('/:id', requireAuth, requirePermission('orders.read'), async (req, res, next) => {
  try {
    const order = await ordersService.getById(req.db, req.params.id as string);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

/** POST /api/orders — create new order */
router.post(
  '/',
  requireAuth,
  requirePermission('orders.create'),
  async (req, res, next) => {
    try {
      const order = await ordersService.create(req.db, req.body, req.user?.id);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/orders/bulk
 * Bulk import Delivery Orders from an Excel file.
 *
 * Query param ?mode=validate  → dry run: validate and return errors without inserting
 * Query param ?mode=import    → execute: validate + create all valid rows
 *
 * Multipart form field: file (Excel .xlsx)
 */
router.post(
  '/bulk',
  requireAuth,
  requirePermission('orders.create'),
  excelUpload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        res.status(400).json({ error: 'File Excel tidak ditemukan. Pastikan field multipart bernama "file".' });
        return;
      }

      // Parse Excel
      let rows: BulkOrderRow[];
      try {
        rows = parseExcelBuffer(req.file.buffer);
      } catch (parseErr: any) {
        res.status(400).json({ error: `Gagal membaca file Excel: ${parseErr?.message ?? 'Format tidak valid'}` });
        return;
      }

      if (rows.length === 0) {
        res.status(400).json({ error: 'File Excel tidak berisi data. Pastikan sheet pertama berisi baris data.' });
        return;
      }

      if (rows.length > 2000) {
        res.status(400).json({ error: `Terlalu banyak baris (${rows.length}). Maksimal 2000 baris per upload.` });
        return;
      }

      const mode = (req.query.mode as string) || 'validate';

      // Always validate first
      const { validationResults, validCount, errorCount } = await ordersService.bulkValidateRows(req.db, rows);

      if (mode === 'validate') {
        // Dry run — return validation summary + errors
        const errors = validationResults
          .filter(r => r.errors.length > 0)
          .map(r => ({
            rowNum: r.rowNum,
            soNumber: r.soNumber,
            errors: r.errors,
          }));

        res.json({
          mode: 'validate',
          totalRows: rows.length,
          validCount,
          errorCount,
          errors,
        });
        return;
      }

      // Import mode — create valid orders
      if (validCount === 0) {
        res.status(400).json({
          error: 'Tidak ada baris yang valid untuk diimport.',
          totalRows: rows.length,
          validCount: 0,
          errorCount,
        });
        return;
      }

      const result = await ordersService.bulkCreate(
        req.db,
        rows,
        validationResults,
        req.user?.id ?? '',
      );

      res.status(201).json({
        mode: 'import',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },
);


router.patch(
  '/:id/status',
  requireAuth,
  requirePermission('orders.update'),
  async (req, res, next) => {
    try {
      const { status, podDate } = req.body as { status: string; podDate?: string };
      if (!status) {
        res.status(400).json({ error: 'status is required' });
        return;
      }
      const order = await ordersService.updateStatus(req.db, req.params.id as string, status, podDate);
      res.json(order);
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/orders/:id/mark-dp-paid — mark DP as paid */
router.patch(
  '/:id/mark-dp-paid',
  requireAuth,
  requirePermission('orders.approve'),
  async (req, res, next) => {
    try {
      await ordersService.markDPPaid(req.db, req.params.id as string);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/orders/:id/close — close order + create pelunasan invoice */
router.patch(
  '/:id/close',
  requireAuth,
  requirePermission('orders.update'),
  async (req, res, next) => {
    try {
      const order = await ordersService.closeOrder(req.db, req.params.id as string);
      res.json(order);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/orders/:id/drops/:dropId/pod
 * Upload Proof of Delivery file for a drop point
 */
router.post(
  '/:id/drops/:dropId/pod',
  requireAuth,
  requirePermission('orders.update'),
  upload.single('pod'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      // Optional: podDate can be sent as a form field alongside the file
      const podDate = (req.body?.podDate as string | undefined) || null;
      await ordersService.uploadPOD(req.db, req.params.id as string, req.params.dropId as string, req.file.filename, podDate);
      res.json({ success: true, filename: req.file.filename });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/orders/:id/drops/:dropId/pod-date
 * Set or update Tanggal POD Aktual (Actual Delivered Date) for a drop point
 */
router.patch(
  '/:id/drops/:dropId/pod-date',
  requireAuth,
  requirePermission('orders.update'),
  async (req, res, next) => {
    try {
      const { podDate } = req.body as { podDate: string | null };
      await ordersService.updateDropPodDate(req.db, req.params.id as string, req.params.dropId as string, podDate ?? null);
      res.json({ success: true, podDate });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
