import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../server/db";
import { bids, auditLogs } from "../server/db/schema";
import { eq } from "drizzle-orm";
// @ts-ignore
import { env } from "cloudflare:workers";

export const getBidsForTender = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data: tenderId }) => {
    const db = getDb(env);
    try {
      return await db.select().from(bids).where(eq(bids.tenderId, tenderId)).all();
    } catch (e) {
      console.error(e);
      // Fallback mock
      return [];
    }
  });

export const submitBid = createServerFn({ method: "POST" })
  .validator((d: { tenderId: string; vendorId: string; commitHash: string; sizeMb: number; objectKey: string }) => d)
  .handler(async ({ data }) => {
    const db = getDb(env);
    try {
      // 1. Record the bid in DB
      await db.insert(bids).values({
        id: `bid-${Date.now()}`,
        tenderId: data.tenderId,
        vendorId: data.vendorId,
        commitHash: data.commitHash,
        sizeMb: data.sizeMb,
        objectKey: data.objectKey,
        status: "Sealed"
      });

      // 2. Record the audit log
      await db.insert(auditLogs).values({
        id: `audit-${Date.now()}`,
        event: "bid.seal",
        actor: data.vendorId,
        hash: data.commitHash,
      });

      return { success: true };
    } catch (e) {
      console.error(e);
      throw new Error("Failed to submit bid");
    }
  });
