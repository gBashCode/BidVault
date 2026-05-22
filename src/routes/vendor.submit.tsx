import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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

  // Only auto-progress if step >= 1 and step < 4
  useEffect(() => {
    if (step === 0 || step >= 4) return;
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(id);
          return 100;
        }
        return p + 2;
      });
    }, 60);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (progress === 100 && step >= 1 && step < 4) {
      const t = setTimeout(() => {
        setStep((s) => s + 1);
        setProgress(0);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [progress, step]);

  const handleStartSubmit = () => {
    if (files.length > 0 && amount) {
      setStep(1);
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
        {step === 1 && <StepEncrypt progress={progress} />}
        {step === 2 && <StepHash progress={progress} />}
        {step === 3 && <StepVerify progress={progress} />}
        {step === 4 && <StepDone amount={amount} files={files} />}
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
        className="w-full btn-ember h-11 rounded-md font-semibold text-[13px] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
      >
        Encrypt & Seal Bid
      </button>
    </div>
  );
}

function StepEncrypt({ progress }: { progress: number }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="font-display text-2xl font-semibold">2. Local encryption in progress</h3>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Applying AES-256-GCM locally. The decryption key is being split via Shamir's Secret Sharing.
      </p>
      <div className="mt-6 flex h-40 flex-col items-center justify-center rounded-xl border border-border bg-surface p-6 font-mono text-[11px] text-muted-foreground shadow-inner">
        <div className="flex w-full justify-between">
          <span>Generating salt...</span>
          <span className="text-primary">{Math.min(progress * 2, 100)}%</span>
        </div>
        <div className="mt-3 flex w-full justify-between">
          <span>Encrypting chunks...</span>
          <span className="text-primary">{progress}%</span>
        </div>
        <div className="mt-3 flex w-full justify-between">
          <span>Splitting key (5-of-7)...</span>
          <span className="text-primary">{Math.max(0, progress - 20)}%</span>
        </div>
      </div>
    </div>
  );
}

function StepHash({ progress }: { progress: number }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="font-display text-2xl font-semibold">3. Cryptographic commitment</h3>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Calculating SHA-256 hash of the encrypted envelope to seal your submission.
      </p>
      <div className="mt-6 flex h-40 flex-col items-center justify-center rounded-xl border border-border bg-surface p-6 text-center shadow-inner">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">
          Streaming hash
        </div>
        <div className="w-full truncate font-mono text-[12px] text-foreground opacity-50">
          {Array(4)
            .fill(0)
            .map(() => Math.random().toString(16).slice(2, 10))
            .join("")}
        </div>
        <div className="mt-4 tabular font-mono text-[11px] text-muted-foreground">
          Processed: {(progress * 0.32).toFixed(1)} MB / 32.0 MB
        </div>
      </div>
    </div>
  );
}

function StepVerify({ progress }: { progress: number }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="font-display text-2xl font-semibold">4. HSM key distribution</h3>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Distributing key shares to the custody network and registering the hash on the ledger.
      </p>
      <div className="mt-6 flex h-40 flex-col items-center justify-center rounded-xl border border-border bg-surface p-6 shadow-inner">
        <ul className="w-full space-y-3 font-mono text-[11px]">
          {["HSM-ZU-1", "HSM-SG-2", "HSM-FR-1"].map((node, i) => (
            <li key={node} className="flex justify-between items-center bg-background/50 px-3 py-2 rounded border border-border/50">
              <span className="text-muted-foreground">{node}</span>
              {progress > i * 30 ? (
                <span className="text-success flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
                  Ack
                </span>
              ) : (
                <span className="text-primary animate-pulse flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-primary"></span>
                  Wait
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StepDone({ amount, files }: { amount: string, files: File[] }) {
  return (
    <div className="animate-in zoom-in-95 duration-700">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/20 shadow-[0_0_40px_rgba(0,255,100,0.3)] mx-auto">
        <svg className="h-10 w-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="mt-6 text-center font-display text-3xl font-semibold text-foreground">
        Bid cryptographically sealed
      </h3>
      <p className="mt-3 text-center text-[14px] text-muted-foreground">
        Your submission is mathematically locked. It cannot be opened by anyone, including the buyer, until the deadline passes and 5-of-7 HSMs release their keys.
      </p>
      <div className="mt-8 rounded-xl border border-success/30 bg-success/5 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-16 w-16 bg-success/10 blur-xl rounded-full" />
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-success mb-2 relative z-10">
          Your receipt
        </div>
        <div className="flex justify-between items-end border-b border-success/20 pb-2 mb-2 relative z-10">
           <span className="font-mono text-[11px] text-muted-foreground">Commitment Hash</span>
           <span className="font-mono text-[11px] text-foreground">0x8f3e9a21bc4d7e10ff01...</span>
        </div>
        <div className="flex justify-between items-end border-b border-success/20 pb-2 mb-2 relative z-10">
           <span className="font-mono text-[11px] text-muted-foreground">Encrypted Payload</span>
           <span className="font-mono text-[11px] text-foreground">
             € {Number(amount).toLocaleString()} · {files.length} annexes
           </span>
        </div>
        <div className="flex justify-between items-end relative z-10">
           <span className="font-mono text-[11px] text-muted-foreground">Time Anchor</span>
           <span className="font-mono text-[11px] text-foreground">Block #2,184,991</span>
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
