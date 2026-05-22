import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ShieldCheck, CheckCircle2, FileText, ChevronRight, ArrowLeft, Terminal, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import { useState } from "react";

export const Route = createFileRoute("/verify/$tenderId")({
  component: VerifyTenderPage,
});

function VerifyTenderPage() {
  const { tenderId } = Route.useParams();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Fetch the public Merkle proofs for this tender
  const { data: proofData, isLoading, error } = useQuery({
    queryKey: ["public-tender-proof", tenderId],
    queryFn: async () => {
      const res = await apiClient.get(`/v1/public/tenders/${tenderId}/proof`);
      return res.data;
    },
  });

  const handleCopySnippet = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    toast.success("Command copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadProofJson = () => {
    if (!proofData) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(proofData, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `tender_${tenderId}_merkle_proofs.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Merkle proof JSON downloaded!");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="font-mono text-xs text-muted-foreground">Validating Merkle root witnesses...</span>
      </div>
    );
  }

  if (error || !proofData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center px-6">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive border border-destructive/20">
          <ShieldCheck className="h-10 w-10 rotate-180" />
        </div>
        <h3 className="font-display text-xl font-semibold">Tender Merkle Root Not Found</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          This tender may not exist or its unsealing/reveal deadline has not yet expired. Merkle proofs are only published after the unsealing phase is fully completed.
        </p>
        <Link to="/" className="btn-ember inline-flex h-9 items-center rounded-md px-4 text-xs font-semibold mt-2">
          Back to Public Index
        </Link>
      </div>
    );
  }

  const cliSnippet = `curl -s http://localhost:4000/v1/public/tenders/${tenderId}/proof | jq .merkleRoot`;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Decorative Orbs */}
      <div className="glow-orb absolute top-20 left-10 h-[500px] w-[500px] bg-primary/5 animate-pulse" />
      <div className="glow-orb absolute bottom-10 right-10 h-[400px] w-[400px] bg-amber-deep/5" />

      {/* Header Banner */}
      <header className="border-b border-border bg-background/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-[12px] font-mono transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
            <span className="h-4 w-[1px] bg-border" />
            <span className="font-mono text-xs text-primary font-semibold uppercase tracking-[0.22em]">
              Merkle Tree Witness Console
            </span>
          </div>
          <button
            onClick={handleDownloadProofJson}
            className="h-8 rounded-md border border-border bg-surface px-3 text-[11px] font-mono cursor-pointer hover:bg-muted inline-flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Download Proof JSON
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1280px] px-6 py-10 space-y-8">
        {/* Hero Section */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-radial-ember opacity-30" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                Immutable Witness Proof
              </div>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                {proofData.title}
              </h1>
              <p className="mt-2 text-[13.5px] text-muted-foreground max-w-2xl">
                Cryptographic verification details for all bids submitted to tender <code className="bg-surface border border-border px-1.5 py-0.5 rounded font-mono text-xs">{tenderId}</code>.
              </p>
            </div>
            <div className="font-mono text-[11px] space-y-1.5 min-w-[280px] bg-surface/50 border border-border p-4 rounded-xl">
              <div className="text-muted-foreground uppercase text-[9px] tracking-wider">Tender Merkle Root</div>
              <div className="text-foreground font-semibold font-mono break-all text-[12px] text-primary select-all">
                {proofData.merkleRoot}
              </div>
              <div className="flex justify-between text-[10.5px] pt-1 text-muted-foreground">
                <span>Total Bids: {proofData.bids?.length || 0}</span>
                <span>Status: {proofData.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bids Verification Table */}
        <div className="glass-card relative overflow-hidden rounded-xl">
          <div className="border-b border-border/70 px-5 py-4 flex items-center justify-between bg-surface/30">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Submitted Commitments Ledger
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead className="bg-surface/50 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-5 py-3.5">Vendor Witness Hash</th>
                  <th className="px-5 py-3.5">Cryptographic Commitment</th>
                  <th className="px-5 py-3.5">Sealed Value</th>
                  <th className="px-5 py-3.5">Merkle Proof</th>
                  <th className="px-5 py-3.5 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {proofData.bids?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground font-mono text-xs">
                      No bid records found for this tender.
                    </td>
                  </tr>
                ) : (
                  proofData.bids?.map((item: any, idx: number) => {
                    const isRevealed = !!item.revealed;
                    const valueStr = isRevealed
                      ? `€ ${Number(item.revealed.plaintextBid?.amount).toLocaleString()}`
                      : "•••• (Locked)";

                    return (
                      <tr key={idx} className="hover:bg-surface/20 transition-colors">
                        <td className="px-5 py-4 font-mono font-medium text-foreground">
                          {item.vendorHash.substring(0, 14)}...
                        </td>
                        <td className="px-5 py-4 font-mono text-muted-foreground select-all">
                          {item.commitment.substring(0, 16)}...
                        </td>
                        <td className="px-5 py-4 font-semibold text-gradient-ember">
                          {valueStr}
                        </td>
                        <td className="px-5 py-4 font-mono text-muted-foreground">
                          {item.merkleProof?.length || 0} hashes
                        </td>
                        <td className="px-5 py-4 text-right">
                          <VerificationBadge
                            merkleRoot={proofData.merkleRoot}
                            commitment={item.commitment}
                            proof={item.merkleProof}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Local Verification Tutorial / Terminal copy */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-primary font-mono text-[11px] uppercase tracking-widest">
              <Terminal className="h-4 w-4" />
              Verify Locally via CLI
            </div>
            <p className="text-[13px] text-muted-foreground">
              Run this raw command on your local terminal to fetch and verify the cryptographic Merkle root of the tender from the open API.
            </p>
            <div className="relative flex items-center bg-background border border-border rounded-lg p-3 font-mono text-[11px] text-foreground/90 overflow-hidden shadow-inner">
              <code className="break-all select-all pr-8">{cliSnippet}</code>
              <button
                onClick={() => handleCopySnippet(cliSnippet, 0)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded border border-border bg-surface text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Copy command"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface/50 p-6 space-y-3">
            <h4 className="font-display text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Open Audit Proof
            </h4>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Every commitment displayed is cryptographically verified to have been submitted prior to the deadline, and hashed into a single Merkle Tree.
              This system provides mathematical guarantee that no bid was modified, injected, or deleted after the bidding window closed.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
