import session from 'express-session';
import FileStoreFactory from 'session-file-store';
import config from '../config/index.js';
import path from 'path';
import fs from 'fs';

const FileStore = FileStoreFactory(session);

/**
 * Configuration des sessions
 * En développement: File store
 * En production: Redis (configuré séparément)
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
      secure: config.isProd,
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
 * Middleware pour régénérer la session après authentification
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
      
      // Restaurer les données de session (sauf les infos sensibles)
      Object.assign(req.session, sessionData);
      resolve();
    });
  });
};

/**
 * Middleware pour détruire la session
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
