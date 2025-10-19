import 'dotenv/config';
import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";

const pool: Pool = mysql.createPool({
  host: String(process.env.DB_DEV_HOST),
  user: String(process.env.DB_DEV_USER),
  password: String(process.env.DB_DEV_PASSWORD),
  database: String(process.env.DB_DEV_NAME),
  // port: Number(process.env.DB_PROD_PORT),
  // ssl: { rejectUnauthorized: false }
});

export default pool;
