import express from "express";
import type { Application } from "express";
import cors from "cors";
import indexRoutes from "./routes/users/index.js";
import userRoutes from "./routes/users/users.js";
import goalsRouter from "./routes/goals/index.js";
import corsOptions from "./config/cors.js";
import bodyParser from "body-parser";

const app: Application = express();

// Middleware
app.use(bodyParser.json());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Маршруты
app.use("/", indexRoutes);
app.use("/users", userRoutes);
app.use("/api/goals", goalsRouter);

export default app;