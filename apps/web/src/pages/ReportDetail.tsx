import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Report } from "../api/types";

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function poll() {
      try {
        const r = await api.getReport(id!);
        if (cancelled) return;
        setReport(r);
        setError(null);
        if (r.status === "pending") {
          setTimeout(poll, 2000); // worker still aggregating; keep polling until it flips
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }
    poll();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!report) return <p>Loading…</p>;

  return (
    <div>
      <h1>Report</h1>
      <p>
        Period: {new Date(report.periodStart).toLocaleString()} → {new Date(report.periodEnd).toLocaleString()}
      </p>
      <p className={`status-${report.status}`}>Status: {report.status}</p>

      {report.status === "pending" && <p>Worker is aggregating checks for this monitor…</p>}

      {report.status === "completed" && (
        <table className="table">
          <tbody>
            <tr>
              <th>Total checks</th>
              <td>{report.totalChecks}</td>
            </tr>
            <tr>
              <th>Successful checks</th>
              <td>{report.successCount}</td>
            </tr>
            <tr>
              <th>Uptime</th>
              <td>{report.uptimePct !== null ? `${report.uptimePct.toFixed(2)}%` : "—"}</td>
            </tr>
            <tr>
              <th>Avg response time</th>
              <td>{report.avgResponseTimeMs !== null ? `${Math.round(report.avgResponseTimeMs)}ms` : "—"}</td>
            </tr>
          </tbody>
        </table>
      )}

      {report.status === "failed" && <p className="error">{report.error}</p>}
    </div>
  );
}
