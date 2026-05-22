import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export const Route = createFileRoute("/dashboard/drafts")({
  head: () => ({
    meta: [
      { title: "Drafts — SealedBid" },
      { name: "description", content: "Unpublished tender drafts awaiting completion and review." },
    ],
  }),
  component: DashboardDrafts,
});

/* ── mock data ─────────────────────────────────────────────────── */

const drafts = [
  {
    id: "DRF-2026-RAIL-009",
    title: "High-speed rail corridor · Brussels – Luxembourg",
    created: "2026-05-14",
    modified: "2026-05-22 14:32",
    value: "€ 1.28 B",
    completion: 82,
    author: "m.vlaeminck@fps-mob.be",
    sections: { done: 9, total: 11 },
  },
  {
    id: "DRF-2026-ICT-CLOUD-04",
    title: "Federal cloud infrastructure migration",
    created: "2026-05-10",
    modified: "2026-05-21 09:18",
    value: "€ 46.5 M",
    completion: 65,
    author: "j.peters@fps-bosa.be",
    sections: { done: 7, total: 11 },
  },
  {
    id: "DRF-2026-DEF-DRONE-17",
    title: "Tactical drone fleet – reconnaissance programme",
    created: "2026-05-06",
    modified: "2026-05-20 17:44",
    value: "€ 92 M",
    completion: 45,
    author: "k.devos@mod.mil.be",
    sections: { done: 5, total: 11 },
  },
  {
    id: "DRF-2026-ENV-HYDRO-11",
    title: "Flood-control pumping stations · Scheldt basin",
    created: "2026-04-28",
    modified: "2026-05-19 11:07",
    value: "€ 18.4 M",
    completion: 30,
    author: "l.janssen@vmm.be",
    sections: { done: 3, total: 10 },
  },
  {
    id: "DRF-2026-EDU-CAMPUS-02",
    title: "University campus digital learning platform",
    created: "2026-04-22",
    modified: "2026-05-18 16:55",
    value: "€ 7.1 M",
    completion: 15,
    author: "a.vandenberghe@onderwijs.be",
    sections: { done: 2, total: 13 },
  },
];

const summaryMetrics = [
  { k: "Total drafts", v: "5", sub: "unpublished" },
  { k: "Combined est. value", v: "€ 1.44 B", sub: "across 5 drafts" },
  { k: "Avg. completion", v: "47 %", sub: "weighted" },
  { k: "Oldest draft", v: "30 d", sub: "DRF-2026-EDU-CAMPUS-02" },
];

/* ── page ──────────────────────────────────────────────────────── */

function DashboardDrafts() {
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
                Operate · Drafts
              </div>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                Tender drafts
              </h1>
              <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
                Tenders still being authored. Complete all required sections before
                publishing to the sealed-bid network.
              </p>
            </div>
            <button className="btn-ember inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold">
              New draft
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-6 py-10">
        {/* ── summary metrics ────────────────────────────────── */}
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
          {summaryMetrics.map((x) => (
            <div key={x.k} className="bg-card px-5 py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {x.k}
              </div>
              <div className="tabular mt-1 font-display text-2xl font-semibold">{x.v}</div>
              <div className="font-mono text-[10.5px] text-muted-foreground">{x.sub}</div>
            </div>
          ))}
        </div>

        {/* ── drafts list ────────────────────────────────────── */}
        <div className="mt-6 space-y-4">
          {drafts.map((d) => (
            <DraftCard key={d.id} draft={d} />
          ))}
        </div>
      </div>
        </main>
      </div>
    </div>
  );
}

/* ── sub-components ────────────────────────────────────────────── */

function DraftCard({
  draft,
}: {
  draft: (typeof drafts)[number];
}) {
  const progressColor =
    draft.completion >= 75
      ? "bg-success"
      : draft.completion >= 40
        ? "bg-primary"
        : "bg-muted-foreground";

  const badgeColor =
    draft.completion >= 75
      ? "bg-success/15 text-success"
      : draft.completion >= 40
        ? "bg-primary/15 text-primary"
        : "bg-muted text-muted-foreground";

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/30">
      <div className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_auto]">
        {/* left: info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-[15px] font-semibold tracking-tight">{draft.title}</h3>
            <span
              className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${badgeColor}`}
            >
              {draft.completion}%
            </span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span>{draft.id}</span>
            <span>Created {draft.created}</span>
            <span>Modified {draft.modified}</span>
            <span>Est. {draft.value}</span>
            <span>{draft.author}</span>
          </div>

          {/* progress bar */}
          <div className="max-w-md space-y-1">
            <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
              <span>
                Sections {draft.sections.done} / {draft.sections.total}
              </span>
              <span>{draft.completion}% complete</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className={`h-full rounded-full transition-all ${progressColor}`}
                style={{ width: `${draft.completion}%` }}
              />
            </div>
          </div>
        </div>

        {/* right: actions */}
        <div className="flex items-start gap-2 md:flex-col md:items-end md:justify-center">
          <button
            className={`inline-flex h-8 items-center rounded-md px-3 text-[12px] font-semibold transition-colors ${
              draft.completion >= 75
                ? "btn-ember"
                : "cursor-not-allowed border border-border bg-surface text-muted-foreground"
            }`}
          >
            Publish
          </button>
          <button className="h-8 rounded-md border border-border bg-card px-3 text-[12px] hover:bg-muted">
            Edit
          </button>
          <button className="h-8 rounded-md border border-border bg-card px-3 text-[12px] text-destructive hover:bg-destructive/10">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
