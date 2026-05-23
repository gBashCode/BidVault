import { useEffect, useState, useRef } from "react";
import { getGlobalTime } from "@/lib/time";

interface CountdownRingProps {
  targetDate: Date;
  totalDurationMs?: number; // Total timeframe to calculate percentage progress
  size?: number;
  strokeWidth?: number;
  onComplete?: () => void;
  title?: string;
  subtitle?: string;
}

export function CountdownRing({
  targetDate,
  totalDurationMs = 1000 * 60 * 60 * 24 * 3, // Default to 3 days
  size = 220,
  strokeWidth = 3,
  onComplete,
  title = "Reveal in",
  subtitle = "Mathematically sealed",
}: CountdownRingProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const onCompleteRef = useRef(onComplete);
  const timerRef = useRef<number | null>(null);
  const completedCalledRef = useRef<boolean>(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    completedCalledRef.current = false;
    const targetTime = new Date(targetDate).getTime();

    const tick = () => {
      const now = getGlobalTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft(0);
        if (!completedCalledRef.current) {
          completedCalledRef.current = true;
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
        }
        timerRef.current = null;
        return;
      }

      setTimeLeft(diff);
      timerRef.current = requestAnimationFrame(tick);
    };

    timerRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [targetDate]);

  const r = size / 2 - strokeWidth - 5;
  const c = 2 * Math.PI * r;
  const progress = Math.min(1, Math.max(0, 1 - timeLeft / totalDurationMs));
  const strokeDashoffset = c * (1 - progress);

  // Format time
  const d = Math.floor(timeLeft / 86_400_000);
  const h = Math.floor((timeLeft / 3_600_000) % 24);
  const m = Math.floor((timeLeft / 60_000) % 60);
  const s = Math.floor((timeLeft / 1000) % 60);

  const pad = (n: number) => String(n).padStart(2, "0");

  const formattedTime =
    d > 0 ? `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={strokeWidth - 1}
          className="stroke-muted-foreground/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={strokeDashoffset}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.76 0.18 58)" />
            <stop offset="100%" stopColor="oklch(0.6 0.2 40)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        {title && (
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {title}
          </div>
        )}
        <div className="tabular mt-1 font-display text-3xl font-semibold text-foreground">
          {formattedTime}
        </div>
        {subtitle && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
            <span className="h-1.5 w-1.5 animate-seal-pulse rounded-full bg-primary" />
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
