import { Link } from "@tanstack/react-router";
import { SealMark } from "./seal-mark";

const nav = [
  { to: "/", label: "Platform" },
  { to: "/dashboard", label: "Enterprise" },
  { to: "/vendor", label: "Vendor portal" },
  { to: "/audit", label: "Audit" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <SealMark className="h-7 w-7" />
          <div className="leading-none">
            <div className="font-display text-[17px] font-semibold tracking-tight">SealedBid</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              Procurement · v4.2
            </div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&.active]:text-foreground [&.active]:bg-muted"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button className="hidden h-9 rounded-md border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted md:inline-flex md:items-center">
            Sign in
          </button>
          <button className="btn-ember inline-flex h-9 items-center rounded-md px-4 text-sm font-semibold">
            Request access
          </button>
        </div>
      </div>
    </header>
  );
}