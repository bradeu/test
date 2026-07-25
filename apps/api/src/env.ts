import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL", "postgres://sitemonitor:sitemonitor@localhost:5432/sitemonitor"),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  port: Number(process.env.API_PORT ?? 4000),
  corsOrigin: required("CORS_ORIGIN", "http://localhost:5173"),
};
