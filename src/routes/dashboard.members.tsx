import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export const Route = createFileRoute("/dashboard/members")({
  head: () => ({
    meta: [
      { title: "Members — BidVault" },
      {
        name: "description",
        content: "Manage workspace team members, roles, and access controls.",
      },
    ],
  }),
  component: MembersPage,
});

const members = [
  {
    name: "Marc Vlaeminck",
    email: "m.vlaeminck@fps-mob.be",
    role: "Admin" as const,
    lastLogin: "2026-05-22 09:14 UTC",
    mfa: true,
    initials: "MV",
  },
  {
    name: "Sophie De Ridder",
    email: "s.deridder@fps-mob.be",
    role: "Admin" as const,
    lastLogin: "2026-05-22 08:51 UTC",
    mfa: true,
    initials: "SR",
  },
  {
    name: "Jan Peeters",
    email: "j.peeters@fps-mob.be",
    role: "Operator" as const,
    lastLogin: "2026-05-21 16:33 UTC",
    mfa: true,
    initials: "JP",
  },
  {
    name: "Elise Mertens",
    email: "e.mertens@ext-audit.eu",
    role: "Auditor" as const,
    lastLogin: "2026-05-20 11:02 UTC",
    mfa: true,
    initials: "EM",
  },
  {
    name: "Pieter Janssens",
    email: "p.janssens@fps-mob.be",
    role: "Operator" as const,
    lastLogin: "2026-05-19 14:47 UTC",
    mfa: false,
    initials: "PJ",
  },
  {
    name: "Clara Van Damme",
    email: "c.vandamme@fps-mob.be",
    role: "Viewer" as const,
    lastLogin: "2026-05-18 10:20 UTC",
    mfa: false,
    initials: "CV",
  },
];

const roleColors: Record<string, string> = {
  Admin: "bg-primary/15 text-primary",
  Operator: "bg-blue-500/15 text-blue-400",
  Auditor: "bg-violet-500/15 text-violet-400",
  Viewer: "bg-muted text-muted-foreground",
};

function MembersPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0">
        <DashboardSidebar />
        <main className="border-l border-border px-8 py-8">
          <Breadcrumb />
          <Header />
          <MetricRow />
          <MembersTable />
        </main>
      </div>
    </div>
  );
}

/* ── Breadcrumb ──────────────────────────────────────── */
function Breadcrumb() {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
      <span>Account</span>
      <span>/</span>
      <span className="text-foreground">Members</span>
    </div>
  );
}

/* ── Header ──────────────────────────────────────────── */
function Header() {
  return (
    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Workspace members</h1>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
          Manage who can access this workspace and their permission levels.
        </div>
      </div>
      <div className="flex gap-2">
        <button className="h-10 rounded-md border border-border bg-card px-4 text-[13px] hover:bg-muted">
          Export list
        </button>
        <button className="btn-ember inline-flex h-10 items-center gap-2 rounded-md px-4 text-[13px] font-semibold">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Invite member
        </button>
      </div>
    </div>
  );
}

/* ── Metric row ──────────────────────────────────────── */
function MetricRow() {
  const m = [
    { k: "Total members", v: "6", sub: "across 2 orgs" },
    { k: "Admins", v: "2", sub: "full access" },
    { k: "MFA coverage", v: "67%", sub: "4 of 6 enabled" },
    { k: "Pending invites", v: "1", sub: "expires in 6d" },
  ];
  return (
    <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
      {m.map((x) => (
        <div key={x.k} className="bg-card px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {x.k}
          </div>
          <div className="tabular mt-1 font-display text-2xl font-semibold">{x.v}</div>
          <div className="font-mono text-[10.5px] text-muted-foreground">{x.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Members table ───────────────────────────────────── */
function MembersTable() {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Active members · {members.length} total
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Filter by name or email…"
            className="h-7 w-56 rounded-md border border-border bg-surface px-2 text-[11px] text-foreground outline-none focus:border-primary/50"
          />
        </div>
      </div>
      <table className="w-full text-[12.5px]">
        <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <tr>
            <th className="px-5 py-2">Member</th>
            <th className="px-5 py-2">Role</th>
            <th className="px-5 py-2">MFA</th>
            <th className="px-5 py-2">Last login</th>
            <th className="px-5 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((m) => (
            <tr key={m.email} className="group hover:bg-surface/60">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                    {m.initials}
                  </div>
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="font-mono text-[10.5px] text-muted-foreground">{m.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3">
                <span
                  className={`inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${roleColors[m.role]}`}
                >
                  {m.role}
                </span>
              </td>
              <td className="px-5 py-3">
                {m.mfa ? (
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-destructive">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    Disabled
                  </span>
                )}
              </td>
              <td className="px-5 py-3 font-mono text-[11px] text-muted-foreground">
                {m.lastLogin}
              </td>
              <td className="px-5 py-3 text-right">
                <button className="invisible rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground group-hover:visible">
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
