import { Router } from "express";
import { pool } from "../db";
import { connection } from "../queue";
import { asyncRoute } from "../middleware/errorHandler";

export const healthRouter = Router();

healthRouter.get(
  "/health",
  asyncRoute(async (_req, res) => {
    const checks = { api: true, postgres: false, redis: false };

    try {
      await pool.query("SELECT 1");
      checks.postgres = true;
    } catch {
      checks.postgres = false;
    }

    try {
      const pong = await connection.ping();
      checks.redis = pong === "PONG";
    } catch {
      checks.redis = false;
    }

    const healthy = checks.postgres && checks.redis;
    res.status(healthy ? 200 : 503).json({ healthy, checks });
  })
);
