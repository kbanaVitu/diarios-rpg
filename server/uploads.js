import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIMES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

export function getUploadDir() {
  const dir = process.env.UPLOAD_DIR || path.resolve(__dirname, '..', 'uploads', 'avatars');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Validates image magic bytes to ensure uploaded buffer is genuinely a PNG, JPEG, GIF, or WebP image.
 */
export function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: '.png' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: '.jpg' };
  }

  // GIF: "GIF87a" or "GIF89a"
  const gifHeader = buffer.subarray(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return { mime: 'image/gif', ext: '.gif' };
  }

  // WebP: "RIFF" .... "WEBP"
  const riffHeader = buffer.subarray(0, 4).toString('ascii');
  const webpHeader = buffer.subarray(8, 12).toString('ascii');
  if (riffHeader === 'RIFF' && webpHeader === 'WEBP') {
    return { mime: 'image/webp', ext: '.webp' };
  }

  return null;
}

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIMES[mime]) {
      return cb(new Error('Tipo de arquivo inválido. Apenas imagens PNG, JPEG, WebP e GIF são permitidas.'));
    }
    cb(null, true);
  }
});

export function singleAvatarUpload(fieldName = 'avatar') {
  return (req, res, next) => {
    const handler = uploadMiddleware.single(fieldName);
    handler(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'A imagem excede o tamanho máximo permitido de 5 MB.' });
        }
        return res.status(400).json({ error: err.message || 'Envio de imagem inválido.' });
      }
      next();
    });
  };
}

export function saveVerifiedAvatar(buffer, prefix = 'char') {
  const detected = detectImageType(buffer);
  if (!detected) {
    const err = new Error('O conteúdo do arquivo não é uma imagem PNG, JPEG, WebP ou GIF válida.');
    err.status = 400;
    throw err;
  }

  const uploadDir = getUploadDir();
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const filename = `${prefix}-${Date.now()}-${uniqueId}${detected.ext}`;
  const fullPath = path.join(uploadDir, filename);

  fs.writeFileSync(fullPath, buffer);
  return `/uploads/avatars/${filename}`;
}

export function removeAvatarIfLocal(avatarUrl) {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) return;
  const filename = path.basename(avatarUrl);
  const fullPath = path.join(getUploadDir(), filename);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch {
      // Ignore unlink errors
    }
  }
}
