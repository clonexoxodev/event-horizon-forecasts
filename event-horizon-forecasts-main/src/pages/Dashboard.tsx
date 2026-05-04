import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Wallet, Target, Trophy, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { fetchPositions, formatNaira } from "@/lib/markets";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";

type Position = {
  id: string;
  market_id: string;
  side: string;
  stake: number;
  payout: number | null;
  outcome: string | null;
  markets: {
    question: string;
    icon: string;
    closes_in: string;
  } | null;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchPositions(user.id).then(data => {
      setPositions(data as Position[]);
      setLoading(false);
    });
  }, [user]);

  const active = positions.filter(p => !p.outcome);
  const past   = positions.filter(p => !!p.outcome);
  const won    = past.filter(p => p.outcome === "WON").length;
  const accuracy = past.length > 0 ? Math.round((won / past.length) * 100) : 0;

  const stats = [
    {
      label: "Balance",
      value: user ? formatNaira(user.balance) : "—",
      change: "Available to bet",
      up: null,
      icon: Wallet,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Accuracy",
      value: past.length > 0 ? `${accuracy}%` : "—",
      change: `${past.length} resolved`,
      up: accuracy >= 50 ? true : false,
      icon: Target,
      color: "text-success bg-success-soft",
    },
    {
      label: "Active",
      value: String(active.length),
      change: "Open positions",
      up: null,
      icon: TrendingUp,
      color: "text-foreground bg-muted",
    },
    {
      label: "Won",
      value: String(won),
      change: `${past.length - won} lost`,
      up: won > 0 ? true : null,
      icon: Trophy,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-20 text-center">
          <h2 className="text-2xl font-bold mb-3">Sign in to view your dashboard</h2>
          <p className="text-muted-foreground">Track your positions, balance, and accuracy.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Hey, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Track your balance, positions, and accuracy.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-card rounded-2xl p-5 shadow-card border border-border/50 hover:shadow-elevated transition-smooth">
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active positions */}
          <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-base">Active Positions</h2>
              <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">
                {active.length} open
              </span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : active.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">No active positions yet.</p>
                <Link to="/" className="text-sm text-primary font-semibold hover:underline mt-1 inline-block">
                  Browse markets →
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {active.map(p => (
                  <li key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-muted/50 transition-smooth">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-secondary grid place-items-center text-lg shrink-0">
                        {p.markets?.icon ?? "📊"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{p.markets?.question ?? p.market_id}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Stake {formatNaira(p.stake)} · {p.markets?.closes_in ?? "—"} left
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      p.side === "YES" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                    }`}>
                      {p.side}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Past results */}
          <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-base">Past Results</h2>
              {past.length > 0 && (
                <span className="text-xs text-success bg-success-soft px-2.5 py-1 rounded-full font-semibold">
                  {won} won · {past.length - won} lost
                </span>
              )}
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : past.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">No resolved positions yet.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {past.slice(0, 5).map(p => (
                  <li key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-muted/50 transition-smooth">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{p.markets?.question ?? p.market_id}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Took {p.side}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                        p.outcome === "WON" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                      }`}>
                        {p.outcome}
                      </div>
                      {p.payout != null && (
                        <div className={`text-sm font-extrabold mt-1 ${p.payout > 0 ? "text-success" : "text-danger"}`}>
                          {p.payout > 0 ? "+" : ""}{formatNaira(Math.abs(p.payout))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
