import { createFileRoute, Link } from "@tanstack/react-router";
import { CircularCountdown, useCountdown } from "@/components/countdown";

export const Route = createFileRoute("/vendor/")({
  component: VendorOverview,
});

const target = new Date(Date.now() + 1000 * 60 * 60 * 18 + 1000 * 42);

function VendorOverview() {
  return (
    <div className="space-y-6">
      <Breadcrumb />
      <Header />
      <MetricRow />
      
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <CountdownPanel />
        <TenderDocuments />
      </div>
    </div>
  );
}

function Breadcrumb() {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
      <span>Vendor Identity</span>
      <span>/</span>
      <span>Tender Context</span>
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
          GOV-2026-ROAD-INFRA-014 · Published by Federal Procurement BE
        </div>
      </div>
      <div className="flex gap-2">
        <Link 
          to="/vendor/submit"
          className="btn-ember inline-flex h-10 items-center rounded-md px-6 text-[13px] font-semibold cursor-pointer shadow-[0_0_15px_rgba(255,107,0,0.3)] hover:shadow-[0_0_25px_rgba(255,107,0,0.5)] transition-shadow"
        >
          Submit Sealed Bid
        </Link>
      </div>
    </div>
  );
}

function MetricRow() {
  const m = [
    { k: "Your Status", v: "Not Submitted", sub: "Action required" },
    { k: "Required format", v: "AES-256-GCM", sub: "Envelope encrypted" },
    { k: "Reveal deadline", v: "T-18:00:42", sub: "2026-04-23 14:00 UTC" },
    { k: "Max bid size", v: "100 MB", sub: "per submission" },
  ];
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-4">
      {m.map((x, i) => (
        <div key={x.k} className="glass-card rounded-xl px-5 py-4 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)]">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {x.k}
          </div>
          <div className={`tabular mt-1 font-display text-2xl font-semibold inline-block ${i === 0 ? "text-primary animate-pulse" : "text-gradient-ember"}`}>
            {x.v}
          </div>
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
        <CircularCountdown target={target} size={200} total={1000 * 60 * 60 * 72} />
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
            Submission Window Open
          </div>
          <h3 className="mt-2 font-display text-2xl font-semibold">
            Prepare your encrypted envelope.
          </h3>
          <p className="mt-3 text-[13.5px] text-muted-foreground">
            Bids are encrypted locally in your browser. The purchasing authority cannot view your submission until the time-lock expires and HSM keys are distributed.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 font-mono text-[11px]">
            {[
              ["Compliance", "KYC Approved"],
              ["Eligibility", "Verified"],
              ["Jurisdiction", "EU / BE"],
              ["Encryption", "Client-side"],
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

function TenderDocuments() {
  const items = [
    { name: "Technical Specifications Annex A", size: "4.2 MB", type: "PDF" },
    { name: "Pricing Matrix Template", size: "1.1 MB", type: "XLSX" },
    { name: "Legal Terms & Conditions", size: "890 KB", type: "PDF" },
    { name: "Site Survey Data & Maps", size: "14.5 MB", type: "ZIP" },
  ];
  return (
    <div className="glass-card relative rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Tender Documents
        </div>
        <Link to="/vendor/documents" className="font-mono text-[10px] text-primary hover:underline">
          Download all →
        </Link>
      </div>
      <ol className="divide-y divide-border">
        {items.map((it) => (
          <li key={it.name} className="flex items-center justify-between px-5 py-3">
            <div>
              <div className="text-[13px] font-medium text-foreground/90">{it.name}</div>
              <div className="font-mono text-[10.5px] text-muted-foreground mt-0.5">{it.size}</div>
            </div>
            <span className="rounded-sm bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] border border-border text-muted-foreground">
              {it.type}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
