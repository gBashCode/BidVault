import { createWorker } from "../lib/queue-factory.js";
import {
  handleCheckReveals,
  handleSealTender,
  handleRevealTender,
  queueName,
} from "../queues/tender-scheduler.js";

export async function initWorker() {
  const worker = await createWorker(
    queueName,
    async (job) => {
      switch (job.name) {
        case "check-reveals":
          await handleCheckReveals();
          break;
        case "seal-tender":
          if (!job.data?.tenderId) {
            throw new Error("Missing tenderId in job data");
          }
          await handleSealTender(job.data.tenderId);
          break;
        case "reveal-tender":
          if (!job.data?.tenderId) {
            throw new Error("Missing tenderId in job data");
          }
          await handleRevealTender(job.data.tenderId);
          break;
        default:
          console.warn(`[Worker] Unknown job name: ${job.name}`);
      }
    },
    {
      concurrency: 5,
    },
  );

  worker.on("failed", (job: any, err: Error) => {
    console.error(`🚨 Job ${job?.id} (${job?.name}) failed after all retries:`, err.message);
    if (process.env.SENTRY_DSN) {
      console.log(`[Sentry] Alert: captured exception for job ${job?.id}: ${err.message}`);
    }
  });

  return worker;
}
