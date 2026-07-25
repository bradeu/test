import { Worker } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_CHECK_MONITOR, QUEUE_GENERATE_REPORT } from "@sitemonitor/shared";
import type { CheckMonitorJobData, GenerateReportJobData } from "@sitemonitor/shared";
import { env } from "./env";
import { processCheckMonitor } from "./processors/checkMonitor";
import { processGenerateReport } from "./processors/generateReport";

const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

const checkMonitorWorker = new Worker<CheckMonitorJobData>(QUEUE_CHECK_MONITOR, processCheckMonitor, {
  connection,
  concurrency: 5,
});

const generateReportWorker = new Worker<GenerateReportJobData>(QUEUE_GENERATE_REPORT, processGenerateReport, {
  connection,
  concurrency: 2,
});

for (const worker of [checkMonitorWorker, generateReportWorker]) {
  worker.on("completed", (job) => console.log(`[${worker.name}] job ${job.id} completed`));
  worker.on("failed", (job, err) => console.error(`[${worker.name}] job ${job?.id} failed:`, err.message));
}

console.log("Worker process started. Listening for jobs on:", QUEUE_CHECK_MONITOR, QUEUE_GENERATE_REPORT);

async function shutdown(): Promise<void> {
  console.log("Shutting down worker...");
  await Promise.all([checkMonitorWorker.close(), generateReportWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
