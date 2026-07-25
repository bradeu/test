import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Check, Monitor } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";

export function MonitorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [requestingReport, setRequestingReport] = useState(false);

  async function load() {
    if (!id) return;
    try {
      const [m, c] = await Promise.all([api.getMonitor(id), api.listChecks(id, 25)]);
      setMonitor(m);
      setChecks(c);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000); // poll to reflect worker-written checks as they land
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleTriggerCheck() {
    if (!id) return;
    setTriggering(true);
    try {
      await api.triggerCheck(id);
      setTimeout(load, 1500);
    } finally {
      setTriggering(false);
    }
  }

  async function handleToggleActive() {
    if (!id || !monitor) return;
    const updated = await api.updateMonitor(id, { isActive: !monitor.isActive });
    setMonitor(updated);
  }

  async function handleDelete() {
    if (!id || !confirm("Delete this monitor?")) return;
    await api.deleteMonitor(id);
    navigate("/");
  }

  async function handleRequestReport() {
    if (!id) return;
    setRequestingReport(true);
    try {
      const periodEnd = new Date().toISOString();
      const periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const report = await api.requestReport(id, periodStart, periodEnd);
      navigate(`/reports/${report.id}`);
    } finally {
      setRequestingReport(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!monitor) return <p>Loading…</p>;

  return (
    <div>
      <div className="page-header">
        <h1>{monitor.name}</h1>
        <StatusBadge status={monitor.lastStatus} />
      </div>
      <p className="mono">{monitor.url}</p>
      <p>
        Checks every {monitor.intervalMinutes} minute(s) · {monitor.isActive ? "active" : "paused"}
      </p>

      <div className="actions">
        <button className="btn" onClick={handleTriggerCheck} disabled={triggering}>
          {triggering ? "Enqueuing…" : "Check Now"}
        </button>
        <button className="btn secondary" onClick={handleToggleActive}>
          {monitor.isActive ? "Pause" : "Resume"}
        </button>
        <button className="btn secondary" onClick={handleRequestReport} disabled={requestingReport}>
          {requestingReport ? "Requesting…" : "Generate 24h Report"}
        </button>
        <button className="btn-link danger" onClick={handleDelete}>
          Delete
        </button>
      </div>

      <h2>Recent Checks</h2>
      {checks.length === 0 ? (
        <p>No checks yet — the worker will run one shortly.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Status</th>
              <th>HTTP</th>
              <th>Response time</th>
              <th>Location</th>
              <th>ISP</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.checkedAt).toLocaleString()}</td>
                <td>
                  <StatusBadge status={c.success ? "up" : "down"} />
                </td>
                <td>{c.statusCode ?? "—"}</td>
                <td>{c.responseTimeMs !== null ? `${c.responseTimeMs}ms` : "—"}</td>
                <td>{[c.geoCity, c.geoCountry].filter(Boolean).join(", ") || "—"}</td>
                <td>{c.geoIsp ?? "—"}</td>
                <td className="error-cell">{c.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
