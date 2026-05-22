import { useState } from "react";
import { verifyMerkleProof } from "@sealedbid/crypto";
import { ShieldCheck, ShieldAlert, Loader2, FileCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VerificationBadgeProps {
  root?: string;
  merkleRoot?: string;
  commitment: string;
  proof: string[];
  className?: string;
}

export function VerificationBadge({ root, merkleRoot, commitment, proof, className = "" }: VerificationBadgeProps) {
  const [status, setStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");

  const handleVerify = async () => {
    if (status === "verifying") return;

    setStatus("verifying");

    // Simulate cryptographic processing time for premium feel
    await new Promise((resolve) => setTimeout(resolve, 800));

    const actualRoot = root || merkleRoot || "";
    try {
      const isValid = verifyMerkleProof(actualRoot, commitment, proof);
      setStatus(isValid ? "verified" : "failed");
    } catch (err) {
      console.error("Merkle proof verification failed", err);
      setStatus("failed");
    }
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.button
            key="idle"
            onClick={handleVerify}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono font-medium hover:bg-primary/10 transition-colors shadow-sm cursor-pointer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <FileCheck className="h-3.5 w-3.5" />
            Verify Merkle Proof
          </motion.button>
        )}

        {status === "verifying" && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-500 text-xs font-mono font-medium"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Verifying Leaf...
          </motion.div>
        )}

        {status === "verified" && (
          <motion.div
            key="verified"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-xs font-mono font-medium shadow-sm shadow-emerald-500/5"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Cryptographically Verified
          </motion.div>
        )}

        {status === "failed" && (
          <motion.button
            key="failed"
            onClick={handleVerify}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-mono font-medium cursor-pointer hover:bg-red-500/10"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
            Verification Failed
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
