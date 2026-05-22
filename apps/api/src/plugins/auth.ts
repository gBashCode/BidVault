import fp from 'fastify-plugin';
import fjwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { prisma } from '@sealedbid/db';
import { AuditChain } from '@sealedbid/crypto';

export interface UserPayload {
  id: string;
  orgId: string;
  role: 'ORG_ADMIN' | 'PROCUREMENT_MANAGER' | 'AUDITOR' | 'VENDOR';
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UserPayload;
    user: UserPayload;
  }
}

function triggerSentryAlert(message: string, context: Record<string, any>) {
  console.error(`🚨 [SENTRY ALERT] ${message}`, context);
  const Sentry = (globalThis as any).Sentry;
  if (Sentry && typeof Sentry.captureMessage === 'function') {
    Sentry.captureMessage(message, { extra: context });
  }
}

export default fp(
  async function authPlugin(fastify: FastifyInstance) {
    await fastify.register(fjwt, {
      secret: process.env.JWT_SECRET || 'sealedbid-dev-secret-change-in-production',
      sign: { expiresIn: '15m' },
    });

    // Decorator: authenticate (verify JWT, attach user)
    fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err: any) {
        const payload = {
          reason: err.message || 'Invalid or missing token',
          ip: request.ip,
          method: request.method,
          url: request.url,
          attemptedAt: new Date().toISOString(),
        };

        // Trigger simulated Sentry alert
        triggerSentryAlert('Unauthorized access attempt', payload);

        // Record to AuditLog asynchronously to prevent blocking response
        prisma.auditLog.findFirst({
          orderBy: { id: 'desc' },
        }).then(async (lastAudit) => {
          const chain = new AuditChain(lastAudit?.eventHash);
          const { eventHash, prevHash } = chain.append('SECURITY_ALERT_UNAUTHORIZED', payload);
          await prisma.auditLog.create({
            data: {
              prevHash,
              eventType: 'SECURITY_ALERT_UNAUTHORIZED',
              payload,
              eventHash,
            },
          });
        }).catch((dbErr) => {
          console.error('Failed to write unauthorized audit log:', dbErr);
        });

        reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or missing token' });
      }
    });

    // Decorator: authorize (check role against allowed list)
    fastify.decorate('authorize', function (roles: string[]) {
      return async function (request: FastifyRequest, reply: FastifyReply) {
        await fastify.authenticate(request, reply);
        if (reply.sent) return;
        const user = request.user;
        if (!roles.includes(user.role)) {
          const payload = {
            userId: user.id,
            userRole: user.role,
            requiredRoles: roles,
            ip: request.ip,
            method: request.method,
            url: request.url,
            attemptedAt: new Date().toISOString(),
          };

          // Trigger simulated Sentry alert
          triggerSentryAlert('Forbidden access attempt', payload);

          // Record to AuditLog asynchronously
          prisma.auditLog.findFirst({
            orderBy: { id: 'desc' },
          }).then(async (lastAudit) => {
            const chain = new AuditChain(lastAudit?.eventHash);
            const { eventHash, prevHash } = chain.append('SECURITY_ALERT_FORBIDDEN', payload);
            await prisma.auditLog.create({
              data: {
                prevHash,
                eventType: 'SECURITY_ALERT_FORBIDDEN',
                actorId: user.id,
                payload,
                eventHash,
              },
            });
          }).catch((dbErr) => {
            console.error('Failed to write forbidden audit log:', dbErr);
          });

          reply.code(403).send({ statusCode: 403, error: 'Forbidden', message: `Role '${user.role}' not authorized` });
        }
      };
    });
  },
  { name: 'auth-plugin' }
);
