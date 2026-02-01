import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ValidationError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_DIMENSION = 256; // Max dimension in pixels
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif'];
const UPLOAD_BASE_DIR = path.join(__dirname, '../../client/public/uploads/payees');

// Create the base directory if it doesn't exist
if (!fs.existsSync(UPLOAD_BASE_DIR)) {
  fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
}

// Multer configuration for in-memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Unsupported format. Use PNG, JPEG, or GIF.', 'UNSUPPORTED_FORMAT'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

/**
 * Generate a unique filename based on username, MD5 and timestamp
 */
function generateFileName(username, buffer) {
  const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
  const timestamp = Date.now().toString();
  const combined = `${username}_${md5Hash}_${timestamp}`;
  
  // Final hash of 32 characters
  const finalHash = crypto.createHash('md5').update(combined).digest('hex');
  return finalHash;
}

/**
 * Create hierarchical directory structure
 * ab/cd/ef/gh/file.png
 */
function createDirectoryPath(fileName) {
  const parts = [
    fileName.substring(0, 2),
    fileName.substring(2, 4),
    fileName.substring(4, 6),
    fileName.substring(6, 8),
  ];
  
  const dirPath = path.join(UPLOAD_BASE_DIR, ...parts);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  return dirPath;
}

/**
 * Upload and process a payee image
 */
export const uploadPayeeImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('No file provided', 'FILE_REQUIRED');
    }

    const username = req.user.username || req.user.id;
    const fileName = generateFileName(username, req.file.buffer);
    const dirPath = createDirectoryPath(fileName);
    const outputFileName = `${fileName}.png`;
    const outputPath = path.join(dirPath, outputFileName);

    // Resize and convert to PNG with sharp
    await sharp(req.file.buffer)
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: 'cover',
        position: 'center',
      })
      .png({ quality: 90 })
      .toFile(outputPath);

    // Build relative path for the frontend
    const relativePath = `/uploads/payees/${fileName.substring(0, 2)}/${fileName.substring(2, 4)}/${fileName.substring(4, 6)}/${fileName.substring(6, 8)}/${outputFileName}`;

    res.json({
      success: true,
      data: {
        imageUrl: relativePath,
        fileName: outputFileName,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a payee image
 */
export const deletePayeeImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl || !imageUrl.startsWith('/uploads/payees/')) {
      throw new ValidationError('Invalid image URL', 'INVALID_IMAGE_URL');
    }

    const filePath = path.join(__dirname, '../../client/public', imageUrl);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      
      // Clean up empty directories
      let dirPath = path.dirname(filePath);
      for (let i = 0; i < 4; i++) {
        if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) {
          fs.rmdirSync(dirPath);
          dirPath = path.dirname(dirPath);
        } else {
          break;
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
