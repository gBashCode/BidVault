import { createWorker } from "../lib/queue-factory.js";
import { handleDeliverWebhook, queueName } from "../queues/webhook.queue.js";

export async function initWebhookWorker() {
  const worker = await createWorker(
    queueName,
    async (job) => {
      if (job.name === "deliver") {
        const { eventType, tenderId } = job.data;
        if (!eventType || !tenderId) {
          throw new Error("Missing eventType or tenderId in job data");
        }
        await handleDeliverWebhook(eventType, tenderId);
      }
    },
    {
      concurrency: 5,
    },
  );

  worker.on("failed", (job: any, err: Error) => {
    console.error(`🚨 Webhook Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
