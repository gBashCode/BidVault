import { Link, useRouter } from "@tanstack/react-router";
import { VaultMark } from "./vault-mark";
import { useUser, logoutAction } from "@/lib/auth";
import { LogOut } from "lucide-react";

const nav = [
  { to: "/", label: "Platform" },
  { to: "/dashboard", label: "Enterprise" },
  { to: "/vendor", label: "Vendor portal" },
  { to: "/audit", label: "Audit" },
];

export function SiteHeader() {
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <VaultMark className="h-8 w-8 text-primary" />
          <div className="leading-none">
            <div className="font-display text-[17px] font-semibold tracking-tight">BidVault</div>
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
          {user ? (
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-foreground">
                Welcome, {user.email?.split('@')[0] || 'User'}
              </div>
              <button 
                onClick={handleLogout}
                className="hidden h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="hidden h-9 rounded-md border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted md:inline-flex md:items-center"
            >
              Sign in
            </Link>
          )}
          {!user && (
            <Link to="/auth" className="btn-ember inline-flex h-9 items-center rounded-md px-4 text-sm font-semibold">
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
