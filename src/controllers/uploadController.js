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
const MAX_IMAGE_DIMENSION = 256; // Taille max en pixels
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif'];
const UPLOAD_BASE_DIR = path.join(__dirname, '../../client/public/uploads/payees');

// Créer le dossier de base s'il n'existe pas
if (!fs.existsSync(UPLOAD_BASE_DIR)) {
  fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
}

// Configuration Multer pour stockage en mémoire
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Format non supporté. Utilisez PNG, JPEG ou GIF.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

/**
 * Génère un nom de fichier unique basé sur le pseudo, MD5 et date
 */
function generateFileName(username, buffer) {
  const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
  const timestamp = Date.now().toString();
  const combined = `${username}_${md5Hash}_${timestamp}`;
  
  // Hash final sur 32 caractères
  const finalHash = crypto.createHash('md5').update(combined).digest('hex');
  return finalHash;
}

/**
 * Crée la structure de dossiers hiérarchique
 * ab/cd/ef/gh/fichier.png
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
 * Upload et traitement d'une image de tiers
 */
export const uploadPayeeImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('Aucun fichier fourni');
    }

    const username = req.user.username || req.user.id;
    const fileName = generateFileName(username, req.file.buffer);
    const dirPath = createDirectoryPath(fileName);
    const outputFileName = `${fileName}.png`;
    const outputPath = path.join(dirPath, outputFileName);

    // Redimensionner et convertir en PNG avec sharp
    await sharp(req.file.buffer)
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: 'cover',
        position: 'center',
      })
      .png({ quality: 90 })
      .toFile(outputPath);

    // Construire le chemin relatif pour le frontend
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
 * Supprime une image de tiers
 */
export const deletePayeeImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl || !imageUrl.startsWith('/uploads/payees/')) {
      throw new ValidationError('URL d\'image invalide');
    }

    const filePath = path.join(__dirname, '../../client/public', imageUrl);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      
      // Nettoyer les dossiers vides
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
