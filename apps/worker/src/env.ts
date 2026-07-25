import "dotenv/config";

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://sitemonitor:sitemonitor@localhost:5432/sitemonitor",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
};
