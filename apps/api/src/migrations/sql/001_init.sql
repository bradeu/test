CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE monitors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  url              TEXT NOT NULL,
  interval_minutes INTEGER NOT NULL DEFAULT 5,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE checks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id        UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  status_code       INTEGER,
  response_time_ms  INTEGER,
  success           BOOLEAN NOT NULL,
  error             TEXT,
  geo_country       TEXT,
  geo_city          TEXT,
  geo_isp           TEXT,
  checked_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checks_monitor_id_checked_at ON checks (monitor_id, checked_at DESC);

CREATE TABLE reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id            UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  period_start          TIMESTAMPTZ NOT NULL,
  period_end            TIMESTAMPTZ NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending',
  total_checks          INTEGER,
  success_count         INTEGER,
  avg_response_time_ms  NUMERIC,
  uptime_pct            NUMERIC,
  error                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at          TIMESTAMPTZ
);

CREATE INDEX idx_reports_monitor_id ON reports (monitor_id, created_at DESC);
