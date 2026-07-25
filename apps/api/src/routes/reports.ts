import { Router } from "express";
import type { Report } from "@sitemonitor/shared";
import { pool } from "../db";
import { asyncRoute, HttpError } from "../middleware/errorHandler";

export const reportsRouter = Router();

function mapReport(r: any): Report {
  return {
    id: r.id,
    monitorId: r.monitor_id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    status: r.status,
    totalChecks: r.total_checks,
    successCount: r.success_count,
    avgResponseTimeMs: r.avg_response_time_ms === null ? null : Number(r.avg_response_time_ms),
    uptimePct: r.uptime_pct === null ? null : Number(r.uptime_pct),
    error: r.error,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  };
}

// GET /api/reports — most recent reports across all monitors.
reportsRouter.get(
  "/reports",
  asyncRoute(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM reports ORDER BY created_at DESC LIMIT 50`
    );
    res.json(rows.map(mapReport));
  })
);

// GET /api/reports/:id — poll this while status is "pending" to see worker progress.
reportsRouter.get(
  "/reports/:id",
  asyncRoute(async (req, res) => {
    const { rows } = await pool.query(`SELECT * FROM reports WHERE id = $1`, [req.params.id]);
    if (rows.length === 0) throw new HttpError(404, "report not found");
    res.json(mapReport(rows[0]));
  })
);
