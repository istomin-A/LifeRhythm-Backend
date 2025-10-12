import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";

const pool: Pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "LifeRhythm",
});

export default pool;
