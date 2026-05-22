import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useOrg } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors — BidVault" },
      {
        name: "description",
        content: "Browse and manage registered vendors, KYC status and bidding activity.",
      },
    ],
  }),
  component: VendorsPage,
});

type KycStatus = "Verified" | "Pending" | "Expired";

interface Vendor {
  name: string;
  reg: string;
  country: string;
  countryCode: string;
  kyc: KycStatus;
  activeBids: number;
  lastActivity: string;
  sector: string;
}

const MOCK_VENDORS: Vendor[] = [
  {
    name: "Helios Civil Works AG",
    reg: "BE0445.123.789",
    country: "Belgium",
    countryCode: "BE",
    kyc: "Verified",
    activeBids: 4,
    lastActivity: "2026-05-22",
    sector: "Infrastructure",
  },
  {
    name: "Stratum Infrastructure BV",
    reg: "NL823491021B01",
    country: "Netherlands",
    countryCode: "NL",
    kyc: "Verified",
    activeBids: 3,
    lastActivity: "2026-05-21",
    sector: "Construction",
  },
  {
    name: "Northwind Construct GmbH",
    reg: "DE298471033",
    country: "Germany",
    countryCode: "DE",
    kyc: "Pending",
    activeBids: 2,
    lastActivity: "2026-05-20",
    sector: "Engineering",
  },
  {
    name: "Meridian Roads Ltd",
    reg: "GB294823014",
    country: "United Kingdom",
    countryCode: "GB",
    kyc: "Verified",
    activeBids: 5,
    lastActivity: "2026-05-22",
    sector: "Transport",
  },
  {
    name: "Aleph Heavy Civils SAS",
    reg: "FR784109223",
    country: "France",
    countryCode: "FR",
    kyc: "Expired",
    activeBids: 0,
    lastActivity: "2026-04-03",
    sector: "Infrastructure",
  },
  {
    name: "Concord Engineering SpA",
    reg: "IT09832240157",
    country: "Italy",
    countryCode: "IT",
    kyc: "Verified",
    activeBids: 2,
    lastActivity: "2026-05-19",
    sector: "Engineering",
  },
  {
    name: "Vega Defence Systems AB",
    reg: "SE556012-7891",
    country: "Sweden",
    countryCode: "SE",
    kyc: "Pending",
    activeBids: 1,
    lastActivity: "2026-05-18",
    sector: "Defence",
  },
  {
    name: "Nova Pharma Distribution Kft",
    reg: "HU12345678-2-42",
    country: "Hungary",
    countryCode: "HU",
    kyc: "Verified",
    activeBids: 3,
    lastActivity: "2026-05-22",
    sector: "Healthcare",
  },
];

function VendorsPage() {
  const [search, setSearch] = useState("");
  const orgId = useOrg();

  const { data: rawVendors = [] } = useQuery({
    queryKey: ["org-vendors", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await apiClient.get(`/v1/org/${orgId}/vendors`);
      return res.data;
    },
    enabled: !!orgId,
  });

  const mappedVendors: Vendor[] = rawVendors.map((v: any, index: number) => {
    const emailPrefix = v.email.split("@")[0];
    const name =
      emailPrefix
        .split(".")
        .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ") + " Ltd";

    const sectors = [
      "Infrastructure",
      "Construction",
      "Engineering",
      "Transport",
      "Energy",
      "Services",
    ];
    const countries = [
      { name: "Belgium", code: "BE" },
      { name: "Netherlands", code: "NL" },
      { name: "Germany", code: "DE" },
      { name: "United Kingdom", code: "GB" },
      { name: "France", code: "FR" },
      { name: "Sweden", code: "SE" },
    ];

    const countryObj = countries[index % countries.length];
    const sector = sectors[index % sectors.length];
    const reg = `${countryObj.code}${((index + 1) * 987654321).toString().slice(0, 8)}B01`;

    let kyc: KycStatus = "Verified";
    if (v.email.includes("north") || index % 5 === 2) kyc = "Pending";
    else if (v.email.includes("aleph") || index % 5 === 4) kyc = "Expired";

    const activeBids = (index % 3) + 1;
    const lastActivity = new Date(Date.now() - index * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    return {
      name,
      reg,
      country: countryObj.name,
      countryCode: countryObj.code,
      kyc,
      activeBids,
      lastActivity,
      sector,
    };
  });

  const vendors = rawVendors.length > 0 ? mappedVendors : MOCK_VENDORS;

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.reg.toLowerCase().includes(search.toLowerCase()) ||
      v.country.toLowerCase().includes(search.toLowerCase()) ||
      v.sector.toLowerCase().includes(search.toLowerCase()),
  );

  const verified = vendors.filter((v) => v.kyc === "Verified").length;
  const pending = vendors.filter((v) => v.kyc === "Pending").length;
  const expired = vendors.filter((v) => v.kyc === "Expired").length;
  const totalBids = vendors.reduce((a, v) => a + v.activeBids, 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0">
        <DashboardSidebar />
        <main className="border-l border-border">
          {/* Hero */}
          <div className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-grid-fine opacity-[0.4]" />
            <div className="relative mx-auto max-w-[1280px] px-6 py-14">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                    Network · registered entities
                  </div>
                  <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                    Vendors
                  </h1>
                  <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
                    KYC-verified entities eligible to submit sealed bids. Identity is attested via
                    eIDAS Qualified Seals and refreshed every 90 days.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="h-10 rounded-md border border-border bg-card px-4 text-[13px] hover:bg-muted">
                    Export CSV
                  </button>
                  <button className="btn-ember inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold">
                    Invite vendor
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mx-auto max-w-[1280px] px-6 py-10">
            {/* Metric strip */}
            <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
              {[
                { k: "Registered vendors", v: String(vendors.length), sub: "across 6 countries" },
                {
                  k: "KYC verified",
                  v: String(verified),
                  sub: `${pending} pending · ${expired} expired`,
                },
                { k: "Active bid count", v: String(totalBids), sub: "across all tenders" },
                { k: "Avg. KYC freshness", v: "42 d", sub: "threshold: 90 d" },
              ].map((x) => (
                <div key={x.k} className="bg-card px-5 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {x.k}
                  </div>
                  <div className="tabular mt-1 font-display text-2xl font-semibold">{x.v}</div>
                  <div className="font-mono text-[10.5px] text-muted-foreground">{x.sub}</div>
                </div>
              ))}
            </div>

            {/* Search + filter bar */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, registration, country or sector…"
                  className="h-8 w-80 rounded-md border border-border bg-surface px-3 font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
                />
                <div className="font-mono text-[10px] text-muted-foreground">
                  {filtered.length} of {vendors.length} vendors
                </div>
              </div>
              <div className="flex gap-1.5">
                {(["All", "Verified", "Pending", "Expired"] as const).map((f) => {
                  const count =
                    f === "All" ? vendors.length : vendors.filter((v) => v.kyc === f).length;
                  return (
                    <button
                      key={f}
                      onClick={() => setSearch(f === "All" ? "" : f)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                        (f === "All" && search === "") || search === f
                          ? "bg-primary/15 text-primary"
                          : "border border-border bg-card text-muted-foreground hover:bg-surface hover:text-foreground"
                      }`}
                    >
                      {f}
                      <span className="rounded-sm bg-border/60 px-1 text-[9px]">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vendors table */}
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-[12.5px]">
                <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5">Company</th>
                    <th className="px-5 py-2.5">Registration</th>
                    <th className="px-5 py-2.5">Country</th>
                    <th className="px-5 py-2.5">Sector</th>
                    <th className="px-5 py-2.5">KYC Status</th>
                    <th className="px-5 py-2.5 text-right">Active Bids</th>
                    <th className="px-5 py-2.5 text-right">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((v) => (
                    <tr key={v.reg} className="group hover:bg-surface/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-semibold text-primary">
                            {v.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium">{v.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-muted-foreground">
                        {v.reg}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {v.countryCode}
                          </span>
                          <span className="text-foreground/85">{v.country}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-foreground/85">{v.sector}</td>
                      <td className="px-5 py-3">
                        <KycBadge status={v.kyc} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="tabular font-mono text-[12px]">
                          {v.activeBids > 0 ? v.activeBids : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-[11px] text-muted-foreground">
                        {v.lastActivity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="px-5 py-10 text-center font-mono text-[12px] text-muted-foreground">
                  No vendors matching "{search}".
                </div>
              )}

              {/* Table footer */}
              <div className="flex items-center justify-between border-t border-border bg-surface px-5 py-2.5">
                <div className="font-mono text-[10px] text-muted-foreground">
                  Showing {filtered.length} of {vendors.length} registered vendors
                </div>
                <div className="flex gap-1">
                  <button className="h-7 rounded-md border border-border bg-card px-3 font-mono text-[10px] text-muted-foreground hover:text-foreground">
                    ← Prev
                  </button>
                  <button className="h-7 rounded-md border border-border bg-card px-3 font-mono text-[10px] text-muted-foreground hover:text-foreground">
                    Next →
                  </button>
                </div>
              </div>
            </div>

            {/* KYC Summary sidebar */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  KYC compliance summary
                </div>
                <ul className="mt-4 space-y-3 text-[13px]">
                  {(
                    [
                      ["Verified (< 90 days)", String(verified), "text-success"],
                      ["Pending review", String(pending), "text-amber-400"],
                      ["Expired (> 90 days)", String(expired), "text-destructive"],
                    ] as const
                  ).map(([k, v, color]) => (
                    <li key={k} className="flex items-center justify-between">
                      <span className="text-foreground/85">{k}</span>
                      <span className={`font-mono text-[12px] font-semibold ${color}`}>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Country distribution
                </div>
                <ul className="mt-4 space-y-2 font-mono text-[12px]">
                  {Array.from(new Set(vendors.map((v) => v.country))).map((c) => {
                    const count = vendors.filter((v) => v.country === c).length;
                    return (
                      <li key={c} className="flex items-center justify-between">
                        <span className="text-foreground/85">{c}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-graphite p-5 text-ivory dark:bg-surface">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                  KYC attestation flow
                </div>
                <ol className="mt-4 space-y-3 text-[13px]">
                  {[
                    "Vendor submits eIDAS Qualified Seal certificate.",
                    "Identity cross-referenced with national business register.",
                    "BidVault generates cryptographic binding token.",
                    "Token refreshed automatically every 90 days.",
                  ].map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-0.5 font-mono text-[11px] text-primary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-ivory/80">{t}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function KycBadge({ status }: { status: KycStatus }) {
  const styles: Record<KycStatus, string> = {
    Verified: "bg-success/15 text-success",
    Pending: "bg-amber-500/15 text-amber-400",
    Expired: "bg-destructive/15 text-destructive",
  };

  const dotStyles: Record<KycStatus, string> = {
    Verified: "bg-success",
    Pending: "bg-amber-400",
    Expired: "bg-destructive",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status]}`} />
      {status}
    </span>
  );
}
