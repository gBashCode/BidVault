import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { AlertTriangle, Trash2, ShieldAlert, ArrowLeft } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export const Route = createFileRoute("/vendor/withdraw")({
  component: VendorWithdrawRoute,
});

function VendorWithdrawRoute() {
  const queryClient = useQueryClient();
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [withdrawnReceipt, setWithdrawnReceipt] = useState<any>(null);

  // 1. Fetch all tenders to find the active tender
  const { data: tenders = [], isLoading: loadingTenders } = useQuery({
    queryKey: ["tenders"],
    queryFn: async () => {
      const res = await apiClient.get("/v1/tenders");
      return res.data;
    },
  });

  const activeTender =
    tenders.find((t: any) => t.status === "OPEN") ||
    tenders.find((t: any) => t.status === "DRAFT") ||
    tenders[0];

  const tenderId = activeTender?.id;

  // 2. Fetch current vendor's bids for this tender
  const { data: bids = [], isLoading: loadingBids } = useQuery({
    queryKey: ["tender-bids", tenderId],
    queryFn: async () => {
      if (!tenderId) return [];
      const res = await apiClient.get(`/v1/tenders/${tenderId}/bids`);
      return res.data;
    },
    enabled: !!tenderId,
  });

  // 3. Fetch audit logs for this tender to verify if bids are withdrawn
  const { data: auditLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["tender-audit-logs", tenderId],
    queryFn: async () => {
      if (!tenderId) return [];
      const res = await apiClient.get(`/v1/tenders/${tenderId}/audit-logs`);
      return res.data;
    },
    enabled: !!tenderId,
  });

  // A bid is active if it's not marked as withdrawn or revoked, and there is no audit log indicating it was withdrawn.
  const activeBids = bids.filter((bid: any) => {
    if (bid.status === "WITHDRAWN" || bid.status === "REVOKED") return false;
    const isWithdrawnInLog = auditLogs.some((l: any) => 
      l.eventType === "BID_WITHDRAWN" && (l.details?.bidId === bid.id || l.eventHash?.includes(bid.id))
    );
    if (isWithdrawnInLog) return false;
    return true;
  });

  const isConfirmed = confirmText === "WITHDRAW";

  // 4. Mutation to trigger the PATCH /v1/bids/:id/withdraw route
  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBid?.id) throw new Error("No bid selected for revocation.");
      const res = await apiClient.patch(`/v1/bids/${selectedBid.id}/withdraw`, {
        reason: reason.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Bid Successfully Revoked", {
        description: "Your key shards have been wiped from all custody HSM nodes.",
      });
      setWithdrawnReceipt({
        ...data,
        bidId: selectedBid.id,
        timestamp: new Date().toISOString()
      });
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["tender-bids", tenderId] });
      queryClient.invalidateQueries({ queryKey: ["tender-audit-logs", tenderId] });
    },
    onError: (err: any) => {
      console.error("Bid withdrawal error:", err);
      toast.error("Revocation Failed", {
        description:
          err.response?.data?.message ||
          err.message ||
          "Failed to trigger key-destruction sequence.",
      });
    },
  });

  const handleWithdraw = () => {
    if (isConfirmed && selectedBid?.id) {
      withdrawMutation.mutate();
    }
  };

  const isLoading = loadingTenders || (!!tenderId && (loadingBids || loadingLogs));

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="font-mono text-xs text-muted-foreground">
          Reading ledger audit state...
        </span>
      </div>
    );
  }

  if (!activeTender) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h3 className="font-display text-xl font-semibold">No Active Tenders</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          There are currently no active or published tenders registered in the ledger.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>Vendor Identity</span>
        <span>/</span>
        <span>Actions</span>
        <span>/</span>
        <span className="text-foreground">Withdraw Bid</span>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-red-500/90">
            Revoke Submission
          </h1>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            Cryptographically withdraw a previously sealed bid.
          </div>
        </div>
      </div>

      {withdrawnReceipt ? (
        <div className="mt-8 glass-card relative rounded-xl border border-red-500/30 p-8 max-w-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 mb-4 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <Trash2 className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="font-display text-2xl font-semibold text-foreground">
            Bid Successfully Revoked
          </h3>
          <p className="mt-2 text-[14px] text-muted-foreground max-w-md">
            Your key shards have been wiped from the HSM nodes. The sealed envelope is now
            permanently unreadable.
          </p>
          <div className="mt-6 w-full text-left bg-surface/50 border border-border p-4 rounded-lg">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-400 mb-2">
              Destruction Receipt
            </div>
            <div className="flex justify-between items-end border-b border-border/50 pb-2 mb-2">
              <span className="font-mono text-[11px] text-muted-foreground">Revoked Bid ID</span>
              <span className="font-mono text-[11px] text-foreground">{withdrawnReceipt.bidId}</span>
            </div>
            <div className="flex justify-between items-end border-b border-border/50 pb-2 mb-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                Revocation Timestamp
              </span>
              <span className="font-mono text-[11px] text-foreground">
                {dayjs.utc(withdrawnReceipt.timestamp).local().format("YYYY-MM-DD HH:mm:ss")}
              </span>
            </div>
            <div className="mt-4 flex justify-center">
              <button 
                onClick={() => {
                  setWithdrawnReceipt(null);
                  setSelectedBid(null);
                  setConfirmText("");
                  setReason("");
                }}
                className="text-sm text-primary hover:underline"
              >
                Return to Active Bids
              </button>
            </div>
          </div>
        </div>
      ) : selectedBid ? (
        <div className="mt-8 glass-card relative rounded-xl border border-red-500/20 shadow-[0_30px_80px_-30px_rgba(255,0,0,0.1)] p-8 max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500/10 blur-3xl" />
          
          <button 
            onClick={() => { setSelectedBid(null); setConfirmText(""); setReason(""); }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to bids
          </button>

          <h3 className="font-display text-xl font-semibold text-foreground">Danger Zone</h3>
          <div className="mt-4 p-4 bg-background/50 border border-border/50 rounded-lg">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Selected Bid</div>
            <div className="font-mono text-[12px] truncate">{selectedBid.commitment || selectedBid.id}</div>
            <div className="font-mono text-[11px] text-muted-foreground mt-1">Submitted: {dayjs.utc(selectedBid.createdAt).local().format("YYYY-MM-DD HH:mm")}</div>
          </div>

          <p className="mt-4 text-[14px] text-muted-foreground leading-relaxed">
            Withdrawing your bid will instruct the HSM network to immediately destroy your specific
            Shamir key shares. Once destroyed, your encrypted envelope{" "}
            <strong className="text-foreground">cannot be opened by anyone</strong>, even after the
            time-lock expires.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block font-mono text-[10.5px] text-muted-foreground uppercase tracking-widest mb-1.5">
                Optional Withdrawal Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Specify reason for audit logs (e.g., changed pricing strategy)..."
                rows={3}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-sans text-sm outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 transition-all resize-none"
              />
            </div>

            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
              <label className="block font-mono text-[11px] text-red-400 uppercase tracking-widest mb-2">
                Type "WITHDRAW" to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="WITHDRAW"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono outline-none focus:border-red-500/50 transition-colors"
              />
              <button
                disabled={!isConfirmed || withdrawMutation.isPending}
                onClick={handleWithdraw}
                className={`mt-4 w-full h-10 rounded-md font-semibold text-[13px] transition-all duration-300 ${
                  isConfirmed && !withdrawMutation.isPending
                    ? "bg-red-500 text-white cursor-pointer hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                    : "bg-surface text-muted-foreground border border-border cursor-not-allowed opacity-50"
                }`}
              >
                {withdrawMutation.isPending
                  ? "Executing Revocation..."
                  : "Destroy HSM Keys & Revoke Bid"}
              </button>
            </div>
          </div>
        </div>
      ) : activeBids.length === 0 ? (
        <div className="flex h-[40vh] flex-col items-center justify-center gap-4 text-center mt-8">
          <AlertTriangle className="h-12 w-12 text-primary animate-pulse" />
          <h3 className="font-display text-xl font-semibold">No Active Submissions</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            You do not have any sealed bids submitted to the tender{" "}
            <strong className="text-foreground">{activeTender.title}</strong>. Only submitted bids can
            be cryptographically revoked.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6 max-w-4xl">
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex gap-4 items-start">
            <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-foreground/80 leading-relaxed">
              <strong className="text-foreground">Zero-Knowledge Security Feature:</strong> For your security, the contents of your bids (including monetary value and files) are strictly client-side encrypted. The server has absolutely no knowledge of your bid amounts, which is why they cannot be displayed here. Please identify the bid you wish to withdraw using its Submission Timestamp or Commitment Hash.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {activeBids.map((bid: any, i: number) => (
              <div key={bid.id} className="glass-card rounded-xl border border-border/60 p-5 flex flex-col justify-between group hover:border-primary/50 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-md">
                      Bid {i + 1}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {dayjs.utc(bid.createdAt).local().format("YYYY-MM-DD HH:mm")}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground mb-1">Commitment Hash</div>
                  <div className="font-mono text-[12px] truncate text-foreground/90 bg-background/50 p-2 rounded border border-border/30">
                    {bid.commitment || bid.id}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBid(bid)}
                  className="w-full mt-5 h-9 rounded-md border border-red-500/30 text-red-400 font-semibold text-[13px] hover:bg-red-500/10 transition-colors"
                >
                  Select for Revocation
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
