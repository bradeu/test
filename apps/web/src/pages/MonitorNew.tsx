import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export function MonitorNew() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://");
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const monitor = await api.createMonitor({ name, url, intervalMinutes });
      navigate(`/monitors/${monitor.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Add Monitor</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My website" required />
        </label>
        <label>
          URL
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
          />
        </label>
        <label>
          Check interval (minutes)
          <input
            type="number"
            min={1}
            max={1440}
            value={intervalMinutes}
            onChange={(e) => setIntervalMinutes(Number(e.target.value))}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create Monitor"}
        </button>
      </form>
    </div>
  );
}
