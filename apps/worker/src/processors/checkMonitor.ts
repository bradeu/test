import type { Job } from "bullmq";
import type { CheckMonitorJobData } from "@sitemonitor/shared";
import { pool } from "../db";
import { lookupGeo } from "../lib/geoLookup";

interface MonitorRow {
  id: string;
  url: string;
  is_active: boolean;
}

// Fetches the monitored URL, times the response, looks up geo/ISP info for the host,
// and writes one row to `checks`. This is the worker's real side effect.
export async function processCheckMonitor(job: Job<CheckMonitorJobData>): Promise<void> {
  const { monitorId } = job.data;

  const { rows } = await pool.query<MonitorRow>("SELECT id, url, is_active FROM monitors WHERE id = $1", [
    monitorId,
  ]);
  if (rows.length === 0) {
    console.warn(`checkMonitor: monitor ${monitorId} no longer exists, skipping`);
    return;
  }
  const monitor = rows[0];
  if (!monitor.is_active) {
    console.log(`checkMonitor: monitor ${monitorId} is inactive, skipping`);
    return;
  }

  const startedAt = Date.now();
  let statusCode: number | null = null;
  let success = false;
  let error: string | null = null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(monitor.url, { method: "GET", redirect: "follow", signal: controller.signal });
    statusCode = response.status;
    success = response.status >= 200 && response.status < 400;
  } catch (err) {
    error = (err as Error).message;
    success = false;
  } finally {
    clearTimeout(timeout);
  }

  const responseTimeMs = Date.now() - startedAt;

  let hostname: string | null = null;
  try {
    hostname = new URL(monitor.url).hostname;
  } catch {
    hostname = null;
  }
  const geo = hostname ? await lookupGeo(hostname) : { country: null, city: null, isp: null };

  await pool.query(
    `INSERT INTO checks (monitor_id, status_code, response_time_ms, success, error, geo_country, geo_city, geo_isp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [monitorId, statusCode, responseTimeMs, success, error, geo.country, geo.city, geo.isp]
  );

  console.log(
    `checkMonitor: ${monitor.url} -> ${success ? "UP" : "DOWN"} (${statusCode ?? "no response"}, ${responseTimeMs}ms)`
  );
}
