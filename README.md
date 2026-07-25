# Site Monitor

Small full-stack TypeScript app: an Express REST API, a BullMQ background worker, and a React (Vite) frontend. You add a URL to monitor; the API schedules recurring background checks; the worker fetches the URL, looks up geo/ISP info for the host via a third-party API (ip-api.com), and writes results to Postgres. You can also request an aggregated uptime report, which the worker computes asynchronously.

## Structure

```
apps/api      Express REST API (routes, Postgres queries, enqueues BullMQ jobs)
apps/worker   BullMQ worker (processes check-monitor and generate-report jobs)
apps/web      React + Vite frontend (React Router pages, calls the API)
packages/shared  Shared TypeScript types (Monitor, Check, Report, job payloads)
```

No ORM, no codegen, no dynamic DI — plain Express handlers, plain `pg` queries, plain BullMQ `Worker` processor functions.

## Prerequisites

- Node.js 22+
- A Postgres server reachable at the `DATABASE_URL` in `.env` (see below)
- Docker, for Redis (used by BullMQ)

This repo's `docker-compose.yml` only runs **Redis**. Postgres is expected to already exist — point `DATABASE_URL` at whatever Postgres instance you use locally (a native install, Postgres.app, another docker container, etc).

## Setup

```bash
npm install
cp .env.example .env   # adjust DATABASE_URL if your Postgres isn't on localhost:5432 with user/db "sitemonitor"

# create the role/db once, against your Postgres instance:
psql -U postgres -c "CREATE ROLE sitemonitor LOGIN PASSWORD 'sitemonitor';"
psql -U postgres -c "CREATE DATABASE sitemonitor OWNER sitemonitor;"

docker compose up -d   # starts Redis
npm run migrate        # applies apps/api/src/migrations/sql/*.sql
```

## Run (three processes)

```bash
npm run dev:api      # http://localhost:4000
npm run dev:worker    # background job processor
npm run dev:web       # http://localhost:5173 (proxies /api to the API)
```

Open http://localhost:5173, add a monitor, and watch checks appear as the worker processes them (the UI polls every few seconds).

## API routes

| Method | Path | Does |
|---|---|---|
| GET | `/api/health` | Postgres + Redis connectivity check |
| POST | `/api/monitors` | create a monitor, schedule recurring checks, enqueue an immediate check |
| GET | `/api/monitors` | list monitors with latest status |
| GET | `/api/monitors/:id` | monitor detail |
| PATCH | `/api/monitors/:id` | update name/url/interval/active (reschedules background job) |
| DELETE | `/api/monitors/:id` | delete monitor + its job schedule |
| POST | `/api/monitors/:id/checks` | enqueue an on-demand check |
| GET | `/api/monitors/:id/checks` | paginated check history |
| POST | `/api/monitors/import` | bulk-create monitors from an uploaded CSV |
| POST | `/api/monitors/:id/reports` | enqueue an aggregated uptime report |
| GET | `/api/reports` | list reports |
| GET | `/api/reports/:id` | report detail (poll while `status: "pending"`) |

## Background jobs

- **check-monitor** — fetches the monitored URL, times the response, calls ip-api.com for geo/ISP info, writes a row to `checks`. Runs on a per-monitor repeating schedule (BullMQ job scheduler) plus on-demand.
- **generate-report** — aggregates `checks` for a monitor over a date range (total/success counts, avg response time, uptime %) and writes the result onto the `reports` row.
