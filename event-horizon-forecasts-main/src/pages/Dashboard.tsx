import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Wallet, Target, Trophy, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { markets, formatNaira } from "@/lib/markets";

const stats = [
  {
    label: "Balance",
    value: "₦52,400",
    change: "+₦4,200 this week",
    up: true,
    icon: Wallet,
    color: "text-primary bg-primary/10",
  },
  {
    label: "Accuracy",
    value: "73%",
    change: "+2% vs last month",
    up: true,
    icon: Target,
    color: "text-success bg-success-soft",
  },
  {
    label: "Rank",
    value: "#142",
    change: "↑ 18 places",
    up: true,
    icon: Trophy,
    color: "text-amber-600 bg-amber-50",
  },
  {
    label: "Active positions",
    value: "8",
    change: "3 closing soon",
    up: null,
    icon: TrendingUp,
    color: "text-foreground bg-muted",
  },
];

const positions = markets.slice(0, 3).map((m, i) => ({
  m,
  side: i % 2 ? "NO" : "YES",
  stake: 5000 + i * 2500,
  pnl: i === 1 ? -800 : 1200 + i * 400,
}));

const past = [
  { q: "Will INEC announce results before midnight?",   side: "YES", outcome: "WON",  payout: 12400 },
  { q: "Will Naira close below ₦1500/$ this week?",     side: "NO",  outcome: "LOST", payout: -3000 },
  { q: "Will Burna Boy headline Coachella 2026?",        side: "YES", outcome: "WON",  payout: 8200  },
];

const Dashboard = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Header />
    <main className="flex-1 container py-10 max-w-5xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Track your balance, positions, and accuracy.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div
            key={s.label}
            className="bg-card rounded-2xl p-5 shadow-card border border-border/50 hover:shadow-elevated transition-smooth"
          >
            <div className={`w-10 h-10 rounded-xl grid place-items-center mb-4 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</div>
            <div className="text-2xl font-extrabold mt-1 tracking-tight">{s.value}</div>
            {s.change && (
              <div className={`flex items-center gap-1 text-xs mt-1.5 font-medium ${
                s.up === true ? "text-success" : s.up === false ? "text-danger" : "text-muted-foreground"
              }`}>
                {s.up === true && <ArrowUpRight className="w-3 h-3" />}
                {s.up === false && <ArrowDownRight className="w-3 h-3" />}
                {s.change}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Positions + History */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active positions */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-base">Active Positions</h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">
              {positions.length} open
            </span>
          </div>
          <ul className="space-y-2">
            {positions.map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-muted/50 transition-smooth cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-secondary grid place-items-center text-lg shrink-0">
                    {p.m.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{p.m.question}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Stake {formatNaira(p.stake)} · {p.m.closesIn} left
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    p.side === "YES" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                  }`}>
                    {p.side}
                  </span>
                  <span className={`text-xs font-semibold ${p.pnl >= 0 ? "text-success" : "text-danger"}`}>
                    {p.pnl >= 0 ? "+" : ""}{formatNaira(Math.abs(p.pnl))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Past results */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-base">Past Results</h2>
            <span className="text-xs text-success bg-success-soft px-2.5 py-1 rounded-full font-semibold">
              2 won · 1 lost
            </span>
          </div>
          <ul className="space-y-2">
            {past.map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-muted/50 transition-smooth cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{p.q}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Took {p.side}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                    p.outcome === "WON" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                  }`}>
                    {p.outcome}
                  </div>
                  <div className={`text-sm font-extrabold mt-1 ${p.payout > 0 ? "text-success" : "text-danger"}`}>
                    {p.payout > 0 ? "+" : ""}{formatNaira(Math.abs(p.payout))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default Dashboard;
