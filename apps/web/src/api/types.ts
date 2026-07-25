export interface Monitor {
  id: string;
  name: string;
  url: string;
  intervalMinutes: number;
  isActive: boolean;
  createdAt: string;
  lastStatus: "up" | "down" | "unknown";
  lastCheckedAt: string | null;
}

export interface Check {
  id: string;
  monitorId: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  success: boolean;
  error: string | null;
  geoCountry: string | null;
  geoCity: string | null;
  geoIsp: string | null;
  checkedAt: string;
}

export type ReportStatus = "pending" | "completed" | "failed";

export interface Report {
  id: string;
  monitorId: string;
  periodStart: string;
  periodEnd: string;
  status: ReportStatus;
  totalChecks: number | null;
  successCount: number | null;
  avgResponseTimeMs: number | null;
  uptimePct: number | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}
