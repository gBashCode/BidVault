import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import authPlugin from "./plugins/auth.js";
import errorPlugin from "./plugins/error.js";
import fastifyCookie from "@fastify/cookie";
import tenderRoutes from "./modules/tender/tender.routes.js";
import bidRoutes from "./modules/bid/bid.routes.js";
import verifyRoutes from "./modules/verify/verify.routes.js";
import publicRoutes from "./modules/public/public.routes.js";
import publicVerifyRoutes from "./modules/public/verify.routes.js";
import complianceRoutes from "./modules/compliance/compliance.routes.js";
import webhookRoutes from "./modules/webhooks/webhook.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";
import orgRoutes from "./modules/org/org.routes.js";
import s3Plugin from "./plugins/s3.js";
import authRoutes from "./modules/auth/auth.routes.js";

export function buildApp() {
  const app = Fastify({
    logger: {
      level: "info",
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
      if (schema && typeof schema.safeParse === "function") {
        const result = schema.safeParse(data);
        if (result.success) return { value: result.data };
        return { error: result.error };
      }
      return { value: data };
    };
  });

  app.setSerializerCompiler(({ schema }: any) => {
    return (data: any) => {
      if (schema && typeof schema.safeParse === "function") {
        const result = schema.safeParse(data);
        return JSON.stringify(result.success ? result.data : data);
      }
      return JSON.stringify(data);
    };
  });

  // Global Error Handler
  app.register(errorPlugin);

  // Cookie Support
  // Cookie Support
  app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || "sealedbid-cookie-secret",
    hook: 'onRequest',
  });

  // Swagger docs
  app.register(swagger, {
    openapi: {
      info: {
        title: "SealedBid API",
        description: "Secure, cryptographic sealed-bid tendering API",
        version: "1.0.0",
      },
      servers: [{ url: "http://localhost:4000" }],
    },
  });

  app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
  });

  // Auth Plugin (JWT + decorators)
  app.register(authPlugin);

  // S3 Presigned Upload Utility Plugin
  app.register(s3Plugin);

  // Global CORS handling hook to allow cross-origin credential sharing
  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin || "http://localhost:8080";
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Access-Control-Allow-Credentials", "true");
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
    reply.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

    if (request.method === "OPTIONS") {
      reply.code(204).send();
    }
  });

  // Reset RLS mock context before each request to prevent session leaks
  app.addHook("onRequest", async () => {
    try {
      const { mockRlsContext } = await import("@sealedbid/db");
      if (mockRlsContext) {
        mockRlsContext.currentUserId = null;
        mockRlsContext.currentOrgId = null;
      }
    } catch (e) {}
  });

  // Health check route
  app.get("/health", async () => {
    return { status: "ok", time: new Date().toISOString() };
  });

  // Register feature routes
  app.register(authRoutes);
  app.register(tenderRoutes);
  app.register(bidRoutes);
  app.register(verifyRoutes);
  app.register(publicRoutes);
  app.register(publicVerifyRoutes);
  app.register(complianceRoutes);
  app.register(webhookRoutes);
  app.register(auditRoutes);
  app.register(orgRoutes);

  return app;
}
