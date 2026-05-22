import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useCountdown } from "@/components/countdown";

export const Route = createFileRoute("/vendor")({
  head: () => ({
    meta: [
      { title: "Vendor portal — SealedBid" },
      { name: "description", content: "Submit a cryptographically sealed bid with verifiable hashing and HSM custody." },
    ],
  }),
  component: VendorPortal,
});

const target = new Date(Date.now() + 1000 * 60 * 60 * 18 + 1000 * 42);

function VendorPortal() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="glow-orb absolute top-20 right-10 h-[600px] w-[600px] bg-primary/10 animate-pulse" style={{ animationDuration: "15s" }} />
      <div className="glow-orb absolute bottom-20 left-20 h-[450px] w-[450px] bg-amber-deep/10" />

      <SiteHeader />
      <div className="relative z-10">
        <div className="absolute inset-0 bg-radial-ember opacity-30" />
        <div className="absolute inset-0 bg-grid-fine opacity-[0.25]" />
        <div className="relative mx-auto max-w-[1180px] px-6 py-12">
          <Header />
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <SubmissionFlow />
            <SideTrust />
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const { d, h, m, s } = useCountdown(target);
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Vendor portal · Helios Civil Works AG
        </div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Submit your sealed bid
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
          GOV-2026-ROAD-INFRA-014 · Federal Highway Reconstruction Phase II
        </p>
      </div>
      <div className="glass-card rounded-lg px-4 py-3 shadow-md hover:translate-y-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Deadline in
          </div>
          <div className="tabular mt-1 font-display text-xl font-semibold text-primary">
            {String(d).padStart(2, "0")}:{String(h).padStart(2, "0")}:
            {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </div>
        </div>
    </div>
  );
}

const steps = ["Upload", "Encrypt", "Hash", "Verify", "Sealed"];

function SubmissionFlow() {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (step >= 4) return;
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
    if (progress === 100 && step < 4) {
      const t = setTimeout(() => {
        setStep((s) => s + 1);
        setProgress(0);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [progress, step]);

  return (
    <div className="glass-card relative rounded-2xl p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {steps.map((s, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li key={s} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] ${
                  done
                    ? "bg-success text-background"
                    : active
                      ? "bg-primary text-primary-foreground ring-orange-glow"
                      : "border border-border text-muted-foreground"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <div className="flex flex-col">
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
                    active ? "text-primary" : done ? "text-success" : "text-muted-foreground"
                  }`}
                >
                  {s}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="ml-1 h-px flex-1 bg-border" />
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 rounded-xl border border-border/50 bg-surface/50 p-6">
        {step === 0 && (
          <FilePicker
            onChoose={() => {
              setStep(1);
              setProgress(0);
            }}
          />
        )}
        {step === 1 && (
          <Progress
            title="Encrypting submission"
            sub="AES-256-GCM · per-tender key · client-side"
            value={progress}
            tone="primary"
          />
        )}
        {step === 2 && (
          <Progress
            title="Generating commitment hash"
            sub="SHA-256 with salted nonce · written to Merkle tree"
            value={progress}
            tone="primary"
          />
        )}
        {step === 3 && (
          <Progress
            title="HSM attestation"
            sub="Custody zu-3 acknowledging envelope receipt"
            value={progress}
            tone="primary"
          />
        )}
        {step === 4 && <SealedResult onReset={() => { setStep(0); setProgress(0); }} />}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 font-mono text-[11px]">
        {[
          ["Envelope", "32.4 MB"],
          ["Cipher", "AES-256-GCM"],
          ["Custody", "HSM zu-3 / sg-1"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-border bg-surface px-3 py-2">
            <div className="text-muted-foreground">{k}</div>
            <div className="text-foreground">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilePicker({ onChoose }: { onChoose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/40 p-10 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Step 1 · Upload documents
      </div>
      <h3 className="mt-3 font-display text-2xl font-semibold">
        Drop your tender package
      </h3>
      <p className="mt-2 max-w-md text-[13px] text-muted-foreground">
        Encryption happens on your device. SealedBid never sees your bid in cleartext.
      </p>
      <button
        onClick={onChoose}
        className="btn-ember mt-6 inline-flex h-11 items-center rounded-md px-5 text-[13px] font-semibold"
      >
        Choose files & seal
      </button>
      <div className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
        PDF · DOCX · XLSX up to 200 MB
      </div>
    </div>
  );
}

function Progress({
  title,
  sub,
  value,
}: {
  title: string;
  sub: string;
  value: number;
  tone?: "primary";
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {sub}
          </p>
        </div>
        <span className="tabular font-mono text-2xl font-semibold text-primary">
          {String(value).padStart(3, "0")}%
        </span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-deep via-primary to-ember transition-[width] duration-100"
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="mt-5 grid gap-1 font-mono text-[11px] text-muted-foreground">
        {generateLog(title, value).map((l) => (
          <div key={l} className="animate-hash">{l}</div>
        ))}
      </div>
    </div>
  );
}

function generateLog(title: string, v: number) {
  const base = [
    "→ negotiating keypair (Curve25519)",
    "→ deriving envelope nonce",
    "→ sealing block 0001 / 0042",
    "→ writing commit to Merkle tree",
    "→ awaiting HSM acknowledgement",
  ];
  const n = Math.min(base.length, 1 + Math.floor(v / 20));
  return base.slice(0, n).map((l) => `${l} ${title.toLowerCase().includes("hash") ? "✓" : ""}`);
}

function SealedResult({ onReset }: { onReset: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 ring-orange-glow">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-primary">
          <path
            d="M5 12.5l4.2 4.2L19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3 className="mt-5 font-display text-2xl font-semibold">Bid sealed.</h3>
      <p className="mt-2 max-w-md mx-auto text-[13px] text-muted-foreground">
        Your submission is encrypted, hashed and held in HSM custody until the reveal deadline.
        Nobody — including SealedBid operators — can read it before then.
      </p>
      <div className="mx-auto mt-6 max-w-md rounded-lg border border-border bg-background/60 p-4 text-left">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Commitment hash
        </div>
        <div className="mt-1 font-mono text-[12px] text-foreground">
          0x8f3e9a21bc4d7e10ff019cba0e72ef41
        </div>
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Merkle root
        </div>
        <div className="mt-1 font-mono text-[12px] text-foreground">
          0x9c4e44a91aa2003e771bbcd031a0…
        </div>
      </div>
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={onReset}
          className="h-10 rounded-md border border-border bg-card px-4 text-[13px] hover:bg-muted"
        >
          Submit another
        </button>
        <button className="btn-ember h-10 rounded-md px-5 text-[13px] font-semibold">
          Download receipt
        </button>
      </div>
    </div>
  );
}

function SideTrust() {
  return (
    <aside className="space-y-4">
      <div className="glass-card rounded-2xl p-6 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)]">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Trust indicators
        </div>
        <ul className="mt-4 space-y-3 text-[13px]">
          {[
            ["Client-side AES-256-GCM", "ok"],
            ["Identity signed (eIDAS QSeal)", "ok"],
            ["KYC valid until 2026-11-04", "ok"],
            ["HSM attestation handshake", "ok"],
          ].map(([k, v]) => (
            <li key={k} className="flex items-center justify-between">
              <span className="text-foreground/85">{k}</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                {v}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="glass-card rounded-2xl bg-graphite p-6 text-ivory dark:bg-surface shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)] hover:translate-y-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
          What happens at reveal
        </div>
        <ol className="mt-4 space-y-3 text-[13px]">
          {[
            "Key shares re-assemble across HSMs in a single block.",
            "Your envelope is decrypted at the same instant as every competitor's.",
            "Bid contents are hashed and compared to your committed hash.",
            "Procurement officer and you both receive a signed verification receipt.",
          ].map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 font-mono text-[11px] text-primary">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-ivory/80">{t}</span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}