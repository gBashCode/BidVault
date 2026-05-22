import { PrismaClient } from '@prisma/client';
import { createCommitment } from '@sealedbid/crypto';

// Custom error to mimic Prisma Raw Query / Constraint Errors
class PrismaConstraintError extends Error {
  code = 'P2010';
  meta: any;
  constructor(message: string) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.meta = { message };
  }
}

const realPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://sealedbid:sealedbid@localhost:5432/sealedbid',
    },
  },
  log: ['error'],
});

// Shared in-memory database for sandbox fallback mode
export const mockDb = {
  orgs: [] as any[],
  users: [] as any[],
  tenders: [] as any[],
  bids: [] as any[],
  auditLogs: [] as any[],
  webhooks: [] as any[],
  webhookDeliveries: [] as any[],
};

// Check database reachability synchronously/lazily on first request
let isDbReachable: boolean | null = null;

async function checkConnection() {
  if (isDbReachable !== null) return isDbReachable;
  try {
    // Fast ping
    await Promise.race([
      realPrisma.$connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000)),
    ]);
    isDbReachable = true;
    console.log('🧪 SealedBid Client: Connected to PostgreSQL.');
  } catch (e) {
    isDbReachable = false;
    console.log('🧪 SealedBid Client: PostgreSQL offline. Enabling transparent Sandbox Mock DB.');
  }
  return isDbReachable;
}

function makeMockCuid(prefix = 'c') {
  // Conforms to Zod's .cuid() regex: starts with c, alphanumeric, length 25
  const randomPart = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return (prefix + randomPart).slice(0, 25).toLowerCase();
}

export const mockRlsContext = {
  currentUserId: null as string | null,
  currentOrgId: null as string | null,
};

function mockCheckUserRls(user: any): boolean {
  if (!mockRlsContext.currentOrgId) return true;
  return user.orgId === mockRlsContext.currentOrgId;
}

function mockCheckTenderRls(tender: any): boolean {
  if (!mockRlsContext.currentOrgId) return true;
  return tender.orgId === mockRlsContext.currentOrgId;
}

function mockCheckBidRls(bid: any): boolean {
  if (!mockRlsContext.currentUserId) return true;
  const user = mockDb.users.find((u) => u.id === mockRlsContext.currentUserId);
  if (!user) return false;
  
  if (bid.vendorId === user.id) return true;
  
  if (['PROCUREMENT_MANAGER', 'AUDITOR', 'ORG_ADMIN'].includes(user.role)) {
    const tender = mockDb.tenders.find((t) => t.id === bid.tenderId);
    if (tender && tender.orgId === user.orgId) return true;
  }
  
  return false;
}

function mockCheckWebhookRls(webhook: any): boolean {
  if (!mockRlsContext.currentOrgId) return true;
  return webhook.orgId === mockRlsContext.currentOrgId;
}

function mockCheckWebhookDeliveryRls(delivery: any): boolean {
  if (!mockRlsContext.currentOrgId) return true;
  const webhook = mockDb.webhooks.find((w) => w.id === delivery.webhookId);
  return webhook ? webhook.orgId === mockRlsContext.currentOrgId : false;
}

const mockPrisma = {
  $connect: async () => {},
  $disconnect: async () => {},
  $transaction: async (fn: (tx: any) => Promise<any>) => {
    return await fn(mockPrisma);
  },
  $executeRawUnsafe: async (sql: string) => {
    const userMatch = sql.match(/SET LOCAL app\.current_user_id\s*=\s*'([^']+)'/i);
    if (userMatch) mockRlsContext.currentUserId = userMatch[1];
    
    const orgMatch = sql.match(/SET LOCAL app\.current_org_id\s*=\s*'([^']+)'/i);
    if (orgMatch) mockRlsContext.currentOrgId = orgMatch[1];
  },
  $queryRawUnsafe: async (sql: string, ...values: any[]) => {
    return [];
  },
  org: {
    create: async (args: any) => {
      const org = { id: args.data.id || makeMockCuid(), ...args.data };
      mockDb.orgs.push(org);
      return org;
    },
    deleteMany: async () => { mockDb.orgs = []; return { count: 0 }; },
  },
  user: {
    create: async (args: any) => {
      const user = { id: args.data.id || makeMockCuid(), ...args.data };
      mockDb.users.push(user);
      return user;
    },
    findUnique: async (args: any) => {
      const user = mockDb.users.find((u) => u.id === args.where.id || u.email === args.where.email);
      if (!user) return null;
      if (!mockCheckUserRls(user)) return null;
      return user;
    },
    deleteMany: async () => { mockDb.users = []; return { count: 0 }; },
  },
  tender: {
    create: async (args: any) => {
      const tender = {
        id: args.data.id || makeMockCuid(),
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
        bids: [],
        ...args.data,
      };
      mockDb.tenders.push(tender);
      return tender;
    },
    update: async (args: any) => {
      const tender = mockDb.tenders.find((t) => t.id === args.where.id);
      if (!tender) throw new Error('Tender not found');
      if (!mockCheckTenderRls(tender)) throw new Error('Tender access forbidden by RLS');
      if (tender.status === 'OPEN' && args.data.revealTime && new Date(args.data.revealTime).getTime() !== new Date(tender.revealTime).getTime()) {
        throw new PrismaConstraintError('Cannot edit revealTime after tender is OPEN');
      }
      Object.assign(tender, args.data);
      tender.updatedAt = new Date();
      return tender;
    },
    findUnique: async (args: any) => {
      const tender = mockDb.tenders.find((t) => t.id === args.where.id);
      if (!tender) return null;
      if (!mockCheckTenderRls(tender)) return null;
      // Populate bids if requested
      if (args.include?.bids) {
        return {
          ...tender,
          bids: mockDb.bids.filter((b) => b.tenderId === tender.id && mockCheckBidRls(b)),
        };
      }
      return tender;
    },
    findMany: async (args: any) => {
      let filtered = mockDb.tenders;
      if (args?.where) {
        filtered = filtered.filter((t) => {
          for (const key of Object.keys(args.where)) {
            const cond = args.where[key];
            if (cond && typeof cond === 'object') {
              if ('lte' in cond && t[key].getTime() > new Date(cond.lte).getTime()) return false;
              if ('gt' in cond && t[key].getTime() <= new Date(cond.gt).getTime()) return false;
            } else if (t[key] !== cond) {
              return false;
            }
          }
          return true;
        });
      }
      // Apply RLS filter
      return filtered.filter(mockCheckTenderRls);
    },
    updateMany: async (args: any) => {
      let count = 0;
      const tendersToUpdate = mockDb.tenders.filter((t) => {
        if (args.where.id && t.id !== args.where.id) return false;
        if (args.where.status && t.status !== args.where.status) return false;
        return true;
      }).filter(mockCheckTenderRls);
      
      for (const t of tendersToUpdate) {
        Object.assign(t, args.data);
        t.updatedAt = new Date();
        count++;
      }
      return { count };
    },
    deleteMany: async () => { mockDb.tenders = []; return { count: 0 }; },
  },
  bid: {
    create: async (args: any) => {
      const tender = mockDb.tenders.find((t) => t.id === args.data.tenderId);
      if (!tender) throw new Error('Tender not found');
      if (args.data.plaintextBid !== null && args.data.plaintextBid !== undefined) {
        if (new Date().getTime() < new Date(tender.revealTime).getTime()) {
          throw new PrismaConstraintError(`Cannot store plaintextBid before revealTime ${new Date(tender.revealTime).toISOString()}`);
        }
      }
      const bid = {
        id: args.data.id || makeMockCuid(),
        submittedAt: new Date(),
        updatedAt: new Date(),
        isValid: false,
        ...args.data,
      };
      mockDb.bids.push(bid);
      return bid;
    },
    update: async (args: any) => {
      const bid = mockDb.bids.find((b) => b.id === args.where.id);
      if (!bid) throw new Error('Bid not found');
      if (!mockCheckBidRls(bid)) throw new Error('Bid access forbidden by RLS');
      const tender = mockDb.tenders.find((t) => t.id === bid.tenderId);
      if (!tender) throw new Error('Tender not found');
      if (args.data.plaintextBid !== null && args.data.plaintextBid !== undefined) {
        if (new Date().getTime() < new Date(tender.revealTime).getTime()) {
          throw new PrismaConstraintError(`Cannot store plaintextBid before revealTime ${new Date(tender.revealTime).toISOString()}`);
        }
      }
      Object.assign(bid, args.data);
      bid.updatedAt = new Date();
      return bid;
    },
    findUnique: async (args: any) => {
      const bid = mockDb.bids.find((b) => b.id === args.where.id);
      if (!bid) return null;
      if (!mockCheckBidRls(bid)) return null;
      return bid;
    },
    findMany: async (args: any) => {
      let filtered = mockDb.bids;
      if (args?.where?.tenderId) {
        filtered = filtered.filter((b) => b.tenderId === args.where.tenderId);
      }
      return filtered.filter(mockCheckBidRls);
    },
    deleteMany: async () => { mockDb.bids = []; return { count: 0 }; },
  },
  auditLog: {
    create: async (args: any) => {
      const log = {
        id: BigInt(mockDb.auditLogs.length + 1),
        createdAt: new Date(),
        ...args.data,
      };
      mockDb.auditLogs.push(log);
      return log;
    },
    findFirst: async (args: any) => {
      let filtered = mockDb.auditLogs;
      if (args?.where?.tenderId) {
        filtered = filtered.filter((l) => l.tenderId === args.where.tenderId);
      }
      if (args?.orderBy) {
        if (args.orderBy.id === 'desc') {
          filtered = [...filtered].sort((a, b) => Number(b.id - a.id));
        }
      }
      return filtered[0] || null;
    },
    findMany: async () => {
      return mockDb.auditLogs;
    },
    deleteMany: async () => { mockDb.auditLogs = []; return { count: 0 }; },
  },
  webhook: {
    create: async (args: any) => {
      const webhook = {
        id: args.data.id || makeMockCuid(),
        isActive: args.data.isActive !== undefined ? args.data.isActive : true,
        createdAt: new Date(),
        ...args.data,
      };
      mockDb.webhooks.push(webhook);
      return webhook;
    },
    findUnique: async (args: any) => {
      const webhook = mockDb.webhooks.find((w) => w.id === args.where.id);
      if (!webhook || !mockCheckWebhookRls(webhook)) return null;
      return webhook;
    },
    findMany: async (args: any) => {
      let filtered = mockDb.webhooks;
      if (args?.where?.orgId) {
        filtered = filtered.filter((w) => w.orgId === args.where.orgId);
      }
      return filtered.filter(mockCheckWebhookRls);
    },
    update: async (args: any) => {
      const webhook = mockDb.webhooks.find((w) => w.id === args.where.id);
      if (!webhook || !mockCheckWebhookRls(webhook)) throw new Error('Webhook not found');
      Object.assign(webhook, args.data);
      return webhook;
    },
    deleteMany: async () => { mockDb.webhooks = []; return { count: 0 }; },
  },
  webhookDelivery: {
    create: async (args: any) => {
      const delivery = {
        id: args.data.id || makeMockCuid(),
        deliveredAt: new Date(),
        attempt: args.data.attempt || 1,
        ...args.data,
      };
      mockDb.webhookDeliveries.push(delivery);
      return delivery;
    },
    findMany: async (args: any) => {
      let filtered = mockDb.webhookDeliveries;
      if (args?.where?.webhookId) {
        filtered = filtered.filter((d) => d.webhookId === args.where.webhookId);
      }
      return filtered.filter(mockCheckWebhookDeliveryRls);
    },
    deleteMany: async () => { mockDb.webhookDeliveries = []; return { count: 0 }; },
  },
};

// Create the dynamic client Proxy
export const prisma = new Proxy({} as typeof realPrisma, {
  get(target, prop) {
    if (prop === 'then') return undefined; // avoid promise-like resolution
    
    // We intercept calls to direct methods of PrismaClient
    const isMock = isDbReachable === false;
    const client = isMock ? mockPrisma : realPrisma;

    // Check connection state on the first method invocation
    if (isDbReachable === null) {
      // Return a function or proxy that awaits connection first
      return new Proxy((client as any)[prop], {
        apply(targetApply, thisArg, argumentsList) {
          return checkConnection().then((connected) => {
            const activeClient = connected ? realPrisma : mockPrisma;
            const targetMethod = (activeClient as any)[prop];
            if (typeof targetMethod === 'function') {
              return Reflect.apply(targetMethod, activeClient, argumentsList);
            }
            return targetMethod;
          });
        },
        get(targetGet, propGet) {
          return (...args: any[]) => {
            return checkConnection().then((connected) => {
              const activeClient = connected ? realPrisma : mockPrisma;
              const targetModel = (activeClient as any)[prop];
              const targetMethod = targetModel[propGet];
              return Reflect.apply(targetMethod, targetModel, args);
            });
          };
        }
      });
    }

    return (client as any)[prop];
  },
}) as any;

export default prisma;
export * from './rls.js';

