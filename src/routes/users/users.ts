import { Router } from "express";
import type { Request, Response } from "express";
import pool from "../../config/db.js";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

// GET /users — получить всех пользователей
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка сервера");
  }
});

// POST /users — регистрация нового пользователя
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).send("Имя пользователя и пароль обязательны");
    return;
  }

  try {
    const user_id = uuidv4();

    const [result] = await pool.query(
      "INSERT INTO users (user_id, username, password, date_reg) VALUES (?, ?, ?, NOW())",
      [user_id, username, password]
    );

    res.status(201).json({
      message: "Пользователь создан",
      id: (result as any).insertId,
      user_id,
    });
  } catch (err: any) {
    console.error("Ошибка при добавлении пользователя:", err);

    if (err.code === "ER_DUP_ENTRY") {
      res.status(400).send("Такое имя пользователя уже существует");
      return;
    }

    res.status(500).send("Ошибка сервера");
  }
});

// POST /users/login — авторизация
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ message: "Введите логин и пароль" });
    return;
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    const users = rows as any[];

    if (users.length === 0 || users[0].password !== password) {
      res.status(401).json({ message: "Неверный логин или пароль" });
      return;
    }

    const token = jwt.sign(
      { user_id: users[0].user_id, username: users[0].username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// проверка токена
router.get("/verify", (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ valid: false, message: "Токен отсутствует" });
    return;
  }

  // гарантируем, что token будет string
  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ valid: false, message: "Неверный формат заголовка Authorization" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    console.error("Ошибка проверки токена:", err);
    res.status(401).json({ valid: false, message: "Недействительный токен" });
  }
});

export default router;
