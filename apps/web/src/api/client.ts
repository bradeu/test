import type { Monitor, Check, Report } from "./types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: options?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  listMonitors: () => request<Monitor[]>("/monitors"),
  getMonitor: (id: string) => request<Monitor>(`/monitors/${id}`),
  createMonitor: (data: { name: string; url: string; intervalMinutes: number }) =>
    request<Monitor>("/monitors", { method: "POST", body: JSON.stringify(data) }),
  updateMonitor: (id: string, data: Partial<{ name: string; url: string; intervalMinutes: number; isActive: boolean }>) =>
    request<Monitor>(`/monitors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMonitor: (id: string) => request<void>(`/monitors/${id}`, { method: "DELETE" }),
  triggerCheck: (id: string) => request<{ enqueued: boolean }>(`/monitors/${id}/checks`, { method: "POST" }),
  listChecks: (id: string, limit = 20) => request<Check[]>(`/monitors/${id}/checks?limit=${limit}`),
  requestReport: (id: string, periodStart: string, periodEnd: string) =>
    request<{ id: string; status: string }>(`/monitors/${id}/reports`, {
      method: "POST",
      body: JSON.stringify({ periodStart, periodEnd }),
    }),
  importMonitors: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ created: Monitor[]; errors: { row: number; message: string }[] }>("/monitors/import", {
      method: "POST",
      body: form,
    });
  },
  listReports: () => request<Report[]>("/reports"),
  getReport: (id: string) => request<Report>(`/reports/${id}`),
};
