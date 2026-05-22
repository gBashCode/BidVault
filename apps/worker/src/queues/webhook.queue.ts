import { createQueue } from "../lib/queue-factory.js";
import * as webhookService from "../../../api/src/modules/webhooks/webhook.service.js";

export const queueName = "webhooks";
let webhookQueue: any = null;

export async function getWebhookQueue() {
  if (!webhookQueue) {
    webhookQueue = await createQueue(queueName);
  }
  return webhookQueue;
}

export async function handleDeliverWebhook(eventType: string, tenderId: string): Promise<void> {
  await webhookService.dispatch(eventType, tenderId);
}
