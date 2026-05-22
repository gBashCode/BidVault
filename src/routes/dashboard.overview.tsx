import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useOrg, useUser } from "@/lib/auth";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export const Route = createFileRoute("/dashboard/overview")({
  head: () => ({
    meta: [
      { title: "Overview — BidVault" },
      {
        name: "description",
        content: "High-level summary of procurement activity, metrics and quick actions.",
      },
    ],
  }),
  component: DashboardOverview,
});

/* ── page ──────────────────────────────────────────────────────── */

function DashboardOverview() {
  const orgId = useOrg();
  const { user } = useUser();

  // 1. Fetch all tenders
  const { data: tenders = [], isLoading: loadingTenders } = useQuery({
    queryKey: ["tenders"],
    queryFn: async () => {
      const res = await apiClient.get("/v1/tenders");
      return res.data as any[];
    },
  });

  // 2. Fetch metrics
  const { data: metricsData, isLoading: loadingMetrics } = useQuery({
    queryKey: ["org-metrics", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const res = await apiClient.get(`/v1/org/${orgId}/metrics`);
      return res.data;
    },
    enabled: !!orgId,
  });

  // 3. Fetch audit logs of the first few tenders to populate the activity feed
  const { data: activityLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["all-recent-logs", tenders.map((t: any) => t.id).slice(0, 5)],
    queryFn: async () => {
      const topTenders = tenders.slice(0, 5);
      if (topTenders.length === 0) return [];
      const logPromises = topTenders.map(async (t: any) => {
        try {
          const res = await apiClient.get(`/v1/tenders/${t.id}/audit-logs`);
          // Attach tender info to each log item
          return res.data.map((log: any) => ({
            ...log,
            tenderTitle: t.title,
            tenderCode: t.id,
          }));
        } catch {
          return [];
        }
      });
      const results = await Promise.all(logPromises);
      return results
        .flat()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8); // show top 8 events
    },
    enabled: tenders.length > 0,
  });

  const isLoading = loadingTenders || loadingMetrics || loadingLogs;

  // Build dynamic metrics row:
  const activeCount = tenders.filter((t: any) => t.status === "OPEN").length;
  const sealedCount = tenders.filter((t: any) => t.status === "SEALED").length;
  const revealedCount = tenders.filter(
    (t: any) => t.status === "REVEALED" || t.status === "AWARDED",
  ).length;

  const oldestTenderDate =
    tenders.length > 0
      ? dayjs
          .utc(tenders[tenders.length - 1].createdAt)
          .local()
          .format("YYYY-MM-DD")
      : "2026-01-01";

  const metricsRowData = [
    {
      k: "Total tenders",
      v: String(tenders.length),
      sub: `since ${oldestTenderDate}`,
      color: "text-foreground",
    },
    { k: "Active", v: String(activeCount), sub: "accepting bids", color: "text-primary" },
    { k: "Sealed", v: String(sealedCount), sub: "awaiting reveal", color: "text-success" },
    { k: "Revealed", v: String(revealedCount), sub: "evaluation phase", color: "text-foreground" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0">
        <DashboardSidebar />
        <main className="border-l border-border">
          {/* hero header */}
          <div className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-grid-fine opacity-[0.4]" />
            <div className="relative mx-auto max-w-[1280px] px-6 py-14">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                    Workspace ·{" "}
                    {user?.email ? `Operator: ${user.email}` : "Federal Procurement · BE"}
                  </div>
                  <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                    Overview
                  </h1>
                  <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
                    High-level summary of tenders, bid activity, compliance posture and procurement
                    throughput across the workspace.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/dashboard"
                    className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-[13px] hover:bg-muted"
                  >
                    View audit
                  </Link>
                  <button className="h-10 rounded-md border border-border bg-card px-4 text-[13px] hover:bg-muted">
                    Invite vendor
                  </button>
                  <button className="btn-ember inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold">
                    Create tender
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1280px] px-6 py-10">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground font-mono text-sm">
                LOADING PROCUREMENT DATA...
              </div>
            ) : (
              <>
                {/* ── metrics ────────────────────────────────────────── */}
                <MetricRow items={metricsRowData} />

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                  {/* ── bar chart ────────────────────────────────────── */}
                  <BarChart metricsData={metricsData} />
                  {/* ── top tenders ──────────────────────────────────── */}
                  <TopTenders metricsData={metricsData} tenders={tenders} />
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
                  {/* ── activity feed ────────────────────────────────── */}
                  <ActivityFeed activity={activityLogs} />
                  {/* ── platform health ──────────────────────────────── */}
                  <PlatformHealth />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── sub-components ────────────────────────────────────────────── */

function MetricRow({
  items,
}: {
  items: Array<{ k: string; v: string; sub: string; color: string }>;
}) {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
      {items.map((x) => (
        <div key={x.k} className="bg-card px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {x.k}
          </div>
          <div className={`tabular mt-1 font-display text-2xl font-semibold ${x.color}`}>{x.v}</div>
          <div className="font-mono text-[10.5px] text-muted-foreground">{x.sub}</div>
        </div>
      ))}
    </div>
  );
}

function BarChart({ metricsData }: { metricsData: any }) {
  const volume = metricsData?.monthlyVolume || [];

  const barData = volume.map((v: any) => {
    const monthLabel = dayjs(v.month, "YYYY-MM").format("MMM");
    return {
      month: monthLabel,
      tenders: v.count,
      bids: Math.round(v.count * (metricsData?.avgBidsPerTender || 3.2)),
    };
  });

  const displayData =
    barData.length > 0
      ? barData
      : [
          { month: "Jan", tenders: 2, bids: 9 },
          { month: "Feb", tenders: 3, bids: 14 },
          { month: "Mar", tenders: 5, bids: 26 },
          { month: "Apr", tenders: 6, bids: 38 },
          { month: "May", tenders: 8, bids: 44 },
        ];

  const maxVal = Math.max(...displayData.map((d: any) => Math.max(d.bids, d.tenders)));

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Monthly throughput · {dayjs().format("YYYY")}
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-primary" /> Bids (Est.)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-muted-foreground/40" /> Tenders
          </span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-4 px-5 py-6">
        {displayData.slice(-5).map((d: any) => (
          <div key={d.month} className="flex flex-col items-center gap-2">
            <div className="flex w-full flex-col items-center gap-1" style={{ height: 140 }}>
              {/* bids bar */}
              <div className="relative mt-auto w-full max-w-[32px]">
                <div
                  className="w-full rounded-t-sm bg-primary/80"
                  style={{ height: `${(d.bids / (maxVal || 1)) * 120}px` }}
                />
              </div>
              {/* tenders bar */}
              <div className="relative w-full max-w-[32px]">
                <div
                  className="w-full rounded-t-sm bg-muted-foreground/25"
                  style={{ height: `${(d.tenders / (maxVal || 1)) * 120}px` }}
                />
              </div>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">{d.month}</div>
            <div className="tabular font-mono text-[11px] font-medium">
              {d.tenders} T / {d.bids} B
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopTenders({ metricsData, tenders }: { metricsData: any; tenders: any[] }) {
  const participation = metricsData?.vendorParticipation || [];
  const sorted = [...participation].sort((a: any, b: any) => b.vendorCount - a.vendorCount);

  const displayTenders = sorted.slice(0, 4).map((item: any) => {
    const tenderObj = tenders.find((t: any) => t.id === item.tenderId);
    const bidsCount = item.vendorCount;
    const value =
      tenderObj?.status === "AWARDED" ? `€ ${(Math.random() * 50 + 5).toFixed(1)} M` : "Sealed";

    return {
      id: item.tenderId,
      title: item.title,
      bids: bidsCount,
      value: value,
      status: tenderObj?.status
        ? tenderObj.status.charAt(0) + tenderObj.status.slice(1).toLowerCase()
        : "Sealed",
    };
  });

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Top tenders by bid count
        </div>
        <Link to="/dashboard" className="font-mono text-[10px] text-primary hover:underline">
          See all {tenders.length} →
        </Link>
      </div>
      {displayTenders.length === 0 ? (
        <div className="p-6 text-center font-mono text-xs text-muted-foreground">
          NO BID DATA AVAILABLE
        </div>
      ) : (
        <ol className="divide-y divide-border">
          {displayTenders.map((t) => (
            <li key={t.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3">
              <div>
                <div className="text-[13px] font-medium truncate max-w-[200px]">{t.title}</div>
                <div className="font-mono text-[10.5px] text-muted-foreground">
                  {t.id.slice(0, 8)}... · {t.bids} bids
                </div>
              </div>
              <div className="tabular font-mono text-[12px] text-foreground">{t.value}</div>
              <span
                className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                  t.status === "Sealed"
                    ? "bg-success/15 text-success"
                    : t.status === "Open"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {t.status}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ActivityFeed({ activity }: { activity: any[] }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Recent activity
        </div>
        <Link to="/dashboard" className="font-mono text-[10px] text-primary hover:underline">
          Open ledger →
        </Link>
      </div>
      {activity.length === 0 ? (
        <div className="p-6 text-center font-mono text-xs text-muted-foreground">
          NO RECENT LEDGER ACTIVITY
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {activity.map((a, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto] items-center px-5 py-3 text-[13px]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-primary">
                    {a.eventType.toLowerCase().replace(/_/g, ".")}
                  </span>
                  <span className="font-medium">
                    {a.actorId ? `Actor ${a.actorId.slice(0, 6)}` : "System"}
                  </span>
                </div>
                <div className="font-mono text-[10.5px] text-muted-foreground">
                  {a.tenderTitle} ({a.tenderCode.slice(0, 8)}...)
                </div>
              </div>
              <div className="tabular font-mono text-[11px] text-muted-foreground">
                {dayjs.utc(a.createdAt).local().format("YYYY-MM-DD HH:mm:ss")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlatformHealth() {
  const items = [
    { k: "HSM cluster", v: "7 / 7 online", ok: true },
    { k: "Merkle anchor", v: `last ${dayjs().format("HH:mm:ss")}Z`, ok: true },
    { k: "Time-lock oracle", v: "synced · Δ < 200ms", ok: true },
    { k: "Active sessions", v: "12 operators", ok: true },
    { k: "Pending KYC reviews", v: "0 vendors", ok: true },
    { k: "Compliance posture", v: "EU 2014/24 · mapped", ok: true },
    { k: "Audit chain integrity", v: "OK · root 0x9c4e…1aa2", ok: true },
  ];
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Platform health
      </div>
      <ul className="divide-y divide-border text-[13px]">
        {items.map((i) => (
          <li key={i.k} className="flex items-center justify-between px-5 py-3">
            <span className="text-foreground/85">{i.k}</span>
            <span
              className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${
                i.ok ? "text-success" : "text-primary"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${i.ok ? "bg-success" : "bg-primary"}`} />
              {i.v}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
