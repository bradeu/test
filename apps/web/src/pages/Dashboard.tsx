import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Monitor } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";

export function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setMonitors(await api.listMonitors());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // poll so worker-driven status changes show up live
    return () => clearInterval(interval);
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this monitor?")) return;
    await api.deleteMonitor(id);
    load();
  }

  if (loading) return <p>Loading monitors…</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Monitors</h1>
        <Link className="btn" to="/monitors/new">
          + Add Monitor
        </Link>
      </div>
      {error && <p className="error">{error}</p>}
      {monitors.length === 0 ? (
        <p>No monitors yet. Add one to start checking a URL.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>URL</th>
              <th>Interval</th>
              <th>Status</th>
              <th>Last checked</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {monitors.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link to={`/monitors/${m.id}`}>{m.name}</Link>
                </td>
                <td className="mono">{m.url}</td>
                <td>{m.intervalMinutes}m</td>
                <td>
                  <StatusBadge status={m.lastStatus} />
                </td>
                <td>{m.lastCheckedAt ? new Date(m.lastCheckedAt).toLocaleTimeString() : "—"}</td>
                <td>
                  <button className="btn-link danger" onClick={() => handleDelete(m.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
