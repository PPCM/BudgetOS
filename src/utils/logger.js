import winston from 'winston';
import path from 'path';
import config from '../config/index.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Format personnalisé pour les logs
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }
  
  if (stack) {
    log += `\n${stack}`;
  }
  
  return log;
});

// Transports selon l'environnement
const transports = [
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      logFormat
    ),
  }),
];

// En production, ajouter les fichiers de log
if (config.isProd) {
  transports.push(
    new winston.transports.File({
      filename: path.join(config.paths.logs, 'error.log'),
      level: 'error',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    }),
    new winston.transports.File({
      filename: path.join(config.paths.logs, 'combined.log'),
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    })
  );
}

const logger = winston.createLogger({
  level: config.logging.level,
  transports,
  exitOnError: false,
});

// Créer un child logger avec contexte
logger.child = (context) => {
  return {
    debug: (message, meta = {}) => logger.debug(message, { ...context, ...meta }),
    info: (message, meta = {}) => logger.info(message, { ...context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { ...context, ...meta }),
    error: (message, meta = {}) => logger.error(message, { ...context, ...meta }),
  };
};

export default logger;
