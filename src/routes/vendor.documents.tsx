import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/vendor/documents")({
  component: VendorDocumentsRoute,
});

function VendorDocumentsRoute() {
  const items = [
    { name: "Technical Specifications Annex A", size: "4.2 MB", type: "PDF" },
    { name: "Pricing Matrix Template", size: "1.1 MB", type: "XLSX" },
    { name: "Legal Terms & Conditions", size: "890 KB", type: "PDF" },
    { name: "Site Survey Data & Maps", size: "14.5 MB", type: "ZIP" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>Vendor Identity</span>
        <span>/</span>
        <span>Requirements</span>
        <span>/</span>
        <span className="text-foreground">Technical Annex</span>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Tender Documents</h1>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            Download the required specifications and templates to formulate your bid.
          </div>
        </div>
        <button className="btn-ember inline-flex h-9 items-center rounded-md px-4 text-[12px] font-semibold cursor-pointer">
          Download All (.zip)
        </button>
      </div>

      <div className="mt-8 glass-card relative rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Files Available (4)
          </div>
        </div>
        <ol className="divide-y divide-border">
          {items.map((it) => (
            <li
              key={it.name}
              className="flex items-center justify-between px-5 py-4 group hover:bg-surface/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-[14px] font-medium text-foreground/90 group-hover:text-primary transition-colors">
                    {it.name}
                  </div>
                  <div className="font-mono text-[10.5px] text-muted-foreground mt-1">
                    {it.size} · {it.type}
                  </div>
                </div>
              </div>
              <button className="rounded px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer">
                Download
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
