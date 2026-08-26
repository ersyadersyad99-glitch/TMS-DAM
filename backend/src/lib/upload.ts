import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

// --- COMMENT BAGIAN INI SEMENTARA (Serverless Read-Only Filesystem Safe) ---
// Ensure upload directories exist
// const dirs = [
//   path.join(UPLOAD_DIR, 'pod'),      // Proof of Delivery files
//   path.join(UPLOAD_DIR, 'receipts'), // Travel fund receipts
// ];
// dirs.forEach((dir) => {
//   try {
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//   } catch (e) {}
// });
// ------------------------------------

const storage = multer.diskStorage({
  destination: (_req: Request, file, cb) => {
    // Route to the right subfolder based on fieldname
    const subdir = file.fieldname === 'receipt' ? 'receipts' : 'pod';
    const targetDir = path.join(UPLOAD_DIR, subdir);
    try {
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {}
    cb(null, targetDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF and images are allowed.`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
