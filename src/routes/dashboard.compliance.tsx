import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export const Route = createFileRoute("/dashboard/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance monitor — SealedBid" },
      { name: "description", content: "Regulatory compliance checks, EU directives, ISO standards, GDPR and conflict of interest status." },
    ],
  }),
  component: CompliancePage,
});

/* ── mock data ─────────────────────────────────────────────────── */

type Status = "compliant" | "warning" | "action";

interface ComplianceItem {
  id: string;
  rule: string;
  description: string;
  status: Status;
  lastChecked: string;
  evidence: string;
}

const euDirectiveItems: ComplianceItem[] = [
  { id: "EU-001", rule: "Art 22(1) — E-procurement mandate", description: "All communications and submissions via certified e-platform", status: "compliant", lastChecked: "2026-05-22 08:00Z", evidence: "SealedBid cert #ESI-2024-4412" },
  { id: "EU-002", rule: "Art 40 — Technical specifications", description: "Non-discriminatory technical specs referencing EU/ISO standards", status: "compliant", lastChecked: "2026-05-21 14:30Z", evidence: "Spec review v2.3 approved" },
  { id: "EU-003", rule: "Art 42 — Labels & certifications", description: "Accepted equivalents for all required certifications", status: "warning", lastChecked: "2026-05-22 08:00Z", evidence: "2 of 14 vendors pending equiv. review" },
  { id: "EU-004", rule: "Art 56 — Evaluation criteria published", description: "Award criteria and weighting disclosed in tender notice", status: "compliant", lastChecked: "2026-05-20 10:00Z", evidence: "Published in TED 2026/S 078-123456" },
  { id: "EU-005", rule: "Art 67 — Best price-quality ratio", description: "MEAT criteria applied with documented methodology", status: "compliant", lastChecked: "2026-05-21 14:30Z", evidence: "Methodology doc v1.4" },
];

const isoItems: ComplianceItem[] = [
  { id: "ISO-001", rule: "ISO 19583-1:2023 — Metadata schema", description: "Structured metadata attached to every tender document", status: "compliant", lastChecked: "2026-05-22 08:00Z", evidence: "Auto-validated on upload" },
  { id: "ISO-002", rule: "ISO 27001:2022 — ISMS certification", description: "Information security management system certification", status: "compliant", lastChecked: "2026-04-01 00:00Z", evidence: "Cert #IS-742891 valid to 2027-03" },
  { id: "ISO-003", rule: "ISO 37001 — Anti-bribery controls", description: "Anti-bribery management system integration", status: "compliant", lastChecked: "2026-05-15 09:00Z", evidence: "Annual audit passed 2026-05-15" },
  { id: "ISO-004", rule: "ISO 20400 — Sustainable procurement", description: "Sustainability criteria integrated into evaluation", status: "warning", lastChecked: "2026-05-22 08:00Z", evidence: "Social value weighting under review" },
];

const gdprItems: ComplianceItem[] = [
  { id: "GDPR-001", rule: "Art 35 — DPIA on file", description: "Data Protection Impact Assessment for bid data processing", status: "compliant", lastChecked: "2026-02-11 00:00Z", evidence: "DPIA v3 · approved 2026-02-11" },
  { id: "GDPR-002", rule: "Art 28 — Processor agreements", description: "DPA signed with all sub-processors (HSM, cloud, backup)", status: "compliant", lastChecked: "2026-05-01 00:00Z", evidence: "7 / 7 DPAs current" },
  { id: "GDPR-003", rule: "Art 32 — Encryption at rest", description: "All bid envelopes encrypted AES-256-GCM at rest", status: "compliant", lastChecked: "2026-05-22 08:00Z", evidence: "Continuous enforcement" },
  { id: "GDPR-004", rule: "Art 17 — Erasure schedule", description: "Automated PII erasure 24 months post award decision", status: "compliant", lastChecked: "2026-05-20 10:00Z", evidence: "Policy v2.1 · next purge 2026-06-01" },
  { id: "GDPR-005", rule: "Art 33 — Breach notification plan", description: "72-hour breach notification procedure documented and tested", status: "action", lastChecked: "2026-05-22 08:00Z", evidence: "Tabletop drill overdue — due 2026-05-18" },
];

const coiItems: ComplianceItem[] = [
  { id: "COI-001", rule: "Evaluator declaration — Panel A", description: "5 evaluators submitted conflict of interest declarations", status: "compliant", lastChecked: "2026-05-21 14:30Z", evidence: "5 / 5 filed · 0 conflicts" },
  { id: "COI-002", rule: "Evaluator declaration — Panel B", description: "3 evaluators submitted conflict of interest declarations", status: "warning", lastChecked: "2026-05-22 08:00Z", evidence: "2 / 3 filed · 1 pending" },
  { id: "COI-003", rule: "Procurement officer declaration", description: "Lead officer annual COI declaration", status: "compliant", lastChecked: "2026-04-19 00:00Z", evidence: "Filed by m.vlaeminck@fps-mob.be" },
  { id: "COI-004", rule: "Vendor relationship screening", description: "Automated screening of vendor-evaluator relationships", status: "compliant", lastChecked: "2026-05-22 08:00Z", evidence: "0 matches across 14 vendors" },
];

const sections = [
  { label: "EU Procurement Directive 2014/24", items: euDirectiveItems },
  { label: "ISO Standards", items: isoItems },
  { label: "GDPR / Data Protection", items: gdprItems },
  { label: "Conflict of Interest", items: coiItems },
] as const;

/* ── helpers ───────────────────────────────────────────────────── */

function statusColor(s: Status) {
  if (s === "compliant") return "text-success";
  if (s === "warning") return "text-amber-400";
  return "text-red-400";
}

function statusBg(s: Status) {
  if (s === "compliant") return "bg-success/10 text-success";
  if (s === "warning") return "bg-amber-400/10 text-amber-400";
  return "bg-red-400/10 text-red-400";
}

function statusDot(s: Status) {
  if (s === "compliant") return "bg-success";
  if (s === "warning") return "bg-amber-400";
  return "bg-red-400";
}

function statusLabel(s: Status) {
  if (s === "compliant") return "Compliant";
  if (s === "warning") return "Warning";
  return "Action required";
}

/* ── score computation ─────────────────────────────────────────── */

const allItems = sections.flatMap((s) => s.items);
const total = allItems.length;
const compliantCount = allItems.filter((i) => i.status === "compliant").length;
const warningCount = allItems.filter((i) => i.status === "warning").length;
const actionCount = allItems.filter((i) => i.status === "action").length;
const score = Math.round((compliantCount / total) * 100);

/* ── component ─────────────────────────────────────────────────── */

function CompliancePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0">
        <DashboardSidebar />
        <main className="border-l border-border">

      {/* hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid-fine opacity-[0.4]" />
        <div className="relative mx-auto max-w-[1280px] px-6 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                Trust · Compliance
              </div>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                Compliance monitor
              </h1>
              <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
                Continuous regulatory compliance checks for tender GOV-2026-ROAD-INFRA-014.
                Status is refreshed hourly from policy engine attestations.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="h-10 rounded-md border border-border bg-card px-4 text-[13px] hover:bg-muted">
                Export report
              </button>
              <button className="btn-ember inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold">
                Run full scan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="mx-auto max-w-[1280px] px-6 py-10">
        {/* score row */}
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
          <div className="bg-card px-5 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Overall score
            </div>
            <div className="tabular mt-1 font-display text-2xl font-semibold">{score}%</div>
            <div className="font-mono text-[10.5px] text-muted-foreground">{total} checks evaluated</div>
          </div>
          <div className="bg-card px-5 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Compliant
            </div>
            <div className="tabular mt-1 font-display text-2xl font-semibold text-success">{compliantCount}</div>
            <div className="font-mono text-[10.5px] text-muted-foreground">of {total} checks</div>
          </div>
          <div className="bg-card px-5 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Warnings
            </div>
            <div className="tabular mt-1 font-display text-2xl font-semibold text-amber-400">{warningCount}</div>
            <div className="font-mono text-[10.5px] text-muted-foreground">review recommended</div>
          </div>
          <div className="bg-card px-5 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Actions required
            </div>
            <div className="tabular mt-1 font-display text-2xl font-semibold text-red-400">{actionCount}</div>
            <div className="font-mono text-[10.5px] text-muted-foreground">immediate attention</div>
          </div>
        </div>

        {/* sections */}
        <div className="mt-8 space-y-6">
          {sections.map((section) => {
            const sectionCompliant = section.items.filter((i) => i.status === "compliant").length;
            return (
              <div key={section.label} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {section.label}
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {sectionCompliant} / {section.items.length} compliant
                  </span>
                </div>
                <table className="w-full text-[12.5px]">
                  <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2">ID</th>
                      <th className="px-5 py-2">Rule</th>
                      <th className="px-5 py-2">Description</th>
                      <th className="px-5 py-2">Evidence</th>
                      <th className="px-5 py-2">Last checked</th>
                      <th className="px-5 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {section.items.map((item) => (
                      <tr key={item.id} className="group hover:bg-surface/60">
                        <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{item.id}</td>
                        <td className="px-5 py-2.5 font-medium">{item.rule}</td>
                        <td className="px-5 py-2.5 text-muted-foreground">{item.description}</td>
                        <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{item.evidence}</td>
                        <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{item.lastChecked}</td>
                        <td className="px-5 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${statusBg(item.status)}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDot(item.status)}`} />
                            {statusLabel(item.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* bottom sidebar-style row */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* recent compliance events */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Recent compliance events
              </div>
              <Link to="/audit" className="font-mono text-[10px] text-primary hover:underline">
                View audit log →
              </Link>
            </div>
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-2">Timestamp</th>
                  <th className="px-5 py-2">Event</th>
                  <th className="px-5 py-2">Detail</th>
                  <th className="px-5 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { t: "2026-05-22 08:00Z", k: "compliance.scan", detail: "Hourly automated scan completed — 18 checks", s: "compliant" as Status },
                  { t: "2026-05-22 07:45Z", k: "coi.filed", detail: "Panel A evaluator #5 declaration received", s: "compliant" as Status },
                  { t: "2026-05-21 14:30Z", k: "compliance.scan", detail: "Hourly automated scan — 1 new warning", s: "warning" as Status },
                  { t: "2026-05-20 10:00Z", k: "dpia.review", detail: "DPIA v3 re-certified by DPO", s: "compliant" as Status },
                  { t: "2026-05-18 00:00Z", k: "breach.drill.overdue", detail: "Tabletop drill deadline passed", s: "action" as Status },
                ].map((e, i) => (
                  <tr key={i} className="hover:bg-surface/60">
                    <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{e.t}</td>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-primary">{e.k}</td>
                    <td className="px-5 py-2.5">{e.detail}</td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${statusColor(e.s)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDot(e.s)}`} />
                        {statusLabel(e.s)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* policy sidebar */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Policy engine
              </div>
              <ul className="mt-3 space-y-2 text-[12.5px]">
                {[
                  ["Engine version", "v2.4.1"],
                  ["Policy pack", "EU-2024/24 r3"],
                  ["Last full scan", "2026-05-22 08:00Z"],
                  ["Scan interval", "Hourly"],
                  ["Next scheduled", "2026-05-22 09:00Z"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between">
                    <span className="text-foreground/85">{k}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{v}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Applicable frameworks
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  "EU 2014/24",
                  "ISO 27001",
                  "ISO 19583",
                  "ISO 37001",
                  "GDPR",
                  "eIDAS",
                  "ISO 20400",
                ].map((f) => (
                  <span
                    key={f}
                    className="rounded-sm border border-border bg-surface px-2 py-1 font-mono text-[10px] text-muted-foreground"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-graphite p-5 text-ivory dark:bg-surface">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                Export compliance pack
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-ivory/70">
                Generate a signed PDF bundle containing all evidence artifacts,
                declarations, and scan results for external auditors.
              </p>
              <button className="mt-3 h-8 rounded-md border border-primary/30 bg-primary/10 px-3 font-mono text-[11px] text-primary hover:bg-primary/20">
                Download bundle →
              </button>
            </div>
          </aside>
        </div>
      </div>
        </main>
      </div>
    </div>
  );
}
