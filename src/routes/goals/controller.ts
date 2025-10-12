import { Router } from "express";
import type { Request, Response } from "express";
import pool from "../../config/db.js";

export const router = Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { user_id, goals } = req.body;

  // Проверка входных данных
  if (!user_id || !Array.isArray(goals) || goals.length === 0) {
    res.status(400).json({ message: "Некорректные данные" });
    return;
  }

  try {
    // Добавляем поле createdAt для каждого объекта goals
    const goalsWithCreatedAt = goals.map((goal: any) => ({
      ...goal,
      createdAt: new Date().toISOString(),
    }));

    // Проверяем, есть ли запись для этого пользователя
    const [rows]: any = await pool.query(
      "SELECT goals FROM goals WHERE user_id = ?",
      [user_id]
    );

    if (rows.length === 0) {
      // Если нет — создаём новую запись
      await pool.query(
        "INSERT INTO goals (user_id, goals) VALUES (?, ?)",
        [user_id, JSON.stringify(goalsWithCreatedAt)]
      );
    } else {
      // Если есть — добавляем новые цели в JSON массив
      for (const goal of goalsWithCreatedAt) {
        await pool.query(
          `UPDATE goals 
           SET goals = JSON_ARRAY_APPEND(goals, '$', CAST(? AS JSON))
           WHERE user_id = ?`,
          [JSON.stringify(goal), user_id]
        );
      }
    }

    res.status(201).json({ message: "Цели добавлены успешно" });
  } catch (err: any) {
    console.error("Ошибка при добавлении цели:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

router.get("/:user_id", async (req: Request, res: Response): Promise<void> => {
  const { user_id } = req.params;

  if (!user_id) {
    res.status(400).json({ message: "user_id обязателен" });
    return;
  }

  try {
    const [rows]: any = await pool.query(
      "SELECT user_id, goals FROM goals WHERE user_id = ?",
      [user_id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Цели не найдены для данного пользователя" });
      return;
    }

    const { user_id: foundUserId, goals } = rows[0];

    // 🧠 Проверяем тип данных — если строка, парсим, если нет, оставляем как есть
    const parsedGoals =
      typeof goals === "string"
        ? JSON.parse(goals || "[]")
        : Array.isArray(goals)
          ? goals
          : [];

    res.status(200).json({
      user_id: foundUserId,
      goals: parsedGoals,
    });
  } catch (err: any) {
    console.error("Ошибка при получении целей:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

router.delete("/:user_id/:createdAt", async (req: Request, res: Response): Promise<void> => {
  const { user_id, createdAt } = req.params;

  if (!user_id || !createdAt) {
    res.status(400).json({ message: "user_id и createdAt обязательны" });
    return;
  }

  try {
    // Получаем текущие цели пользователя
    const [rows]: any = await pool.query(
      "SELECT goals FROM goals WHERE user_id = ?",
      [user_id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Пользователь не найден" });
      return;
    }

    const currentGoals: any[] =
      typeof rows[0].goals === "string"
        ? JSON.parse(rows[0].goals)
        : rows[0].goals;

    // Фильтруем цель, которую нужно удалить
    const updatedGoals = currentGoals.filter(goal => goal.createdAt !== createdAt);

    // Обновляем запись в базе
    await pool.query(
      "UPDATE goals SET goals = ? WHERE user_id = ?",
      [JSON.stringify(updatedGoals), user_id]
    );

    res.status(200).json({ message: "Цель удалена успешно", goals: updatedGoals });
  } catch (err: any) {
    console.error("Ошибка при удалении цели:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

router.patch("/:user_id/:createdAt", async (req: Request, res: Response): Promise<void> => {
  const { user_id, createdAt } = req.params;
  const { status } = req.body; // статус приходит с фронта

  if (!user_id || !createdAt) {
    res.status(400).json({ message: "user_id и createdAt обязательны" });
    return;
  }

  if (!status) {
    res.status(400).json({ message: "status обязателен" });
    return;
  }

  try {
    // Получаем текущие цели пользователя
    const [rows]: any = await pool.query(
      "SELECT goals FROM goals WHERE user_id = ?",
      [user_id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Пользователь не найден" });
      return;
    }

    const currentGoals: any[] =
      typeof rows[0].goals === "string"
        ? JSON.parse(rows[0].goals)
        : rows[0].goals;

    // Обновляем статус нужной цели
    const updatedGoals = currentGoals.map(goal => {
      if (goal.createdAt === createdAt) {
        return { ...goal, status }; // <-- ставим статус с фронта
      }
      return goal;
    });

    // Обновляем запись в базе
    await pool.query(
      "UPDATE goals SET goals = ? WHERE user_id = ?",
      [JSON.stringify(updatedGoals), user_id]
    );

    res.status(200).json({ message: "Статус цели обновлен", goals: updatedGoals });
  } catch (err: any) {
    console.error("Ошибка при обновлении цели:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});