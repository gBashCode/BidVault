import fp from 'fastify-plugin';
import fjwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

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
      } catch (err) {
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
          reply.code(403).send({ statusCode: 403, error: 'Forbidden', message: `Role '${user.role}' not authorized` });
        }
      };
    });
  },
  { name: 'auth-plugin' }
);
