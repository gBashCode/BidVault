import { prisma, withRls } from "@sealedbid/db";

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
  return await withRls(user, async (tx) => {
    // 1. Build date filter bounds using submissionDeadline
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();

    // Query active tenders for the organization
    const tenders = await tx.tender.findMany({
      where: {
        orgId: user.orgId,
        submissionDeadline: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        revealTime: true,
        submissionDeadline: true,
        status: true,
      },
    });

    const totalTenders = tenders.length;

    // 2. Average cycle time (in hours) calculated from submissionDeadline to revealTime
    let totalCycleMs = 0;
    for (const t of tenders) {
      totalCycleMs += Math.max(0, t.revealTime.getTime() - t.submissionDeadline.getTime());
    }
    const avgCycleTimeHours = totalTenders > 0 ? totalCycleMs / totalTenders / (3600 * 1000) : 0;

    // 3. On-Time Reveal Rate
    // Query revealed bids for these tenders
    const tenderIds = tenders.map((t) => t.id);
    const bids = await tx.bid.findMany({
      where: {
        tenderId: { in: tenderIds },
        revealedAt: { not: null },
      },
      select: {
        tenderId: true,
        revealedAt: true,
      },
    });

    let onTimeReveals = 0;
    for (const t of tenders) {
      const tBids = bids.filter((b) => b.tenderId === t.id && b.revealedAt);
      if (tBids.length > 0) {
        const sorted = [...tBids].sort(
          (a, b) => a.revealedAt!.getTime() - b.revealedAt!.getTime(),
        );
        const firstReveal = sorted[0].revealedAt!.getTime();
        const revealDeadline = t.revealTime.getTime();

        // Check if first bid revealed within 5 minutes after revealTime
        if (firstReveal <= revealDeadline + 5 * 60 * 1000) {
          onTimeReveals++;
        }
      }
    }
    const onTimeRevealRate = totalTenders > 0 ? (onTimeReveals / totalTenders) * 100 : 0;

    // 4. Dispute rate (% bids where isValid = false)
    const allOrgBids = await tx.bid.findMany({
      where: {
        tender: { orgId: user.orgId },
      },
      select: {
        id: true,
        isValid: true,
      },
    });
    const totalBidsCount = allOrgBids.length;
    const invalidBidsCount = allOrgBids.filter((b) => b.isValid === false).length;
    const disputeRate = totalBidsCount > 0 ? (invalidBidsCount / totalBidsCount) * 100 : 0;

    // 5. Total Value Awarded (sum bid prices for status=AWARDED tenders)
    const awardedBids = await tx.bid.findMany({
      where: {
        tender: { orgId: user.orgId, status: "AWARDED" },
        plaintextBid: { not: null },
      },
      select: {
        plaintextBid: true,
      },
    });

    let totalValueAwarded = 0;
    for (const b of awardedBids) {
      if (b.plaintextBid) {
        const parsed =
          typeof b.plaintextBid === "string" ? JSON.parse(b.plaintextBid) : (b.plaintextBid as any);
        const price =
          parsed.price !== undefined ? parsed.price : parsed.unitPrice * (parsed.qty || 1);
        totalValueAwarded += price || 0;
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
  const tenders = await prisma.tender.findMany({
    where: { orgId },
    select: { submissionDeadline: true },
  });

  const groups: Record<string, number> = {};
  for (const t of tenders) {
    const d = new Date(t.submissionDeadline);
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
  const tenders = await prisma.tender.findMany({
    where: { orgId },
    select: {
      id: true,
      title: true,
      bids: {
        select: {
          vendorId: true,
        },
      },
    },
  });

  return tenders.map((t) => {
    const uniqueVendors = new Set(t.bids.map((b) => b.vendorId));
    return {
      tenderId: t.id,
      title: t.title,
      vendorCount: uniqueVendors.size,
    };
  });
}

export async function avgBidsPerTender(orgId: string): Promise<number> {
  const tenders = await prisma.tender.findMany({
    where: {
      orgId,
      status: { in: ["REVEALED", "AWARDED"] },
    },
    select: {
      _count: {
        select: { bids: true },
      },
    },
  });

  if (tenders.length === 0) return 0;

  const totalBids = tenders.reduce((acc, t) => acc + t._count.bids, 0);
  return totalBids / tenders.length;
}

export async function collusionSuspects(orgId: string) {
  const tenders = await prisma.tender.findMany({
    where: {
      orgId,
      status: { in: ["REVEALED", "AWARDED"] },
    },
    select: {
      id: true,
      title: true,
      bids: {
        where: {
          plaintextBid: { not: null },
        },
        select: {
          vendorId: true,
          plaintextBid: true,
        },
      },
    },
  });

  const nodes: Array<{ id: string; label: string }> = [];
  const edges: Array<{ from: string; to: string; weight: number }> = [];

  const registeredNodes = new Set<string>();

  for (const t of tenders) {
    const bids = t.bids;

    // Group bids by price to detect matches
    const priceGroups: Record<number, any[]> = {};
    for (const b of bids) {
      if (!b.plaintextBid) continue;
      const parsed =
        typeof b.plaintextBid === "string" ? JSON.parse(b.plaintextBid) : (b.plaintextBid as any);
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
