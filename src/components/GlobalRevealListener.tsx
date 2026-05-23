import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { WinnerModal } from "./WinnerModal";

export function GlobalRevealListener() {
  const { user } = useUser();
  const isVendorPortal = user?.role === "VENDOR";

  // Poll all tenders for the user
  const { data: tenders = [] } = useQuery({
    queryKey: ["global-tenders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await apiClient.get("/v1/tenders");
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 2000,
  });

  const [revealedTenderId, setRevealedTenderId] = useState<string | null>(null);
  const previouslyRevealedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!tenders.length) return;

    for (const tender of tenders) {
      const isRevealed = tender.status === "REVEALED";
      if (isRevealed && !previouslyRevealedRef.current.has(tender.id)) {
        // We found a newly revealed tender!
        previouslyRevealedRef.current.add(tender.id);
        setRevealedTenderId(tender.id);
        // Only trigger one at a time
        break;
      } else if (isRevealed) {
        // Ensure it's in the set if it was already revealed on load
        previouslyRevealedRef.current.add(tender.id);
      }
    }
  }, [tenders]);

  // If we have a newly revealed tender, fetch its bids to determine the winner
  const { data: bids = [], refetch } = useQuery({
    queryKey: ["tender-bids", revealedTenderId],
    queryFn: async () => {
      if (!revealedTenderId) return [];
      const res = await apiClient.get(`/v1/tenders/${revealedTenderId}/bids`);
      return res.data;
    },
    enabled: !!revealedTenderId,
    refetchInterval: (query) => {
      // Keep polling every second if any bid is not yet revealed on the server
      const hasUnrevealed = query?.state?.data?.some((b: any) => !b.isValid);
      return hasUnrevealed ? 1000 : false;
    },
  });

  // Auto-reveal for Vendor
  useEffect(() => {
    if (!isVendorPortal || !bids.length) return;

    const autoReveal = async () => {
      for (const bid of bids) {
        if (!bid.isValid) {
          try {
            const ptStr = sessionStorage.getItem(`plaintext_${bid.id}`);
            const salt = sessionStorage.getItem(`salt_${bid.id}`);
            if (ptStr && salt) {
              await apiClient.post(`/v1/bids/${bid.id}/reveal`, {
                plaintextBid: JSON.parse(ptStr),
                salt,
              });
              // Refetch bids after auto-revealing
              refetch();
            }
          } catch (e) {
            console.error("Auto-reveal failed", e);
          }
        }
      }
    };

    autoReveal();
  }, [bids, isVendorPortal, refetch]);

  // Calculate winner if bids are loaded
  let winnerName = "Unknown Vendor";
  let winnerAmount = 0;
  let isWinner = false;

  const getBidAmount = (b: any) => {
    try {
      if (typeof b?.plaintextBid === "string") {
        const parsed = JSON.parse(b.plaintextBid);
        if (parsed?.amount != null) return Number(parsed.amount);
      } else if (b?.plaintextBid?.amount != null) {
        return Number(b.plaintextBid.amount);
      }
    } catch (e) {}

    try {
      if (b?.id) {
        const localStr = sessionStorage.getItem(`plaintext_${b.id}`);
        if (localStr) {
          const localData = JSON.parse(localStr);
          if (localData?.amount != null) return Number(localData.amount);
        }
      }
    } catch (e) {}
    // We shouldn't use a hardcoded fallback if we can avoid it.
    // If the server hasn't decrypted it yet, it returns null.
    return null;
  };

  let validBids: any[] = [];
  if (bids.length > 0) {
    validBids = bids.filter((b: any) => getBidAmount(b) !== null);
    const winningBid = validBids.length > 0
      ? validBids.reduce((best: any, curr: any) => {
          const bA = getBidAmount(best)!;
          const cA = getBidAmount(curr)!;
          return cA < bA ? curr : best;
        })
      : null;

    if (winningBid) {
      winnerAmount = getBidAmount(winningBid) || 0;
      winnerName = winningBid.vendorId || "Unknown Vendor";
      
      // For vendor, check if their own bid matches the winning bid
      const vendorBid = bids[0]; // Vendor endpoint only returns their own bid
      isWinner = !!vendorBid && vendorBid.vendorId === winningBid.vendorId;
    }
  }

  // Determine if modal should be open
  // We open it if we have a revealedTenderId AND at least one valid bid
  const isOpen = !!revealedTenderId && validBids.length > 0;

  return (
    <WinnerModal
      isOpen={isOpen}
      onClose={() => setRevealedTenderId(null)}
      isVendorPortal={isVendorPortal}
      isWinner={isWinner}
      winnerName={winnerName}
      winnerAmount={winnerAmount}
    />
  );
}
