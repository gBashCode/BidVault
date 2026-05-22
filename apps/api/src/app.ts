import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import authPlugin from './plugins/auth.js';
import errorPlugin from './plugins/error.js';
import tenderRoutes from './modules/tender/tender.routes.js';
import bidRoutes from './modules/bid/bid.routes.js';
import verifyRoutes from './modules/verify/verify.routes.js';
import publicRoutes from './modules/public/public.routes.js';
import publicVerifyRoutes from './modules/public/verify.routes.js';
import complianceRoutes from './modules/compliance/compliance.routes.js';
import webhookRoutes from './modules/webhooks/webhook.routes.js';
import s3Plugin from './plugins/s3.js';


export function buildApp() {
  const app = Fastify({
    logger: {
      level: 'info',
      // Redact request.body for /bids routes to satisfy security constraints
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            hostname: request.hostname,
            remoteAddress: request.ip,
          };
        },
      },
    },
  });

  // Support Zod schemas natively in route definitions
  app.setValidatorCompiler(({ schema }: any) => {
    return (data: any) => {
      if (schema && typeof schema.safeParse === 'function') {
        const result = schema.safeParse(data);
        if (result.success) return { value: result.data };
        return { error: result.error };
      }
      return { value: data };
    };
  });

  app.setSerializerCompiler(({ schema }: any) => {
    return (data: any) => {
      if (schema && typeof schema.safeParse === 'function') {
        const result = schema.safeParse(data);
        return JSON.stringify(result.success ? result.data : data);
      }
      return JSON.stringify(data);
    };
  });

  // Global Error Handler
  app.register(errorPlugin);

  // Swagger docs
  app.register(swagger, {
    openapi: {
      info: {
        title: 'SealedBid API',
        description: 'Secure, cryptographic sealed-bid tendering API',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:4000' }],
    },
  });

  app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
  });

  // Auth Plugin (JWT + decorators)
  app.register(authPlugin);

  // S3 Presigned Upload Utility Plugin
  app.register(s3Plugin);

  // Reset RLS mock context before each request to prevent session leaks
  app.addHook('onRequest', async () => {
    try {
      const { mockRlsContext } = await import('@sealedbid/db');
      if (mockRlsContext) {
        mockRlsContext.currentUserId = null;
        mockRlsContext.currentOrgId = null;
      }
    } catch (e) {}
  });


  // Health check route
  app.get('/health', async () => {
    return { status: 'ok', time: new Date().toISOString() };
  });

  // Register feature routes
  app.register(tenderRoutes);
  app.register(bidRoutes);
  app.register(verifyRoutes);
  app.register(publicRoutes);
  app.register(publicVerifyRoutes);
  app.register(complianceRoutes);
  app.register(webhookRoutes);

  return app;
}
