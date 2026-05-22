import { Queue as BullQueue, Worker as BullWorker, Processor } from 'bullmq';
import Redis from 'ioredis';

let isRedisOnline: boolean | null = null;
let redisConnection: Redis | null = null;

export async function checkRedisConnection(): Promise<boolean> {
  if (isRedisOnline !== null) return isRedisOnline;
  
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 1000,
    lazyConnect: true,
  });

  try {
    await Promise.race([
      connection.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000)),
    ]);
    await connection.ping();
    isRedisOnline = true;
    redisConnection = connection;
  } catch (e) {
    isRedisOnline = false;
    redisConnection = null;
    connection.disconnect();
  }
  return isRedisOnline;
}

const mockWorkers: Record<string, { processor: Processor; concurrency: number }> = {};
const mockQueues: Record<string, MockQueue> = {};

export class MockQueue {
  name: string;
  constructor(name: string) {
    this.name = name;
    mockQueues[name] = this;
  }

  async add(jobName: string, data: any, opts?: any): Promise<any> {
    const worker = mockWorkers[this.name];
    if (!worker) {
      return { id: 'mock-job-id' };
    }

    const job = {
      name: jobName,
      data,
      id: 'mock-job-' + Math.random().toString(36).slice(2, 11),
      attemptsMade: 0,
      log: (msg: string) => {},
    };

    const runJob = async () => {
      try {
        await worker.processor(job as any);
      } catch (err) {
        const maxAttempts = opts?.attempts || 1;
        if (job.attemptsMade < maxAttempts - 1) {
          job.attemptsMade++;
          const delay = opts?.backoff?.delay || 1000;
          setTimeout(runJob, delay);
        }
      }
    };

    if (opts?.repeat?.every) {
      const runAndSchedule = async () => {
        await runJob();
      };
      // Start interval
      const intervalId = setInterval(runAndSchedule, opts.repeat.every);
      // Run once immediately
      setImmediate(runAndSchedule);
      return { id: job.id, intervalId };
    }

    if (opts?.delay) {
      setTimeout(runJob, opts.delay);
    } else {
      setImmediate(runJob);
    }

    return job;
  }

  async close() {}
}

export class MockWorker {
  name: string;
  private errorHandlers: Function[] = [];

  constructor(name: string, processor: Processor, opts?: any) {
    this.name = name;
    mockWorkers[name] = { processor, concurrency: opts?.concurrency || 1 };
  }

  async close() {}

  on(event: string, handler: Function) {
    if (event === 'failed') {
      this.errorHandlers.push(handler);
    }
    return this;
  }

  async simulateFailure(job: any, error: Error) {
    for (const handler of this.errorHandlers) {
      await handler(job, error);
    }
  }
}

export async function createQueue(name: string): Promise<any> {
  const online = await checkRedisConnection();
  if (online) {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    return new BullQueue(name, { connection: new Redis(redisUrl, { maxRetriesPerRequest: null }) });
  } else {
    return new MockQueue(name);
  }
}

export async function createWorker(name: string, processor: Processor, opts?: any): Promise<any> {
  const online = await checkRedisConnection();
  if (online) {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    return new BullWorker(name, processor, { ...opts, connection: new Redis(redisUrl, { maxRetriesPerRequest: null }) });
  } else {
    return new MockWorker(name, processor, opts);
  }
}
