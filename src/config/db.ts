import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";
import 'dotenv/config';

const pool: Pool = mysql.createPool({
  host: process.env.DB_PROD_HOST!,
  user: process.env.DB_PROD_USER!,
  password: process.env.DB_PROD_PASSWORD!,
  database: process.env.DB_PROD_NAME!,
  port: Number(process.env.DB_PROD_PORT!),
  ssl: { rejectUnauthorized: false }
});

export default pool;
