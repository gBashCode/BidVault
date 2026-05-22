import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export const Route = createFileRoute("/dashboard/kyc-reviews")({
  head: () => ({
    meta: [
      { title: "KYC reviews — BidVault" },
      {
        name: "description",
        content:
          "Review and approve vendor Know Your Customer documentation for procurement eligibility.",
      },
    ],
  }),
  component: KycReviewsPage,
});

type ReviewStatus = "Approved" | "Under review" | "Rejected" | "Needs update";

interface KycReview {
  id: string;
  vendor: string;
  reg: string;
  submissionDate: string;
  documentType: string;
  documentCount: number;
  status: ReviewStatus;
  reviewer: string;
  riskScore: string;
  expiresAt: string;
  notes: string;
}

const reviews: KycReview[] = [
  {
    id: "KYC-2026-0112",
    vendor: "Helios Civil Works AG",
    reg: "BE0445.123.789",
    submissionDate: "2026-04-18",
    documentType: "Full registration pack",
    documentCount: 8,
    status: "Approved",
    reviewer: "a.desmet@fps-compliance.be",
    riskScore: "Low",
    expiresAt: "2026-10-18",
    notes: "All documents verified against Belgian Crossroads Bank for Enterprises.",
  },
  {
    id: "KYC-2026-0113",
    vendor: "Stratum Infrastructure",
    reg: "NL823491021",
    submissionDate: "2026-04-20",
    documentType: "Annual renewal",
    documentCount: 5,
    status: "Under review",
    reviewer: "l.vanhoeck@fps-compliance.be",
    riskScore: "Medium",
    expiresAt: "—",
    notes: "Awaiting UBO register cross-check with Dutch Chamber of Commerce.",
  },
  {
    id: "KYC-2026-0114",
    vendor: "Northwind Construct",
    reg: "DE298471033",
    submissionDate: "2026-04-21",
    documentType: "Initial onboarding",
    documentCount: 12,
    status: "Needs update",
    reviewer: "a.desmet@fps-compliance.be",
    riskScore: "Medium",
    expiresAt: "—",
    notes: "Trade register extract older than 90 days. Certificate of good standing missing.",
  },
  {
    id: "KYC-2026-0115",
    vendor: "Meridian Roads Ltd",
    reg: "GB294823014",
    submissionDate: "2026-04-16",
    documentType: "Post-Brexit re-certification",
    documentCount: 9,
    status: "Rejected",
    reviewer: "l.vanhoeck@fps-compliance.be",
    riskScore: "High",
    expiresAt: "—",
    notes:
      "Director flagged on EU sanctions list (Council Regulation 269/2014). Escalated to legal.",
  },
  {
    id: "KYC-2026-0116",
    vendor: "Aleph Heavy Civils",
    reg: "FR784109223",
    submissionDate: "2026-04-22",
    documentType: "Full registration pack",
    documentCount: 7,
    status: "Under review",
    reviewer: "a.desmet@fps-compliance.be",
    riskScore: "Low",
    expiresAt: "—",
    notes: "French K-bis extract verified. Awaiting proof of professional insurance.",
  },
  {
    id: "KYC-2026-0117",
    vendor: "Concord Engineering",
    reg: "IT09832240",
    submissionDate: "2026-04-23",
    documentType: "Initial onboarding",
    documentCount: 10,
    status: "Approved",
    reviewer: "l.vanhoeck@fps-compliance.be",
    riskScore: "Low",
    expiresAt: "2026-10-23",
    notes: "Italian Camera di Commercio extract and anti-mafia certificate verified.",
  },
];

const statusStyle: Record<ReviewStatus, string> = {
  Approved: "bg-success/15 text-success",
  "Under review": "bg-primary/15 text-primary",
  Rejected: "bg-destructive/15 text-destructive",
  "Needs update": "bg-amber-500/15 text-amber-500",
};

const statusDot: Record<ReviewStatus, string> = {
  Approved: "bg-success",
  "Under review": "bg-primary animate-seal-pulse",
  Rejected: "bg-destructive",
  "Needs update": "bg-amber-500",
};

const riskStyle: Record<string, string> = {
  Low: "text-success",
  Medium: "text-primary",
  High: "text-destructive",
};

function KycReviewsPage() {
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
                    <span className="text-foreground">KYC reviews</span>
                  </div>
                  <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                    KYC reviews
                  </h1>
                  <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
                    Vendor identity verification, sanctions screening and document validation. All
                    reviews are logged immutably to the audit chain.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="h-10 rounded-md border border-border bg-card px-4 text-[13px] hover:bg-muted">
                    Export report
                  </button>
                  <button className="btn-ember inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold">
                    Request new KYC
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mx-auto grid max-w-[1280px] gap-6 px-6 py-10 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {/* Metrics */}
              <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
                {[
                  { k: "Total reviews", v: "38", sub: "since 2026-01-01" },
                  { k: "Approved", v: "29", sub: "76.3% approval rate" },
                  { k: "Under review", v: "6", sub: "avg. 3.1d turnaround" },
                  { k: "Rejected / Needs update", v: "3", sub: "1 rejected · 2 needs update" },
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

              {/* Reviews list */}
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="overflow-hidden rounded-xl border border-border bg-card hover:border-border/80"
                  >
                    {/* Card header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium">{review.vendor}</span>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${statusStyle[review.status]}`}
                            >
                              <span
                                className={`h-1 w-1 rounded-full ${statusDot[review.status]}`}
                              />
                              {review.status}
                            </span>
                          </div>
                          <div className="font-mono text-[10.5px] text-muted-foreground">
                            {review.id} · {review.reg}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(review.status === "Under review" || review.status === "Needs update") && (
                          <>
                            <button className="h-8 rounded-md border border-success/30 bg-success/10 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-success hover:bg-success/20">
                              Approve
                            </button>
                            <button className="h-8 rounded-md border border-border bg-surface px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:bg-muted hover:text-foreground">
                              Request update
                            </button>
                            <button className="h-8 rounded-md border border-destructive/30 bg-destructive/10 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive hover:bg-destructive/20">
                              Reject
                            </button>
                          </>
                        )}
                        {review.status === "Approved" && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            Valid until {review.expiresAt}
                          </span>
                        )}
                        {review.status === "Rejected" && (
                          <button className="h-8 rounded-md border border-border bg-surface px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary hover:bg-muted">
                            Request re-submission
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_1fr_auto]">
                      <div className="space-y-2">
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                          Document details
                        </div>
                        <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                          <div className="rounded-md border border-border bg-surface px-3 py-2">
                            <div className="text-muted-foreground">Type</div>
                            <div className="mt-0.5 text-foreground">{review.documentType}</div>
                          </div>
                          <div className="rounded-md border border-border bg-surface px-3 py-2">
                            <div className="text-muted-foreground">Documents</div>
                            <div className="mt-0.5 text-foreground">
                              {review.documentCount} files
                            </div>
                          </div>
                          <div className="rounded-md border border-border bg-surface px-3 py-2">
                            <div className="text-muted-foreground">Submitted</div>
                            <div className="mt-0.5 text-foreground">{review.submissionDate}</div>
                          </div>
                          <div className="rounded-md border border-border bg-surface px-3 py-2">
                            <div className="text-muted-foreground">Risk score</div>
                            <div className={`mt-0.5 ${riskStyle[review.riskScore]}`}>
                              {review.riskScore}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                          Reviewer notes
                        </div>
                        <p className="text-[13px] text-foreground/85">{review.notes}</p>
                        <div className="font-mono text-[10.5px] text-muted-foreground">
                          Reviewed by {review.reviewer}
                        </div>
                      </div>

                      <div className="flex items-start">
                        <button className="font-mono text-[10px] text-primary hover:underline">
                          View docs →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Verification checklist
                </div>
                <ul className="mt-4 space-y-3 text-[13px]">
                  {[
                    ["Trade register extract", "< 90 days"],
                    ["UBO declaration", "Required"],
                    ["Certificate of good standing", "Required"],
                    ["Professional insurance", "Verified"],
                    ["Sanctions screening", "Automated"],
                    ["Anti-money laundering", "Automated"],
                    ["Conflict of interest", "Self-declaration"],
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
                  Compliance framework
                </div>
                <ul className="mt-4 space-y-3 text-[13px]">
                  {[
                    ["EU Directive 2015/849", "AML/KYC"],
                    ["eIDAS Regulation", "Identity"],
                    ["EU Sanctions Reg. 269/2014", "Screening"],
                    ["GDPR Art. 6(1)(c)", "Data basis"],
                    ["Belgian Public Procurement Act", "Art. 61–66"],
                  ].map(([regulation, scope]) => (
                    <li key={regulation} className="flex items-center justify-between">
                      <span className="text-foreground/85">{regulation}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{scope}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Recent audit entries
                </div>
                <ul className="mt-4 space-y-3 text-[12.5px]">
                  {[
                    ["kyc.approve", "Concord Engineering", "2026-04-23"],
                    ["kyc.flag", "Meridian Roads Ltd", "2026-04-22"],
                    ["kyc.request", "Northwind Construct", "2026-04-22"],
                    ["kyc.submit", "Aleph Heavy Civils", "2026-04-22"],
                    ["kyc.approve", "Helios Civil Works AG", "2026-04-20"],
                  ].map(([event, vendor, date]) => (
                    <li key={`${event}-${vendor}`} className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-[11px] text-primary">{event}</div>
                        <div className="text-foreground/85">{vendor}</div>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{date}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/audit"
                  className="mt-4 block font-mono text-[10px] text-primary hover:underline"
                >
                  Open full ledger →
                </Link>
              </div>

              <div className="rounded-xl border border-border bg-graphite p-5 text-ivory dark:bg-surface">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                  KYC review process
                </div>
                <ol className="mt-4 space-y-3 text-[13px]">
                  {[
                    "Vendor uploads documents through encrypted portal with eIDAS signature.",
                    "Automated screening checks sanctions lists and UBO registers.",
                    "Compliance officer reviews documents and assigns risk score.",
                    "Approved vendors are eligible for tender invitations for 6 months.",
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
