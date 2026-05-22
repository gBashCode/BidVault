import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/vendor/technical")({
  component: VendorTechnicalRoute,
});

function VendorTechnicalRoute() {
  const requirements = [
    {
      id: "REQ-01",
      title: "Asphalt Composition",
      description: "Polymer-modified bitumen (PMB) matching EN 14023 standards.",
      status: "Acknowledged",
    },
    {
      id: "REQ-02",
      title: "Load Bearing Capacity",
      description: "Minimum of 45 MPa unconfined compressive strength.",
      status: "Acknowledged",
    },
    {
      id: "REQ-03",
      title: "Drainage Gradient",
      description: "Minimum 2% cross-fall across all main carriageways.",
      status: "Pending Review",
    },
    {
      id: "REQ-04",
      title: "Environmental Offset",
      description: "CO2 emission tracking per ton of material laid.",
      status: "Pending Review",
    },
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
          <h1 className="font-display text-3xl font-semibold tracking-tight">Technical Annex</h1>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            Specific engineering and environmental parameters for GOV-2026-ROAD-INFRA-014.
          </div>
        </div>
      </div>

      <div className="mt-8 glass-card relative rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:translate-y-0">
        <div className="border-b border-border/70 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Engineering Requirements Checklist
        </div>
        <div className="p-2">
          <table className="w-full text-[13px]">
            <thead className="text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Ref ID</th>
                <th className="px-4 py-3 font-medium">Requirement Focus</th>
                <th className="px-4 py-3 font-medium">Specification Details</th>
                <th className="px-4 py-3 font-medium text-right">Vendor Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {requirements.map((req) => (
                <tr key={req.id} className="hover:bg-surface/40 transition-colors">
                  <td className="px-4 py-4 font-mono text-[11px] text-primary whitespace-nowrap">
                    {req.id}
                  </td>
                  <td className="px-4 py-4 font-medium text-foreground">{req.title}</td>
                  <td className="px-4 py-4 text-muted-foreground text-[12.5px]">
                    {req.description}
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <span
                      className={`inline-flex items-center font-mono text-[10px] uppercase tracking-[0.1em] px-2 py-1 rounded-sm ${
                        req.status === "Acknowledged"
                          ? "bg-success/10 text-success"
                          : "bg-surface border border-border text-muted-foreground"
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
