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
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`relative overflow-hidden rounded-lg border transition-all duration-700 backdrop-blur-sm spotlight-card ${
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
  const [status, setStatus] = useState<"sealed" | "decrypting" | "revealed">("sealed");
  const [logs, setLogs] = useState<string[]>([]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  const startReveal = () => {
    setStatus("decrypting");
    setLogs([]);

    const logLines = [
      "→ Establishing secure enclave session (Curve25519)...",
      "→ Requesting FIPS 140-3 HSM key shares (Threshold 5 of 7)...",
      "→ HSM key shares received & validated.",
      "→ Reassembling global reveal key...",
      "→ Decrypting bid ciphers using AES-256-GCM...",
      "→ Verifying bid integrity against commitment hashes...",
      "→ Appending unseal block to append-only Merkle ledger...",
      "✓ Decryption successful. Bids verified independently."
    ];

    let currentLog = 0;
    const interval = setInterval(() => {
      if (currentLog < logLines.length) {
        setLogs((prev) => [...prev, logLines[currentLog]]);
        currentLog++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setStatus("revealed");
        }, 600);
      }
    }, 220);
  };

  const resetReveal = () => {
    setStatus("sealed");
    setLogs([]);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="glass-card spotlight-card relative rounded-2xl p-5 md:p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0 overflow-hidden"
    >
      {/* Cryptographic Decryption Console Overlay */}
      {status === "decrypting" && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between bg-black/90 p-6 md:p-8 backdrop-blur-md border border-primary/30 rounded-2xl">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Cryptographic Decryption Console</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">Session: SB-901A · HSM Live</span>
          </div>
          
          <div className="my-5 flex-1 font-mono text-[11.5px] leading-relaxed space-y-1.5 overflow-y-auto text-left text-ivory/90">
            {logs.map((log, idx) => (
              <div key={idx} className={log.startsWith("✓") ? "text-success font-semibold" : ""}>
                {log}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
              <span>Assembled Key Integrity</span>
              <span>{(logs.length / 8) * 100}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-gradient-to-r from-amber-deep via-primary to-ember transition-all duration-200"
                style={{ width: `${(logs.length / 8) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

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
          onClick={status === "revealed" ? resetReveal : startReveal}
          className="btn-ember inline-flex h-9 items-center rounded-md px-4 font-mono text-[11px] uppercase tracking-[0.18em] cursor-pointer"
        >
          {status === "revealed" ? "Re-seal demo" : "Trigger reveal"}
        </button>
      </div>
      
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {bids.map((b, i) => (
          <div key={b.ref} style={{ animationDelay: `${i * 120}ms` }} className="animate-rise">
            <SealedBidCard
              bid={{ ...b, rank: status === "revealed" ? i + 1 : undefined }}
              revealed={status === "revealed"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}