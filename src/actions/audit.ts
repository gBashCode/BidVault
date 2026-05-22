import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../server/db";
import { auditLogs } from "../server/db/schema";
import { desc } from "drizzle-orm";
// @ts-ignore - cloudflare:workers is resolved by vite plugin
import { env } from "cloudflare:workers";

export const getAuditLogs = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = getDb(env);
    
    try {
      return await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).all();
    } catch (e) {
      console.error(e);
      // Fallback mock
      return [];
    }
  }
);
