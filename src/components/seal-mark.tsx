export function SealMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="sealGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.76 0.18 58)" />
          <stop offset="55%" stopColor="oklch(0.66 0.18 45)" />
          <stop offset="100%" stopColor="oklch(0.5 0.18 40)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="7" fill="url(#sealGrad)" />
      <path
        d="M10 16.5l3.8 3.8L22.5 11.6"
        fill="none"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <circle cx="16" cy="16" r="13" fill="none" stroke="white" strokeOpacity="0.18" />
    </svg>
  );
}