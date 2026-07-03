import session from 'express-session';
import FileStoreFactory from 'session-file-store';
import config from '../config/index.js';
import path from 'path';
import fs from 'fs';

const FileStore = FileStoreFactory(session);

/**
 * Session configuration
 * In development: File store
 * In production: Redis (configured separately)
 */
export const createSessionMiddleware = () => {
  const sessionsPath = path.join(config.paths.data, 'sessions');
  
  if (!fs.existsSync(sessionsPath)) {
    fs.mkdirSync(sessionsPath, { recursive: true });
  }

  const sessionConfig = {
    name: config.session.name,
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.session.secure,
      sameSite: 'lax',
      maxAge: config.session.maxAge,
      path: '/',
    },
    store: new FileStore({
      path: sessionsPath,
      ttl: config.session.maxAge / 1000,
      retries: 0,
      logFn: () => {},
    }),
  };

  return session(sessionConfig);
};

/**
 * Middleware to regenerate the session after authentication
 */
export const regenerateSession = (req) => {
  return new Promise((resolve, reject) => {
    const sessionData = { ...req.session };
    delete sessionData.cookie;
    
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Restore session data (except sensitive info)
      Object.assign(req.session, sessionData);
      resolve();
    });
  });
};

/**
 * Middleware to destroy the session
 */
export const destroySession = (req) => {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};
