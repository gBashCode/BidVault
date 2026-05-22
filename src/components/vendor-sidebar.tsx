import { Link, useRouterState } from "@tanstack/react-router";

const groups = [
  {
    label: "Tender Context",
    items: [
      { l: "Overview", to: "/vendor" },
      { l: "Documents", to: "/vendor/documents", badge: "2 New" },
      { l: "Q&A Forum", to: "/vendor/qa" },
    ],
  },
  {
    label: "Requirements",
    items: [
      { l: "Compliance & KYC", to: "/vendor/compliance" },
      { l: "Technical Annex", to: "/vendor/technical" },
    ],
  },
  {
    label: "Actions",
    items: [
      { l: "Submit Bid", to: "/vendor/submit" },
      { l: "Withdraw Bid", to: "/vendor/withdraw" },
    ],
  },
];

export function VendorSidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto bg-sidebar px-4 py-6">
      <div className="rounded-lg border border-border bg-background/50 p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Vendor Identity
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="text-[13px] font-medium">Helios Civil Works AG</div>
          <span className="font-mono text-[10px] text-success">Verified</span>
        </div>
      </div>
      <nav className="mt-6 space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {g.label}
            </div>
            <div className="mt-2 space-y-0.5">
              {g.items.map((i) => {
                const isActive =
                  i.to === "/vendor" ? currentPath === "/vendor" : currentPath.startsWith(i.to);
                return (
                  <Link
                    key={i.l}
                    to={i.to}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-[13px] transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                    }`}
                  >
                    <span>{i.l}</span>
                    {i.badge && (
                      <span className="rounded-sm bg-primary/15 px-1.5 font-mono text-[10px] text-primary">
                        {i.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
