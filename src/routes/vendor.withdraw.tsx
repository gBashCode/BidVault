import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/vendor/withdraw")({
  component: VendorWithdrawRoute,
});

function VendorWithdrawRoute() {
  const [confirmText, setConfirmText] = useState("");
  const [withdrawn, setWithdrawn] = useState(false);

  const isConfirmed = confirmText === "WITHDRAW";

  const handleWithdraw = () => {
    if (isConfirmed) setWithdrawn(true);
  };

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

      {!withdrawn ? (
        <div className="mt-8 glass-card relative rounded-xl border border-red-500/20 shadow-[0_30px_80px_-30px_rgba(255,0,0,0.1)] p-8 max-w-2xl">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500/10 blur-3xl" />
          
          <h3 className="font-display text-xl font-semibold text-foreground">
            Danger Zone
          </h3>
          <p className="mt-3 text-[14px] text-muted-foreground leading-relaxed">
            Withdrawing your bid will instruct the HSM network to immediately destroy your specific Shamir key shares. 
            Once destroyed, your encrypted envelope <strong className="text-foreground">cannot be opened by anyone</strong>, even after the time-lock expires.
          </p>
          <p className="mt-3 text-[14px] text-muted-foreground leading-relaxed">
            A cryptographic proof of withdrawal will be written to the append-only audit ledger to verify your action.
          </p>

          <div className="mt-8 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
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
              disabled={!isConfirmed}
              onClick={handleWithdraw}
              className={`mt-4 w-full h-10 rounded-md font-semibold text-[13px] transition-all duration-300 ${
                isConfirmed 
                  ? "bg-red-500 text-white cursor-pointer hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)]" 
                  : "bg-surface text-muted-foreground border border-border cursor-not-allowed opacity-50"
              }`}
            >
              Destroy HSM Keys & Revoke Bid
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 glass-card relative rounded-xl border border-red-500/30 p-8 max-w-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 mb-4 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="font-display text-2xl font-semibold text-foreground">
            Bid Successfully Revoked
          </h3>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Your key shards have been wiped from the HSM nodes. The sealed envelope is now permanently unreadable.
          </p>
          <div className="mt-6 w-full text-left bg-surface/50 border border-border p-4 rounded-lg">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-400 mb-2">
              Destruction Receipt
            </div>
            <div className="flex justify-between items-end border-b border-border/50 pb-2 mb-2">
               <span className="font-mono text-[11px] text-muted-foreground">Ledger Event</span>
               <span className="font-mono text-[11px] text-red-400">bid.revoke</span>
            </div>
            <div className="flex justify-between items-end">
               <span className="font-mono text-[11px] text-muted-foreground">Event Hash</span>
               <span className="font-mono text-[11px] text-foreground">0xd3a4b5c6...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
