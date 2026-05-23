import { useEffect, useState } from "react";
import { getGlobalTime } from "@/lib/time";

export function useCountdown(target: Date) {
  const [now, setNow] = useState(() => getGlobalTime());
  
  useEffect(() => {
    const id = setInterval(() => setNow(getGlobalTime()), 500); // 500ms for tighter sync
    return () => clearInterval(id);
  }, []);
  
  const diff = Math.max(0, target.getTime() - now);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff / 3_600_000) % 24);
  const m = Math.floor((diff / 60_000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  
  return { d, h, m, s, done: diff === 0, totalMs: diff };
}

export function Countdown({ target, compact = false }: { target: Date; compact?: boolean }) {
  const { d, h, m, s } = useCountdown(target);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const items = [
    { v: pad(d), l: "days" },
    { v: pad(h), l: "hours" },
    { v: pad(m), l: "min" },
    { v: pad(s), l: "sec" },
  ];
  return (
    <div className={`flex items-end ${compact ? "gap-3" : "gap-5 md:gap-8"}`}>
      {items.map((it, i) => (
        <div key={it.l} className="flex items-end gap-3 md:gap-5">
          <div className="flex flex-col items-start">
            <span
              className={`tabular font-display font-semibold leading-none text-foreground ${
                compact ? "text-3xl" : "text-5xl md:text-7xl"
              }`}
            >
              {it.v}
            </span>
            <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {it.l}
            </span>
          </div>
          {i < items.length - 1 && (
            <span
              className={`font-display font-light text-muted-foreground/40 ${
                compact ? "text-3xl" : "text-5xl md:text-7xl"
              }`}
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function CircularCountdown({
  target,
  size = 220,
  total = 1000 * 60 * 60 * 24 * 3,
}: {
  target: Date;
  size?: number;
  total?: number;
}) {
  const { d, h, m, s, totalMs } = useCountdown(target);
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const progress = Math.min(1, Math.max(0, 1 - totalMs / total));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={2}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.76 0.18 58)" />
            <stop offset="100%" stopColor="oklch(0.6 0.2 40)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Reveal in
        </div>
        <div className="tabular mt-1 font-display text-3xl font-semibold">
          {String(d).padStart(2, "0")}:{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:
          {String(s).padStart(2, "0")}
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
          <span className="h-1.5 w-1.5 animate-seal-pulse rounded-full bg-primary" />
          Mathematically sealed
        </div>
      </div>
    </div>
  );
}
