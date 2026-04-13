import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __currentFileName = fileURLToPath(import.meta.url);
const __rootDirname = path.join(path.dirname(__currentFileName), '..');

const uploadDir = path.join(__rootDirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 },
  storage,
});

export default upload;
