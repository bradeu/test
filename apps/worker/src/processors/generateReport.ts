import type { Job } from "bullmq";
import type { GenerateReportJobData } from "@sitemonitor/shared";
import { pool } from "../db";

interface AggregateRow {
  total_checks: string;
  success_count: string;
  avg_response_time_ms: string | null;
}

// Aggregates the checks recorded for a monitor over a date range and writes the summary
// back onto the report row. Real DB work, no external call needed for this job type.
export async function processGenerateReport(job: Job<GenerateReportJobData>): Promise<void> {
  const { reportId, monitorId, periodStart, periodEnd } = job.data;

  try {
    const { rows } = await pool.query<AggregateRow>(
      `SELECT
         COUNT(*)::text AS total_checks,
         COUNT(*) FILTER (WHERE success)::text AS success_count,
         AVG(response_time_ms)::text AS avg_response_time_ms
       FROM checks
       WHERE monitor_id = $1 AND checked_at >= $2 AND checked_at <= $3`,
      [monitorId, periodStart, periodEnd]
    );

    const totalChecks = Number(rows[0].total_checks);
    const successCount = Number(rows[0].success_count);
    const avgResponseTimeMs = rows[0].avg_response_time_ms === null ? null : Number(rows[0].avg_response_time_ms);
    const uptimePct = totalChecks > 0 ? (successCount / totalChecks) * 100 : null;

    await pool.query(
      `UPDATE reports
       SET status = 'completed', total_checks = $1, success_count = $2,
           avg_response_time_ms = $3, uptime_pct = $4, completed_at = now()
       WHERE id = $5`,
      [totalChecks, successCount, avgResponseTimeMs, uptimePct, reportId]
    );

    console.log(`generateReport: report ${reportId} completed (${totalChecks} checks, ${uptimePct ?? "n/a"}% uptime)`);
  } catch (err) {
    await pool.query(`UPDATE reports SET status = 'failed', error = $1, completed_at = now() WHERE id = $2`, [
      (err as Error).message,
      reportId,
    ]);
    throw err;
  }
}
