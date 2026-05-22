import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SealedBid" },
      { name: "description", content: "Configure workspace settings, security policies, notifications, and API access." },
    ],
  }),
  component: SettingsPage,
});

const apiKeys = [
  {
    name: "Production — Tender API",
    key: "sk_live_9f4e••••••••••••••3c1a",
    created: "2026-03-12",
    lastUsed: "2026-05-22 08:41 UTC",
    status: "Active",
  },
  {
    name: "Staging — Integration tests",
    key: "sk_test_71ca••••••••••••••8b02",
    created: "2026-04-01",
    lastUsed: "2026-05-21 14:19 UTC",
    status: "Active",
  },
  {
    name: "CI/CD Pipeline — Deploy",
    key: "sk_ci_a3b0••••••••••••••f714",
    created: "2026-01-28",
    lastUsed: "2026-05-20 22:03 UTC",
    status: "Active",
  },
  {
    name: "Legacy — v3 migration",
    key: "sk_old_dd0a••••••••••••••1ee2",
    created: "2025-11-05",
    lastUsed: "2026-02-14 09:30 UTC",
    status: "Revoked",
  },
];

function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0">
        <DashboardSidebar />
        <main className="border-l border-border px-8 py-8">
          <Breadcrumb />
          <Header />
          <div className="mt-6 space-y-6">
            <GeneralSection />
            <SecuritySection />
            <NotificationsSection />
            <ApiSection />
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            <div className="font-mono text-[10.5px] text-muted-foreground">
              Last saved 2026-05-22 07:30 UTC by m.vlaeminck@fps-mob.be
            </div>
            <div className="flex gap-2">
              <button className="h-10 rounded-md border border-border bg-card px-4 text-[13px] hover:bg-muted">
                Discard
              </button>
              <button className="btn-ember inline-flex h-10 items-center rounded-md px-5 text-[13px] font-semibold">
                Save changes
              </button>
            </div>
          </div>
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
      <span className="text-foreground">Settings</span>
    </div>
  );
}

/* ── Header ──────────────────────────────────────────── */
function Header() {
  return (
    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Workspace settings
        </h1>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
          Configure security policies, notifications, and integration settings for this workspace.
        </div>
      </div>
    </div>
  );
}

/* ── Section wrapper ─────────────────────────────────── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-surface px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

/* ── Field row ───────────────────────────────────────── */
function FieldRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid items-center gap-4 px-5 py-4 md:grid-cols-[1fr_1fr]">
      <div>
        <div className="text-[13px] font-medium">{label}</div>
        <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{description}</div>
      </div>
      <div className="flex justify-end">{children}</div>
    </div>
  );
}

/* ── General ─────────────────────────────────────────── */
function GeneralSection() {
  return (
    <Section label="General">
      <FieldRow label="Workspace name" description="Display name shown across the platform.">
        <input
          defaultValue="Federal Procurement · BE"
          className="h-9 w-full max-w-xs rounded-md border border-border bg-surface px-3 text-[13px] text-foreground outline-none focus:border-primary/50"
        />
      </FieldRow>
      <FieldRow label="Workspace ID" description="Unique identifier, cannot be changed.">
        <div className="font-mono text-[12px] text-muted-foreground">ws_fps_mob_be_2026</div>
      </FieldRow>
      <FieldRow label="Description" description="Internal note for workspace purpose.">
        <textarea
          defaultValue="Belgian Federal Public Service – Mobility & Transport. Primary procurement workspace for road infrastructure tenders."
          rows={3}
          className="w-full max-w-xs resize-none rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary/50"
        />
      </FieldRow>
      <FieldRow label="Time zone" description="Used for deadline calculations and audit timestamps.">
        <input
          defaultValue="Europe/Brussels (UTC+1)"
          className="h-9 w-full max-w-xs rounded-md border border-border bg-surface px-3 text-[13px] text-foreground outline-none focus:border-primary/50"
          readOnly
        />
      </FieldRow>
    </Section>
  );
}

/* ── Security ────────────────────────────────────────── */
function SecuritySection() {
  return (
    <Section label="Security">
      <FieldRow label="Enforce MFA" description="Require all members to enable multi-factor authentication.">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Session timeout" description="Automatically sign out idle users after this duration.">
        <div className="flex items-center gap-2">
          <input
            defaultValue="30"
            className="h-9 w-20 rounded-md border border-border bg-surface px-3 text-center text-[13px] text-foreground outline-none focus:border-primary/50"
          />
          <span className="font-mono text-[11px] text-muted-foreground">minutes</span>
        </div>
      </FieldRow>
      <FieldRow label="IP allowlist" description="Restrict workspace access to specific IP ranges (CIDR notation).">
        <textarea
          defaultValue={"10.0.0.0/8\n172.16.0.0/12\n193.190.198.0/24"}
          rows={3}
          className="w-full max-w-xs resize-none rounded-md border border-border bg-surface px-3 py-2 font-mono text-[12px] text-foreground outline-none focus:border-primary/50"
        />
      </FieldRow>
      <FieldRow label="Audit log retention" description="Duration to retain detailed audit log entries.">
        <div className="flex items-center gap-2">
          <input
            defaultValue="365"
            className="h-9 w-20 rounded-md border border-border bg-surface px-3 text-center text-[13px] text-foreground outline-none focus:border-primary/50"
          />
          <span className="font-mono text-[11px] text-muted-foreground">days</span>
        </div>
      </FieldRow>
      <FieldRow label="Password policy" description="Minimum strength requirements for member passwords.">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-success/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Strong · 12+ chars
        </span>
      </FieldRow>
    </Section>
  );
}

/* ── Notifications ───────────────────────────────────── */
function NotificationsSection() {
  return (
    <Section label="Notifications">
      <FieldRow label="Email alerts" description="Send email notifications for critical tender events.">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Bid sealed alerts" description="Notify admins each time a bid envelope is sealed.">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Deadline reminders" description="Send reminders 72h, 24h, and 1h before reveal deadlines.">
        <Switch defaultChecked />
      </FieldRow>
      <FieldRow label="Weekly digest" description="Send a weekly summary of workspace activity every Monday.">
        <Switch />
      </FieldRow>
      <FieldRow label="Webhook URL" description="POST event payloads to an external endpoint (JSON).">
        <input
          defaultValue="https://hooks.fps-mob.be/sealedbid/events"
          className="h-9 w-full max-w-xs rounded-md border border-border bg-surface px-3 font-mono text-[12px] text-foreground outline-none focus:border-primary/50"
        />
      </FieldRow>
      <FieldRow label="Webhook secret" description="HMAC-SHA256 secret for verifying webhook signatures.">
        <div className="flex items-center gap-2">
          <input
            defaultValue="whsec_••••••••••••••••"
            readOnly
            className="h-9 w-full max-w-xs rounded-md border border-border bg-surface px-3 font-mono text-[12px] text-muted-foreground outline-none"
          />
          <button className="h-9 shrink-0 rounded-md border border-border bg-surface px-3 text-[11px] hover:bg-muted">
            Reveal
          </button>
        </div>
      </FieldRow>
    </Section>
  );
}

/* ── API ─────────────────────────────────────────────── */
function ApiSection() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          API keys
        </div>
        <button className="h-7 rounded-md border border-border bg-card px-3 text-[11px] font-medium hover:bg-muted">
          + Generate key
        </button>
      </div>
      <table className="w-full text-[12.5px]">
        <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <tr>
            <th className="px-5 py-2">Name</th>
            <th className="px-5 py-2">Key</th>
            <th className="px-5 py-2">Created</th>
            <th className="px-5 py-2">Last used</th>
            <th className="px-5 py-2">Status</th>
            <th className="px-5 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {apiKeys.map((k) => (
            <tr key={k.key} className="group hover:bg-surface/60">
              <td className="px-5 py-2.5 font-medium">{k.name}</td>
              <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{k.key}</td>
              <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{k.created}</td>
              <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{k.lastUsed}</td>
              <td className="px-5 py-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                    k.status === "Active"
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  <span
                    className={`h-1 w-1 rounded-full ${
                      k.status === "Active" ? "bg-success" : "bg-destructive"
                    }`}
                  />
                  {k.status}
                </span>
              </td>
              <td className="px-5 py-2.5 text-right">
                <button className="invisible rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground group-hover:visible">
                  {k.status === "Active" ? "Revoke" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
