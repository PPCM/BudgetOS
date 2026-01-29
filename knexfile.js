import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

// Resolve the database client based on DB_TYPE environment variable
const getClientConfig = () => {
  const dbType = process.env.DB_TYPE || 'sqlite';

  switch (dbType) {
    case 'mysql':
    case 'mariadb':
      return {
        client: 'mysql2',
        connection: {
          host: process.env.MYSQL_HOST || 'localhost',
          port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
          database: process.env.MYSQL_DB || 'budgetos',
          user: process.env.MYSQL_USER || 'budgetos',
          password: process.env.MYSQL_PASSWORD || 'budgetos',
          charset: 'utf8mb4',
        },
        pool: { min: 2, max: 10 },
      };
    case 'postgres':
    case 'postgresql':
      return {
        client: 'pg',
        connection: {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
          database: process.env.POSTGRES_DB || 'budgetos',
          user: process.env.POSTGRES_USER || 'budgetos',
          password: process.env.POSTGRES_PASSWORD || 'budgetos',
        },
        pool: { min: 2, max: 10 },
      };
    case 'sqlite':
    default:
      return {
        client: 'better-sqlite3',
        connection: {
          filename: process.env.DB_PATH || path.resolve(__dirname, 'data/budgetos.db'),
        },
        useNullAsDefault: true,
      };
  }
};

const config = {
  ...getClientConfig(),
  migrations: {
    directory: path.resolve(__dirname, 'src/database/migrations'),
    sortDirsSeparately: true,
  },
  seeds: {
    directory: path.resolve(__dirname, 'src/database/seeds'),
  },
};

export default config;
