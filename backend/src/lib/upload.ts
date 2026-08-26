import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';

import os from 'os';

const getUploadBaseDir = (): string => {
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    return os.tmpdir();
  }
  return process.env.UPLOAD_DIR ?? 'uploads';
};

const storage = multer.diskStorage({
  destination: (_req: Request, file, cb) => {
    const baseDir = getUploadBaseDir();
    const subdir = file.fieldname === 'receipt' ? 'receipts' : 'pod';
    const targetDir = path.join(baseDir, subdir);
    try {
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {
      console.warn('[Upload Storage Warning]', e);
    }
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
