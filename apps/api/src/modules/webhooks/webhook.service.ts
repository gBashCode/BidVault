import { randomBytes, createHmac } from 'crypto';
import { prisma } from '@sealedbid/db';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

let webhookQueue: any = null;

async function getQueue() {
  if (webhookQueue) return webhookQueue;
  
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
    webhookQueue = new Queue('webhooks', { connection });
  } catch (e) {
    webhookQueue = {
      add: async (name: string, data: any) => {
        setImmediate(() => dispatch(data.eventType, data.tenderId));
        return { id: 'mock-job-id' };
      }
    };
  }
  return webhookQueue;
}

export async function queueWebhook(eventType: string, tenderId: string) {
  const q = await getQueue();
  await q.add('deliver', { eventType, tenderId });
}

// Helper to check for private/localhost IPs to prevent SSRF
export function isPrivateUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // Check private ranges
    // 10.0.0.0 - 10.255.255.255
    // 172.16.0.0 - 172.31.255.255
    // 192.168.0.0 - 192.168.255.255
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.')
    ) {
      return true;
    }
    
    const parts = hostname.split('.');
    if (parts[0] === '172') {
      const second = parseInt(parts[1], 10);
      if (second >= 16 && second <= 31) {
        return true;
      }
    }

    return false;
  } catch (e) {
    return true; // block malformed URLs
  }
}

export async function createWebhook(orgId: string, url: string, events: string[]) {
  // Generate random 32-byte secret in hex (64 chars)
  const secret = randomBytes(32).toString('hex');

  const webhook = await prisma.webhook.create({
    data: {
      orgId,
      url,
      secret,
      events,
      isActive: true,
    },
  });

  return {
    id: webhook.id,
    orgId: webhook.orgId,
    url: webhook.url,
    events: webhook.events,
    isActive: webhook.isActive,
    createdAt: webhook.createdAt,
  };
}

export async function dispatch(eventType: string, tenderId: string) {
  // 1. Fetch Tender details
  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    include: { org: true },
  });

  if (!tender) return;

  // 2. Find matching webhooks
  const webhooks = await prisma.webhook.findMany({
    where: {
      orgId: tender.orgId,
      isActive: true,
    },
  });

  const matchedWebhooks = webhooks.filter((w) => w.events.includes(eventType));
  if (matchedWebhooks.length === 0) return;

  // 3. Assemble payload
  const eventId = 'evt_' + randomBytes(12).toString('hex');
  const now = new Date();

  // Minimal safe data
  const data: Record<string, any> = {
    tenderId,
    status: tender.status,
    title: tender.title,
    revealTime: tender.revealTime.toISOString(),
  };

  // Fetch bids to include minimal anonymized stats
  const bids = await prisma.bid.findMany({
    where: { tenderId },
  });

  data.bidCount = bids.length;

  // If bid submitted/revealed event, add relevant metadata
  if (eventType === 'bid.submitted' || eventType === 'bid.revealed') {
    const latestBid = bids.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0];
    if (latestBid) {
      const vendorHash = '0x' + bytesToHex(keccak_256(utf8ToBytes(latestBid.vendorId + tenderId)));
      data.latestBid = {
        id: latestBid.id,
        vendorHash,
        commitment: latestBid.commitment,
        submittedAt: latestBid.submittedAt.toISOString(),
      };

      // Security Rule 1: Never include plaintext bid unless tender.status === 'AWARDED'
      if (tender.status === 'AWARDED' && latestBid.plaintextBid) {
        data.latestBid.plaintextBid = typeof latestBid.plaintextBid === 'string'
          ? JSON.parse(latestBid.plaintextBid)
          : latestBid.plaintextBid;
      }
    }
  }

  const payload = {
    id: eventId,
    type: eventType,
    tenderId,
    occurredAt: now.toISOString(),
    data,
  };

  const payloadBody = JSON.stringify(payload);

  // 4. Dispatch to each target
  for (const webhook of matchedWebhooks) {
    // SSRF protection (allowed in test mode to support local integration tests)
    if (isPrivateUrl(webhook.url) && process.env.NODE_ENV !== 'test') {
      console.warn(`[SSRF Prevented] Disallowed private webhook destination: ${webhook.url}`);
      continue;
    }

    const timestamp = Date.now().toString();
    const nonce = randomBytes(16).toString('hex');

    // Signature: HMAC_SHA256(secret, timestamp + '.' + nonce + '.' + body)
    const signatureInput = `${timestamp}.${nonce}.${payloadBody}`;
    const signature = createHmac('sha256', webhook.secret).update(signatureInput).digest('hex');

    // Run delivery inside worker context with 3x retry exponential backoff
    await deliverWithRetry(webhook, eventId, eventType, payloadBody, timestamp, nonce, signature);
  }
}

async function deliverWithRetry(
  webhook: any,
  eventId: string,
  eventType: string,
  body: string,
  timestamp: string,
  nonce: string,
  signature: string,
  attempt = 1
) {
  let statusCode: number | null = null;
  let errorMsg: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SealedBid-Signature': signature,
        'X-SealedBid-Timestamp': timestamp,
        'X-SealedBid-Nonce': nonce,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    statusCode = response.status;
    if (!response.ok) {
      errorMsg = `HTTP Error ${response.status}`;
    }
  } catch (err: any) {
    errorMsg = err.message || 'Fetch failed';
  }

  // Log delivery attempt
  await prisma.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      eventId,
      eventType,
      statusCode,
      error: errorMsg,
      attempt,
    },
  });

  // Handle retry
  if (errorMsg && attempt < 3) {
    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s backoff
    setTimeout(() => {
      deliverWithRetry(webhook, eventId, eventType, body, timestamp, nonce, signature, attempt + 1);
    }, delay);
  }
}

export async function dispatchTestEvent(webhookId: string) {
  const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!webhook) throw new Error('Webhook not found');

  const eventId = 'evt_test_' + randomBytes(12).toString('hex');
  const payload = {
    id: eventId,
    type: 'webhook.test',
    occurredAt: new Date().toISOString(),
    data: { test: true },
  };

  const payloadBody = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString('hex');
  
  const signatureInput = `${timestamp}.${nonce}.${payloadBody}`;
  const signature = createHmac('sha256', webhook.secret).update(signatureInput).digest('hex');

  await deliverWithRetry(webhook, eventId, 'webhook.test', payloadBody, timestamp, nonce, signature);
}

export async function rotateSecret(webhookId: string) {
  const newSecret = randomBytes(32).toString('hex');
  const webhook = await prisma.webhook.update({
    where: { id: webhookId },
    data: { secret: newSecret },
  });

  return {
    id: webhook.id,
    orgId: webhook.orgId,
    url: webhook.url,
    events: webhook.events,
    isActive: webhook.isActive,
    createdAt: webhook.createdAt,
  };
}
