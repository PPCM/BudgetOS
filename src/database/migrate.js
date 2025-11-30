import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, getDatabase, closeDatabase, query } from './connection.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Exécute les migrations de la base de données
 */
const migrate = async () => {
  try {
    logger.info('Starting database migration...');
    
    // Initialiser la connexion (async avec sql.js)
    await initDatabase();
    
    // Lire le fichier de schéma
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Exécuter le schéma
    query.exec(schema);
    
    logger.info('Database schema applied successfully');
    
    // Vérifier les tables créées
    const tables = query.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    logger.info('Tables created:', { 
      count: tables.length,
      tables: tables.map(t => t.name) 
    });
    
    // Fermer la connexion
    closeDatabase();
    
    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// Exécuter si appelé directement
migrate();
