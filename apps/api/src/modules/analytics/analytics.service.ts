import { prisma, withRls } from "@sealedbid/db";
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

interface MetricsResult {
  totalTenders: number;
  avgCycleTimeHours: number;
  onTimeRevealRate: number;
  disputeRate: number;
  totalValueAwarded: number;
}

export async function getComplianceMetrics(
  user: { id: string; orgId: string },
  from?: string,
  to?: string,
): Promise<MetricsResult> {
  const isMock = (prisma as any).isDbReachable === false || !prisma.$queryRawUnsafe;

  return await withRls(user, async (tx) => {
    // 1. Build date filter bounds
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();

    if (!isMock) {
      try {
        // High-performance raw SQL metrics aggregation
        const metrics: any = await tx.$queryRawUnsafe(
          `
          SELECT 
            COUNT(t.id)::int as "totalTenders",
            COALESCE(AVG(EXTRACT(EPOCH FROM (t."revealTime" - t."createdAt")) / 3600), 0)::float as "avgCycleTime",
            COALESCE(
              (COUNT(CASE WHEN EXISTS (
                SELECT 1 FROM "Bid" b 
                WHERE b."tenderId" = t.id 
                AND b."revealedAt" <= t."revealTime" + INTERVAL '5 minutes'
              ) THEN 1 END)::float / NULLIF(COUNT(t.id), 0)) * 100, 
              0
            )::float as "onTimeRevealRate",
            COALESCE(
              (SELECT COUNT(CASE WHEN b."isValid" = false THEN 1 END)::float / NULLIF(COUNT(b.id), 0) FROM "Bid" b WHERE b."tenderId" IN (SELECT id FROM "Tender" WHERE "orgId" = $1)) * 100,
              0
            )::float as "disputeRate",
            COALESCE(
              SUM(CASE WHEN t.status = 'AWARDED' THEN (b."plaintextBid"->>'price')::float END),
              0
            )::float as "totalValueAwarded"
          FROM "Tender" t
          LEFT JOIN "Bid" b ON t.id = b."tenderId"
          WHERE t."orgId" = $1 AND t."createdAt" BETWEEN $2 AND $3
        `,
          user.orgId,
          fromDate,
          toDate,
        );

        const row = metrics[0] || {};
        return {
          totalTenders: row.totalTenders || 0,
          avgCycleTimeHours: row.avgCycleTime || 0,
          onTimeRevealRate: row.onTimeRevealRate || 0,
          disputeRate: row.disputeRate || 0,
          totalValueAwarded: row.totalValueAwarded || 0,
        };
      } catch (err) {
        console.error("Raw query error, falling back to TS metrics computation:", err);
      }
    }

    // --- Offline Sandbox Fallback computation ---
    const { mockDb } = await import("@sealedbid/db");

    const tenders = mockDb.tenders.filter((t) => {
      const created = new Date(t.createdAt);
      console.log("DEBUG TENDER MATCH:", {
        tId: t.id,
        tOrgId: t.orgId,
        userOrgId: user.orgId,
        created,
        fromDate,
        toDate,
        orgMatch: t.orgId === user.orgId,
        dateMatch: created >= fromDate && created <= toDate,
      });
      return t.orgId === user.orgId && created >= fromDate && created <= toDate;
    });

    // Total tenders
    const totalTenders = tenders.length;

    // Average cycle time (in hours)
    let totalCycleMs = 0;
    for (const t of tenders) {
      const reveal = new Date(t.revealTime);
      const created = new Date(t.createdAt);
      totalCycleMs += Math.max(0, reveal.getTime() - created.getTime());
    }
    const avgCycleTimeHours = totalTenders > 0 ? totalCycleMs / totalTenders / (3600 * 1000) : 0;

    // On-Time Reveal Rate
    let onTimeReveals = 0;
    for (const t of tenders) {
      const bids = mockDb.bids.filter((b) => b.tenderId === t.id && b.revealedAt);
      if (bids.length > 0) {
        const sorted = [...bids].sort(
          (a, b) => new Date(a.revealedAt).getTime() - new Date(b.revealedAt).getTime(),
        );
        const firstReveal = new Date(sorted[0].revealedAt).getTime();
        const revealDeadline = new Date(t.revealTime).getTime();

        // Check if first bid revealed within 5 minutes after revealTime
        if (firstReveal <= revealDeadline + 5 * 60 * 1000) {
          onTimeReveals++;
        }
      }
    }
    const onTimeRevealRate = totalTenders > 0 ? (onTimeReveals / totalTenders) * 100 : 0;

    // Dispute rate (% bids where isValid = false)
    const orgTenderIds = mockDb.tenders.filter((t) => t.orgId === user.orgId).map((t) => t.id);
    const orgBids = mockDb.bids.filter((b) => orgTenderIds.includes(b.tenderId));
    const totalBids = orgBids.length;
    const invalidBids = orgBids.filter((b) => b.isValid === false).length;
    const disputeRate = totalBids > 0 ? (invalidBids / totalBids) * 100 : 0;

    // Total Value Awarded (sum bid prices for status=AWARDED tenders)
    let totalValueAwarded = 0;
    for (const t of tenders) {
      if (t.status === "AWARDED") {
        const bids = mockDb.bids.filter((b) => b.tenderId === t.id);
        for (const b of bids) {
          if (b.plaintextBid) {
            const parsed =
              typeof b.plaintextBid === "string" ? JSON.parse(b.plaintextBid) : b.plaintextBid;
            const price =
              parsed.price !== undefined ? parsed.price : parsed.unitPrice * (parsed.qty || 1);
            totalValueAwarded += price || 0;
          }
        }
      }
    }

    return {
      totalTenders,
      avgCycleTimeHours,
      onTimeRevealRate,
      disputeRate,
      totalValueAwarded,
    };
  });
}

export async function tenderVolumeByMonth(
  orgId: string,
): Promise<Array<{ month: string; count: number }>> {
  const { mockDb } = await import("@sealedbid/db");
  const tenders = mockDb.tenders.filter((t) => t.orgId === orgId);

  const groups: Record<string, number> = {};
  for (const t of tenders) {
    const d = new Date(t.createdAt);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    groups[monthStr] = (groups[monthStr] || 0) + 1;
  }

  return Object.keys(groups)
    .sort()
    .map((month) => ({ month, count: groups[month] }));
}

export async function vendorParticipation(
  orgId: string,
): Promise<Array<{ tenderId: string; title: string; vendorCount: number }>> {
  const { mockDb } = await import("@sealedbid/db");
  const tenders = mockDb.tenders.filter((t) => t.orgId === orgId);

  return tenders.map((t) => {
    const bids = mockDb.bids.filter((b) => b.tenderId === t.id);
    const uniqueVendors = new Set(bids.map((b) => b.vendorId));
    return {
      tenderId: t.id,
      title: t.title,
      vendorCount: uniqueVendors.size,
    };
  });
}

export async function avgBidsPerTender(orgId: string): Promise<number> {
  const { mockDb } = await import("@sealedbid/db");
  const tenders = mockDb.tenders.filter(
    (t) => t.orgId === orgId && (t.status === "REVEALED" || t.status === "AWARDED"),
  );
  if (tenders.length === 0) return 0;

  let totalBids = 0;
  for (const t of tenders) {
    totalBids += mockDb.bids.filter((b) => b.tenderId === t.id).length;
  }
  return totalBids / tenders.length;
}

export async function collusionSuspects(orgId: string) {
  const { mockDb } = await import("@sealedbid/db");
  const tenders = mockDb.tenders.filter(
    (t) => t.orgId === orgId && (t.status === "REVEALED" || t.status === "AWARDED"),
  );

  const nodes: Array<{ id: string; label: string }> = [];
  const edges: Array<{ from: string; to: string; weight: number }> = [];

  const registeredNodes = new Set<string>();

  for (const t of tenders) {
    const bids = mockDb.bids.filter((b) => b.tenderId === t.id && b.plaintextBid);

    // Group bids by price to detect matches
    const priceGroups: Record<number, any[]> = {};
    for (const b of bids) {
      const parsed =
        typeof b.plaintextBid === "string" ? JSON.parse(b.plaintextBid) : b.plaintextBid;
      const price =
        parsed.price !== undefined ? parsed.price : parsed.unitPrice * (parsed.qty || 1);

      if (price !== undefined) {
        if (!priceGroups[price]) priceGroups[price] = [];
        priceGroups[price].push(b);
      }
    }

    // Any group with > 1 bid represents potential collusion (identical bids)
    for (const price of Object.keys(priceGroups)) {
      const matchingBids = priceGroups[Number(price)];
      if (matchingBids.length > 1) {
        for (let i = 0; i < matchingBids.length; i++) {
          for (let j = i + 1; j < matchingBids.length; j++) {
            const vA = matchingBids[i].vendorId;
            const vB = matchingBids[j].vendorId;

            // Register nodes
            if (!registeredNodes.has(vA)) {
              nodes.push({ id: vA, label: `Vendor ${vA.slice(0, 6)}` });
              registeredNodes.add(vA);
            }
            if (!registeredNodes.has(vB)) {
              nodes.push({ id: vB, label: `Vendor ${vB.slice(0, 6)}` });
              registeredNodes.add(vB);
            }

            // Register edge
            const existingEdge = edges.find(
              (e) => (e.from === vA && e.to === vB) || (e.from === vB && e.to === vA),
            );
            if (existingEdge) {
              existingEdge.weight += 1;
            } else {
              edges.push({ from: vA, to: vB, weight: 1 });
            }
          }
        }
      }
    }
  }

  return { nodes, edges };
}
