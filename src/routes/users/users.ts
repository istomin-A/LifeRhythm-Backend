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
  const { username, password, email } = req.body;

  // Проверяем обязательные поля
  if (!username || !password) {
    res.status(400).send("Имя пользователя и пароль обязательны");
    return;
  }

  // Если email не передан, ставим пустую строку
  const userEmail = typeof email === "string" ? email : "";

  // Опционально: проверка валидности email, если передан
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (userEmail && !isValidEmail(userEmail)) {
    res.status(400).send("Некорректный email");
    return;
  }

  try {
    const user_id = uuidv4();

    const [result] = await pool.query(
      "INSERT INTO users (user_id, username, password, email, date_reg) VALUES (?, ?, ?, ?, NOW())",
      [user_id, username, password, userEmail]
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

// обновление email
router.patch("/update-email/:user_id", async (req: Request, res: Response): Promise<void> => {
  const { user_id } = req.params;
  const { email } = req.body;

  if (!user_id) {
    res.status(400).send("user_id обязателен");
    return;
  }

  if (typeof email !== "string") {
    res.status(400).send("Email обязателен");
    return;
  }

  // Проверка валидности email (можно отключить, если нужен любой текст)
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (email && !isValidEmail(email)) {
    res.status(400).send("Некорректный email");
    return;
  }

  try {
    const [result]: any = await pool.query(
      "UPDATE users SET email = ? WHERE user_id = ?",
      [email, user_id]
    );

    if (result.affectedRows === 0) {
      res.status(404).send("Пользователь не найден");
      return;
    }

    res.status(200).json({
      message: "Email успешно обновлён",
      user_id,
      email,
    });
  } catch (err: any) {
    console.error("Ошибка при обновлении email:", err);
    res.status(500).send("Ошибка сервера");
  }
});

// получить конкретного пользователя
router.get("/:user_id", async (req: Request, res: Response): Promise<void> => {
  const { user_id } = req.params;

  if (!user_id) {
    res.status(400).send("user_id обязателен");
    return;
  }

  try {
    const [rows]: any = await pool.query("SELECT * FROM users WHERE user_id = ?", [user_id]);

    if (rows.length === 0) {
      res.status(404).send("Пользователь не найден");
      return;
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Ошибка при получении пользователя:", err);
    res.status(500).send("Ошибка сервера");
  }
});

export default router;
