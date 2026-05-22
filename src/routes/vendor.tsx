import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { VendorSidebar } from "@/components/vendor-sidebar";
import axios from "axios";

export const Route = createFileRoute("/vendor")({
  head: () => ({
    meta: [
      { title: "Vendor portal — SealedBid" },
      { name: "description", content: "Submit a cryptographically sealed bid with verifiable hashing and HSM custody." },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window !== "undefined") {
      try {
        const res = await axios.get("/api/auth/me");
        if (!res.data || res.data.role !== "VENDOR") {
          throw redirect({
            to: "/login" as any,
            search: {
              redirect: location.href,
            } as any,
          });
        }
      } catch {
        throw redirect({
          to: "/login" as any,
          search: {
            redirect: location.href,
          } as any,
        });
      }
    }
  },
  component: VendorLayout,
});

function VendorLayout() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="glow-orb absolute top-20 right-10 h-[600px] w-[600px] bg-primary/10 animate-pulse" style={{ animationDuration: "15s" }} />
      <div className="glow-orb absolute bottom-20 left-1/3 h-[500px] w-[500px] bg-amber-deep/10" />

      <SiteHeader />
      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0 relative z-10">
        <VendorSidebar />
        <main className="border-l border-border bg-grid-fine/30 px-8 py-8 relative min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}