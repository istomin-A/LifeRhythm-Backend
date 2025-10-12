import { Router } from "express";
import type { Request, Response } from "express";
import pool from "../../config/db.js";

const router = Router();

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query("SELECT NOW() AS now");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка сервера");
  }
});

export default router;
