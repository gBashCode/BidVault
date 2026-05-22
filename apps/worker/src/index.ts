import Fastify from 'fastify';
import { assertTimeSync, getLastDriftMs } from './lib/time-guard.js';
import { getQueue } from './queues/tender-scheduler.js';
import { initWorker } from './workers/tender.worker.js';
import { initWebhookWorker } from './workers/webhook.worker.js';

async function bootstrap() {
  console.log('🏁 SealedBid Worker: Booting...');

  // 1. Assert NTP Time synchronization on boot
  try {
    await assertTimeSync();
    console.log(`✅ NTP Sync successful: +${getLastDriftMs()}ms OK`);
  } catch (err: any) {
    console.error('🚨 Failed to synchronize system clock with NTP on boot:', err.message);
    process.exit(1);
  }

  // 2. Initialize and start the BullMQ Worker process
  const worker = await initWorker();
  const webhookWorker = await initWebhookWorker();
  console.log('👷 Background workers started successfully.');

  // 3. Register the repeatable 'check-reveals' job
  const queue = await getQueue();
  // BullMQ repeatable jobs are scheduled via the repeat option
  await queue.add('check-reveals', {}, {
    repeat: {
      every: 30000, // runs every 30 seconds
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
  console.log('⏰ Repeatable check-reveals cron scheduled (every 30s).');

  // 4. Set up periodic NTP verification every 60 seconds
  setInterval(async () => {
    try {
      await assertTimeSync();
    } catch (err: any) {
      console.error(`🚨 Halting worker process due to critical NTP verification error: ${err.message}`);
      // Close the workers immediately to stop processing
      await worker.close();
      await webhookWorker.close();
      await queue.close();
      process.exit(1);
    }
  }, 60000);

  // 5. Host a lightweight health-check endpoint via Fastify
  const fastify = Fastify({ logger: false });

  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      ntpDriftMs: getLastDriftMs(),
    };
  });

  const port = Number(process.env.PORT || 3001);
  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🏥 Health check server running on http://localhost:${port}/health`);
  } catch (err) {
    console.error('🏥 Failed to start health check server:', err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('💥 Unhandled exception during worker boot sequence:', err);
  process.exit(1);
});
