import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Monitor } from "../api/types";

export function MonitorImport() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ created: Monitor[]; errors: { row: number; message: string }[] } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      setResult(await api.importMonitors(file));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Import Monitors from CSV</h1>
      <p>
        Upload a CSV with columns <code>name,url,intervalMinutes</code>. Each valid row is created as a monitor and
        an initial check is enqueued immediately.
      </p>
      <form className="form" onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={!file || submitting}>
          {submitting ? "Importing…" : "Import"}
        </button>
      </form>

      {result && (
        <div className="import-result">
          <p>
            Created {result.created.length} monitor(s), {result.errors.length} row(s) skipped.
          </p>
          {result.created.length > 0 && (
            <ul>
              {result.created.map((m) => (
                <li key={m.id}>
                  <Link to={`/monitors/${m.id}`}>{m.name}</Link> — {m.url}
                </li>
              ))}
            </ul>
          )}
          {result.errors.length > 0 && (
            <ul className="error">
              {result.errors.map((e) => (
                <li key={e.row}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
