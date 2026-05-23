import { Trophy, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function WinnerModal({
  isOpen,
  onClose,
  isVendorPortal,
  isWinner,
  winnerName,
  winnerAmount,
}: {
  isOpen: boolean;
  onClose: () => void;
  isVendorPortal: boolean;
  isWinner: boolean;
  winnerName: string;
  winnerAmount: number;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-emerald-500/20"
          >
            <div className="absolute inset-0 bg-radial-ember opacity-30" />
            <div className="glow-orb absolute -top-10 -right-10 h-[250px] w-[250px] bg-emerald-500/20" />
            
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground z-10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)] bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40">
                <Trophy className="h-12 w-12" />
              </div>

              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400 mb-3">
                Bid Results Unsealed
              </div>

              {isVendorPortal && isWinner ? (
                <>
                  <h2 className="font-display text-4xl font-bold text-foreground">
                    Congratulations!
                  </h2>
                  <p className="mt-4 text-[15px] text-muted-foreground">
                    Your cryptographic bid of <strong className="text-emerald-400">€ {winnerAmount.toLocaleString()}</strong> is the winning bid!
                  </p>
                </>
              ) : isVendorPortal && !isWinner ? (
                <>
                  <h2 className="font-display text-3xl font-bold text-foreground">
                    Winner Announced
                  </h2>
                  <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
                    The winning bid went to <strong className="text-foreground capitalize">{winnerName}</strong> for <strong className="text-emerald-400">€ {winnerAmount.toLocaleString()}</strong>.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-display text-3xl font-bold text-foreground">
                    Winner Determined
                  </h2>
                  <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
                    The winning vendor is <strong className="text-foreground capitalize">{winnerName}</strong> with a bid of <strong className="text-emerald-400">€ {winnerAmount.toLocaleString()}</strong>.
                  </p>
                </>
              )}

              <button
                onClick={onClose}
                className="mt-8 rounded-md bg-emerald-500 px-8 py-2.5 font-mono text-[12px] font-semibold text-black hover:bg-emerald-400 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
              >
                Acknowledge
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
