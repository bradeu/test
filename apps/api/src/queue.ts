import { Queue } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_CHECK_MONITOR, QUEUE_GENERATE_REPORT } from "@sitemonitor/shared";
import { env } from "./env";

export const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

export const checkMonitorQueue = new Queue(QUEUE_CHECK_MONITOR, { connection });
export const generateReportQueue = new Queue(QUEUE_GENERATE_REPORT, { connection });

// One repeatable schedule per monitor, keyed by monitorId so we can remove/replace it cleanly.
export function repeatableJobId(monitorId: string): string {
  return `monitor-schedule:${monitorId}`;
}

export async function scheduleMonitorChecks(monitorId: string, intervalMinutes: number): Promise<void> {
  await checkMonitorQueue.upsertJobScheduler(
    repeatableJobId(monitorId),
    { every: intervalMinutes * 60_000 },
    {
      name: "scheduled-check",
      data: { monitorId },
      opts: { removeOnComplete: 50, removeOnFail: 50 },
    }
  );
}

export async function removeMonitorSchedule(monitorId: string): Promise<void> {
  await checkMonitorQueue.removeJobScheduler(repeatableJobId(monitorId));
}

export async function enqueueImmediateCheck(monitorId: string): Promise<void> {
  await checkMonitorQueue.add(
    "manual-check",
    { monitorId },
    { removeOnComplete: 50, removeOnFail: 50 }
  );
}
