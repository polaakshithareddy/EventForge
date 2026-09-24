import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { BadRequestError } from '../utils/AppError.js';

// Dedicated private directory for authenticated files
const CONTRACTS_DIR = path.resolve('uploads', 'contracts');

if (!fs.existsSync(CONTRACTS_DIR)) {
  fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CONTRACTS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${cleanBase}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new BadRequestError(`Unsupported file format (${ext}). Allowed: PDF, Word, Images.`));
  }
};

export const uploadContract = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

export const CONTRACTS_UPLOAD_PATH = CONTRACTS_DIR;
