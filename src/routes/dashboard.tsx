import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { CircularCountdown } from "@/components/countdown";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

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
  const [inspectItem, setInspectItem] = useState<{
    type: "bid" | "audit";
    id: string;
    data: any;
  } | null>(null);

  const handleSelectBid = (ref: string) => {
    const bid = MOCK_BIDS[ref];
    if (bid) {
      setInspectItem({ type: "bid", id: ref, data: bid });
    }
  };

  const handleSelectAudit = (hash: string) => {
    const fullKey = Object.keys(MOCK_AUDIT_LOGS).find(
      (k) => k === hash || k.startsWith(hash.substring(0, 6))
    );
    if (fullKey) {
      setInspectItem({ type: "audit", id: hash, data: MOCK_AUDIT_LOGS[fullKey] });
    }
  };

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
            <ActiveTendersTable onSelectBid={handleSelectBid} />
            <Compliance />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <VendorActivity />
            <AuditLedger onSelectAudit={handleSelectAudit} />
          </div>
        </main>
      </div>

      <Sheet open={!!inspectItem} onOpenChange={(open) => !open && setInspectItem(null)}>
        <SheetContent className="w-[90vw] sm:max-w-lg border-l border-border bg-card/95 backdrop-blur-xl text-foreground flex flex-col h-full p-0">
          {inspectItem && (
            <div className="flex flex-col h-full overflow-y-auto">
              <div className="border-b border-border/70 p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">
                  SECURE CRYPTOGRAPHIC LEDGER
                </div>
                <SheetTitle className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {inspectItem.type === "bid" ? "Bid Commitment Envelope" : "Audit Ledger Record"}
                </SheetTitle>
                <SheetDescription className="font-mono text-[11px] text-muted-foreground mt-1.5">
                  ID / HASH: <span className="text-foreground font-semibold break-all selection:bg-primary/30">{inspectItem.id}</span>
                </SheetDescription>
              </div>

              {inspectItem.type === "bid" ? (
                <BidInspectBody bid={inspectItem.data} />
              ) : (
                <AuditInspectBody log={inspectItem.data} />
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
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
        <button 
          onClick={() => toast.success("Ledger Export Completed", {
            description: "CSV-ZIP archive generated. Hash signature: 0x4f82...92be"
          })}
          className="h-10 rounded-md border border-border bg-card px-4 text-[13px] hover:bg-muted cursor-pointer"
        >
          Export ledger
        </button>
        <button 
          onClick={() => toast.info("Reveal Countdown Locked", {
            description: "Shamir key nodes synced. Time-lock unlock deadline active."
          })}
          className="btn-ember inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold cursor-pointer"
        >
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

function ActiveTendersTable({ onSelectBid }: { onSelectBid: (ref: string) => void }) {
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
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[600px]">
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
              <tr 
                key={r[0]} 
                className="hover:bg-surface/60 cursor-pointer transition-colors group"
                onClick={() => onSelectBid(r[0])}
              >
                <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground group-hover:text-primary transition-colors">{r[0]}</td>
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

function AuditLedger({ onSelectAudit }: { onSelectAudit: (hash: string) => void }) {
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
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[400px]">
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
              <tr 
                key={i} 
                className="hover:bg-surface/60 cursor-pointer transition-colors group"
                onClick={() => onSelectAudit(r[3])}
              >
                <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{r[0]}</td>
                <td className="px-5 py-2.5 font-mono text-[11px] text-primary">{r[1]}</td>
                <td className="px-5 py-2.5">{r[2]}</td>
                <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground group-hover:text-primary transition-colors">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* Cryptographic Detailed Inspection Sheet Components & Mock Data */

interface BidDetail {
  ref: string;
  vendor: string;
  reg: string;
  commitHash: string;
  fullHash: string;
  envelopeSize: string;
  status: string;
  timestamp: string;
  salt: string;
  merkleProof: {
    root: string;
    leafIndex: number;
    proof: string[];
  };
  hsmAttestation: {
    cert: string;
    node: string;
    algorithm: string;
    publicKey: string;
  };
  rawPayload: string;
}

const MOCK_BIDS: Record<string, BidDetail> = {
  "BID-014-A1": {
    ref: "BID-014-A1",
    vendor: "Helios Civil Works AG",
    reg: "BE0445.123.789",
    commitHash: "0x8f3e…7e10",
    fullHash: "0x8f3e9cb124fdd9e083c27e10a6db24e390cbf5233bc238ee92745cf842f1a602",
    envelopeSize: "32.4 MB",
    status: "Sealed",
    timestamp: "2026-05-22 15:11:02 UTC",
    salt: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    merkleProof: {
      root: "0x9c4e2311aa234e1289de456bb788102aef12d09c2a3b4c5d6e7f8a9b0c1d2e3f",
      leafIndex: 0,
      proof: [
        "0xab53c12f0e0d5a3f2d1c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e",
        "0x7c9d4e1b8c3a2f90123cb456d789e0123f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9",
        "0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e"
      ],
    },
    hsmAttestation: {
      cert: "FIPS-140-3 Level 4 (Attestation Key Cert ID #4839)",
      node: "HSM-SG-1 (Singapore Custody)",
      algorithm: "Curve25519 DH + ECIES-SHA256",
      publicKey: "04:8f:3e:9c:b1:24:fd:d9:e0:83:c2:7e:10:a6:db:24:e3:90:cb:f5:23:3b:c2"
    },
    rawPayload: JSON.stringify({
      tender_ref: "GOV-2026-ROAD-INFRA-014",
      vendor: "Helios Civil Works AG",
      amount_commitment: "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
      bid_value_encrypted: "U2VjcmV0QmlkVmFsdWVPZkhlbGlvc0NpdmlsV29ya3NBRw==",
      nonce: "1678b9c0d1e2f3a4"
    }, null, 2)
  },
  "BID-014-B2": {
    ref: "BID-014-B2",
    vendor: "Stratum Infrastructure",
    reg: "NL823491021",
    commitHash: "0x71ca…4c52",
    fullHash: "0x71ca8482f3ef841029c3a37d2fef8e70a98f12c29bc34ee927d62fe842f1a602",
    envelopeSize: "28.1 MB",
    status: "Sealed",
    timestamp: "2026-05-22 13:42:15 UTC",
    salt: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    merkleProof: {
      root: "0x9c4e2311aa234e1289de456bb788102aef12d09c2a3b4c5d6e7f8a9b0c1d2e3f",
      leafIndex: 1,
      proof: [
        "0x8f3e9cb124fdd9e083c27e10a6db24e390cbf5233bc238ee92745cf842f1a602",
        "0x7c9d4e1b8c3a2f90123cb456d789e0123f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9",
        "0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e"
      ],
    },
    hsmAttestation: {
      cert: "FIPS-140-3 Level 4 (Attestation Key Cert ID #4841)",
      node: "HSM-ZU-3 (Zurich Custody)",
      algorithm: "Curve25519 DH + ECIES-SHA256",
      publicKey: "04:71:ca:84:82:f3:ef:84:10:29:c3:a3:7d:2f:ef:8e:70:a9:8f:12:c2:9b:c3"
    },
    rawPayload: JSON.stringify({
      tender_ref: "GOV-2026-ROAD-INFRA-014",
      vendor: "Stratum Infrastructure",
      amount_commitment: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
      bid_value_encrypted: "U2VjcmV0QmlkVmFsdWVPZlN0cmF0dW1JbmZyYXN0cnVjdHVyZQ==",
      nonce: "2678b9c0d1e2f3a5"
    }, null, 2)
  },
  "BID-014-C3": {
    ref: "BID-014-C3",
    vendor: "Northwind Construct",
    reg: "DE298471033",
    commitHash: "0xa14b…8f77",
    fullHash: "0xa14b9cb224fdd9e083c27e10a6db24e390cbf5233bc238ee92745cf842f1a238",
    envelopeSize: "31.6 MB",
    status: "Sealed",
    timestamp: "2026-05-22 10:18:41 UTC",
    salt: "8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f",
    merkleProof: {
      root: "0x9c4e2311aa234e1289de456bb788102aef12d09c2a3b4c5d6e7f8a9b0c1d2e3f",
      leafIndex: 2,
      proof: [
        "0xdd0a8123bc45e7890123cb124fdd9e083c27e10a6db24e390cbf5233bc23b614",
        "0x8f3e9cb124fdd9e083c27e10a6db24e390cbf5233bc238ee92745cf842f1a602",
        "0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e"
      ],
    },
    hsmAttestation: {
      cert: "FIPS-140-3 Level 4 (Attestation Key Cert ID #4838)",
      node: "HSM-SG-1 (Singapore Custody)",
      algorithm: "Curve25519 DH + ECIES-SHA256",
      publicKey: "04:a1:4b:9c:b2:24:fd:d9:e0:83:c2:7e:10:a6:db:24:e3:90:cb:f5:23:3b:c2"
    },
    rawPayload: JSON.stringify({
      tender_ref: "GOV-2026-ROAD-INFRA-014",
      vendor: "Northwind Construct",
      amount_commitment: "0x8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f",
      bid_value_encrypted: "U2VjcmV0QmlkVmFsdWVPZk5vcnRod2luZENvbnN0cnVjdA==",
      nonce: "3678b9c0d1e2f3a6"
    }, null, 2)
  },
  "BID-014-D4": {
    ref: "BID-014-D4",
    vendor: "Meridian Roads Ltd",
    reg: "GB294823014",
    commitHash: "0x223e…9012",
    fullHash: "0x223ecb124fdd9e083c27e10a6db24e390cbf5233bc238ee92745cf842f1a9012",
    envelopeSize: "26.9 MB",
    status: "Sealed",
    timestamp: "2026-05-22 09:31:55 UTC",
    salt: "9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
    merkleProof: {
      root: "0x9c4e2311aa234e1289de456bb788102aef12d09c2a3b4c5d6e7f8a9b0c1d2e3f",
      leafIndex: 3,
      proof: [
        "0xa14b9cb224fdd9e083c27e10a6db24e390cbf5233bc238ee92745cf842f1a238",
        "0x8f3e9cb124fdd9e083c27e10a6db24e390cbf5233bc238ee92745cf842f1a602",
        "0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e"
      ],
    },
    hsmAttestation: {
      cert: "FIPS-140-3 Level 4 (Attestation Key Cert ID #4837)",
      node: "HSM-ZU-3 (Zurich Custody)",
      algorithm: "Curve25519 DH + ECIES-SHA256",
      publicKey: "04:22:3e:cb:12:4f:dd:9e:08:3c:27:e10:a6:db:24:e3:90:cb:f5:23:3b:c2"
    },
    rawPayload: JSON.stringify({
      tender_ref: "GOV-2026-ROAD-INFRA-014",
      vendor: "Meridian Roads Ltd",
      amount_commitment: "0x9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
      bid_value_encrypted: "U2VjcmV0QmlkVmFsdWVPZk1lcmlkaWFuUm9hZHNMdGQ=",
      nonce: "4678b9c0d1e2f3a7"
    }, null, 2)
  },
  "BID-014-E5": {
    ref: "BID-014-E5",
    vendor: "Aleph Heavy Civils",
    reg: "FR784109223",
    commitHash: "0xdd0a…b614",
    fullHash: "0xdd0a8123bc45e7890123cb124fdd9e083c27e10a6db24e390cbf5233bc23b614",
    envelopeSize: "29.3 MB",
    status: "Sealed",
    timestamp: "2026-05-22 10:12:30 UTC",
    salt: "0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b",
    merkleProof: {
      root: "0x9c4e2311aa234e1289de456bb788102aef12d09c2a3b4c5d6e7f8a9b0c1d2e3f",
      leafIndex: 4,
      proof: [
        "0xee78a9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5ec0a4",
        "0xa14b9cb224fdd9e083c27e10a6db24e390cbf5233bc238ee92745cf842f1a238",
        "0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e"
      ],
    },
    hsmAttestation: {
      cert: "FIPS-140-3 Level 4 (Attestation Key Cert ID #4836)",
      node: "HSM-SG-1 (Singapore Custody)",
      algorithm: "Curve25519 DH + ECIES-SHA256",
      publicKey: "04:dd:0a:81:23:bc:45:e7:89:01:23:cb:12:4f:dd:9e:08:3c:27:e10:a6:db"
    },
    rawPayload: JSON.stringify({
      tender_ref: "GOV-2026-ROAD-INFRA-014",
      vendor: "Aleph Heavy Civils",
      amount_commitment: "0x0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b",
      bid_value_encrypted: "U2VjcmV0QmlkVmFsdWVPZkFsZXBoSGVhdnlDaXZpbHM=",
      nonce: "5678b9c0d1e2f3a8"
    }, null, 2)
  },
  "BID-014-F6": {
    ref: "BID-014-F6",
    vendor: "Concord Engineering",
    reg: "IT09832240",
    commitHash: "0xee78…c0a4",
    fullHash: "0xee78a9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5ec0a4",
    envelopeSize: "30.0 MB",
    status: "Sealed",
    timestamp: "2026-05-22 14:02:18 UTC",
    salt: "f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
    merkleProof: {
      root: "0x9c4e2311aa234e1289de456bb788102aef12d09c2a3b4c5d6e7f8a9b0c1d2e3f",
      leafIndex: 5,
      proof: [
        "0xdd0a8123bc45e7890123cb124fdd9e083c27e10a6db24e390cbf5233bc23b614",
        "0xa14b9cb224fdd9e083c27e10a6db24e390cbf5233bc238ee92745cf842f1a238",
        "0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e"
      ],
    },
    hsmAttestation: {
      cert: "FIPS-140-3 Level 4 (Attestation Key Cert ID #4835)",
      node: "HSM-ZU-3 (Zurich Custody)",
      algorithm: "Curve25519 DH + ECIES-SHA256",
      publicKey: "04:ee:78:a9:c0:d1:e2:f3:a4:b5:c6:d7:e8:f9:a0:b1:c2:d3:e4:f5:a6:b7"
    },
    rawPayload: JSON.stringify({
      tender_ref: "GOV-2026-ROAD-INFRA-014",
      vendor: "Concord Engineering",
      amount_commitment: "0xf1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
      bid_value_encrypted: "U2VjcmV0QmlkVmFsdWVPZkNvbmNvcmRFbmdpbmVlcmluZw==",
      nonce: "6678b9c0d1e2f3a9"
    }, null, 2)
  }
};

interface AuditLogDetail {
  timestamp: string;
  event: string;
  actor: string;
  hash: string;
  details: string;
  signer: string;
  signature: string;
  blockHeight: number;
}

const MOCK_AUDIT_LOGS: Record<string, AuditLogDetail> = {
  "0x4fe2…c1b0": {
    timestamp: "2026-05-22 14:02:18 UTC",
    event: "doc.replace",
    actor: "Concord Engineering",
    hash: "0x4fe2c0f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6bc1b0",
    details: "Replaced technical specification annex (RFQ-Part-B.pdf). Document size: 14.2 MB. File SHA-256 commit matches metadata registration.",
    signer: "CN=Concord Operations, O=Concord Engineering S.p.A., C=IT",
    signature: "3082010a0282010100c39f18a5e3d7af23bd73ec492de7b9a023b9d034298129a0b9432d6fe0210214c776deab0246a47a02c81e9fa0a38bde90c8a8d7a123f0a12",
    blockHeight: 849201
  },
  "0x8f3e…7e10": {
    timestamp: "2026-05-22 15:11:02 UTC",
    event: "bid.seal",
    actor: "Helios Civil Works AG",
    hash: "0x8f3e9cb124fdd9e083c27e10a6db24e390cbf5233bc238ee92745cf842f1a602",
    details: "Sealed bid envelope package submitted and registered on local HSM key chain. Shamir shards locked. Size: 32.4 MB.",
    signer: "CN=Helios Bidding Authority, O=Helios Civil Works AG, C=BE",
    signature: "3082010a0282010100d8f07a6e5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2",
    blockHeight: 849208
  },
  "root 0x9c4e…1aa2": {
    timestamp: "2026-05-22 15:12:00 UTC",
    event: "merkle.advance",
    actor: "System Ledger",
    hash: "0x9c4e2311aa234e1289de456bb788102aef12d09c2a3b4c5d6e7f8a9b0c1d2e3f",
    details: "Merkle tree leaf added. Advanced ledger root hash state. Anchored to public Ethereum / Starknet state transition block #849210.",
    signer: "CN=SealedBid Ledger Service, O=SealedBid Technologies Inc., C=US",
    signature: "3082010a0282010100a98f12c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
    blockHeight: 849210
  },
  "0x223e…9012": {
    timestamp: "2026-05-22 09:31:55 UTC",
    event: "bid.seal",
    actor: "Meridian Roads Ltd",
    hash: "0x223ecb124fdd9e083c27e10a6db24e390cbf5233bc238ee92745cf842f1a9012",
    details: "Sealed bid envelope package submitted and registered on local HSM key chain. Shamir shards locked. Size: 26.9 MB.",
    signer: "CN=Meridian Procurement, O=Meridian Roads Ltd, C=GB",
    signature: "3082010a0282010100ff88ca8234e9a0c1d2e3f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e",
    blockHeight: 849182
  },
  "0xb112…f00d": {
    timestamp: "2026-05-22 10:18:41 UTC",
    event: "vendor.join",
    actor: "Northwind Construct",
    hash: "0xb112ca82f3ef841029c3a37d2fef8e70a98f12c29bc34ee927d62fe842f1f00d",
    details: "Vendor successfully authenticated via eIDAS and joined the GOV-2026-ROAD-INFRA-014 tender group.",
    signer: "CN=Northwind Construct GmbH, O=Northwind Construct, C=DE",
    signature: "3082010a0282010100e4b8a2e3f4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
    blockHeight: 849195
  }
};

function BidInspectBody({ bid }: { bid: BidDetail }) {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = () => {
    setVerifying(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Querying HSM cluster and resolving Merkle tree path...",
        success: () => {
          setVerifying(false);
          setVerified(true);
          return `Cryptographic attestation valid for ${bid.vendor}`;
        },
        error: "Verification failed.",
      }
    );
  };

  return (
    <div className="p-6 space-y-6 flex-1">
      {/* Verification Action Bar */}
      <div className="rounded-lg border border-border/80 bg-surface/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-foreground">Integrity Status</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
              {verified ? "Verified against ledger Merkle root" : "Attestation unchecked since load"}
            </div>
          </div>
          {verified ? (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-success/15 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Verified
            </span>
          ) : (
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="btn-ember h-8 rounded px-3 text-[11.5px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <svg className="animate-spin h-3 w-3 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Resolving...
                </>
              ) : (
                "Verify proof chain"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Meta Grid */}
      <div className="space-y-4">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Envelope Parameters</h4>
        <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">Vendor Entity</div>
            <div className="mt-0.5 font-sans font-semibold text-foreground text-[12px] truncate">{bid.vendor}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">Registration Code</div>
            <div className="mt-0.5 text-foreground text-[11.5px] truncate">{bid.reg}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">Sealing Timestamp</div>
            <div className="mt-0.5 text-foreground text-[11.5px] truncate">{bid.timestamp}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">Payload Size</div>
            <div className="mt-0.5 text-foreground text-[11.5px] truncate">{bid.envelopeSize}</div>
          </div>
        </div>
      </div>

      {/* Cryptographic Proof */}
      <div className="space-y-4">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Shamir & HSM Custody</h4>
        <div className="space-y-2 text-[12px] border border-border/60 bg-surface/30 rounded-lg p-3">
          <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground">HSM Node Authority</span>
            <span className="font-mono text-[11px] text-foreground font-semibold">{bid.hsmAttestation.node}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-border/40">
            <span className="text-muted-foreground">TPM Attestation Spec</span>
            <span className="font-mono text-[11px] text-foreground">{bid.hsmAttestation.cert}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-border/40">
            <span className="text-muted-foreground">Encryption Cipher</span>
            <span className="font-mono text-[11px] text-foreground">{bid.hsmAttestation.algorithm}</span>
          </div>
          <div className="py-1 border-t border-border/40">
            <span className="text-muted-foreground block mb-1">Envelope Signature Key</span>
            <div className="font-mono text-[9px] text-muted-foreground bg-black/40 rounded p-1.5 break-all max-h-16 overflow-y-auto leading-relaxed border border-border/40 select-all">
              {bid.hsmAttestation.publicKey}
            </div>
          </div>
        </div>
      </div>

      {/* Merkle Proof path */}
      <div className="space-y-4">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Merkle Path (Index {bid.merkleProof.leafIndex})</h4>
        <div className="border border-border/60 bg-surface/30 rounded-lg p-3 space-y-2">
          <div className="font-mono text-[9.5px] text-muted-foreground break-all">
            Merkle Root: <span className="text-foreground select-all font-semibold">{bid.merkleProof.root}</span>
          </div>
          <div className="space-y-1.5 border-t border-border/40 pt-2.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Merkle Proof Siblings</div>
            {bid.merkleProof.proof.map((p, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px] font-mono">
                <span className="text-primary font-semibold text-[9.5px] shrink-0">Sibling {idx + 1}:</span>
                <span className="text-muted-foreground break-all select-all">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Raw Payload JSON */}
      <div className="space-y-3 pb-8">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Raw Verification Payload</h4>
          <button
            onClick={() => {
              navigator.clipboard.writeText(bid.rawPayload);
              toast.success("Payload copied to clipboard");
            }}
            className="font-mono text-[10px] text-primary hover:underline bg-transparent border-0 cursor-pointer"
          >
            Copy JSON
          </button>
        </div>
        <pre className="font-mono text-[10px] text-muted-foreground bg-black/60 p-4 rounded-lg overflow-x-auto border border-border/60 leading-relaxed max-h-48 select-all">
          {bid.rawPayload}
        </pre>
      </div>
    </div>
  );
}

function AuditInspectBody({ log }: { log: AuditLogDetail }) {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = () => {
    setVerifying(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Running consensus verify against L1 state root...",
        success: () => {
          setVerifying(false);
          setVerified(true);
          return `ZK consensus verified block height #${log.blockHeight}`;
        },
        error: "Consensus verification failed.",
      }
    );
  };

  return (
    <div className="p-6 space-y-6 flex-1">
      {/* Verification Status */}
      <div className="rounded-lg border border-border/80 bg-surface/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-foreground">Ledger Anchoring</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
              {verified ? "State root checked and locked on-chain" : "State proof unchecked"}
            </div>
          </div>
          {verified ? (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-success/15 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              ZK-Verified
            </span>
          ) : (
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="btn-ember h-8 rounded px-3 text-[11.5px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <svg className="animate-spin h-3 w-3 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying ZK...
                </>
              ) : (
                "Verify consensus"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Meta Grid */}
      <div className="space-y-4">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Event Parameters</h4>
        <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">Event Name</div>
            <div className="mt-0.5 text-primary text-[12px] font-bold truncate">{log.event}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">Actor</div>
            <div className="mt-0.5 font-sans font-semibold text-foreground text-[12px] truncate">{log.actor}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">Ledger Height</div>
            <div className="mt-0.5 text-foreground text-[11.5px] truncate">Block #{log.blockHeight}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">Offset</div>
            <div className="mt-0.5 text-foreground text-[11.5px] truncate">{log.timestamp}</div>
          </div>
        </div>
      </div>

      {/* Details Box */}
      <div className="space-y-4">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Record Summary</h4>
        <div className="border border-border/60 bg-surface/30 rounded-lg p-3 text-[12.5px] leading-relaxed text-muted-foreground font-sans">
          {log.details}
        </div>
      </div>

      {/* Cryptographic Signatures */}
      <div className="space-y-4 pb-8">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Authoritative Attestation</h4>
        <div className="border border-border/60 bg-surface/30 rounded-lg p-3 space-y-3">
          <div>
            <span className="text-[9.5px] text-muted-foreground uppercase tracking-wider block">Signing Authority</span>
            <div className="font-mono text-[11px] text-foreground mt-0.5">{log.signer}</div>
          </div>
          <div className="border-t border-border/40 pt-2.5">
            <span className="text-[9.5px] text-muted-foreground uppercase tracking-wider block">Cryptographic Signature</span>
            <div className="font-mono text-[9px] text-muted-foreground bg-black/40 rounded p-1.5 break-all max-h-24 overflow-y-auto leading-relaxed border border-border/40 mt-1 select-all">
              {log.signature}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}