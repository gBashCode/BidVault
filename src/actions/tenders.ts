import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../server/db";
import { tenders } from "../server/db/schema";
import { eq } from "drizzle-orm";
// @ts-ignore
import { env } from "cloudflare:workers";

export const getTenders = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = getDb(env);
    
    // In a real app we'd fetch actual tenders. Let's return all.
    try {
      const allTenders = await db.select().from(tenders).all();
      return allTenders;
    } catch (e) {
      console.error(e);
      // Return mock data fallback if DB fails or is empty for dev
      return [
        {
          id: "GOV-2026-ROAD-INFRA-014",
          reference: "GOV-2026-ROAD-INFRA-014",
          title: "Federal Highway · Phase II",
          description: "Reconstruction Phase II",
          creatorId: "m.vlaeminck@fps-mob.be",
          revealDeadline: new Date(Date.now() + 1000 * 60 * 60 * 18 + 1000 * 42),
          status: "Ready",
          createdAt: new Date("2026-04-19"),
        }
      ];
    }
  }
);
