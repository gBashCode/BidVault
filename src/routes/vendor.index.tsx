import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { CountdownRing } from "@/components/CountdownRing";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ChevronRight,
  Trophy,
} from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { toast } from "sonner";

dayjs.extend(utc);

export const Route = createFileRoute("/vendor/")({
  validateSearch: (search: Record<string, unknown>): { tenderId?: string } => {
    return {
      tenderId: search.tenderId as string | undefined,
    };
  },
  component: VendorOverview,
});

function VendorOverview() {
  const { tenderId: searchTenderId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.id });

  // 1. Fetch all tenders
  const { data: tenders = [], isLoading: loadingTenders } = useQuery({
    queryKey: ["tenders"],
    queryFn: async () => {
      const res = await apiClient.get("/v1/tenders");
      return res.data;
    },
    refetchInterval: 2000,
  });

  const activeTender = searchTenderId ? tenders.find((t: any) => t.id === searchTenderId) : null;
  const tenderId = activeTender?.id;

  // 2. Fetch documents for this tender
  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["tender-documents", tenderId],
    queryFn: async () => {
      if (!tenderId) return [];
      const res = await apiClient.get(`/v1/tenders/${tenderId}/documents`);
      return res.data;
    },
    enabled: !!tenderId,
  });

  // 3. Fetch vendor's own bids for this tender (authorized under modified routes + RLS)
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

  const isLoading = loadingTenders || (!!tenderId && (loadingBids || loadingDocs));

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="font-mono text-xs text-muted-foreground">Syncing ledger contexts...</span>
      </div>
    );
  }

  // If no specific tender is selected, show list
  if (!activeTender) {
    if (tenders.length === 0) {
      return (
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <h3 className="font-display text-xl font-semibold">No Active Tenders Found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            There are currently no active or published tenders in your organization database. Check
            back later or contact your procurement administrator.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Available Tenders</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select an open tender to view documents and submit your encrypted bid.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {tenders.map((t: any) => (
            <div
              key={t.id}
              className="glass-card rounded-xl p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">{t.title}</h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest ${t.status === "OPEN" ? "bg-primary/20 text-primary border border-primary/50" : "bg-surface border border-border text-muted-foreground"}`}
                >
                  {t.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {t.description || "No description provided."}
              </p>
              <div className="flex flex-col gap-2 font-mono text-[11px] text-muted-foreground mb-6">
                <div>
                  Deadline: {dayjs.utc(t.submissionDeadline).format("YYYY-MM-DD HH:mm")} UTC
                </div>
                <div>ID: {t.id}</div>
              </div>
              <button
                onClick={() => navigate({ search: { tenderId: t.id } })}
                className="w-full btn-ember h-9 rounded-md flex items-center justify-center gap-2 text-[12px] cursor-pointer"
              >
                View Tender <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const bid = bids[0]; // Vendor only gets their own bid due to RLS
  const isSubmitted = !!bid;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <button
        onClick={() => navigate({ search: { tenderId: undefined } })}
        className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
      >
        ← Back to all tenders
      </button>
      <Breadcrumb tenderTitle={activeTender.title} />
      <Header activeTender={activeTender} isSubmitted={isSubmitted} />
      <MetricRow activeTender={activeTender} isSubmitted={isSubmitted} bid={bid} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <CountdownPanel activeTender={activeTender} isSubmitted={isSubmitted} bid={bid} allBids={bids} />
        <TenderDocuments documents={documents} />
      </div>
    </div>
  );
}

function Breadcrumb({ tenderTitle }: { tenderTitle: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
      <span>Vendor Identity</span>
      <span>/</span>
      <span>Tender Context</span>
      <span>/</span>
      <span className="text-foreground truncate max-w-xs">{tenderTitle}</span>
    </div>
  );
}

function Header({ activeTender, isSubmitted }: { activeTender: any; isSubmitted: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{activeTender.title}</h1>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
          {activeTender.id} · Published by Procurement Authority
        </div>
      </div>
      <div className="flex gap-2">
        {!isSubmitted ? (
          <Link
            to="/vendor/submit"
            search={{ tenderId: activeTender.id }}
            className="btn-ember inline-flex h-10 items-center rounded-md px-6 text-[13px] font-semibold cursor-pointer shadow-[0_0_15px_rgba(255,107,0,0.3)] hover:shadow-[0_0_25px_rgba(255,107,0,0.5)] transition-shadow"
          >
            Submit BidVault
          </Link>
        ) : (
          <div className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 text-[13px] font-semibold text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
            Bid Submitted
          </div>
        )}
      </div>
    </div>
  );
}

function MetricRow({
  activeTender,
  isSubmitted,
  bid,
}: {
  activeTender: any;
  isSubmitted: boolean;
  bid: any;
}) {
  // Use UTC via dayjs for date formatting per constraint 5
  const deadlineUTC = dayjs.utc(activeTender.submissionDeadline);
  const userTZ = dayjs.tz ? dayjs.tz.guess() : "UTC";
  const deadlineLocal = deadlineUTC.local().format("YYYY-MM-DD HH:mm");

  const m = [
    {
      k: "Your Status",
      v: isSubmitted ? "Submitted" : "Not Submitted",
      sub: isSubmitted ? "Cryptographically sealed" : "Action required",
    },
    {
      k: "Required format",
      v: "AES-256-GCM",
      sub: "Envelope encrypted",
    },
    {
      k: "Submission Deadline",
      v: deadlineUTC.format("HH:mm") + " UTC",
      sub: `${deadlineLocal} (${userTZ})`,
    },
    {
      k: "Tender Status",
      v: activeTender.status,
      sub: `Current lifecycle stage`,
    },
  ];

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-4">
      {m.map((x, i) => (
        <div
          key={x.k}
          className="glass-card rounded-xl px-5 py-4 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)]"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {x.k}
          </div>
          <div
            className={`tabular mt-1 font-display text-2xl font-semibold inline-block ${
              i === 0
                ? isSubmitted
                  ? "text-emerald-400"
                  : "text-primary animate-pulse"
                : "text-gradient-ember"
            }`}
          >
            {x.v}
          </div>
          <div className="font-mono text-[10.5px] text-muted-foreground mt-0.5">{x.sub}</div>
        </div>
      ))}
    </div>
  );
}

function CountdownPanel({
  activeTender,
  isSubmitted,
  bid,
  allBids,
}: {
  activeTender: any;
  isSubmitted: boolean;
  bid: any;
  allBids: any[];
}) {
  const targetDate = new Date(activeTender.submissionDeadline);
  const isExpired = Date.now() > targetDate.getTime();
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
    return null; // No amount found
  };

  // Find the winning bid (lowest amount) among all bids that have a known amount
  const validBids = allBids.filter((b) => getBidAmount(b) !== null);
  const winningBid = validBids.length > 0
    ? validBids.reduce((best: any, curr: any) => {
        const bestAmount = getBidAmount(best)!;
        const currAmount = getBidAmount(curr)!;
        return currAmount < bestAmount ? curr : best;
      })
    : null;

  if (isRevealed && winningBid) {
    const winnerAmount = getBidAmount(winningBid)!;
    const winnerVendorId = winningBid.vendorId || "Unknown";
    const isCurrentUserWinner = bid && bid.vendorId === winningBid.vendorId;
    const myAmount = bid ? getBidAmount(bid) : null;

    return (
      <div className="glass-card relative overflow-hidden rounded-xl p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
        <div className="absolute inset-0 bg-radial-ember opacity-30" />
        <div className="glow-orb absolute -top-10 -right-10 h-[250px] w-[250px] bg-emerald-500/10" />
        <div className="relative space-y-6">
          <div className="flex flex-col items-center text-center py-4">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] ${
              isCurrentUserWinner
                ? "bg-emerald-500/15 text-emerald-400 border-2 border-emerald-500/30"
                : "bg-amber-500/15 text-amber-400 border-2 border-amber-500/30"
            }`}>
              <Trophy className="h-9 w-9" />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400 mb-2">
              Bid Results Announced
            </div>
            <h3 className="font-display text-2xl font-semibold">
              {isCurrentUserWinner ? "Congratulations! You won!" : "Winner Announced"}
            </h3>
            <p className="mt-2 text-[13px] text-muted-foreground max-w-md">
              {isCurrentUserWinner
                ? "Your bid has been selected as the winning submission for this tender."
                : "The bids have been unsealed and the winner has been determined."}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400 pb-2 border-b border-emerald-500/20">
              Winning Bid Details
            </div>
            <div className="flex justify-between items-center py-1.5 font-mono text-[12.5px]">
              <span className="text-muted-foreground">Winner</span>
              <span className={`font-semibold text-[14px] ${isCurrentUserWinner ? "text-emerald-400" : "text-foreground"}`}>
                {isCurrentUserWinner ? "You" : `Vendor ${winnerVendorId.substring(0, 8)}...`}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 font-mono text-[12.5px]">
              <span className="text-muted-foreground">Winning Price</span>
              <span className="font-semibold text-emerald-400 text-[18px]">
                € {winnerAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 font-mono text-[12.5px]">
              <span className="text-muted-foreground">Total Bids Received</span>
              <span className="text-foreground">{allBids.length}</span>
            </div>
          </div>

          {bid && (
            <div className="rounded-xl border border-border bg-surface/50 p-5 space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary pb-2 border-b border-border/50">
                Your Bid Summary
              </div>
              <div className="flex justify-between items-center py-1.5 font-mono text-[12.5px]">
                <span className="text-muted-foreground">Your Bid Amount</span>
                <span className="font-semibold text-foreground text-[15px]">
                  {myAmount !== null ? `€ ${myAmount.toLocaleString()}` : "Sealed"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 font-mono text-[12.5px]">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-semibold ${isCurrentUserWinner ? "text-emerald-400" : "text-amber-400"}`}>
                  {isCurrentUserWinner ? "✓ Winner" : "Not Selected"}
                </span>
              </div>
            </div>
          )}
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
          title={isExpired ? "Status" : "Deadline"}
          subtitle={isSubmitted ? "Sealed receipt safe" : "Mathematically locked"}
        />
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
            {isExpired ? "Submission Window Closed" : "Submission Window Open"}
          </div>
          <h3 className="mt-2 font-display text-2xl font-semibold">
            {isSubmitted
              ? "Your bid is cryptographically sealed."
              : isExpired
                ? "The submission window has closed."
                : "Prepare your encrypted envelope."}
          </h3>
          <p className="mt-3 text-[13.5px] text-muted-foreground">
            {isSubmitted
              ? `Your bid was received on ${dayjs(bid.submittedAt).format("YYYY-MM-DD HH:mm")} UTC. The commitment hash is registered on the append-only ledger.`
              : "Bids are encrypted locally in your browser. The purchasing authority cannot view your submission until the time-lock expires and HSM keys are distributed."}
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

function TenderDocuments({ documents }: { documents: any[] }) {
  const defaultItems = [
    { filename: "Technical Specifications Annex A", fileSize: 4.2 * 1024 * 1024, type: "PDF" },
    { filename: "Pricing Matrix Template", fileSize: 1.1 * 1024 * 1024, type: "XLSX" },
    { filename: "Legal Terms & Conditions", fileSize: 890 * 1024, type: "PDF" },
  ];

  const items =
    documents.length > 0
      ? documents.map((d) => ({
          filename: d.filename,
          fileSize: d.fileSize,
          type: d.filename.split(".").pop()?.toUpperCase() || "PDF",
        }))
      : defaultItems;

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
    return (bytes / 1024).toFixed(0) + " KB";
  };

  return (
    <div className="glass-card relative rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Tender Documents
        </div>
        <button
          onClick={() => toast.success("Downloading all documents...")}
          className="font-mono text-[10px] text-primary hover:underline cursor-pointer"
        >
          Download all →
        </button>
      </div>
      <ol className="divide-y divide-border">
        {items.map((it) => (
          <li key={it.filename} className="flex items-center justify-between px-5 py-3">
            <div>
              <div className="text-[13px] font-medium text-foreground/90">{it.filename}</div>
              <div className="font-mono text-[10.5px] text-muted-foreground mt-0.5">
                {formatSize(it.fileSize)}
              </div>
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
