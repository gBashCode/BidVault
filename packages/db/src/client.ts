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
const mockDb = {
  orgs: [] as any[],
  users: [] as any[],
  tenders: [] as any[],
  bids: [] as any[],
  auditLogs: [] as any[],
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

const mockPrisma = {
  $connect: async () => {},
  $disconnect: async () => {},
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
      // Populate bids if requested
      if (args.include?.bids) {
        return {
          ...tender,
          bids: mockDb.bids.filter((b) => b.tenderId === tender.id),
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
      return filtered;
    },
    updateMany: async (args: any) => {
      let count = 0;
      const tendersToUpdate = mockDb.tenders.filter((t) => {
        if (args.where.id && t.id !== args.where.id) return false;
        if (args.where.status && t.status !== args.where.status) return false;
        return true;
      });
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
        createdAt: new Date(),
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
      return mockDb.bids.find((b) => b.id === args.where.id) || null;
    },
    findMany: async (args: any) => {
      if (args?.where?.tenderId) {
        return mockDb.bids.filter((b) => b.tenderId === args.where.tenderId);
      }
      return mockDb.bids;
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
