import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Report } from "../api/types";

export function ReportsList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setReports(await api.listReports());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000); // pending reports flip to completed once the worker finishes
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Reports</h1>
      {error && <p className="error">{error}</p>}
      {reports.length === 0 ? (
        <p>No reports requested yet. Generate one from a monitor's detail page.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Requested</th>
              <th>Period</th>
              <th>Status</th>
              <th>Uptime</th>
              <th>Avg response</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link to={`/reports/${r.id}`}>{new Date(r.createdAt).toLocaleString()}</Link>
                </td>
                <td>
                  {new Date(r.periodStart).toLocaleDateString()} → {new Date(r.periodEnd).toLocaleDateString()}
                </td>
                <td className={`status-${r.status}`}>{r.status}</td>
                <td>{r.uptimePct !== null ? `${r.uptimePct.toFixed(1)}%` : "—"}</td>
                <td>{r.avgResponseTimeMs !== null ? `${Math.round(r.avgResponseTimeMs)}ms` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
