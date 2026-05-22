import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { CircularCountdown } from "@/components/countdown";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Enterprise console — SealedBid" },
      { name: "description", content: "Operate active tenders, monitor reveal queue, vendor activity and audit ledger." },
    ],
  }),
  component: Dashboard,
});

const target = new Date(Date.now() + 1000 * 60 * 60 * 18 + 1000 * 42);

function Dashboard() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="glow-orb absolute top-20 right-10 h-[600px] w-[600px] bg-primary/10 animate-pulse" style={{ animationDuration: "15s" }} />
      <div className="glow-orb absolute bottom-20 left-1/3 h-[500px] w-[500px] bg-amber-deep/10" />

      <SiteHeader />
      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0 relative z-10">
        <Sidebar />
        <main className="border-l border-border bg-grid-fine/30 px-8 py-8 relative">
          <Breadcrumb />
          <Header />
          <MetricRow />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
            <CountdownPanel />
            <RevealQueue />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <ActiveTendersTable />
            <Compliance />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <VendorActivity />
            <AuditLedger />
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  const groups = [
    {
      label: "Operate",
      items: [
        { l: "Overview", active: false },
        { l: "Active tenders", active: true, badge: "8" },
        { l: "Reveal queue", badge: "3" },
        { l: "Drafts" },
      ],
    },
    {
      label: "Network",
      items: [{ l: "Vendors" }, { l: "Invitations" }, { l: "KYC reviews" }],
    },
    {
      label: "Trust",
      items: [{ l: "Audit ledger" }, { l: "Compliance" }, { l: "Custody status" }],
    },
    { label: "Account", items: [{ l: "Members" }, { l: "Settings" }] },
  ];
  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto bg-sidebar px-4 py-6">
      <div className="rounded-lg border border-border bg-background/50 p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Workspace
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="text-[13px] font-medium">Federal Procurement · BE</div>
          <span className="font-mono text-[10px] text-success">Live</span>
        </div>
      </div>
      <nav className="mt-6 space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {g.label}
            </div>
            <div className="mt-2 space-y-0.5">
              {g.items.map((i) => (
                <div
                  key={i.l}
                  className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-[13px] transition-colors ${
                    i.active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  }`}
                >
                  <span>{i.l}</span>
                  {i.badge && (
                    <span className="rounded-sm bg-primary/15 px-1.5 font-mono text-[10px] text-primary">
                      {i.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function Breadcrumb() {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
      <span>Operate</span>
      <span>/</span>
      <span>Active tenders</span>
      <span>/</span>
      <span className="text-foreground">GOV-2026-ROAD-INFRA-014</span>
    </div>
  );
}

function Header() {
  return (
    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Federal Highway · Phase II
        </h1>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
          GOV-2026-ROAD-INFRA-014 · Created 2026-04-19 by m.vlaeminck@fps-mob.be
        </div>
      </div>
      <div className="flex gap-2">
        <button className="h-10 rounded-md border border-border bg-card px-4 text-[13px] hover:bg-muted">
          Export ledger
        </button>
        <button className="btn-ember inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold">
          Lock reveal
        </button>
      </div>
    </div>
  );
}

function MetricRow() {
  const m = [
    { k: "Sealed bids", v: "14", sub: "of 18 invited" },
    { k: "Bid envelope size", v: "32.4 MB", sub: "AES-256-GCM" },
    { k: "Reveal deadline", v: "T-18:00:42", sub: "2026-04-23 14:00 UTC" },
    { k: "Audit chain", v: "OK", sub: "root 0x9c4e…1aa2" },
  ];
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-4">
      {m.map((x) => (
        <div key={x.k} className="glass-card rounded-xl px-5 py-4 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)]">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {x.k}
          </div>
          <div className="tabular mt-1 font-display text-2xl font-semibold text-gradient-ember inline-block">{x.v}</div>
          <div className="font-mono text-[10.5px] text-muted-foreground mt-0.5">{x.sub}</div>
        </div>
      ))}
    </div>
  );
}

function CountdownPanel() {
  return (
    <div className="glass-card relative overflow-hidden rounded-xl p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="absolute inset-0 bg-radial-ember opacity-50" />
      <div className="glow-orb absolute -top-10 -right-10 h-[250px] w-[250px] bg-primary/10" />
      <div className="relative grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <CircularCountdown target={target} size={220} total={1000 * 60 * 60 * 72} />
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
            Mathematically sealed until deadline
          </div>
          <h3 className="mt-2 font-display text-2xl font-semibold">
            No human can read these bids.
          </h3>
          <p className="mt-3 text-[13.5px] text-muted-foreground">
            Key shares are held across 7 HSMs in 2 jurisdictions. Reassembly is enforced by
            time-lock; manual override would require a court order and 5 of 7 share holders.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 font-mono text-[11px]">
            {[
              ["Cipher", "AES-256-GCM"],
              ["Threshold", "5 of 7 Shamir"],
              ["Custody", "HSM zu-3 / sg-1"],
              ["Attestation", "TPM 2.0 · ok"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-border bg-surface px-3 py-2">
                <div className="text-muted-foreground">{k}</div>
                <div className="mt-0.5 text-foreground">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RevealQueue() {
  const items = [
    { id: "GOV-2026-ROAD-INFRA-014", in: "T-18:00:42", bids: 14, status: "Ready" },
    { id: "MOD-2026-MED-SUPPLY-007", in: "T-2d 04:12", bids: 9, status: "Sealed" },
    { id: "ENV-2026-WIND-OFFSHORE-22", in: "T-6d 11:03", bids: 7, status: "Open" },
    { id: "FIN-2026-BANK-CUSTODY-03", in: "T-12d 22:55", bids: 4, status: "Draft" },
  ];
  return (
    <div className="glass-card relative rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Reveal queue
        </div>
        <Link to="/dashboard" className="font-mono text-[10px] text-primary hover:underline">
          See all 8 →
        </Link>
      </div>
      <ol className="divide-y divide-border">
        {items.map((it) => (
          <li key={it.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3">
            <div>
              <div className="text-[13px] font-medium">{it.id}</div>
              <div className="font-mono text-[10.5px] text-muted-foreground">{it.bids} bids · sealed</div>
            </div>
            <div className="tabular font-mono text-[12px] text-foreground">{it.in}</div>
            <span
              className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                it.status === "Ready"
                  ? "bg-primary/15 text-primary"
                  : it.status === "Sealed"
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {it.status}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ActiveTendersTable() {
  const rows = [
    ["BID-014-A1", "Helios Civil Works AG", "BE0445.123.789", "0x8f3e…7e10", "32.4 MB", "Sealed"],
    ["BID-014-B2", "Stratum Infrastructure", "NL823491021", "0x71ca…4c52", "28.1 MB", "Sealed"],
    ["BID-014-C3", "Northwind Construct", "DE298471033", "0xa14b…8f77", "31.6 MB", "Sealed"],
    ["BID-014-D4", "Meridian Roads Ltd", "GB294823014", "0x223e…9012", "26.9 MB", "Sealed"],
    ["BID-014-E5", "Aleph Heavy Civils", "FR784109223", "0xdd0a…b614", "29.3 MB", "Sealed"],
    ["BID-014-F6", "Concord Engineering", "IT09832240", "0xee78…c0a4", "30.0 MB", "Sealed"],
  ];
  return (
    <div className="glass-card relative overflow-hidden rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Encrypted submissions · 14 sealed
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          <input
            placeholder="Filter…"
            className="h-7 rounded-md border border-border bg-surface px-2 text-[11px] text-foreground outline-none focus:border-primary/50"
          />
        </div>
      </div>
      <table className="w-full text-[12.5px]">
        <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <tr>
            <th className="px-5 py-2">Ref</th>
            <th className="px-5 py-2">Vendor</th>
            <th className="px-5 py-2">Reg.</th>
            <th className="px-5 py-2">Commit hash</th>
            <th className="px-5 py-2 text-right">Envelope</th>
            <th className="px-5 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r[0]} className="hover:bg-surface/60">
              <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{r[0]}</td>
              <td className="px-5 py-2.5 font-medium">{r[1]}</td>
              <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{r[2]}</td>
              <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{r[3]}</td>
              <td className="px-5 py-2.5 text-right font-mono text-[11px]">{r[4]}</td>
              <td className="px-5 py-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                  <span className="h-1 w-1 animate-seal-pulse rounded-full bg-primary" />
                  {r[5]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Compliance() {
  const items = [
    { k: "EU Procurement Directive 2014/24", v: "Mapped" },
    { k: "ISO 19583-1 metadata", v: "OK" },
    { k: "Vendor KYC freshness", v: "14 / 14 < 90d" },
    { k: "Open conflict declarations", v: "0" },
    { k: "DPA · DPIA on file", v: "v3 · 2026-02-11" },
  ];
  return (
    <div className="glass-card relative rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="border-b border-border/70 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Compliance monitor
      </div>
      <ul className="divide-y divide-border text-[13px]">
        {items.map((i) => (
          <li key={i.k} className="flex items-center justify-between px-5 py-3">
            <span className="text-foreground/85">{i.k}</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {i.v}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VendorActivity() {
  const rows = [
    ["Helios Civil Works AG", "Bid envelope sealed", "T-45:11"],
    ["Stratum Infrastructure", "KYC refreshed", "T-46:30"],
    ["Northwind Construct", "Joined tender", "T-50:18"],
    ["Meridian Roads Ltd", "Bid envelope sealed", "T-46:31"],
    ["Aleph Heavy Civils", "Bid envelope sealed", "T-45:12"],
    ["Concord Engineering", "Document re-uploaded", "T-44:02"],
  ];
  return (
    <div className="glass-card relative rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="border-b border-border/70 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Vendor activity
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r, i) => (
          <li key={i} className="grid grid-cols-[1fr_auto] items-center px-5 py-3 text-[13px]">
            <div>
              <div className="font-medium">{r[0]}</div>
              <div className="font-mono text-[11px] text-muted-foreground">{r[1]}</div>
            </div>
            <div className="tabular font-mono text-[11px] text-muted-foreground">{r[2]}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AuditLedger() {
  const rows = [
    ["T-44:02", "doc.replace", "Concord Engineering", "0x4fe2…c1b0"],
    ["T-45:11", "bid.seal", "Helios Civil Works AG", "0x8f3e…7e10"],
    ["T-45:12", "merkle.advance", "—", "root 0x9c4e…1aa2"],
    ["T-46:31", "bid.seal", "Meridian Roads Ltd", "0x223e…9012"],
    ["T-50:18", "vendor.join", "Northwind Construct", "0xb112…f00d"],
  ];
  return (
    <div className="glass-card relative rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Audit ledger · append-only
        </div>
        <Link to="/audit" className="font-mono text-[10px] text-primary hover:underline">
          Open ledger →
        </Link>
      </div>
      <table className="w-full text-[12.5px]">
        <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <tr>
            <th className="px-5 py-2">T</th>
            <th className="px-5 py-2">Event</th>
            <th className="px-5 py-2">Actor</th>
            <th className="px-5 py-2">Hash</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-surface/60">
              <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{r[0]}</td>
              <td className="px-5 py-2.5 font-mono text-[11px] text-primary">{r[1]}</td>
              <td className="px-5 py-2.5">{r[2]}</td>
              <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{r[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}