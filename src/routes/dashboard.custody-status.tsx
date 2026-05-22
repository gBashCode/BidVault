import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export const Route = createFileRoute("/dashboard/custody-status")({
  head: () => ({
    meta: [
      { title: "Custody status — SealedBid" },
      { name: "description", content: "HSM network status, Shamir key shard custody, TPM attestation and custody chain monitoring." },
    ],
  }),
  component: CustodyStatusPage,
});

/* ── mock data ─────────────────────────────────────────────────── */

type NodeStatus = "online" | "offline" | "maintenance";

interface HsmNode {
  id: string;
  location: string;
  jurisdiction: string;
  status: NodeStatus;
  lastHeartbeat: string;
  shardId: string;
  tpmVersion: string;
  tpmAttestation: "verified" | "pending" | "failed";
  firmware: string;
  uptime: string;
}

const hsmNodes: HsmNode[] = [
  { id: "HSM-ZU-01", location: "Zürich · Equinix ZH4", jurisdiction: "CH", status: "online", lastHeartbeat: "2026-05-22 11:34:52Z", shardId: "shard-α-7e10", tpmVersion: "TPM 2.0", tpmAttestation: "verified", firmware: "v3.8.2", uptime: "142d 07h" },
  { id: "HSM-ZU-02", location: "Zürich · Equinix ZH4", jurisdiction: "CH", status: "online", lastHeartbeat: "2026-05-22 11:34:51Z", shardId: "shard-β-4c52", tpmVersion: "TPM 2.0", tpmAttestation: "verified", firmware: "v3.8.2", uptime: "142d 07h" },
  { id: "HSM-ZU-03", location: "Zürich · Interxion ZUR1", jurisdiction: "CH", status: "online", lastHeartbeat: "2026-05-22 11:34:50Z", shardId: "shard-γ-8f77", tpmVersion: "TPM 2.0", tpmAttestation: "verified", firmware: "v3.8.2", uptime: "89d 14h" },
  { id: "HSM-SG-01", location: "Singapore · Equinix SG3", jurisdiction: "SG", status: "online", lastHeartbeat: "2026-05-22 11:34:48Z", shardId: "shard-δ-9012", tpmVersion: "TPM 2.0", tpmAttestation: "verified", firmware: "v3.8.1", uptime: "204d 22h" },
  { id: "HSM-SG-02", location: "Singapore · Equinix SG3", jurisdiction: "SG", status: "online", lastHeartbeat: "2026-05-22 11:34:47Z", shardId: "shard-ε-b614", tpmVersion: "TPM 2.0", tpmAttestation: "verified", firmware: "v3.8.1", uptime: "204d 22h" },
  { id: "HSM-SG-03", location: "Singapore · Digital Realty SIN10", jurisdiction: "SG", status: "maintenance", lastHeartbeat: "2026-05-22 09:12:03Z", shardId: "shard-ζ-c0a4", tpmVersion: "TPM 2.0", tpmAttestation: "pending", firmware: "v3.8.0 → v3.8.2", uptime: "0d 00h" },
  { id: "HSM-SG-04", location: "Singapore · Global Switch SG1", jurisdiction: "SG", status: "online", lastHeartbeat: "2026-05-22 11:34:46Z", shardId: "shard-η-f00d", tpmVersion: "TPM 2.0", tpmAttestation: "verified", firmware: "v3.8.1", uptime: "178d 11h" },
];

const onlineCount = hsmNodes.filter((n) => n.status === "online").length;
const verifiedCount = hsmNodes.filter((n) => n.tpmAttestation === "verified").length;

/* ── helpers ───────────────────────────────────────────────────── */

function nodeStatusColor(s: NodeStatus) {
  if (s === "online") return "text-success";
  if (s === "maintenance") return "text-amber-400";
  return "text-red-400";
}

function nodeStatusBg(s: NodeStatus) {
  if (s === "online") return "bg-success/10 text-success";
  if (s === "maintenance") return "bg-amber-400/10 text-amber-400";
  return "bg-red-400/10 text-red-400";
}

function nodeStatusDot(s: NodeStatus) {
  if (s === "online") return "bg-success";
  if (s === "maintenance") return "bg-amber-400";
  return "bg-red-400";
}

function tpmBadge(s: HsmNode["tpmAttestation"]) {
  if (s === "verified") return "bg-success/10 text-success";
  if (s === "pending") return "bg-amber-400/10 text-amber-400";
  return "bg-red-400/10 text-red-400";
}

/* ── component ─────────────────────────────────────────────────── */

function CustodyStatusPage() {
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
                Trust · Custody
              </div>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                HSM & key custody status
              </h1>
              <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
                Real-time monitoring of Hardware Security Modules, Shamir secret sharing
                threshold, and TPM attestation across 2 jurisdictions.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="h-10 rounded-md border border-border bg-card px-4 text-[13px] hover:bg-muted">
                Export status
              </button>
              <button className="btn-ember inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold">
                Re-attest all
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="mx-auto max-w-[1280px] px-6 py-10">
        {/* metric row */}
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-5">
          {[
            { k: "HSM nodes", v: `${onlineCount} / 7`, sub: "online" },
            { k: "Shamir threshold", v: "5 of 7", sub: `${onlineCount} available — ${onlineCount >= 5 ? "threshold met" : "BELOW THRESHOLD"}` },
            { k: "TPM attestation", v: `${verifiedCount} / 7`, sub: "verified" },
            { k: "Jurisdictions", v: "2", sub: "CH · SG" },
            { k: "Key ceremony", v: "2026-01-15", sub: "next rotation 2027-01-15" },
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

        {/* shamir threshold panel */}
        <div className="mt-6 relative overflow-hidden rounded-xl border border-border bg-card p-6">
          <div className="absolute inset-0 bg-radial-ember opacity-30" />
          <div className="relative">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Shamir secret sharing · threshold scheme
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {hsmNodes.map((node) => (
                <div
                  key={node.id}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-3 font-mono text-[11px] ${
                    node.status === "online"
                      ? "border-success/30 bg-success/5"
                      : node.status === "maintenance"
                        ? "border-amber-400/30 bg-amber-400/5"
                        : "border-red-400/30 bg-red-400/5"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${nodeStatusDot(node.status)} ${node.status === "online" ? "animate-seal-pulse" : ""}`} />
                  <div>
                    <div className="text-foreground">{node.shardId}</div>
                    <div className="text-muted-foreground">{node.id}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 text-[13px]">
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-success/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Threshold met
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {onlineCount} of 7 shards available · minimum 5 required for key reassembly
              </span>
            </div>
          </div>
        </div>

        {/* HSM nodes table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              HSM node network · 7 nodes across 2 jurisdictions
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
              <input
                placeholder="Filter nodes…"
                className="h-7 rounded-md border border-border bg-surface px-2 text-[11px] text-foreground outline-none focus:border-primary/50"
              />
            </div>
          </div>
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-5 py-2">Node ID</th>
                <th className="px-5 py-2">Location</th>
                <th className="px-5 py-2">Jurisdiction</th>
                <th className="px-5 py-2">Shard ID</th>
                <th className="px-5 py-2">Last heartbeat</th>
                <th className="px-5 py-2">Firmware</th>
                <th className="px-5 py-2">Uptime</th>
                <th className="px-5 py-2">TPM</th>
                <th className="px-5 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hsmNodes.map((node) => (
                <tr key={node.id} className="group hover:bg-surface/60">
                  <td className="px-5 py-2.5 font-mono text-[11px] font-medium text-foreground">{node.id}</td>
                  <td className="px-5 py-2.5">{node.location}</td>
                  <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{node.jurisdiction}</td>
                  <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{node.shardId}</td>
                  <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{node.lastHeartbeat}</td>
                  <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{node.firmware}</td>
                  <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{node.uptime}</td>
                  <td className="px-5 py-2.5">
                    <span className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${tpmBadge(node.tpmAttestation)}`}>
                      {node.tpmAttestation}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${nodeStatusBg(node.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${nodeStatusDot(node.status)}`} />
                      {node.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* bottom two-col */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* custody chain events */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Custody chain · recent events
              </div>
              <Link to="/audit" className="font-mono text-[10px] text-primary hover:underline">
                Full audit log →
              </Link>
            </div>
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-2">Timestamp</th>
                  <th className="px-5 py-2">Event</th>
                  <th className="px-5 py-2">Node</th>
                  <th className="px-5 py-2">Detail</th>
                  <th className="px-5 py-2">Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { t: "2026-05-22 09:12Z", k: "hsm.maintenance.start", node: "HSM-SG-03", detail: "Firmware upgrade v3.8.0 → v3.8.2", hash: "0xab12…9e44" },
                  { t: "2026-05-22 08:00Z", k: "tpm.attest.batch", node: "all", detail: "6 of 7 verified · 1 in maintenance", hash: "0xce34…f1a0" },
                  { t: "2026-05-21 20:00Z", k: "heartbeat.ok", node: "all", detail: "7 of 7 responding", hash: "0x11fa…bc02" },
                  { t: "2026-05-21 08:00Z", k: "tpm.attest.batch", node: "all", detail: "7 of 7 verified", hash: "0xdd91…2e78" },
                  { t: "2026-05-20 15:30Z", k: "shard.verify", node: "HSM-ZU-03", detail: "Key shard integrity check passed", hash: "0x7788…4a11" },
                  { t: "2026-05-19 08:00Z", k: "tpm.attest.batch", node: "all", detail: "7 of 7 verified", hash: "0xaa00…e921" },
                  { t: "2026-01-15 10:00Z", k: "key.ceremony", node: "all", detail: "Annual key ceremony — 7 shards distributed", hash: "0x0001…ffff" },
                ].map((e, i) => (
                  <tr key={i} className="hover:bg-surface/60">
                    <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{e.t}</td>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-primary">{e.k}</td>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{e.node}</td>
                    <td className="px-5 py-2.5">{e.detail}</td>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{e.hash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* sidebar */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Key parameters
              </div>
              <ul className="mt-3 space-y-2 text-[12.5px]">
                {[
                  ["Cipher", "AES-256-GCM"],
                  ["Key exchange", "X25519"],
                  ["Threshold", "5 of 7 Shamir"],
                  ["HSM model", "Thales Luna 7"],
                  ["TPM spec", "TPM 2.0 · TCG"],
                  ["Attestation interval", "12 hours"],
                  ["Key rotation", "Annual"],
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
                Trustee key holders
              </div>
              <ul className="mt-3 space-y-2 text-[12.5px]">
                {[
                  { name: "KU Leuven · Cryptography Lab", shards: "α, β" },
                  { name: "Federal Public Service · Mobility", shards: "γ" },
                  { name: "Trail of Bits · External Auditor", shards: "δ" },
                  { name: "NCC Group · External Auditor", shards: "ε" },
                  { name: "BNP Paribas Fortis · Custodian", shards: "ζ" },
                  { name: "Singapore GovTech · Observer", shards: "η" },
                ].map((t) => (
                  <li key={t.name} className="flex items-center justify-between gap-2">
                    <span className="text-foreground/85 truncate">{t.name}</span>
                    <span className="font-mono text-[11px] text-primary shrink-0">{t.shards}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-graphite p-5 text-ivory dark:bg-surface">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                Verify attestation
              </div>
              <pre className="mt-3 overflow-auto rounded-md bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-ivory/85">
{`$ sealedbid custody verify \\
    --nodes all \\
    --tpm-pcr 0,1,2,7

→ querying 7 HSM nodes…
→ 6 online, 1 maintenance
→ PCR banks match golden values
✓ attestation verified (6 of 7)`}
              </pre>
            </div>
          </aside>
        </div>
      </div>
        </main>
      </div>
    </div>
  );
}
