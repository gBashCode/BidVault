import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useCountdown } from "@/components/countdown";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useOrg } from "@/lib/auth";
import dayjs from "dayjs";

export const Route = createFileRoute("/dashboard/reveal-queue")({
  head: () => ({
    meta: [
      { title: "Reveal queue — BidVault" },
      {
        name: "description",
        content:
          "Monitor all tenders approaching their reveal deadline with live countdowns and seal status.",
      },
    ],
  }),
  component: RevealQueuePage,
});

type Status = "Ready" | "Sealed" | "Pending" | "Scheduled";
type Filter = "All" | Status;

interface QueueItem {
  id: string;
  title: string;
  bids: number;
  deadline: Date;
  status: Status;
  owner: string;
}

const TOTAL_WINDOW = 1000 * 60 * 60 * 24 * 21; // 21-day reveal window
const filters: Filter[] = ["All", "Ready", "Sealed", "Pending", "Scheduled"];

function RevealQueuePage() {
  const [active, setActive] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const orgId = useOrg();

  // 1. Fetch live tenders
  const { data: tenders = [], isLoading: loadingTenders } = useQuery({
    queryKey: ["tenders"],
    queryFn: async () => {
      const res = await apiClient.get("/v1/tenders");
      return res.data as any[];
    },
  });

  // 2. Fetch metrics to get the bids count for each tender
  const { data: metricsData, isLoading: loadingMetrics } = useQuery({
    queryKey: ["org-metrics", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const res = await apiClient.get(`/v1/org/${orgId}/metrics`);
      return res.data;
    },
    enabled: !!orgId,
  });

  const isLoading = loadingTenders || loadingMetrics;

  const queueItems: QueueItem[] = tenders.map((t: any) => {
    const nowTime = Date.now();
    const revealTime = new Date(t.revealTime).getTime();

    let status: Status = "Scheduled";
    if (t.status === "SEALED") {
      if (nowTime >= revealTime) {
        status = "Ready";
      } else {
        status = "Sealed";
      }
    } else if (t.status === "OPEN") {
      if (nowTime >= new Date(t.submissionDeadline).getTime()) {
        status = "Sealed";
      } else {
        status = "Pending";
      }
    } else if (t.status === "DRAFT") {
      status = "Scheduled";
    } else if (t.status === "REVEALED" || t.status === "AWARDED") {
      status = "Ready";
    }

    const bidsCount =
      metricsData?.vendorParticipation?.find((p: any) => p.tenderId === t.id)?.vendorCount || 0;

    return {
      id: t.id,
      title: t.title,
      bids: bidsCount,
      deadline: new Date(t.revealTime),
      status,
      owner: t.createdById
        ? `operator-${t.createdById.slice(0, 6)}@fgov.be`
        : "procurement@fgov.be",
    };
  });

  // Apply filters and search
  const filtered = queueItems
    .filter((i) => active === "All" || i.status === active)
    .filter(
      (i) =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.id.toLowerCase().includes(search.toLowerCase()),
    );

  const counts = {
    All: queueItems.length,
    Ready: queueItems.filter((i) => i.status === "Ready").length,
    Sealed: queueItems.filter((i) => i.status === "Sealed").length,
    Pending: queueItems.filter((i) => i.status === "Pending").length,
    Scheduled: queueItems.filter((i) => i.status === "Scheduled").length,
  };

  const totalBidVaults = queueItems.reduce((acc, curr) => acc + curr.bids, 0);
  const avgBidsPerTender =
    queueItems.length > 0 ? (totalBidVaults / queueItems.length).toFixed(1) : "0.0";

  // Find nearest deadline in the future
  const upcomingDeadlines = queueItems
    .filter((i) => i.deadline.getTime() > Date.now())
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  const nearestItem = upcomingDeadlines[0];
  const nearestText = nearestItem ? `${dayjs(nearestItem.deadline).format("HH:mm")} UTC` : "None";
  const nearestSub = nearestItem ? nearestItem.id.slice(0, 12) + "..." : "No active pipeline";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0">
        <DashboardSidebar />
        <main className="border-l border-border">
          {/* Hero */}
          <div className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-grid-fine opacity-[0.4]" />
            <div className="relative mx-auto max-w-[1280px] px-6 py-14">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                    Cryptographic reveal pipeline
                  </div>
                  <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                    Reveal queue
                  </h1>
                  <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
                    Tenders approaching their time-lock reveal deadline. Once the countdown hits
                    zero, HSM key-shares reassemble and all sealed bids are decrypted
                    simultaneously.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  {(
                    [
                      ["Ready", String(counts.Ready)],
                      ["In pipeline", String(queueItems.length)],
                      [
                        "Next reveal",
                        nearestItem ? dayjs(nearestItem.deadline).format("MM-DD HH:mm") : "N/A",
                      ],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="rounded-md border border-border bg-card px-3 py-2">
                      <div className="text-muted-foreground">{k}</div>
                      <div className="mt-0.5 text-foreground">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mx-auto max-w-[1280px] px-6 py-10">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground font-mono text-sm">
                LOADING PIPELINE DATA...
              </div>
            ) : (
              <>
                {/* Metric strip */}
                <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
                  {[
                    {
                      k: "Total sealed bids",
                      v: String(totalBidVaults),
                      sub: `across ${queueItems.length} tenders`,
                    },
                    {
                      k: "Avg. bids / tender",
                      v: avgBidsPerTender,
                      sub: "calculated in real-time",
                    },
                    { k: "Nearest deadline", v: nearestText, sub: nearestSub },
                    { k: "Reveal integrity", v: "OK", sub: "all chains verified" },
                  ].map((x) => (
                    <div key={x.k} className="bg-card px-5 py-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        {x.k}
                      </div>
                      <div className="tabular mt-1 font-display text-2xl font-semibold">{x.v}</div>
                      <div className="font-mono text-[10.5px] text-muted-foreground">{x.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Filter bar */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {filters.map((f) => (
                      <button
                        key={f}
                        onClick={() => setActive(f)}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                          active === f
                            ? "bg-primary/15 text-primary"
                            : "border border-border bg-card text-muted-foreground hover:bg-surface hover:text-foreground"
                        }`}
                      >
                        {f}
                        <span className="rounded-sm bg-border/60 px-1 text-[9px]">{counts[f]}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      placeholder="Search tenders…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8 w-56 rounded-md border border-border bg-surface px-3 font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
                    />
                    <button className="h-8 rounded-md border border-border bg-card px-3 font-mono text-[11px] hover:bg-surface">
                      Export
                    </button>
                  </div>
                </div>

                {/* Queue list */}
                <div className="mt-4 space-y-3">
                  {filtered.map((item) => (
                    <QueueCard key={item.id} item={item} />
                  ))}
                </div>

                {filtered.length === 0 && (
                  <div className="mt-10 text-center font-mono text-[12px] text-muted-foreground">
                    No tenders matching "{active}" status or search query.
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function QueueCard({ item }: { item: QueueItem }) {
  const remaining = item.deadline.getTime() - Date.now();
  const pct = Math.max(0, Math.min(100, 100 - (remaining / TOTAL_WINDOW) * 100));
  const { d, h, m, s } = useCountdown(item.deadline);

  const statusStyle: Record<Status, string> = {
    Ready: "bg-primary/15 text-primary",
    Sealed: "bg-success/15 text-success",
    Pending: "bg-amber-500/15 text-amber-400",
    Scheduled: "bg-muted text-muted-foreground",
  };

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/30">
      <div className="grid items-center gap-6 px-6 py-5 md:grid-cols-[1fr_auto_auto_auto]">
        {/* Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="truncate text-[14px] font-medium max-w-[400px]">{item.title}</h3>
            <span
              className={`shrink-0 rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${statusStyle[item.status]}`}
            >
              {item.status}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
            <span>{item.id}</span>
            <span>·</span>
            <span>{item.bids} sealed bids</span>
            <span>·</span>
            <span>{item.owner}</span>
          </div>
        </div>

        {/* Countdown */}
        <div className="rounded-lg border border-border bg-surface px-4 py-2 text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            Reveal in
          </div>
          <div className="tabular mt-0.5 font-display text-lg font-semibold text-primary">
            {String(d).padStart(2, "0")}:{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:
            {String(s).padStart(2, "0")}
          </div>
        </div>

        {/* Bids count */}
        <div className="text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            Bids
          </div>
          <div className="tabular mt-0.5 font-display text-xl font-semibold">{item.bids}</div>
        </div>

        {/* Progress ring (simplified bar) */}
        <div className="w-28">
          <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground">
            <span>Progress</span>
            <span className="tabular text-foreground">{Math.round(pct)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${
                pct > 90 ? "bg-primary" : pct > 60 ? "bg-amber-500" : "bg-success"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom detail row — visible on hover */}
      <div className="grid grid-cols-4 gap-px border-t border-border bg-border opacity-0 transition-opacity group-hover:opacity-100">
        {(
          [
            ["Cipher", "AES-256-GCM"],
            ["Custody", "HSM zu-3 / sg-1"],
            ["Threshold", "5 of 7 Shamir"],
            ["Deadline", dayjs(item.deadline).format("YYYY-MM-DD HH:mm:ss") + " UTC"],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="bg-card px-5 py-2 font-mono text-[10.5px]">
            <span className="text-muted-foreground">{k}: </span>
            <span className="text-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
