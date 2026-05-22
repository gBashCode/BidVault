import { useState } from "react";

export interface Bid {
  vendor: string;
  ref: string;
  hash: string;
  amount: string;
  delta?: string;
  rank?: number;
}

export function SealedBidCard({ bid, revealed }: { bid: Bid; revealed: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border transition-all duration-700 backdrop-blur-sm ${
        revealed
          ? "border-primary/40 bg-card/65 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5)] ring-orange-glow"
          : "border-border/60 bg-surface/40 bid-sealed hover:border-primary/30 hover:translate-y-[-2px]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {bid.ref}
          </span>
          {revealed && bid.rank != null && (
            <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
              #{bid.rank}
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
            revealed ? "text-success" : "text-muted-foreground"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              revealed ? "bg-success" : "bg-primary animate-seal-pulse"
            }`}
          />
          {revealed ? "Verified" : "Sealed"}
        </span>
      </div>

      <div className="px-4 py-4">
        <div className="text-sm font-medium text-foreground">{bid.vendor}</div>
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
          {revealed ? bid.hash : maskHash(bid.hash)}
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              Bid amount
            </div>
            <div
              className={`tabular mt-1 font-display text-2xl font-semibold ${
                revealed ? "text-foreground" : "text-muted-foreground/40"
              }`}
            >
              {revealed ? bid.amount : "•••• •••"}
            </div>
          </div>
          {revealed && bid.delta && (
            <div className="text-right">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                vs. lowest
              </div>
              <div className="mt-1 font-mono text-sm text-foreground">{bid.delta}</div>
            </div>
          )}
        </div>
      </div>

      {!revealed && (
        <div className="relative h-1 overflow-hidden bg-border/60 animate-scan" />
      )}
    </div>
  );
}

function maskHash(h: string) {
  return h.replace(/[0-9a-fA-F]/g, "•").replace(/(.{4})/g, "$1 ").trim();
}

export function RevealShowcase({ bids }: { bids: Bid[] }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="glass-card relative rounded-2xl p-5 md:p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Tender · GOV-2026-ROAD-INFRA-014
          </div>
          <div className="mt-1 font-display text-lg font-semibold">
            Federal Highway Reconstruction — Phase II
          </div>
        </div>
        <button
          onClick={() => setRevealed((r) => !r)}
          className="btn-ember inline-flex h-9 items-center rounded-md px-4 font-mono text-[11px] uppercase tracking-[0.18em]"
        >
          {revealed ? "Re-seal demo" : "Trigger reveal"}
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {bids.map((b, i) => (
          <div key={b.ref} style={{ animationDelay: `${i * 120}ms` }} className="animate-rise">
            <SealedBidCard bid={{ ...b, rank: revealed ? i + 1 : undefined }} revealed={revealed} />
          </div>
        ))}
      </div>
    </div>
  );
}