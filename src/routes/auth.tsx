import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { signupAction, loginAction } from "@/lib/auth";
import { VaultMark } from "@/components/vault-mark";
import { ShieldCheck, User, Building2, Mail, KeyRound, Loader2, ChevronRight, Lock, CreditCard, MapPin, Phone, Globe, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"role" | "payment" | "form">("role");
  const [role, setRole] = useState<"VENDOR" | "PROCUREMENT_MANAGER" | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (selectedRole: "VENDOR" | "PROCUREMENT_MANAGER") => {
    setRole(selectedRole);
    if (selectedRole === "PROCUREMENT_MANAGER") {
      setView("payment");
    } else {
      setView("form");
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate payment processing
    setTimeout(() => {
      setLoading(false);
      toast.success("Payment Successful", { description: "Enterprise fee processed." });
      setView("form");
    }, 1500);
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const companyName = formData.get("companyName") as string;
    const gstn = formData.get("gstn") as string;
    const address = formData.get("address") as string;
    const phone = formData.get("phone") as string;
    const website = formData.get("website") as string;

    try {
      let res;
      if (authMode === "signup") {
        res = await signupAction({
          data: { email, password, companyName, role: role!, gstn, address, phone, website },
        });
        toast.success("Registration Complete", {
          description: "Your PII has been locally encrypted and stored securely.",
        });
      } else {
        res = await loginAction({
          data: { email, password },
        });
        toast.success("Login Successful", {
          description: "Session established securely.",
        });
      }

      const target = res.user?.role === "VENDOR" ? "/vendor" : "/dashboard";
      navigate({ to: target as any });
    } catch (err: any) {
      toast.error(authMode === "signup" ? "Registration Error" : "Login Error", {
        description: err.message || "Failed to authenticate.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col justify-between overflow-hidden">
      <div className="glow-orb absolute -top-40 -left-40 h-[600px] w-[600px] bg-primary/10" />
      <div className="glow-orb absolute bottom-0 right-0 h-[500px] w-[500px] bg-amber-deep/10" />
      <div className="absolute inset-0 bg-grid opacity-[0.2]" />

      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-border/40 bg-background/50 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2.5">
          <VaultMark className="h-7 w-7 text-primary" />
          <div className="leading-none">
            <div className="font-display text-[17px] font-semibold tracking-tight">BidVault</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              Security Portal
            </div>
          </div>
        </Link>
        <div className="text-sm flex gap-4">
          <button onClick={() => { setView("role"); setRole(null); }} className="text-muted-foreground hover:text-foreground transition-colors">Start Over</button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        
        {view === "role" && (
          <div className="w-full max-w-4xl flex flex-col items-center">
            <h1 className="font-display text-4xl font-bold tracking-tight mb-3 text-center">
              How will you use BidVault?
            </h1>
            <p className="text-muted-foreground text-center mb-12 max-w-lg">
              Select your organization type to proceed. You can act as either a bidder or an enterprise issuing tenders.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
              <button 
                onClick={() => handleRoleSelect("VENDOR")}
                className="text-left bg-surface/40 backdrop-blur-sm border border-border/60 rounded-2xl p-8 hover:bg-surface/80 hover:border-primary shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] group transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-6 shadow-[0_0_20px_rgba(255,107,0,0.1)]">
                    <User className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2 flex items-center justify-between">
                    Bidding Vendor
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    I want to discover and bid on enterprise tenders securely. Free forever for participating vendors.
                  </p>
                </div>
              </button>

              <button 
                onClick={() => handleRoleSelect("PROCUREMENT_MANAGER")}
                className="text-left bg-surface/40 backdrop-blur-sm border border-border/60 rounded-2xl p-8 hover:bg-surface/80 hover:border-amber-500 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] group transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-xl bg-amber-deep/10 border border-amber-deep/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform mb-6 shadow-[0_0_20px_rgba(255,165,0,0.1)]">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2 flex items-center justify-between">
                    Purchasing Enterprise
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    I want to issue tenders and securely collect sealed bids from vendors. Requires a one-time setup fee.
                  </p>
                </div>
              </button>
            </div>
            <div className="mt-12 flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                FIPS-140-3 Threshold Node Attestation
              </span>
            </div>
            
            <div className="mt-8">
              <button
                onClick={() => {
                  setRole(null);
                  setAuthMode("login");
                  setView("form");
                }}
                className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors"
              >
                Already have an account? Sign in securely →
              </button>
            </div>
          </div>
        )}

        {view === "payment" && (
          <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-border/80 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
              <CreditCard className="h-5 w-5 text-amber-500" />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-center">Enterprise Setup Fee</h2>
            <p className="mt-2 text-sm text-muted-foreground text-center mb-8">
              A one-time fee of <strong>$499</strong> is required to provision your dedicated secure envelope cluster.
            </p>

            <form onSubmit={handlePaymentSubmit} className="w-full space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Card Number (Simulated)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input type="text" required defaultValue="4242 4242 4242 4242" className="w-full bg-surface/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Expiry</label>
                  <input type="text" required defaultValue="12/28" className="w-full bg-surface/50 border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">CVC</label>
                  <input type="text" required defaultValue="123" className="w-full bg-surface/50 border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-black py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pay $499 & Continue"}
              </button>
            </form>
          </div>
        )}

        {view === "form" && (
          <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-border/80 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] flex flex-col items-center">
            <div className="flex w-full items-center justify-between mb-8">
              <h2 className="font-display text-2xl font-bold tracking-tight">
                {role === "VENDOR" ? "Vendor Portal" : role === "PROCUREMENT_MANAGER" ? "Enterprise Portal" : "Secure Sign In"}
              </h2>
              {role !== null && (
                <div className="flex bg-surface/50 p-1 rounded-lg border border-border/50">
                  <button 
                    onClick={() => setAuthMode("login")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${authMode === "login" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => setAuthMode("signup")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${authMode === "signup" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleAuth} className="w-full space-y-4">
              {authMode === "signup" && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Company / Org Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        name="companyName" 
                        required 
                        className="w-full bg-surface/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                        placeholder="Acme Corp"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">GSTN / Tax ID</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        name="gstn" 
                        required 
                        className="w-full bg-surface/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                        placeholder="e.g. 22AAAAA0000A1Z5"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Company Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        name="address" 
                        required 
                        className="w-full bg-surface/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                        placeholder="123 Corporate Blvd, City"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input 
                          type="tel" 
                          name="phone" 
                          required 
                          className="w-full bg-surface/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                          placeholder="+1 234 567 8900"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Website</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input 
                          type="url" 
                          name="website" 
                          required 
                          className="w-full bg-surface/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="email" 
                    name="email" 
                    required 
                    className="w-full bg-surface/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    placeholder="admin@sealedbid.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="password" 
                    name="password" 
                    required 
                    minLength={8}
                    className="w-full bg-surface/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-4 ${role === 'VENDOR' ? 'bg-primary hover:bg-primary-hover' : 'bg-amber-600 hover:bg-amber-500'} text-white py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center disabled:opacity-50`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (authMode === "signup" ? "Complete Registration" : "Authenticate")}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/40 w-full flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-success" />
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                Zero-Knowledge Proof Session
              </span>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 w-full py-4 border-t border-border/40 bg-surface/50 text-center font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
        BidVault Technologies Inc. · Secured by Threshold HSM Cryptography
      </footer>
    </div>
  );
}
