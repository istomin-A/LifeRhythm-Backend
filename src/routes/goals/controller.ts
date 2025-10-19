import { Router } from "express";
import type { Request, Response } from "express";
import { sendEmail } from "./sendEmail.js";
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
      endDateTask: goal.endDateTask ?? "",
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
  const { status, dateDone } = req.body; // 👈 теперь принимаем дату выполнения

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

    // Обновляем нужную цель
    const updatedGoals = currentGoals.map(goal => {
      if (goal.createdAt === createdAt) {
        return {
          ...goal,
          status,
          // добавляем поле, если пришло значение
          dateDone: dateDone ?? goal.dateDone ?? null
        };
      }
      return goal;
    });

    // Обновляем запись в базе
    await pool.query(
      "UPDATE goals SET goals = ? WHERE user_id = ?",
      [JSON.stringify(updatedGoals), user_id]
    );

    res.status(200).json({
      message: "Статус и дата выполнения обновлены",
      goals: updatedGoals
    });
  } catch (err: any) {
    console.error("Ошибка при обновлении цели:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

router.patch("/end-date/:user_id/:createdAt", async (req: Request, res: Response): Promise<void> => {
  const { user_id, createdAt } = req.params;
  const { endDateTask } = req.body;

  if (!user_id || !createdAt) {
    res.status(400).json({ message: "user_id и createdAt обязательны" });
    return;
  }

  if (!endDateTask) {
    res.status(400).json({ message: "endDateTask обязателен" });
    return;
  }

  try {
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

    const updatedGoals = currentGoals.map(goal => {
      if (goal.createdAt === createdAt) {
        return { ...goal, endDateTask };
      }
      return goal;
    });

    await pool.query(
      "UPDATE goals SET goals = ? WHERE user_id = ?",
      [JSON.stringify(updatedGoals), user_id]
    );

    res.status(200).json({ message: "Дата завершения задачи обновлена", goals: updatedGoals });
  } catch (err: any) {
    console.error("Ошибка при обновлении даты завершения:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

router.post("/send-email/:user_id/:createdAt", async (req: Request, res: Response): Promise<void> => {
  const { user_id, createdAt } = req.params;
  const { to, subject, text } = req.body;

  // Проверка обязательных данных
  if (!user_id || !createdAt) {
    res.status(400).json({ message: "user_id и createdAt обязательны" });
    return;
  }

  if (!to || !subject || !text) {
    res.status(400).json({ message: "Поля to, subject и text обязательны" });
    return;
  }

  try {
    // Проверяем, есть ли пользователь и его цели
    const [rows]: any = await pool.query(
      "SELECT goals FROM goals WHERE user_id = ?",
      [user_id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "Пользователь не найден" });
      return;
    }

    // Ищем задачу по createdAt
    const currentGoals: any[] =
      typeof rows[0].goals === "string"
        ? JSON.parse(rows[0].goals)
        : rows[0].goals;

    const task = currentGoals.find((goal) => goal.createdAt === createdAt);

    if (!task) {
      res.status(404).json({ message: "Задача с таким createdAt не найдена" });
      return;
    }

    // Отправляем письмо
    const info = await sendEmail(to, subject, text);

    console.log(`📧 Письмо по задаче "${task.title ?? "(без названия)"}" отправлено пользователю ${user_id}`);

    // (опционально) — можно записать факт отправки письма в БД
    // Например, добавить поле `emailSentAt` в задачу:
    const updatedGoals = currentGoals.map((goal) =>
      goal.createdAt === createdAt
        ? { ...goal, emailSentAt: new Date().toISOString() }
        : goal
    );

    await pool.query(
      "UPDATE goals SET goals = ? WHERE user_id = ?",
      [JSON.stringify(updatedGoals), user_id]
    );

    // Ответ клиенту
    res.status(200).json({
      success: true,
      message: "Письмо успешно отправлено",
      messageId: info.messageId,
      updatedGoals,
    });
  } catch (error: any) {
    console.error("Ошибка при отправке письма:", error);
    res.status(500).json({ message: "Ошибка при отправке письма", error });
  }
});