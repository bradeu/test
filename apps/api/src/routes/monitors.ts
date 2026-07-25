import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import type { Monitor, Check } from "@sitemonitor/shared";
import { pool } from "../db";
import { enqueueImmediateCheck, scheduleMonitorChecks, removeMonitorSchedule, generateReportQueue } from "../queue";
import { asyncRoute, HttpError } from "../middleware/errorHandler";

export const monitorsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 }, // 1MB CSV cap
});

interface MonitorRow {
  id: string;
  name: string;
  url: string;
  interval_minutes: number;
  is_active: boolean;
  created_at: string;
  last_success: boolean | null;
  last_checked_at: string | null;
}

function mapMonitor(row: MonitorRow): Monitor {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    intervalMinutes: row.interval_minutes,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastStatus: row.last_checked_at === null ? "unknown" : row.last_success ? "up" : "down",
    lastCheckedAt: row.last_checked_at,
  };
}

const MONITOR_SELECT = `
  SELECT
    m.id, m.name, m.url, m.interval_minutes, m.is_active, m.created_at,
    lc.success AS last_success, lc.checked_at AS last_checked_at
  FROM monitors m
  LEFT JOIN LATERAL (
    SELECT success, checked_at FROM checks c
    WHERE c.monitor_id = m.id
    ORDER BY checked_at DESC
    LIMIT 1
  ) lc ON true
`;

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// POST /api/monitors — create a monitor, persist it, and schedule recurring background checks.
monitorsRouter.post(
  "/monitors",
  asyncRoute(async (req, res) => {
    const { name, url, intervalMinutes = 5 } = req.body ?? {};

    if (typeof name !== "string" || name.trim().length === 0) {
      throw new HttpError(400, "name is required");
    }
    if (typeof url !== "string" || !isValidUrl(url)) {
      throw new HttpError(400, "url must be a valid http(s) URL");
    }
    const interval = Number(intervalMinutes);
    if (!Number.isFinite(interval) || interval < 1 || interval > 1440) {
      throw new HttpError(400, "intervalMinutes must be between 1 and 1440");
    }

    const { rows } = await pool.query<MonitorRow>(
      `INSERT INTO monitors (name, url, interval_minutes) VALUES ($1, $2, $3)
       RETURNING id, name, url, interval_minutes, is_active, created_at, NULL::boolean AS last_success, NULL::timestamptz AS last_checked_at`,
      [name.trim(), url, interval]
    );

    const monitor = mapMonitor(rows[0]);
    await scheduleMonitorChecks(monitor.id, interval);
    await enqueueImmediateCheck(monitor.id);

    res.status(201).json(monitor);
  })
);

// GET /api/monitors — list all monitors with their most recent check status.
monitorsRouter.get(
  "/monitors",
  asyncRoute(async (_req, res) => {
    const { rows } = await pool.query<MonitorRow>(`${MONITOR_SELECT} ORDER BY m.created_at DESC`);
    res.json(rows.map(mapMonitor));
  })
);

// POST /api/monitors/import — bulk-create monitors from an uploaded CSV (columns: name,url,intervalMinutes).
monitorsRouter.post(
  "/monitors/import",
  upload.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file) {
      throw new HttpError(400, "file upload is required (multipart field 'file')");
    }

    let records: Record<string, string>[];
    try {
      records = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
    } catch (err) {
      throw new HttpError(400, `could not parse CSV: ${(err as Error).message}`);
    }

    const created: Monitor[] = [];
    const errors: { row: number; message: string }[] = [];

    for (const [index, record] of records.entries()) {
      const name = record.name?.trim();
      const url = record.url?.trim();
      const interval = record.intervalMinutes ? Number(record.intervalMinutes) : 5;

      if (!name || !url || !isValidUrl(url) || !Number.isFinite(interval) || interval < 1 || interval > 1440) {
        errors.push({ row: index + 2, message: "invalid name/url/intervalMinutes" });
        continue;
      }

      const { rows } = await pool.query<MonitorRow>(
        `INSERT INTO monitors (name, url, interval_minutes) VALUES ($1, $2, $3)
         RETURNING id, name, url, interval_minutes, is_active, created_at, NULL::boolean AS last_success, NULL::timestamptz AS last_checked_at`,
        [name, url, interval]
      );
      const monitor = mapMonitor(rows[0]);
      await scheduleMonitorChecks(monitor.id, interval);
      await enqueueImmediateCheck(monitor.id);
      created.push(monitor);
    }

    res.status(201).json({ created, errors });
  })
);

// GET /api/monitors/:id
monitorsRouter.get(
  "/monitors/:id",
  asyncRoute(async (req, res) => {
    const { rows } = await pool.query<MonitorRow>(`${MONITOR_SELECT} WHERE m.id = $1`, [req.params.id]);
    if (rows.length === 0) throw new HttpError(404, "monitor not found");
    res.json(mapMonitor(rows[0]));
  })
);

// PATCH /api/monitors/:id — update name/url/interval/active flag; reschedules background checks accordingly.
monitorsRouter.patch(
  "/monitors/:id",
  asyncRoute(async (req, res) => {
    const { id } = req.params;
    const { rows: existingRows } = await pool.query<MonitorRow>(`${MONITOR_SELECT} WHERE m.id = $1`, [id]);
    if (existingRows.length === 0) throw new HttpError(404, "monitor not found");
    const existing = mapMonitor(existingRows[0]);

    const name = typeof req.body?.name === "string" && req.body.name.trim() ? req.body.name.trim() : existing.name;
    const url = typeof req.body?.url === "string" ? req.body.url : existing.url;
    const intervalMinutes =
      req.body?.intervalMinutes !== undefined ? Number(req.body.intervalMinutes) : existing.intervalMinutes;
    const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : existing.isActive;

    if (!isValidUrl(url)) throw new HttpError(400, "url must be a valid http(s) URL");
    if (!Number.isFinite(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 1440) {
      throw new HttpError(400, "intervalMinutes must be between 1 and 1440");
    }

    await pool.query(
      `UPDATE monitors SET name = $1, url = $2, interval_minutes = $3, is_active = $4 WHERE id = $5`,
      [name, url, intervalMinutes, isActive, id]
    );

    if (isActive) {
      await scheduleMonitorChecks(id, intervalMinutes);
    } else {
      await removeMonitorSchedule(id);
    }

    const { rows } = await pool.query<MonitorRow>(`${MONITOR_SELECT} WHERE m.id = $1`, [id]);
    res.json(mapMonitor(rows[0]));
  })
);

// DELETE /api/monitors/:id — removes the monitor and its recurring job schedule.
monitorsRouter.delete(
  "/monitors/:id",
  asyncRoute(async (req, res) => {
    const { id } = req.params;
    const { rowCount } = await pool.query("DELETE FROM monitors WHERE id = $1", [id]);
    if (rowCount === 0) throw new HttpError(404, "monitor not found");
    await removeMonitorSchedule(id);
    res.status(204).send();
  })
);

// POST /api/monitors/:id/checks — enqueue an on-demand check job right now.
monitorsRouter.post(
  "/monitors/:id/checks",
  asyncRoute(async (req, res) => {
    const { id } = req.params;
    const { rows } = await pool.query("SELECT id FROM monitors WHERE id = $1", [id]);
    if (rows.length === 0) throw new HttpError(404, "monitor not found");
    await enqueueImmediateCheck(id);
    res.status(202).json({ enqueued: true });
  })
);

// GET /api/monitors/:id/checks — paginated check history, most recent first.
monitorsRouter.get(
  "/monitors/:id/checks",
  asyncRoute(async (req, res) => {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const { rows } = await pool.query(
      `SELECT id, monitor_id, status_code, response_time_ms, success, error, geo_country, geo_city, geo_isp, checked_at
       FROM checks WHERE monitor_id = $1
       ORDER BY checked_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const checks: Check[] = rows.map((r) => ({
      id: r.id,
      monitorId: r.monitor_id,
      statusCode: r.status_code,
      responseTimeMs: r.response_time_ms,
      success: r.success,
      error: r.error,
      geoCountry: r.geo_country,
      geoCity: r.geo_city,
      geoIsp: r.geo_isp,
      checkedAt: r.checked_at,
    }));

    res.json(checks);
  })
);

// POST /api/monitors/:id/reports — request an aggregated report over a date range; processed asynchronously.
monitorsRouter.post(
  "/monitors/:id/reports",
  asyncRoute(async (req, res) => {
    const { id } = req.params;
    const { rows: monitorRows } = await pool.query("SELECT id FROM monitors WHERE id = $1", [id]);
    if (monitorRows.length === 0) throw new HttpError(404, "monitor not found");

    const periodStart = req.body?.periodStart ? new Date(req.body.periodStart) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const periodEnd = req.body?.periodEnd ? new Date(req.body.periodEnd) : new Date();

    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodStart >= periodEnd) {
      throw new HttpError(400, "periodStart must be before periodEnd, both valid dates");
    }

    const { rows } = await pool.query(
      `INSERT INTO reports (monitor_id, period_start, period_end, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [id, periodStart.toISOString(), periodEnd.toISOString()]
    );
    const reportId = rows[0].id as string;

    await generateReportQueue.add(
      "generate-report",
      { reportId, monitorId: id, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() },
      { removeOnComplete: 50, removeOnFail: 50 }
    );

    res.status(202).json({ id: reportId, status: "pending" });
  })
);
