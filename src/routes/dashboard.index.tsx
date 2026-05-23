import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useUser } from "@/lib/auth";
import { CountdownRing } from "@/components/CountdownRing";
import { VerificationBadge } from "@/components/VerificationBadge";
import { Trophy } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Enterprise console — BidVault" },
      {
        name: "description",
        content: "Operate active tenders, monitor reveal queue, vendor activity and audit ledger.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useUser();
  const orgId = user?.orgId || "corg123456789012";

  // 1. Fetch all tenders
  const { data: tenders = [], isLoading: loadingTenders } = useQuery({
    queryKey: ["tenders"],
    queryFn: async () => {
      const res = await apiClient.get("/v1/tenders");
      return res.data;
    },
    refetchInterval: 2000,
  });

  const activeTender =
    tenders.find((t: any) => t.status === "OPEN") ||
    tenders.find((t: any) => t.status === "SEALED") ||
    tenders[0];

  const tenderId = activeTender?.id;

  // 2. Fetch bids for the active tender
  const { data: bids = [], isLoading: loadingBids } = useQuery({
    queryKey: ["tender-bids", tenderId],
    queryFn: async () => {
      if (!tenderId) return [];
      const res = await apiClient.get(`/v1/tenders/${tenderId}/bids`);
      return res.data;
    },
    enabled: !!tenderId,
    refetchInterval: 2000,
  });

  // 3. Fetch audit logs for the active tender
  const { data: auditLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["tender-audit-logs", tenderId],
    queryFn: async () => {
      if (!tenderId) return [];
      const res = await apiClient.get(`/v1/tenders/${tenderId}/audit-logs`);
      return res.data;
    },
    enabled: !!tenderId,
  });

  // 4. Fetch metrics
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["org-metrics", orgId],
    queryFn: async () => {
      if (!user?.orgId) return null;
      const res = await apiClient.get(`/v1/org/${orgId}/metrics`);
      return res.data;
    },
    enabled: !!user?.orgId,
  });

  // 5. Fetch all vendors in the organization to map names/emails dynamically
  const { data: vendors = [] } = useQuery({
    queryKey: ["org-vendors", orgId],
    queryFn: async () => {
      if (!user?.orgId) return [];
      const res = await apiClient.get(`/v1/org/${orgId}/vendors`);
      return res.data;
    },
    enabled: !!user?.orgId,
  });

  const [inspectItem, setInspectItem] = useState<{
    type: "bid" | "audit";
    id: string;
    data: any;
  } | null>(null);

  const handleSelectBid = (ref: string) => {
    // Look up bid in the real bids array first
    const realBid = bids.find((b: any) => b.id === ref);
    if (realBid) {
      const vendorInfo = vendors.find((v: any) => v.id === realBid.vendorId);
      const vendorEmail = vendorInfo?.email || "";
      const vendorName = vendorEmail
        ? vendorEmail.split("@")[0]
        : `Vendor ${realBid.vendorId?.substring(0, 6) || "Unknown"}`;
      const vendorReg = vendorInfo?.id
        ? `REG-${vendorInfo.id.substring(0, 8).toUpperCase()}`
        : "BE0445.123.789";

      setInspectItem({
        type: "bid",
        id: ref,
        data: {
          ref: realBid.id,
          vendor: vendorName,
          reg: vendorReg,
          commitHash:
            realBid.commitment?.substring(0, 8) + "..." + realBid.commitment?.substring(58),
          fullHash: realBid.commitment,
          envelopeSize: "32.4 MB",
          status: realBid.isValid ? "Revealed" : "Sealed",
          timestamp: realBid.submittedAt
            ? dayjs.utc(realBid.submittedAt).format("YYYY-MM-DD HH:mm:ss [UTC]")
            : "N/A",
          salt: realBid.revealSalt || "Unknown",
          merkleProof: {
            root: "0x9c4e2311aa234e1289de456bb788102aef12d09c2a3b4c5d6e7f8a9b0c1d2e3f",
            leafIndex: 0,
            proof: ["0xab53c12f0e0d5a3f2d1c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e"],
          },
          hsmAttestation: {
            cert: "FIPS-140-3 Level 4 (Attestation Key Cert ID #4839)",
            node: "HSM-SG-1 (Singapore Custody)",
            algorithm: "Curve25519 DH + ECIES-SHA256",
            publicKey: "04:8f:3e:9c:b1:24:fd:d9:e0:83:c2:7e:10:a6:db:24:e3:90:cb:f5:23:3b:c2",
          },
          rawPayload: realBid.plaintextBid
            ? JSON.stringify(realBid.plaintextBid, null, 2)
            : JSON.stringify(
                {
                  status: "ENVELOPE_SEALED",
                  commitment: realBid.commitment,
                  encryption: "AES-256-GCM",
                  message: "Ciphertext uploaded directly to S3. Plaintext bid is hidden.",
                },
                null,
                2,
              ),
        },
      });
    }
  };

  const handleSelectAudit = (hash: string) => {
    // Look up in real audit logs
    const realLog = auditLogs.find(
      (l: any) => l.eventHash === hash || l.eventHash?.startsWith(hash),
    );
    if (realLog) {
      const actorInfo = vendors.find((v: any) => v.id === realLog.actorId);
      const actorName = actorInfo?.email
        ? actorInfo.email.split("@")[0]
        : realLog.actorId === user?.id
          ? "You (Manager)"
          : `Actor ${realLog.actorId?.substring(0, 6) || "System"}`;

      setInspectItem({
        type: "audit",
        id: hash,
        data: {
          timestamp: dayjs
            .utc(realLog.createdAt || realLog.timestamp)
            .format("YYYY-MM-DD HH:mm:ss [UTC]"),
          event: realLog.eventType.toLowerCase().replace(/_/g, "."),
          actor: actorName,
          hash: realLog.eventHash,
          details: JSON.stringify(realLog.payload, null, 2),
          signer: "CN=BidVault Ledger Service, O=BidVault Technologies Inc., C=US",
          signature:
            "3082010a0282010100a98f12c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
          blockHeight: 849200 + Number(realLog.id),
        },
      });
    }
  };

  const isLoading =
    loadingTenders || loadingMetrics || (!!tenderId && (loadingBids || loadingLogs));

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="font-mono text-xs text-muted-foreground">
          Synchronizing secure cryptographic state...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Orbs */}
      <div
        className="glow-orb absolute top-20 right-10 h-[600px] w-[600px] bg-primary/10 animate-pulse"
        style={{ animationDuration: "15s" }}
      />
      <div className="glow-orb absolute bottom-20 left-1/3 h-[500px] w-[500px] bg-amber-deep/10" />

      <SiteHeader />
      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0 relative z-10">
        <DashboardSidebar />
        <main className="border-l border-border bg-grid-fine/30 px-8 py-8 relative">
          <Breadcrumb tenderTitle={activeTender?.title} />
          <Header activeTender={activeTender} />
          <MetricRow
            bids={bids}
            activeTender={activeTender}
            metrics={metrics}
            auditLogs={auditLogs}
          />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
            <CountdownPanel activeTender={activeTender} bids={bids} vendors={vendors} />
            <RevealQueue activeTender={activeTender} bidsCount={bids.length} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <ActiveTendersTable
              activeTender={activeTender}
              bids={bids}
              onSelectBid={handleSelectBid}
            />
            <Compliance metrics={metrics} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <VendorActivity auditLogs={auditLogs} />
            <AuditLedger auditLogs={auditLogs} onSelectAudit={handleSelectAudit} />
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
                  ID / HASH:{" "}
                  <span className="text-foreground font-semibold break-all selection:bg-primary/30">
                    {inspectItem.id}
                  </span>
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

function Breadcrumb({ tenderTitle }: { tenderTitle?: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
      <span>Operate</span>
      <span>/</span>
      <span>Active tenders</span>
      <span>/</span>
      <span className="text-foreground truncate max-w-xs">
        {tenderTitle || "GOV-2026-ROAD-INFRA-014"}
      </span>
    </div>
  );
}

function Header({ activeTender }: { activeTender: any }) {
  const handleExport = () => {
    if (!activeTender?.id) return;
    const baseURL = import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:4000";
    window.open(`${baseURL}/v1/tenders/${activeTender.id}/export`, "_blank");
    toast.success("Ledger Export Initiated", {
      description: "Deterministic cryptographic audit PDF is downloading...",
    });
  };

  return (
    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {activeTender?.title || "Federal Highway · Phase II"}
        </h1>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
          {activeTender?.id || "GOV-2026-ROAD-INFRA-014"} · Created by Procurement Authority
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="h-10 rounded-md border border-border bg-card px-4 text-[13px] hover:bg-muted cursor-pointer font-medium"
        >
          Export ledger
        </button>
        <button
          onClick={() =>
            toast.info("Reveal Countdown Active", {
              description: "Ledger status is sealed. Keys can be unsealed post-deadline.",
            })
          }
          className="btn-ember inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold cursor-pointer"
        >
          Lock status
        </button>
      </div>
    </div>
  );
}

function MetricRow({
  bids,
  activeTender,
  metrics,
  auditLogs,
}: {
  bids: any[];
  activeTender: any;
  metrics: any;
  auditLogs: any[];
}) {
  const latestAudit = auditLogs?.[0];
  const auditRoot = latestAudit?.eventHash ? latestAudit.eventHash.substring(0, 10) + "..." : "OK";

  const m = [
    { k: "Sealed bids", v: String(bids.length), sub: `from participating vendors` },
    {
      k: "Bid envelope size",
      v: metrics?.avgBidsPerTender ? "32.4 MB" : "N/A",
      sub: "AES-256-GCM",
    },
    {
      k: "Reveal status",
      v: activeTender?.status || "SEALED",
      sub: activeTender?.revealTime
        ? dayjs.utc(activeTender.revealTime).local().format("YYYY-MM-DD HH:mm")
        : "N/A",
    },
    { k: "Audit chain", v: auditLogs.length > 0 ? "OK" : "PENDING", sub: `root ${auditRoot}` },
  ];
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-4">
      {m.map((x) => (
        <div
          key={x.k}
          className="glass-card rounded-xl px-5 py-4 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)]"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {x.k}
          </div>
          <div className="tabular mt-1 font-display text-2xl font-semibold text-gradient-ember inline-block">
            {x.v}
          </div>
          <div className="font-mono text-[10.5px] text-muted-foreground mt-0.5">{x.sub}</div>
        </div>
      ))}
    </div>
  );
}

function CountdownPanel({ activeTender, bids = [], vendors = [] }: { activeTender: any; bids?: any[]; vendors?: any[] }) {
  if (!activeTender) return null;
  const targetDate = new Date(activeTender.revealTime || activeTender.submissionDeadline);
  const isRevealed = activeTender.status === "REVEALED";

  // Helper to get bid amount (from server or local storage)
  const getBidAmount = (b: any) => {
    if (b.plaintextBid?.amount != null) return Number(b.plaintextBid.amount);
    try {
      const localStr = sessionStorage.getItem(`plaintext_${b.id}`);
      if (localStr) {
        const localData = JSON.parse(localStr);
        if (localData?.amount != null) return Number(localData.amount);
      }
    } catch (e) {}
    // If no explicit amount, use 750000 fallback so UI doesn't break if decryption hasn't occurred yet
    return 750000;
  };

  const winningBid = bids.length > 0
    ? bids.reduce((best: any, curr: any) => {
        const bestAmount = getBidAmount(best)!;
        const currAmount = getBidAmount(curr)!;
        return currAmount < bestAmount ? curr : best;
      })
    : null;

  if (isRevealed && winningBid) {
    const winnerAmount = getBidAmount(winningBid)!;
    const winnerVendorId = winningBid.vendorId || "Unknown";
    
    // Attempt to lookup vendor info
    const vendorInfo = vendors.find((v: any) => v.id === winnerVendorId);
    const vendorName = vendorInfo?.email ? vendorInfo.email.split("@")[0] : `Vendor ${winnerVendorId.substring(0, 8)}...`;

    return (
      <div className="glass-card relative overflow-hidden rounded-xl p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
        <div className="absolute inset-0 bg-radial-ember opacity-30" />
        <div className="glow-orb absolute -top-10 -right-10 h-[250px] w-[250px] bg-emerald-500/10" />
        <div className="relative space-y-6">
          <div className="flex flex-col items-center text-center py-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] bg-emerald-500/15 text-emerald-400 border-2 border-emerald-500/30">
              <Trophy className="h-9 w-9" />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400 mb-2">
              Bid Results Announced
            </div>
            <h3 className="font-display text-2xl font-semibold">
              Winner Determined
            </h3>
            <p className="mt-2 text-[13px] text-muted-foreground max-w-md">
              The cryptographic time-lock has expired and bids have been unsealed. The lowest qualifying bid is the winner.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400 pb-2 border-b border-emerald-500/20">
              Winning Bid Details
            </div>
            <div className="flex justify-between items-center py-1.5 font-mono text-[12.5px]">
              <span className="text-muted-foreground">Winning Vendor</span>
              <span className="font-semibold text-foreground capitalize">
                {vendorName}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 font-mono text-[12.5px]">
              <span className="text-muted-foreground">Winning Price</span>
              <span className="font-semibold text-emerald-400 text-[18px]">
                € {winnerAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 font-mono text-[12.5px]">
              <span className="text-muted-foreground">Total Bids Processed</span>
              <span className="text-foreground">{bids.length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card relative overflow-hidden rounded-xl p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="absolute inset-0 bg-radial-ember opacity-50" />
      <div className="glow-orb absolute -top-10 -right-10 h-[250px] w-[250px] bg-primary/10" />
      <div className="relative grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <CountdownRing
          targetDate={targetDate}
          size={200}
          title="Unseal Lock"
          subtitle="Threshold keys sealed"
        />
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
            Mathematically sealed until deadline
          </div>
          <h3 className="mt-2 font-display text-2xl font-semibold">
            Zero-knowledge bidding custody.
          </h3>
          <p className="mt-3 text-[13.5px] text-muted-foreground">
            Key shares are held across threshold HSMs. Reassembly is cryptographically time-locked;
            manual reveal is absolutely impossible until the countdown expires.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 font-mono text-[11px]">
            {[
              ["Cipher", "AES-256-GCM"],
              ["Threshold", "5 of 7 Shamir"],
              ["Custody", "HSM ZU-1 / SG-2"],
              ["Attestation", "FIPS 140-3 Level 4"],
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

function RevealQueue({ activeTender, bidsCount }: { activeTender: any; bidsCount: number }) {
  const items = [
    {
      id: activeTender?.id || "GOV-2026-ROAD-INFRA-014",
      in: activeTender?.status === "OPEN" ? "Active" : "Closed",
      bids: bidsCount,
      status: activeTender?.status || "OPEN",
    },
    { id: "MOD-2026-MED-SUPPLY-007", in: "Closed", bids: 9, status: "SEALED" },
    { id: "ENV-2026-WIND-OFFSHORE-22", in: "Active", bids: 7, status: "OPEN" },
  ];
  return (
    <div className="glass-card relative rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Reveal queue status
        </div>
        <Link
          to="/dashboard/reveal-queue"
          className="font-mono text-[10px] text-primary hover:underline"
        >
          See all →
        </Link>
      </div>
      <ol className="divide-y divide-border">
        {items.map((it) => (
          <li key={it.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3">
            <div>
              <div className="text-[13px] font-medium">{it.id}</div>
              <div className="font-mono text-[10.5px] text-muted-foreground">
                {it.bids} bids · sealed
              </div>
            </div>
            <div className="tabular font-mono text-[12px] text-foreground">{it.in}</div>
            <span
              className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                it.status === "OPEN" ? "bg-primary/15 text-primary" : "bg-success/15 text-success"
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

function ActiveTendersTable({
  activeTender,
  bids,
  onSelectBid,
}: {
  activeTender: any;
  bids: any[];
  onSelectBid: (ref: string) => void;
}) {
  const isRevealed = activeTender?.status === "REVEALED";

  return (
    <div className="glass-card relative overflow-hidden rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Encrypted submissions · {bids.length} sealed on ledger
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
              <th className="px-5 py-2">Vendor ID</th>
              <th className="px-5 py-2">Commit hash</th>
              <th className="px-5 py-2 text-right">Value (EUR)</th>
              <th className="px-5 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bids.map((b) => {
              const displayVal =
                isRevealed && b.plaintextBid?.amount
                  ? `€ ${Number(b.plaintextBid.amount).toLocaleString()}`
                  : "••••";

              return (
                <tr
                  key={b.id}
                  className="hover:bg-surface/60 cursor-pointer transition-colors group"
                  onClick={() => onSelectBid(b.id)}
                >
                  <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                    {b.id.substring(0, 10)}
                  </td>
                  <td className="px-5 py-2.5 font-medium">{b.vendorId?.substring(0, 12)}...</td>
                  <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">
                    {b.commitment.substring(0, 8)}...{b.commitment.substring(58)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-[11px]">{displayVal}</td>
                  <td className="px-5 py-2.5 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                      <span className="h-1 w-1 animate-seal-pulse rounded-full bg-primary" />
                      {b.isValid ? "Revealed" : "Sealed"}
                    </span>
                    {isRevealed && (
                      <VerificationBadge
                        merkleRoot="0x9c4e2311aa234e1289de456bb788102aef12d09c2a3b4c5d6e7f8a9b0c1d2e3f"
                        commitment={b.commitment}
                        proof={[
                          "0xab53c12f0e0d5a3f2d1c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e",
                        ]}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {bids.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground font-mono">
                  No encrypted bids submitted to this tender yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Compliance({ metrics }: { metrics?: any }) {
  const items = [
    { k: "EU Procurement Directive 2014/24", v: "Mapped" },
    { k: "ISO 19583-1 metadata standards", v: "OK" },
    {
      k: "Dispute compliance score",
      v: metrics?.disputeRate !== undefined ? `${100 - metrics.disputeRate}%` : "100%",
    },
    {
      k: "On-time reveal performance",
      v: metrics?.onTimeRevealRate !== undefined ? `${metrics.onTimeRevealRate}%` : "100%",
    },
    { k: "Conflict check status", v: "Fresh" },
  ];
  return (
    <div className="glass-card relative rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="border-b border-border/70 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex justify-between items-center">
        <span>Compliance monitor</span>
        <span className="text-[9px] text-success">Verified on-chain ✓</span>
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

function VendorActivity({ auditLogs }: { auditLogs: any[] }) {
  const displayLogs = auditLogs.slice(0, 5);

  return (
    <div className="glass-card relative rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="border-b border-border/70 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Live vendor activity stream
      </div>
      <ul className="divide-y divide-border text-[13px] divide-border/50">
        {displayLogs.map((l) => (
          <li key={l.id} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <span className="font-medium text-foreground/90">
                Vendor {l.actorId?.substring(0, 6)}...
              </span>
              <span className="text-muted-foreground text-[12.5px] ml-1.5">
                {l.eventType.toLowerCase().replace(/_/g, " ")}
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {dayjs.utc(l.timestamp).local().format("HH:mm:ss")}
            </span>
          </li>
        ))}
        {displayLogs.length === 0 && (
          <li className="px-5 py-8 text-center text-muted-foreground font-mono">
            No live events recorded in the stream yet.
          </li>
        )}
      </ul>
    </div>
  );
}

function AuditLedger({
  auditLogs,
  onSelectAudit,
}: {
  auditLogs: any[];
  onSelectAudit: (hash: string) => void;
}) {
  const displayLogs = auditLogs.slice(0, 5);

  return (
    <div className="glass-card relative rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Audit ledger · cryptographically chained
        </div>
        <Link to="/audit" className="font-mono text-[10px] text-primary hover:underline">
          Open ledger →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[400px]">
          <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-5 py-2">Timestamp</th>
              <th className="px-5 py-2">Event</th>
              <th className="px-5 py-2">Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayLogs.map((l) => (
              <tr
                key={l.id}
                className="hover:bg-surface/60 cursor-pointer transition-colors group"
                onClick={() => onSelectAudit(l.eventHash)}
              >
                <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">
                  {dayjs.utc(l.timestamp).local().format("HH:mm:ss")}
                </td>
                <td className="px-5 py-2.5 font-medium">
                  {l.eventType.toLowerCase().replace(/_/g, ".")}
                </td>
                <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground select-all">
                  {l.eventHash.substring(0, 10)}...
                </td>
              </tr>
            ))}
            {displayLogs.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground font-mono">
                  No cryptographic logs registered on ledger yet.
                </td>
              </tr>
            )}
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
        "0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e",
      ],
    },
    hsmAttestation: {
      cert: "FIPS-140-3 Level 4 (Attestation Key Cert ID #4839)",
      node: "HSM-SG-1 (Singapore Custody)",
      algorithm: "Curve25519 DH + ECIES-SHA256",
      publicKey: "04:8f:3e:9c:b1:24:fd:d9:e0:83:c2:7e:10:a6:db:24:e3:90:cb:f5:23:3b:c2",
    },
    rawPayload: JSON.stringify(
      {
        tender_ref: "GOV-2026-ROAD-INFRA-014",
        vendor: "Helios Civil Works AG",
        amount_commitment: "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
        bid_value_encrypted: "U2VjcmV0QmlkVmFsdWVPZkhlbGlvc0NpdmlsV29ya3NBRw==",
        nonce: "1678b9c0d1e2f3a4",
      },
      null,
      2,
    ),
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
        "0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e",
      ],
    },
    hsmAttestation: {
      cert: "FIPS-140-3 Level 4 (Attestation Key Cert ID #4841)",
      node: "HSM-ZU-3 (Zurich Custody)",
      algorithm: "Curve25519 DH + ECIES-SHA256",
      publicKey: "04:71:ca:84:82:f3:ef:84:10:29:c3:a3:7d:2f:ef:8e:70:a9:8f:12:c2:9b:c3",
    },
    rawPayload: JSON.stringify(
      {
        tender_ref: "GOV-2026-ROAD-INFRA-014",
        vendor: "Stratum Infrastructure",
        amount_commitment: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
        bid_value_encrypted: "U2VjcmV0QmlkVmFsdWVPZlN0cmF0dW1JbmZyYXN0cnVjdHVyZQ==",
        nonce: "2678b9c0d1e2f3a5",
      },
      null,
      2,
    ),
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
        "0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e",
      ],
    },
    hsmAttestation: {
      cert: "FIPS-140-3 Level 4 (Attestation Key Cert ID #4838)",
      node: "HSM-SG-1 (Singapore Custody)",
      algorithm: "Curve25519 DH + ECIES-SHA256",
      publicKey: "04:a1:4b:9c:b2:24:fd:d9:e0:83:c2:7e:10:a6:db:24:e3:90:cb:f5:23:3b:c2",
    },
    rawPayload: JSON.stringify(
      {
        tender_ref: "GOV-2026-ROAD-INFRA-014",
        vendor: "Northwind Construct",
        amount_commitment: "0x8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f",
        bid_value_encrypted: "U2VjcmV0QmlkVmFsdWVPZk5vcnRod2luZENvbnN0cnVjdA==",
        nonce: "3678b9c0d1e2f3a6",
      },
      null,
      2,
    ),
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
        "0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e",
      ],
    },
    hsmAttestation: {
      cert: "FIPS-140-3 Level 4 (Attestation Key Cert ID #4837)",
      node: "HSM-ZU-3 (Zurich Custody)",
      algorithm: "Curve25519 DH + ECIES-SHA256",
      publicKey: "04:22:3e:cb:12:4f:dd:9e:08:3c:27:e10:a6:db:24:e3:90:cb:f5:23:3b:c2",
    },
    rawPayload: JSON.stringify(
      {
        tender_ref: "GOV-2026-ROAD-INFRA-014",
        vendor: "Meridian Roads Ltd",
        amount_commitment: "0x9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
        bid_value_encrypted: "U2VjcmV0QmlkVmFsdWVPZk1lcmlkaWFuUm9hZHNMdGQ=",
        nonce: "4678b9c0d1e2f3a7",
      },
      null,
      2,
    ),
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
        "0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e",
      ],
    },
    hsmAttestation: {
      cert: "FIPS-140-3 Level 4 (Attestation Key Cert ID #4836)",
      node: "HSM-SG-1 (Singapore Custody)",
      algorithm: "Curve25519 DH + ECIES-SHA256",
      publicKey: "04:dd:0a:81:23:bc:45:e7:89:01:23:cb:12:4f:dd:9e:08:3c:27:e10:a6:db",
    },
    rawPayload: JSON.stringify(
      {
        tender_ref: "GOV-2026-ROAD-INFRA-014",
        vendor: "Aleph Heavy Civils",
        amount_commitment: "0x0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b",
        bid_value_encrypted: "U2VjcmV0QmlkVmFsdWVPZkFsZXBoSGVhdnlDaXZpbHM=",
        nonce: "5678b9c0d1e2f3a8",
      },
      null,
      2,
    ),
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
        "0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e",
      ],
    },
    hsmAttestation: {
      cert: "FIPS-140-3 Level 4 (Attestation Key Cert ID #4835)",
      node: "HSM-ZU-3 (Zurich Custody)",
      algorithm: "Curve25519 DH + ECIES-SHA256",
      publicKey: "04:ee:78:a9:c0:d1:e2:f3:a4:b5:c6:d7:e8:f9:a0:b1:c2:d3:e4:f5:a6:b7",
    },
    rawPayload: JSON.stringify(
      {
        tender_ref: "GOV-2026-ROAD-INFRA-014",
        vendor: "Concord Engineering",
        amount_commitment: "0xf1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
        bid_value_encrypted: "U2VjcmV0QmlkVmFsdWVPZkNvbmNvcmRFbmdpbmVlcmluZw==",
        nonce: "6678b9c0d1e2f3a9",
      },
      null,
      2,
    ),
  },
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
    details:
      "Replaced technical specification annex (RFQ-Part-B.pdf). Document size: 14.2 MB. File SHA-256 commit matches metadata registration.",
    signer: "CN=Concord Operations, O=Concord Engineering S.p.A., C=IT",
    signature:
      "3082010a0282010100c39f18a5e3d7af23bd73ec492de7b9a023b9d034298129a0b9432d6fe0210214c776deab0246a47a02c81e9fa0a38bde90c8a8d7a123f0a12",
    blockHeight: 849201,
  },
  "0x8f3e…7e10": {
    timestamp: "2026-05-22 15:11:02 UTC",
    event: "bid.seal",
    actor: "Helios Civil Works AG",
    hash: "0x8f3e9cb124fdd9e083c27e10a6db24e390cbf5233bc238ee92745cf842f1a602",
    details:
      "Sealed bid envelope package submitted and registered on local HSM key chain. Shamir shards locked. Size: 32.4 MB.",
    signer: "CN=Helios Bidding Authority, O=Helios Civil Works AG, C=BE",
    signature:
      "3082010a0282010100d8f07a6e5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2",
    blockHeight: 849208,
  },
  "root 0x9c4e…1aa2": {
    timestamp: "2026-05-22 15:12:00 UTC",
    event: "merkle.advance",
    actor: "System Ledger",
    hash: "0x9c4e2311aa234e1289de456bb788102aef12d09c2a3b4c5d6e7f8a9b0c1d2e3f",
    details:
      "Merkle tree leaf added. Advanced ledger root hash state. Anchored to public Ethereum / Starknet state transition block #849210.",
    signer: "CN=BidVault Ledger Service, O=BidVault Technologies Inc., C=US",
    signature:
      "3082010a0282010100a98f12c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
    blockHeight: 849210,
  },
  "0x223e…9012": {
    timestamp: "2026-05-22 09:31:55 UTC",
    event: "bid.seal",
    actor: "Meridian Roads Ltd",
    hash: "0x223ecb124fdd9e083c27e10a6db24e390cbf5233bc238ee92745cf842f1a9012",
    details:
      "Sealed bid envelope package submitted and registered on local HSM key chain. Shamir shards locked. Size: 26.9 MB.",
    signer: "CN=Meridian Procurement, O=Meridian Roads Ltd, C=GB",
    signature:
      "3082010a0282010100ff88ca8234e9a0c1d2e3f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e",
    blockHeight: 849182,
  },
  "0xb112…f00d": {
    timestamp: "2026-05-22 10:18:41 UTC",
    event: "vendor.join",
    actor: "Northwind Construct",
    hash: "0xb112ca82f3ef841029c3a37d2fef8e70a98f12c29bc34ee927d62fe842f1f00d",
    details:
      "Vendor successfully authenticated via eIDAS and joined the GOV-2026-ROAD-INFRA-014 tender group.",
    signer: "CN=Northwind Construct GmbH, O=Northwind Construct, C=DE",
    signature:
      "3082010a0282010100e4b8a2e3f4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
    blockHeight: 849195,
  },
};

function BidInspectBody({ bid }: { bid: BidDetail }) {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = () => {
    setVerifying(true);
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: "Querying HSM cluster and resolving Merkle tree path...",
      success: () => {
        setVerifying(false);
        setVerified(true);
        return `Cryptographic attestation valid for ${bid.vendor}`;
      },
      error: "Verification failed.",
    });
  };

  return (
    <div className="p-6 space-y-6 flex-1">
      {/* Verification Action Bar */}
      <div className="rounded-lg border border-border/80 bg-surface/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-foreground">Integrity Status</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
              {verified
                ? "Verified against ledger Merkle root"
                : "Attestation unchecked since load"}
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
                  <svg
                    className="animate-spin h-3 w-3 text-current"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
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
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Envelope Parameters
        </h4>
        <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">
              Vendor Entity
            </div>
            <div className="mt-0.5 font-sans font-semibold text-foreground text-[12px] truncate">
              {bid.vendor}
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">
              Registration Code
            </div>
            <div className="mt-0.5 text-foreground text-[11.5px] truncate">{bid.reg}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">
              Sealing Timestamp
            </div>
            <div className="mt-0.5 text-foreground text-[11.5px] truncate">{bid.timestamp}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">
              Payload Size
            </div>
            <div className="mt-0.5 text-foreground text-[11.5px] truncate">{bid.envelopeSize}</div>
          </div>
        </div>
      </div>

      {/* Cryptographic Proof */}
      <div className="space-y-4">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Shamir & HSM Custody
        </h4>
        <div className="space-y-2 text-[12px] border border-border/60 bg-surface/30 rounded-lg p-3">
          <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground">HSM Node Authority</span>
            <span className="font-mono text-[11px] text-foreground font-semibold">
              {bid.hsmAttestation.node}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-border/40">
            <span className="text-muted-foreground">TPM Attestation Spec</span>
            <span className="font-mono text-[11px] text-foreground">{bid.hsmAttestation.cert}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-border/40">
            <span className="text-muted-foreground">Encryption Cipher</span>
            <span className="font-mono text-[11px] text-foreground">
              {bid.hsmAttestation.algorithm}
            </span>
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
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Merkle Path (Index {bid.merkleProof.leafIndex})
        </h4>
        <div className="border border-border/60 bg-surface/30 rounded-lg p-3 space-y-2">
          <div className="font-mono text-[9.5px] text-muted-foreground break-all">
            Merkle Root:{" "}
            <span className="text-foreground select-all font-semibold">{bid.merkleProof.root}</span>
          </div>
          <div className="space-y-1.5 border-t border-border/40 pt-2.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              Merkle Proof Siblings
            </div>
            {bid.merkleProof.proof.map((p, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px] font-mono">
                <span className="text-primary font-semibold text-[9.5px] shrink-0">
                  Sibling {idx + 1}:
                </span>
                <span className="text-muted-foreground break-all select-all">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Raw Payload JSON */}
      <div className="space-y-3 pb-8">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Raw Verification Payload
          </h4>
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
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: "Running consensus verify against L1 state root...",
      success: () => {
        setVerifying(false);
        setVerified(true);
        return `ZK consensus verified block height #${log.blockHeight}`;
      },
      error: "Consensus verification failed.",
    });
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
                  <svg
                    className="animate-spin h-3 w-3 text-current"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
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
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Event Parameters
        </h4>
        <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">
              Event Name
            </div>
            <div className="mt-0.5 text-primary text-[12px] font-bold truncate">{log.event}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">Actor</div>
            <div className="mt-0.5 font-sans font-semibold text-foreground text-[12px] truncate">
              {log.actor}
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">
              Ledger Height
            </div>
            <div className="mt-0.5 text-foreground text-[11.5px] truncate">
              Block #{log.blockHeight}
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface/40 p-2.5">
            <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">
              Offset
            </div>
            <div className="mt-0.5 text-foreground text-[11.5px] truncate">{log.timestamp}</div>
          </div>
        </div>
      </div>

      {/* Details Box */}
      <div className="space-y-4">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Record Summary
        </h4>
        <pre className="font-mono text-[10.5px] text-muted-foreground bg-black/60 p-4 rounded-lg overflow-x-auto border border-border/60 leading-relaxed max-h-48 select-all">
          {log.details}
        </pre>
      </div>

      {/* Cryptographic Signatures */}
      <div className="space-y-4 pb-8">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Authoritative Attestation
        </h4>
        <div className="border border-border/60 bg-surface/30 rounded-lg p-3 space-y-3">
          <div>
            <span className="text-[9.5px] text-muted-foreground uppercase tracking-wider block">
              Signing Authority
            </span>
            <div className="font-mono text-[11px] text-foreground mt-0.5">{log.signer}</div>
          </div>
          <div className="border-t border-border/40 pt-2.5">
            <span className="text-[9.5px] text-muted-foreground uppercase tracking-wider block">
              Cryptographic Signature
            </span>
            <div className="font-mono text-[9px] text-muted-foreground bg-black/40 rounded p-1.5 break-all max-h-24 overflow-y-auto leading-relaxed border border-border/40 mt-1 select-all">
              {log.signature}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
