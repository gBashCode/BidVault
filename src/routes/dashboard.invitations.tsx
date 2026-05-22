import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export const Route = createFileRoute("/dashboard/invitations")({
  head: () => ({
    meta: [
      { title: "Invitations — BidVault" },
      {
        name: "description",
        content: "Manage vendor invitations across active and upcoming tenders.",
      },
    ],
  }),
  component: InvitationsPage,
});

const invitations = [
  {
    id: "INV-2026-0041",
    vendor: "Helios Civil Works AG",
    reg: "BE0445.123.789",
    tender: "GOV-2026-ROAD-INFRA-014",
    tenderTitle: "Federal Highway · Phase II",
    sentDate: "2026-04-19",
    sentBy: "m.vlaeminck@fps-mob.be",
    status: "Accepted" as const,
    responseDate: "2026-04-20",
  },
  {
    id: "INV-2026-0042",
    vendor: "Stratum Infrastructure",
    reg: "NL823491021",
    tender: "GOV-2026-ROAD-INFRA-014",
    tenderTitle: "Federal Highway · Phase II",
    sentDate: "2026-04-19",
    sentBy: "m.vlaeminck@fps-mob.be",
    status: "Accepted" as const,
    responseDate: "2026-04-21",
  },
  {
    id: "INV-2026-0043",
    vendor: "Northwind Construct",
    reg: "DE298471033",
    tender: "MOD-2026-MED-SUPPLY-007",
    tenderTitle: "Medical Supply Chain Logistics",
    sentDate: "2026-04-21",
    sentBy: "j.peeters@mod-health.be",
    status: "Pending" as const,
    responseDate: "—",
  },
  {
    id: "INV-2026-0044",
    vendor: "Meridian Roads Ltd",
    reg: "GB294823014",
    tender: "GOV-2026-ROAD-INFRA-014",
    tenderTitle: "Federal Highway · Phase II",
    sentDate: "2026-04-18",
    sentBy: "m.vlaeminck@fps-mob.be",
    status: "Declined" as const,
    responseDate: "2026-04-20",
  },
  {
    id: "INV-2026-0045",
    vendor: "Aleph Heavy Civils",
    reg: "FR784109223",
    tender: "ENV-2026-WIND-OFFSHORE-22",
    tenderTitle: "Offshore Wind Farm · North Sea",
    sentDate: "2026-04-15",
    sentBy: "d.claes@env-energy.be",
    status: "Expired" as const,
    responseDate: "—",
  },
  {
    id: "INV-2026-0046",
    vendor: "Concord Engineering",
    reg: "IT09832240",
    tender: "FIN-2026-BANK-CUSTODY-03",
    tenderTitle: "Digital Custody Infrastructure",
    sentDate: "2026-04-22",
    sentBy: "s.janssen@fin-treasury.be",
    status: "Pending" as const,
    responseDate: "—",
  },
];

const statusStyle = {
  Accepted: "bg-success/15 text-success",
  Pending: "bg-primary/15 text-primary",
  Declined: "bg-destructive/15 text-destructive",
  Expired: "bg-muted text-muted-foreground",
};

const statusDot = {
  Accepted: "bg-success",
  Pending: "bg-primary animate-seal-pulse",
  Declined: "bg-destructive",
  Expired: "bg-muted-foreground",
};

function InvitationsPage() {
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
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    <Link to="/dashboard" className="hover:text-foreground">
                      Dashboard
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">Invitations</span>
                  </div>
                  <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                    Vendor invitations
                  </h1>
                  <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
                    Track outgoing invitations to qualified vendors across all active tenders.
                    Vendors receive a cryptographically signed invitation link with eIDAS
                    verification.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="h-10 rounded-md border border-border bg-card px-4 text-[13px] hover:bg-muted">
                    Export CSV
                  </button>
                  <button className="btn-ember inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold">
                    Send new invitation
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mx-auto grid max-w-[1280px] gap-6 px-6 py-10 lg:grid-cols-[1fr_300px]">
            {/* Main table */}
            <div className="space-y-6">
              {/* Metrics */}
              <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
                {[
                  { k: "Total sent", v: "42", sub: "across 8 tenders" },
                  { k: "Accepted", v: "28", sub: "66.7% rate" },
                  { k: "Pending", v: "9", sub: "avg. 2.3d response" },
                  { k: "Declined / Expired", v: "5", sub: "2 declined · 3 expired" },
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

              {/* Table */}
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Recent invitations · 6 of 42
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      placeholder="Filter vendors…"
                      className="h-7 rounded-md border border-border bg-surface px-2 text-[11px] text-foreground outline-none focus:border-primary/50"
                    />
                    <select className="h-7 rounded-md border border-border bg-surface px-2 text-[11px] text-foreground outline-none">
                      <option>All statuses</option>
                      <option>Accepted</option>
                      <option>Pending</option>
                      <option>Declined</option>
                      <option>Expired</option>
                    </select>
                  </div>
                </div>
                <table className="w-full text-[12.5px]">
                  <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2">Ref</th>
                      <th className="px-5 py-2">Vendor</th>
                      <th className="px-5 py-2">Tender</th>
                      <th className="px-5 py-2">Sent</th>
                      <th className="px-5 py-2">Response</th>
                      <th className="px-5 py-2">Status</th>
                      <th className="px-5 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="group hover:bg-surface/60">
                        <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">
                          {inv.id}
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="font-medium">{inv.vendor}</div>
                          <div className="font-mono text-[10.5px] text-muted-foreground">
                            {inv.reg}
                          </div>
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="text-foreground">{inv.tenderTitle}</div>
                          <div className="font-mono text-[10.5px] text-muted-foreground">
                            {inv.tender}
                          </div>
                        </td>
                        <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">
                          {inv.sentDate}
                        </td>
                        <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">
                          {inv.responseDate}
                        </td>
                        <td className="px-5 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${statusStyle[inv.status]}`}
                          >
                            <span className={`h-1 w-1 rounded-full ${statusDot[inv.status]}`} />
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          {inv.status === "Pending" && (
                            <button className="font-mono text-[10px] text-primary hover:underline">
                              Resend
                            </button>
                          )}
                          {inv.status === "Declined" && (
                            <button className="font-mono text-[10px] text-primary hover:underline">
                              Re-invite
                            </button>
                          )}
                          {inv.status === "Expired" && (
                            <button className="font-mono text-[10px] text-primary hover:underline">
                              Re-invite
                            </button>
                          )}
                          {inv.status === "Accepted" && (
                            <span className="font-mono text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Invitation policy
                </div>
                <ul className="mt-4 space-y-3 text-[13px]">
                  {[
                    ["eIDAS signature required", "Enforced"],
                    ["Response window", "5 business days"],
                    ["Auto-expire on lapse", "Enabled"],
                    ["Conflict of interest check", "Automated"],
                    ["KYC freshness < 90 days", "Required"],
                  ].map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between">
                      <span className="text-foreground/85">{k}</span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        {v}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Acceptance rate by tender
                </div>
                <ul className="mt-4 space-y-3 text-[13px]">
                  {[
                    ["GOV-2026-ROAD-INFRA-014", "12 / 18", "67%"],
                    ["MOD-2026-MED-SUPPLY-007", "7 / 9", "78%"],
                    ["ENV-2026-WIND-OFFSHORE-22", "5 / 8", "63%"],
                    ["FIN-2026-BANK-CUSTODY-03", "4 / 7", "57%"],
                  ].map(([tender, ratio, pct]) => (
                    <li key={tender} className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-[11px] text-foreground/85">{tender}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {ratio} accepted
                        </div>
                      </div>
                      <span className="tabular font-mono text-[12px] font-medium text-primary">
                        {pct}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-graphite p-5 text-ivory dark:bg-surface">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                  Invitation flow
                </div>
                <ol className="mt-4 space-y-3 text-[13px]">
                  {[
                    "Procurement officer selects qualified vendor from registry.",
                    "Signed invitation dispatched with eIDAS QSeal certificate.",
                    "Vendor receives link, verifies tender details and responds.",
                    "Accepted vendors get access to sealed submission portal.",
                  ].map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-0.5 font-mono text-[11px] text-primary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-ivory/80">{t}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
