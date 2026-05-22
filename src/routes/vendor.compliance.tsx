import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/vendor/compliance")({
  component: VendorComplianceRoute,
});

function VendorComplianceRoute() {
  const items = [
    { k: "Company Registration", v: "Verified BE0445.123.789" },
    { k: "Tax Clearance Certificate", v: "Valid until 2026-12-31" },
    { k: "EU Procurement Eligibility", v: "Approved" },
    { k: "NDA Signed", v: "2026-04-19" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>Vendor Identity</span>
        <span>/</span>
        <span>Requirements</span>
        <span>/</span>
        <span className="text-foreground">Compliance</span>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Compliance & KYC</h1>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            Helios Civil Works AG · Status: Verified
          </div>
        </div>
      </div>

      <div className="mt-8 glass-card relative rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
        <div className="border-b border-border/70 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Requirement Checklist
        </div>
        <ul className="divide-y divide-border text-[13px]">
          {items.map((i) => (
            <li key={i.k} className="flex items-center justify-between px-5 py-4">
              <span className="text-foreground/90 font-medium">{i.k}</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-success bg-success/10 px-2 py-1 rounded-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {i.v}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
