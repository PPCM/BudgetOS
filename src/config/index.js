import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',
  
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || 'localhost',
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    maxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 86400000, // 24h
    name: 'budgetos.sid',
  },
  
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    sqlite: {
      path: process.env.DB_PATH || './data/budgetos.db',
    },
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
      database: process.env.POSTGRES_DB || 'budgetos',
      user: process.env.POSTGRES_USER || 'budgetos',
      password: process.env.POSTGRES_PASSWORD || '',
    },
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15min
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    },
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
  
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10485760, // 10MB
    path: process.env.UPLOAD_PATH || './uploads',
    allowedMimeTypes: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/x-qif',
      'application/x-ofx',
    ],
  },
  
  app: {
    defaultLocale: process.env.DEFAULT_LOCALE || 'fr',
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'EUR',
    supportedCurrencies: ['EUR', 'USD', 'GBP', 'CHF', 'CAD'],
    supportedLocales: ['fr', 'en'],
  },
  
  paths: {
    root: path.resolve(__dirname, '../..'),
    src: path.resolve(__dirname, '..'),
    data: path.resolve(__dirname, '../../data'),
    uploads: path.resolve(__dirname, '../../uploads'),
    logs: path.resolve(__dirname, '../../logs'),
  },
};

// Validation de la configuration critique
if (config.isProd && config.session.secret === 'dev-secret-change-me') {
  throw new Error('SESSION_SECRET must be set in production');
}

export default config;
