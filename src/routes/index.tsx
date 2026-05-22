import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Countdown, CircularCountdown } from "@/components/countdown";
import { RevealShowcase, SealedBidCard } from "@/components/bid-card";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

const target = new Date(Date.now() + 1000 * 60 * 60 * 47 + 1000 * 73);

const heroBids = [
  { vendor: "Helios Civil Works AG", ref: "BID-014-A1", hash: "0x8f3e9a21bc4d7e10", amount: "€ 42,180,000" },
  { vendor: "Stratum Infrastructure", ref: "BID-014-B2", hash: "0x71ca2f08d9bb4c52", amount: "€ 39,920,500", delta: "—" },
  { vendor: "Northwind Construct", ref: "BID-014-C3", hash: "0xa14b6e9c2d018f77", amount: "€ 44,510,000" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <LiveReveal />
      <Features />
      <DashboardPreview />
      <SecuritySection />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

/* ---------- HERO ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-radial-ember opacity-90" />
      <div className="absolute inset-0 bg-grid opacity-[0.35]" />
      <div className="absolute inset-0 bg-noise opacity-40 mix-blend-overlay" />
      <div className="relative mx-auto grid max-w-[1400px] gap-16 px-6 pb-24 pt-20 md:grid-cols-[1.15fr_1fr] md:pt-28">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-seal-pulse rounded-full bg-primary" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Live · 2,184 sealed tenders this quarter
            </span>
          </div>
          <h1 className="mt-7 font-display text-[64px] font-semibold leading-[0.95] tracking-tight md:text-[88px]">
            Provably fair
            <br />
            <span className="text-gradient-ember">procurement</span>,
            <br />
            sealed by math.
          </h1>
          <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
            SealedBid is cryptographic infrastructure for high-stakes tendering. Vendor bids
            are encrypted at submission, held in zero-trust custody, and unsealed in the
            same atomic moment — with an immutable audit trail to prove it.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button className="btn-ember inline-flex h-12 items-center rounded-md px-6 text-[14px] font-semibold">
              Book enterprise demo
            </button>
            <Link
              to="/dashboard"
              className="inline-flex h-12 items-center rounded-md border border-border bg-card/80 px-6 text-[14px] font-medium text-foreground backdrop-blur transition-colors hover:bg-card"
            >
              Explore live console →
            </Link>
          </div>
          <div className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-border/70 pt-7">
            {[
              { k: "€ 38.2B", v: "Procured under seal" },
              { k: "11 / 27", v: "OECD jurisdictions" },
              { k: "0", v: "Pre-reveal breaches" },
            ].map((s) => (
              <div key={s.v}>
                <div className="tabular font-display text-2xl font-semibold">{s.k}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live tender card */}
        <div className="relative">
          <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-amber-deep/10 blur-2xl" />
          <div className="relative rounded-2xl border border-border bg-card/90 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Active tender
                </div>
                <div className="mt-1 font-display text-[18px] font-semibold">
                  Federal Highway · Phase II
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  GOV-2026-ROAD-INFRA-014 · 14 sealed bids
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-seal-pulse" />
                Sealed
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center">
              <CircularCountdown target={target} size={240} />
            </div>
            <div className="mt-6 divide-y divide-border/70 rounded-lg border border-border/70 bg-surface/60">
              {heroBids.map((b) => (
                <div key={b.ref} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary/20 to-amber-deep/20 ring-1 ring-primary/30" />
                    <div>
                      <div className="text-[13px] font-medium">{b.vendor}</div>
                      <div className="font-mono text-[10px] text-muted-foreground animate-hash">
                        {b.hash} · sealed
                      </div>
                    </div>
                  </div>
                  <div className="tabular font-mono text-[12px] text-muted-foreground/50">
                    •••• •••
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Cipher · AES-256-GCM</span>
              <span>Custody · HSM cluster zu-3</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- TRUST STRIP ---------- */
function TrustStrip() {
  const items = [
    { k: "AES-256-GCM", v: "Per-bid envelope encryption" },
    { k: "Atomic reveal", v: "Single-block deadline unseal" },
    { k: "Zero-trust", v: "Operators cannot read bids" },
    { k: "Audit-chain", v: "Append-only Merkle ledger" },
  ];
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 divide-x divide-border px-0 md:grid-cols-4">
        {items.map((it) => (
          <div key={it.k} className="px-6 py-7">
            <div className="font-display text-base font-semibold">{it.k}</div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {it.v}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- HOW IT WORKS ---------- */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Create tender",
      d: "Procurement officer drafts a tender, locks scope, and publishes the reveal deadline to the immutable ledger.",
    },
    {
      n: "02",
      t: "Encrypt bid",
      d: "Vendor's bid is encrypted client-side with AES-256-GCM. Only the cipher and a salted hash leave their device.",
    },
    {
      n: "03",
      t: "Store under custody",
      d: "Ciphertext is sharded across FIPS 140-3 HSMs. No human key-holder can decrypt before deadline T.",
    },
    {
      n: "04",
      t: "Reveal simultaneously",
      d: "At T, key shares re-assemble in a single atomic block. Every bid becomes legible to all parties at once.",
    },
    {
      n: "05",
      t: "Audit & verify",
      d: "Procurement, vendors, regulators and auditors verify each bid hash against the Merkle root. Tamper = impossible.",
    },
  ];
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-grid-fine opacity-[0.4]" />
      <div className="relative mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader
          eyebrow="Protocol"
          title="Five steps to a fair tender."
          sub="From draft to verified award, every event is signed, time-stamped and joined to the next."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-5">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="group relative rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Step {s.n}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 group-hover:bg-primary" />
              </div>
              <h3 className="mt-4 font-display text-[17px] font-semibold">{s.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.d}</p>
              {i < steps.length - 1 && (
                <div className="absolute right-[-13px] top-1/2 hidden h-px w-6 bg-gradient-to-r from-primary/40 to-transparent md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- LIVE REVEAL ---------- */
function LiveReveal() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-graphite text-ivory dark:bg-surface">
      <div className="absolute inset-0 bg-grid opacity-[0.15]" />
      <div className="absolute inset-x-0 top-0 h-px divider-x" />
      <div className="relative mx-auto max-w-[1400px] px-6 py-24">
        <div className="grid items-end gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Live reveal · Interactive
            </span>
            <h2 className="mt-3 font-display text-4xl font-semibold md:text-5xl">
              The deadline moment, choreographed.
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] text-ivory/70">
              Trigger the simulation below. Each cipher decrypts in the same atomic block;
              hashes resolve, ranks settle, and a tamper-proof verification trail is written
              to the ledger — all in under a second.
            </p>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-ivory/50">
            Showcase mode · No live data
          </div>
        </div>
        <div className="mt-10">
          <RevealShowcase bids={heroBids} />
        </div>
      </div>
    </section>
  );
}

/* ---------- FEATURES ---------- */
function Features() {
  const items = [
    {
      k: "Encrypted bid envelopes",
      d: "AES-256-GCM with per-tender keys, sharded via Shamir across 7 HSMs in two jurisdictions.",
      n: "01",
    },
    {
      k: "Immutable audit trail",
      d: "Every event — draft, submission, reveal, award — is hashed into an append-only Merkle ledger.",
      n: "02",
    },
    {
      k: "Vendor identity & KYC",
      d: "Onboarded vendors are bound to signed corporate identities and reusable compliance attestations.",
      n: "03",
    },
    {
      k: "Compliance dashboard",
      d: "EU Procurement Directive, FAR, UK PCR 2015 and ISO 19583 mapped to live tender state.",
      n: "04",
    },
    {
      k: "Cryptographic verification",
      d: "Any party can independently verify a bid against the published Merkle root — no platform trust required.",
      n: "05",
    },
    {
      k: "Reveal queue & SLAs",
      d: "Scheduled reveals with sub-second atomicity, monitored across regions with 99.999% availability.",
      n: "06",
    },
  ];
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader
          eyebrow="Capabilities"
          title="Enterprise procurement, re-engineered."
          sub="Six surfaces, one protocol. Each component runs in production for ministries, banks and infrastructure operators."
        />
        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.k}
              className="group relative bg-card p-7 transition-colors hover:bg-surface"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Module {it.n}
                </span>
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="mt-6 font-display text-[19px] font-semibold">{it.k}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- DASHBOARD PREVIEW ---------- */
function DashboardPreview() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-surface">
      <div className="absolute inset-0 bg-grid-fine opacity-[0.4]" />
      <div className="relative mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader
          eyebrow="Console"
          title="A control surface built for procurement teams."
          sub="Dense, calm, and immediate. The console is the operational reality of running a sealed tender."
        />
        <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_40px_80px_-40px_rgba(0,0,0,0.25)]">
          <DashboardMockup />
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            to="/dashboard"
            className="inline-flex h-11 items-center rounded-md border border-border bg-card px-5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            Open full enterprise console →
          </Link>
        </div>
      </div>
    </section>
  );
}

function DashboardMockup() {
  return (
    <div className="grid grid-cols-[200px_1fr] divide-x divide-border">
      <div className="hidden flex-col gap-1 bg-sidebar p-3 md:flex">
        {["Overview", "Active tenders", "Reveal queue", "Vendors", "Audit ledger", "Compliance", "Settings"].map(
          (l, i) => (
            <div
              key={l}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-[13px] ${
                i === 1
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <span>{l}</span>
              {i === 2 && (
                <span className="rounded-sm bg-primary/15 px-1.5 font-mono text-[10px] text-primary">3</span>
              )}
            </div>
          ),
        )}
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Active tender
            </div>
            <div className="mt-1 font-display text-lg font-semibold">
              GOV-2026-ROAD-INFRA-014 · Phase II
            </div>
          </div>
          <div className="hidden gap-2 md:flex">
            <Pill>14 bids sealed</Pill>
            <Pill tone="primary">Reveal T-47:00:13</Pill>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {[
            { k: "Bids sealed", v: "14 / 14" },
            { k: "Vendors verified", v: "14" },
            { k: "Compliance", v: "All clear" },
            { k: "Custody", v: "HSM zu-3 · ok" },
          ].map((m) => (
            <div key={m.k} className="rounded-lg border border-border bg-surface px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {m.k}
              </div>
              <div className="tabular mt-1 font-display text-xl font-semibold">{m.v}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <BidTable />
          <AuditPanel />
        </div>
      </div>
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "primary" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
        tone === "primary"
          ? "border border-primary/30 bg-primary/10 text-primary"
          : "border border-border bg-surface text-muted-foreground"
      }`}
    >
      {tone === "primary" && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-seal-pulse" />}
      {children}
    </span>
  );
}

function BidTable() {
  const rows = [
    ["BID-014-A1", "Helios Civil Works AG", "0x8f3e…7e10", "Sealed", "T-47:00"],
    ["BID-014-B2", "Stratum Infrastructure", "0x71ca…4c52", "Sealed", "T-46:58"],
    ["BID-014-C3", "Northwind Construct", "0xa14b…8f77", "Sealed", "T-46:54"],
    ["BID-014-D4", "Meridian Roads Ltd", "0x223e…9012", "Sealed", "T-46:31"],
    ["BID-014-E5", "Aleph Heavy Civils", "0xdd0a…b614", "Sealed", "T-45:12"],
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Encrypted submissions
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">Showing 5 / 14</div>
      </div>
      <table className="w-full text-[12.5px]">
        <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Ref</th>
            <th className="px-4 py-2">Vendor</th>
            <th className="px-4 py-2">Hash</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2 text-right">Received</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r[0]} className="hover:bg-surface/60">
              <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{r[0]}</td>
              <td className="px-4 py-2.5">{r[1]}</td>
              <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{r[2]}</td>
              <td className="px-4 py-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {r[3]}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-[11px] text-muted-foreground">{r[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditPanel() {
  const events = [
    { t: "T-45:12", k: "Bid sealed · BID-014-E5", h: "0xdd0a…b614" },
    { t: "T-45:14", k: "Merkle root advanced", h: "root 0x9c4e…1aa2" },
    { t: "T-46:31", k: "Bid sealed · BID-014-D4", h: "0x223e…9012" },
    { t: "T-48:02", k: "Tender published", h: "policy v2.1" },
    { t: "T-72:00", k: "Reveal deadline locked", h: "block 2,184,991" },
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Audit ledger
        </div>
        <span className="font-mono text-[10px] text-success">Sealed · OK</span>
      </div>
      <ol className="relative">
        {events.map((e, i) => (
          <li key={i} className="relative flex gap-3 border-b border-border/60 px-4 py-3 last:border-0">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              {i < events.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {e.t}
                </span>
                <span className="text-[12.5px] font-medium">{e.k}</span>
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">{e.h}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- SECURITY SECTION ---------- */
function SecuritySection() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-radial-ember opacity-50" />
      <div className="relative mx-auto grid max-w-[1400px] gap-12 px-6 py-24 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
            Cryptographic trust
          </span>
          <h2 className="mt-3 font-display text-4xl font-semibold md:text-5xl">
            The platform doesn't ask you to trust the platform.
          </h2>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Every bid is published as a commitment hash the moment it's submitted. After the
            reveal, anyone — auditor, regulator, competing vendor — can independently verify
            that the disclosed bid is byte-identical to what was sealed.
          </p>
          <ul className="mt-7 space-y-3 text-[14px]">
            {[
              "AES-256-GCM envelope encryption with per-tender keys",
              "Shamir 5-of-7 secret sharing across two jurisdictions",
              "FIPS 140-3 Level 4 HSM custody, observable via attestation",
              "Append-only Merkle ledger anchored hourly to public chains",
              "External cryptographic review by Trail of Bits & NCC Group",
            ].map((l) => (
              <li key={l} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-foreground/85">{l}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card/90 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Verification example
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Match
            </span>
          </div>
          <div className="mt-5 grid gap-3 font-mono text-[11.5px]">
            {[
              ["committed_hash", "0x8f3e9a21bc4d7e10ff019cba0e72…"],
              ["disclosed_bid", "{ vendor: HELIOS, amount: 42180000 }"],
              ["recomputed_hash", "0x8f3e9a21bc4d7e10ff019cba0e72…"],
              ["merkle_root", "0x9c4e44a91aa2003e771bbcd03…"],
              ["block", "ETH 19,184,001 · 2026-04-21T14:00:00Z"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-[140px_1fr] items-baseline gap-3 rounded-md border border-border bg-surface px-3 py-2"
              >
                <span className="text-muted-foreground">{k}</span>
                <span className="truncate text-foreground">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-[12.5px] text-success">
            ✓ Disclosed bid matches sealed commitment. Verified independently of SealedBid.
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- FINAL CTA ---------- */
function FinalCta() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-graphite text-ivory">
      <div className="absolute inset-0 bg-grid opacity-[0.18]" />
      <div className="absolute inset-0 bg-radial-ember opacity-60" />
      <div className="relative mx-auto max-w-[1400px] px-6 py-28 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-ivory/15 bg-ivory/5 px-3 py-1.5 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-seal-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ivory/70">
            Currently onboarding · Public sector & infrastructure
          </span>
        </div>
        <h2 className="mx-auto mt-6 max-w-3xl font-display text-5xl font-semibold leading-[1] md:text-7xl">
          When fairness must be <span className="text-gradient-ember">proven</span>, not promised.
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button className="btn-ember inline-flex h-12 items-center rounded-md px-6 text-[14px] font-semibold">
            Talk to procurement engineering
          </button>
          <a
            href="#"
            className="inline-flex h-12 items-center rounded-md border border-ivory/20 bg-ivory/5 px-6 text-[14px] font-medium text-ivory backdrop-blur hover:bg-ivory/10"
          >
            Read the protocol whitepaper
          </a>
        </div>
        <div className="mt-8">
          <Countdown target={target} compact />
        </div>
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ivory/50">
          Next live demo reveal · simulated
        </div>
      </div>
    </section>
  );
}

/* ---------- shared ---------- */
function SectionHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-8">
      <div className="max-w-3xl">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
          {eyebrow}
        </span>
        <h2 className="mt-3 font-display text-4xl font-semibold leading-[1.05] md:text-5xl">
          {title}
        </h2>
        {sub && <p className="mt-4 text-[15px] text-muted-foreground">{sub}</p>}
      </div>
      <div className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground md:block">
        SealedBid / Protocol
      </div>
    </div>
  );
}
