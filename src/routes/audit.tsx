import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit ledger — SealedBid" },
      { name: "description", content: "Immutable, cryptographically verifiable audit trail across every tender event." },
    ],
  }),
  component: AuditPage,
});

const events = [
  { t: "2026-04-23T13:18:42Z", k: "bid.seal", actor: "Helios Civil Works AG", hash: "0x8f3e9a21bc4d7e10ff019cba0e72ef41", height: 2_184_991 },
  { t: "2026-04-23T13:14:31Z", k: "bid.seal", actor: "Meridian Roads Ltd", hash: "0x223e2244e7019012ab7c1cc92e0e3f01", height: 2_184_990 },
  { t: "2026-04-23T13:10:18Z", k: "vendor.join", actor: "Northwind Construct", hash: "0xb112f00dd2c14a09ae9a40f773115022", height: 2_184_989 },
  { t: "2026-04-23T12:55:11Z", k: "doc.replace", actor: "Concord Engineering", hash: "0x4fe21cc193b0c1b08e44e0aa5511e110", height: 2_184_988 },
  { t: "2026-04-23T11:00:02Z", k: "merkle.advance", actor: "system", hash: "root 0x9c4e44a91aa2003e771bbcd031a02201", height: 2_184_987 },
  { t: "2026-04-22T17:10:00Z", k: "tender.publish", actor: "m.vlaeminck@fps-mob.be", hash: "0x77abc09812334e1d", height: 2_184_900 },
  { t: "2026-04-22T16:42:51Z", k: "policy.attach", actor: "m.vlaeminck@fps-mob.be", hash: "policy v2.1", height: 2_184_899 },
  { t: "2026-04-22T16:00:00Z", k: "deadline.lock", actor: "system", hash: "block 2,184,891 · T+72h", height: 2_184_891 },
];

function AuditPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="glow-orb absolute top-10 right-20 h-[500px] w-[500px] bg-primary/10 animate-pulse" style={{ animationDuration: "14s" }} />
      <div className="glow-orb absolute bottom-20 left-10 h-[400px] w-[400px] bg-amber-deep/10" />

      <SiteHeader />
      <div className="relative overflow-hidden border-b border-border bg-grid-fine/30">
        <div className="absolute inset-0 bg-radial-ember opacity-30" />
        <div className="relative mx-auto max-w-[1280px] px-6 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                Tamper-proof · append-only
              </div>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                Audit ledger
              </h1>
              <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
                Every event on SealedBid is hashed, time-stamped and chained. Anchored hourly
                to Ethereum and signed by 5 of 7 trustees.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 font-mono text-[11px]">
              {[
                ["Last anchor", "13:00:00Z"],
                ["Height", "2,184,991"],
                ["Integrity", "OK"],
              ].map(([k, v]) => (
                <div key={k} className="glass-card rounded-md px-3 py-2 shadow-sm hover:translate-y-0">
                  <div className="text-muted-foreground">{k}</div>
                  <div className="mt-0.5 text-foreground">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto grid max-w-[1280px] gap-6 px-6 py-10 lg:grid-cols-[1fr_320px]">
        <div className="glass-card relative overflow-hidden rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Event log · GOV-2026-ROAD-INFRA-014
            </div>
            <div className="flex gap-2">
              <button className="h-8 rounded-md border border-border bg-surface px-3 text-[11px]">
                Export CSV
              </button>
              <button className="h-8 rounded-md border border-border bg-surface px-3 text-[11px]">
                Verify chain
              </button>
            </div>
          </div>
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-5 py-2">Timestamp</th>
                <th className="px-5 py-2">Event</th>
                <th className="px-5 py-2">Actor</th>
                <th className="px-5 py-2">Hash</th>
                <th className="px-5 py-2 text-right">Height</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((e) => (
                <tr key={e.height} className="group hover:bg-surface/60">
                  <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{e.t}</td>
                  <td className="px-5 py-2.5 font-mono text-[11px] text-primary">{e.k}</td>
                  <td className="px-5 py-2.5">{e.actor}</td>
                  <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">
                    {e.hash}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular font-mono text-[11px]">
                    {e.height.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4">
          <div className="glass-card rounded-xl p-5 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)]">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Merkle root
            </div>
            <div className="mt-2 break-all font-mono text-[12px] text-foreground">
              0x9c4e44a91aa2003e771bbcd031a02201ee78bb5500a113fde0
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-success/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Anchored on-chain
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)]">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Trustee signatures
            </div>
            <ul className="mt-3 space-y-2 text-[12.5px]">
              {[
                ["KU Leuven · Cryptography Lab", "5 of 7"],
                ["Federal Public Service · Mobility", "✓"],
                ["Trail of Bits · External", "✓"],
                ["NCC Group · External", "✓"],
                ["BNP Paribas Fortis · Custodian", "✓"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between">
                  <span className="text-foreground/85">{k}</span>
                  <span className="font-mono text-[11px] text-success">{v}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card rounded-xl bg-graphite p-5 text-ivory dark:bg-surface shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)] hover:translate-y-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Verify locally
            </div>
            <pre className="mt-3 overflow-auto rounded-md bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-ivory/85">
{`$ sealedbid verify \\
    --tender GOV-2026-ROAD-INFRA-014 \\
    --root 0x9c4e44a91aa2003e771bbcd031...

→ fetched 91 events
→ recomputed root 0x9c4e44a91aa2…
✓ chain integrity verified`}
            </pre>
          </div>
        </aside>
      </div>
    </div>
  );
}