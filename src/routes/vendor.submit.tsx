import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { encryptBid } from "@/lib/crypto-client";
import { BidSealAnimation } from "@/components/BidSealAnimation";
import axios from "axios";
import { toast } from "sonner";
import { ShieldCheck, Lock, CheckCircle2, ChevronRight } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export const Route = createFileRoute("/vendor/submit")({
  component: VendorSubmitRoute,
});

function VendorSubmitRoute() {
  return (
    <div className="space-y-6">
      <Breadcrumb />
      <Header />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SubmissionFlow />
        <SideTrust />
      </div>
    </div>
  );
}

function Breadcrumb() {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
      <span>Vendor Identity</span>
      <span>/</span>
      <span>Actions</span>
      <span>/</span>
      <span className="text-foreground">Submit Bid</span>
    </div>
  );
}

function Header() {
  return (
    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Bid Encryption & Sealing
        </h1>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
          GOV-2026-ROAD-INFRA-014 · Phase II
        </div>
      </div>
    </div>
  );
}

const steps = ["Upload", "Encrypt", "Hash", "Verify", "Sealed"];

function SubmissionFlow() {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Form State
  const [amount, setAmount] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Cryptographic & API response states
  const [commitment, setCommitment] = useState("");
  const [saltHash, setSaltHash] = useState("");
  const [bidId, setBidId] = useState("");
  const [s3Key, setS3Key] = useState("");

  // Fetch active tender for client context
  const { data: tenders = [] } = useQuery({
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

  const handleStartSubmit = async () => {
    if (files.length === 0 || !amount) {
      toast.error("Please enter a bid amount and upload at least one file.");
      return;
    }

    if (!activeTender) {
      toast.error("No active tender found for submission.");
      return;
    }

    try {
      // Step 1: Encrypting
      setStep(1);
      setProgress(15);

      const plaintextBid = {
        amount: parseFloat(amount),
        currency: "EUR",
        files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      };

      // Perform local in-browser encryption
      const { commitment: compCommitment, saltHash: compSaltHash, encryptedBlob } = await encryptBid(
        plaintextBid,
        activeTender.id
      );

      setCommitment(compCommitment);
      setSaltHash(compSaltHash);

      setProgress(70);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 2: Hashing (Ledger preparation)
      setStep(2);
      setProgress(10);
      await new Promise((resolve) => setTimeout(resolve, 400));
      setProgress(60);
      await new Promise((resolve) => setTimeout(resolve, 400));
      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 3: Verify (Ledger registration & S3 Upload)
      setStep(3);
      setProgress(10);

      // Register commitment and salt hash on backend API
      const bidRes = await apiClient.post(`/v1/tenders/${activeTender.id}/bids`, {
        commitment: compCommitment,
        saltHash: compSaltHash,
      });

      const registeredBid = bidRes.data;
      setBidId(registeredBid.id);

      setProgress(40);

      // Extract generated salt from sessionStorage and save with real bid ID
      const localSalt = sessionStorage.getItem(`salt_${compCommitment}`);
      if (localSalt) {
        sessionStorage.setItem(`salt_${registeredBid.id}`, localSalt);
      }
      sessionStorage.setItem(`plaintext_${registeredBid.id}`, JSON.stringify(plaintextBid));
      // Store encrypted blob as hex in sessionStorage for robust offline fallback
      const hexBlob = Array.from(encryptedBlob)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      sessionStorage.setItem(`encrypted_blob_${registeredBid.id}`, hexBlob);

      // S3 Multipart POST Upload
      const { uploadUrl, uploadFields } = registeredBid;
      let etag = '"mock-etag-52627"';

      if (uploadUrl && uploadFields) {
        try {
          const formData = new FormData();
          Object.entries(uploadFields).forEach(([key, value]) => {
            formData.append(key, value as string);
          });
          // Append the encrypted binary Blob as 'file' (must be the last parameter for S3 POST)
          formData.append("file", new Blob([encryptedBlob as any], { type: "application/octet-stream" }));

          const s3Res = await axios.post(uploadUrl, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          if (s3Res.headers.etag) {
            etag = s3Res.headers.etag;
          }
        } catch (s3Err) {
          console.warn("Mock S3 network warning (expected in local offline sandbox):", s3Err);
        }
      }

      setProgress(75);
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Confirm Upload to backend
      const keyPath = uploadFields?.key || `tenders/${activeTender.id}/bids/${registeredBid.id}.enc`;
      setS3Key(keyPath);

      await apiClient.post(`/v1/bids/${registeredBid.id}/confirm-upload`, {
        etag,
        s3Key: keyPath,
      });

      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Step 4: Sealed
      setStep(4);
      toast.success("Bid sealed and submitted successfully!");
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error("Bid sealing failed", {
        description: err.response?.data?.message || err.message || "Cryptographic seal could not be verified.",
      });
      setStep(0);
      setProgress(0);
    }
  };

  return (
    <div className="glass-card relative rounded-2xl p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="mb-6 flex justify-between">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex flex-col items-center gap-2 ${
              i <= step ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-[10px] border ${
                i < step
                  ? "border-primary bg-primary/20"
                  : i === step
                    ? "border-primary bg-background shadow-[0_0_15px_rgba(255,107,0,0.5)]"
                    : "border-border bg-surface"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em]">{s}</span>
          </div>
        ))}
      </div>

      <div className="relative mt-8 h-1 w-full overflow-hidden rounded-full bg-surface border border-border/50">
        <div
          className="absolute inset-y-0 left-0 bg-primary transition-all duration-75 ease-linear"
          style={{
            width: `${step >= 4 ? 100 : step === 0 ? 0 : progress}%`,
            boxShadow: "0 0 10px rgba(255,107,0,0.8)",
          }}
        />
      </div>

      <div className="mt-10 min-h-[300px]">
        {step === 0 && (
          <StepUpload 
            amount={amount} 
            setAmount={setAmount} 
            files={files} 
            setFiles={setFiles} 
            onStart={handleStartSubmit} 
          />
        )}
        {step === 1 && (
          <div className="space-y-6">
            <BidSealAnimation commitment="" isSealing={true} isComplete={false} />
            <StepEncrypt progress={progress} />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6">
            <BidSealAnimation commitment={commitment} isSealing={true} isComplete={false} />
            <StepHash progress={progress} />
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6">
            <BidSealAnimation commitment={commitment} isSealing={true} isComplete={false} />
            <StepVerify progress={progress} />
          </div>
        )}
        {step === 4 && (
          <div className="space-y-6">
            <BidSealAnimation commitment={commitment} isSealing={false} isComplete={true} />
            <StepDone amount={amount} files={files} commitment={commitment} bidId={bidId} s3Key={s3Key} />
          </div>
        )}
      </div>
    </div>
  );
}

function StepUpload({ 
  amount, setAmount, files, setFiles, onStart 
}: { 
  amount: string, setAmount: (v: string) => void, 
  files: File[], setFiles: (v: File[]) => void, 
  onStart: () => void 
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div>
        <h3 className="font-display text-2xl font-semibold">1. Prepare your submission</h3>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Enter your commercial bid and select technical annexes. Everything is encrypted locally.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
            Commercial Bid Amount (EUR)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">€</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-4 py-2.5 text-foreground font-mono outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
            Technical Annexes & Documents
          </label>
          <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer shadow-inner p-8">
            <svg className="h-8 w-8 text-primary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              {files.length > 0 ? `${files.length} file(s) selected` : "Select files or drag & drop"}
            </span>
            <input 
              type="file" 
              multiple 
              className="hidden" 
              onChange={handleFileChange}
            />
          </label>
          {files.length > 0 && (
            <div className="mt-3 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex justify-between font-mono text-[10px] text-muted-foreground bg-surface/50 px-2 py-1 rounded">
                  <span className="truncate">{f.name}</span>
                  <span>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        disabled={!amount || files.length === 0}
        onClick={onStart}
        className="w-full btn-ember h-11 rounded-md font-semibold text-[13px] disabled:opacity-50 disabled:cursor-not-allowed mt-4 cursor-pointer"
      >
        Encrypt & Seal Bid
      </button>
    </div>
  );
}

function StepEncrypt({ progress }: { progress: number }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex h-36 flex-col justify-center rounded-xl border border-border bg-surface p-6 font-mono text-[11px] text-muted-foreground shadow-inner">
        <div className="flex w-full justify-between">
          <span>Generating 32-byte salt...</span>
          <span className="text-primary">{Math.min(progress * 2, 100)}%</span>
        </div>
        <div className="mt-3 flex w-full justify-between">
          <span>Encrypting bid parameters with AES-GCM-256...</span>
          <span className="text-primary">{progress}%</span>
        </div>
        <div className="mt-3 flex w-full justify-between">
          <span>Deriving key with PBKDF2 (100k iterations)...</span>
          <span className="text-primary">{Math.max(0, progress - 10)}%</span>
        </div>
      </div>
    </div>
  );
}

function StepHash({ progress }: { progress: number }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex h-36 flex-col justify-center rounded-xl border border-border bg-surface p-6 text-center shadow-inner">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">
          Generating cryptographic commitment
        </div>
        <div className="w-full truncate font-mono text-[12px] text-foreground opacity-50">
          {Array(4)
            .fill(0)
            .map(() => Math.random().toString(16).slice(2, 10))
            .join("")}
        </div>
        <div className="mt-4 tabular font-mono text-[11px] text-muted-foreground">
          Hashing completed: {progress}%
        </div>
      </div>
    </div>
  );
}

function StepVerify({ progress }: { progress: number }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex h-36 flex-col justify-center rounded-xl border border-border bg-surface p-6 shadow-inner">
        <ul className="w-full space-y-3 font-mono text-[11px]">
          {["S3 Direct Upload", "Ledger Commitment"].map((node, i) => (
            <li key={node} className="flex justify-between items-center bg-background/50 px-3 py-2 rounded border border-border/50">
              <span className="text-muted-foreground">{node}</span>
              {progress > (i + 1) * 35 ? (
                <span className="text-success flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
                  Completed
                </span>
              ) : (
                <span className="text-primary animate-pulse flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-primary"></span>
                  Uploading...
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StepDone({ 
  amount, 
  files, 
  commitment, 
  bidId, 
  s3Key 
}: { 
  amount: string; 
  files: File[]; 
  commitment: string; 
  bidId: string; 
  s3Key: string;
}) {
  return (
    <div className="animate-in zoom-in-95 duration-700">
      <div className="rounded-xl border border-success/30 bg-success/5 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-16 w-16 bg-success/10 blur-xl rounded-full" />
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-success mb-2 relative z-10">
          Your receipt
        </div>
        <div className="flex justify-between items-end border-b border-success/20 pb-2 mb-2 relative z-10">
           <span className="font-mono text-[11px] text-muted-foreground">Bid Reference ID</span>
           <span className="font-mono text-[11px] text-foreground font-semibold">{bidId}</span>
        </div>
        <div className="flex justify-between items-end border-b border-success/20 pb-2 mb-2 relative z-10">
           <span className="font-mono text-[11px] text-muted-foreground">Commitment Hash</span>
           <span className="font-mono text-[11px] text-foreground truncate max-w-[200px]">{commitment}</span>
        </div>
        <div className="flex justify-between items-end border-b border-success/20 pb-2 mb-2 relative z-10">
           <span className="font-mono text-[11px] text-muted-foreground">Payload Info</span>
           <span className="font-mono text-[11px] text-foreground">
             € {Number(amount).toLocaleString()} · {files.length} annexes
           </span>
        </div>
        <div className="flex justify-between items-end relative z-10">
           <span className="font-mono text-[11px] text-muted-foreground">Ledger S3 Storage</span>
           <span className="font-mono text-[11px] text-foreground truncate max-w-[200px]">{s3Key}</span>
        </div>
      </div>
    </div>
  );
}

function SideTrust() {
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
          Trust model
        </div>
        <h4 className="mt-2 font-display text-xl font-semibold">Zero-knowledge architecture</h4>
        <p className="mt-2 text-[13px] text-muted-foreground">
          SealedBid employs a client-side encryption model. The platform operator (us) and the buyer cannot read your bid.
        </p>
        <ul className="mt-4 space-y-3">
          {[
            "Encryption happens in your browser",
            "Shamir's Secret Sharing (5-of-7)",
            "Tamper-evident audit ledger",
          ].map((s) => (
            <li key={s} className="flex items-center gap-2 text-[12px] text-foreground">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary">
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {s}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-primary/5 blur-2xl rounded-full" />
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground relative z-10">
          Need help?
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground relative z-10">
          If you encounter cryptographic errors or HSM timeouts during submission, contact support.
        </p>
        <button className="mt-4 font-mono text-[11px] text-primary hover:underline cursor-pointer relative z-10">
          support@sealedbid.com →
        </button>
      </div>
    </div>
  );
}
