import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export const Route = createFileRoute("/dashboard/overview")({
  head: () => ({
    meta: [
      { title: "Overview — SealedBid" },
      { name: "description", content: "High-level summary of procurement activity, metrics and quick actions." },
    ],
  }),
  component: DashboardOverview,
});

/* ── mock data ─────────────────────────────────────────────────── */

const metrics = [
  { k: "Total tenders", v: "24", sub: "since 2026-01-01", color: "text-foreground" },
  { k: "Active", v: "8", sub: "accepting bids", color: "text-primary" },
  { k: "Sealed", v: "14", sub: "awaiting reveal", color: "text-success" },
  { k: "Revealed", v: "2", sub: "evaluation phase", color: "text-foreground" },
];

const activity = [
  { ts: "2026-05-22 16:42:11Z", ev: "bid.seal", actor: "Helios Civil Works AG", tender: "GOV-2026-ROAD-INFRA-014" },
  { ts: "2026-05-22 15:38:02Z", ev: "vendor.join", actor: "Northwind Construct", tender: "MOD-2026-MED-SUPPLY-007" },
  { ts: "2026-05-22 14:22:54Z", ev: "tender.publish", actor: "m.vlaeminck@fps-mob.be", tender: "ENV-2026-WIND-OFFSHORE-22" },
  { ts: "2026-05-22 12:10:09Z", ev: "doc.replace", actor: "Concord Engineering", tender: "GOV-2026-ROAD-INFRA-014" },
  { ts: "2026-05-22 10:55:30Z", ev: "deadline.lock", actor: "system", tender: "FIN-2026-BANK-CUSTODY-03" },
  { ts: "2026-05-21 18:44:17Z", ev: "kyc.approve", actor: "admin@fps-mob.be", tender: "MOD-2026-MED-SUPPLY-007" },
  { ts: "2026-05-21 17:12:43Z", ev: "bid.seal", actor: "Meridian Roads Ltd", tender: "GOV-2026-ROAD-INFRA-014" },
  { ts: "2026-05-21 14:01:55Z", ev: "policy.attach", actor: "m.vlaeminck@fps-mob.be", tender: "ENV-2026-WIND-OFFSHORE-22" },
];

const barData = [
  { month: "Jan", tenders: 2, bids: 9 },
  { month: "Feb", tenders: 3, bids: 14 },
  { month: "Mar", tenders: 5, bids: 26 },
  { month: "Apr", tenders: 6, bids: 38 },
  { month: "May", tenders: 8, bids: 44 },
];

const topTenders = [
  { id: "GOV-2026-ROAD-INFRA-014", title: "Federal Highway · Phase II", bids: 14, value: "€ 42.5 M", status: "Sealed" },
  { id: "MOD-2026-MED-SUPPLY-007", title: "Medical Supply Framework", bids: 9, value: "€ 18.2 M", status: "Sealed" },
  { id: "ENV-2026-WIND-OFFSHORE-22", title: "Offshore Wind Array", bids: 7, value: "€ 310 M", status: "Open" },
  { id: "FIN-2026-BANK-CUSTODY-03", title: "Banking Custody Services", bids: 4, value: "€ 6.8 M", status: "Draft" },
];

/* ── page ──────────────────────────────────────────────────────── */

function DashboardOverview() {
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
                Workspace · Federal Procurement · BE
              </div>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                Overview
              </h1>
              <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
                High-level summary of tenders, bid activity, compliance posture
                and procurement throughput across the workspace.
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
        {/* ── metrics ────────────────────────────────────────── */}
        <MetricRow />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* ── bar chart ────────────────────────────────────── */}
          <BarChart />
          {/* ── top tenders ──────────────────────────────────── */}
          <TopTenders />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* ── activity feed ────────────────────────────────── */}
          <ActivityFeed />
          {/* ── platform health ──────────────────────────────── */}
          <PlatformHealth />
        </div>
      </div>
        </main>
      </div>
    </div>
  );
}

/* ── sub-components ────────────────────────────────────────────── */

function MetricRow() {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
      {metrics.map((x) => (
        <div key={x.k} className="bg-card px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {x.k}
          </div>
          <div className={`tabular mt-1 font-display text-2xl font-semibold ${x.color}`}>
            {x.v}
          </div>
          <div className="font-mono text-[10.5px] text-muted-foreground">{x.sub}</div>
        </div>
      ))}
    </div>
  );
}

function BarChart() {
  const maxBids = Math.max(...barData.map((d) => d.bids));
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Monthly throughput · 2026
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-primary" /> Bids received
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-muted-foreground/40" /> Tenders
          </span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-4 px-5 py-6">
        {barData.map((d) => (
          <div key={d.month} className="flex flex-col items-center gap-2">
            <div className="flex w-full flex-col items-center gap-1" style={{ height: 140 }}>
              {/* bids bar */}
              <div className="relative mt-auto w-full max-w-[32px]">
                <div
                  className="w-full rounded-t-sm bg-primary/80"
                  style={{ height: `${(d.bids / maxBids) * 120}px` }}
                />
              </div>
              {/* tenders bar (overlapping, smaller) */}
              <div className="relative w-full max-w-[32px]">
                <div
                  className="w-full rounded-t-sm bg-muted-foreground/25"
                  style={{ height: `${(d.tenders / maxBids) * 120}px` }}
                />
              </div>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">{d.month}</div>
            <div className="tabular font-mono text-[11px] font-medium">{d.bids}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopTenders() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Top tenders by bid count
        </div>
        <Link to="/dashboard" className="font-mono text-[10px] text-primary hover:underline">
          See all 24 →
        </Link>
      </div>
      <ol className="divide-y divide-border">
        {topTenders.map((t) => (
          <li key={t.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3">
            <div>
              <div className="text-[13px] font-medium">{t.title}</div>
              <div className="font-mono text-[10.5px] text-muted-foreground">
                {t.id} · {t.bids} bids
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
    </div>
  );
}

function ActivityFeed() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Recent activity
        </div>
        <Link to="/audit" className="font-mono text-[10px] text-primary hover:underline">
          Open ledger →
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {activity.map((a, i) => (
          <li key={i} className="grid grid-cols-[1fr_auto] items-center px-5 py-3 text-[13px]">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-primary">{a.ev}</span>
                <span className="font-medium">{a.actor}</span>
              </div>
              <div className="font-mono text-[10.5px] text-muted-foreground">{a.tender}</div>
            </div>
            <div className="tabular font-mono text-[11px] text-muted-foreground">{a.ts}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlatformHealth() {
  const items = [
    { k: "HSM cluster", v: "7 / 7 online", ok: true },
    { k: "Merkle anchor", v: "last 13:00:00Z", ok: true },
    { k: "Time-lock oracle", v: "synced · Δ < 200ms", ok: true },
    { k: "Active sessions", v: "12 operators", ok: true },
    { k: "Pending KYC reviews", v: "3 vendors", ok: false },
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
