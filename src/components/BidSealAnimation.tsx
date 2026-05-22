import { motion } from "framer-motion";
import { Lock, ShieldCheck, Zap } from "lucide-react";

interface BidSealAnimationProps {
  commitment: string;
  isSealing: boolean;
  isComplete: boolean;
}

export function BidSealAnimation({ commitment, isSealing, isComplete }: BidSealAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 border border-border/40 rounded-2xl bg-card/30 backdrop-blur-sm shadow-xl max-w-md w-full mx-auto">
      <div className="relative mb-6">
        {/* Glow Ring Effect */}
        {isSealing && (
          <motion.div
            className="absolute -inset-4 rounded-full bg-primary/20 blur-xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut",
            }}
          />
        )}

        {isComplete && (
          <motion.div
            className="absolute -inset-6 rounded-full bg-emerald-500/25 blur-2xl"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
          />
        )}

        {/* Lock Container */}
        <motion.div
          className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-2 bg-background shadow-lg transition-colors ${
            isComplete
              ? "border-emerald-500 text-emerald-500 shadow-emerald-500/10"
              : isSealing
              ? "border-primary text-primary shadow-primary/10"
              : "border-muted text-muted-foreground"
          }`}
          initial={{ scale: 0.8, rotate: -10 }}
          animate={
            isComplete
              ? { scale: [1, 1.15, 1], rotate: 0 }
              : isSealing
              ? { scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }
              : { scale: 1, rotate: 0 }
          }
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 15,
            duration: 0.5,
            ...(isSealing && { repeat: Infinity, repeatDelay: 1 }),
          }}
        >
          {isComplete ? (
            <ShieldCheck className="h-10 w-10 animate-fade-in" />
          ) : isSealing ? (
            <Zap className="h-10 w-10 animate-pulse text-primary" />
          ) : (
            <Lock className="h-10 w-10" />
          )}
        </motion.div>
      </div>

      <div className="text-center w-full">
        <h3 className="font-display font-medium text-lg text-foreground">
          {isComplete ? "Bid Mathematically Sealed" : isSealing ? "Applying Client-Side Cryptography" : "Ready to Seal Bid"}
        </h3>
        <p className="mt-1.5 text-xs text-muted-foreground max-w-xs mx-auto">
          {isComplete
            ? "Your bid is encrypted and the commitment is saved on-chain. Plaintext bid has been purged."
            : isSealing
            ? "Deriving AES-GCM-256 key from salt using PBKDF2 with 100,000 iterations..."
            : "Click 'Seal and Submit' to locally encrypt your bid."}
        </p>

        {/* Commitment Hash Reveal */}
        {commitment && (
          <motion.div
            className="mt-6 w-full text-left"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 block mb-1">
              Cryptographic Commitment (SHA-256)
            </span>
            <div className="font-mono text-[10px] break-all p-3 rounded-lg bg-black/40 border border-border/30 text-emerald-400 select-all shadow-inner relative overflow-hidden">
              <span className="relative z-10">{commitment}</span>
              {/* Scanline overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent pointer-events-none animate-scanline" style={{ height: "200%" }} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
