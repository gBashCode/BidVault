import { SealMark } from "./seal-mark";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <SealMark className="h-7 w-7" />
            <span className="font-display text-lg font-semibold">SealedBid</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Cryptographic procurement infrastructure for enterprises and public institutions
            that require provable fairness.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            All cryptographic services operational
          </div>
        </div>
        {[
          { title: "Platform", links: ["Encrypted bids", "Reveal engine", "Audit ledger", "Vendor portal"] },
          { title: "Compliance", links: ["AES-256 / FIPS 140-3", "SOC 2 Type II", "ISO 27001", "GDPR · DPA"] },
          { title: "Company", links: ["Whitepaper", "Security", "Customers", "Contact"] },
        ].map((col) => (
          <div key={col.title}>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {col.title}
            </div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l}>
                  <a className="text-foreground/80 transition-colors hover:text-primary" href="#">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-2 px-6 py-5 text-xs text-muted-foreground md:flex-row md:items-center">
          <div className="font-mono uppercase tracking-[0.18em]">
            © 2026 SealedBid Systems · Zurich / Singapore
          </div>
          <div className="font-mono uppercase tracking-[0.18em]">
            Build 4.2.184 · sha 0xA7F1·92BE·44C0
          </div>
        </div>
      </div>
    </footer>
  );
}