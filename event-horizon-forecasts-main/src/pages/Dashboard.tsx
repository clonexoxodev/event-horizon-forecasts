import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Wallet, Target, Trophy, TrendingUp, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { formatNaira } from "@/lib/markets";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";

type Position = {
  id: string;
  market_id: string;
  market_question: string;
  market_icon: string;
  side: "YES" | "NO";
  stake: number;
  payout: number | null;
  outcome: "WON" | "LOST" | null;
  closes_in: string;
  created_at: string;
};

// Mock data generator for demo purposes
const generateMockPositions = (): Position[] => {
  const mockMarkets = [
    { question: "Will Bitcoin reach $100k in 2024?", icon: "₿" },
    { question: "Will Nigeria qualify for World Cup?", icon: "⚽" },
    { question: "Will Tinubu complete his term?", icon: "🇳🇬" },
    { question: "Will inflation drop below 20%?", icon: "📊" },
    { question: "Will Naira strengthen against Dollar?", icon: "💵" },
  ];

  const positions: Position[] = [];

  // Generate 3 active positions
  for (let i = 0; i < 3; i++) {
    const market = mockMarkets[i];
    positions.push({
      id: `active-${i}`,
      market_id: `market-${i}`,
      market_question: market.question,
      market_icon: market.icon,
      side: i % 2 === 0 ? "YES" : "NO",
      stake: [1000, 2500, 5000][i],
      payout: null,
      outcome: null,
      closes_in: ["2 days", "5 hours", "1 week"][i],
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    });
  }

  // Generate 5 past positions
  for (let i = 0; i < 5; i++) {
    const market = mockMarkets[i];
    const won = i < 3; // First 3 are wins
    const stake = [1000, 1500, 2000, 2500, 3000][i];
    positions.push({
      id: `past-${i}`,
      market_id: `market-past-${i}`,
      market_question: market.question,
      market_icon: market.icon,
      side: i % 2 === 0 ? "YES" : "NO",
      stake,
      payout: won ? stake * 1.8 : 0,
      outcome: won ? "WON" : "LOST",
      closes_in: "Closed",
      created_at: new Date(Date.now() - (i + 3) * 86400000).toISOString(),
    });
  }

  return positions;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Simulate API call
    setLoading(true);
    setTimeout(() => {
      const mockData = generateMockPositions();
      setPositions(mockData);
      setLoading(false);
    }, 800);
  }, [user]);

  const active = positions.filter(p => !p.outcome);
  const past = positions.filter(p => !!p.outcome);
  const won = past.filter(p => p.outcome === "WON").length;
  const lost = past.filter(p => p.outcome === "LOST").length;
  const totalPredictions = positions.length;
  const accuracy = past.length > 0 ? Math.round((won / past.length) * 100) : 0;

  // Calculate total wagered and returns
  const totalWagered = positions.reduce((sum, p) => sum + p.stake, 0);
  const totalReturns = past.reduce((sum, p) => sum + (p.payout || 0), 0);
  const netProfit = totalReturns - past.reduce((sum, p) => sum + p.stake, 0);

  const stats = [
    {
      label: "Balance",
      value: user ? formatNaira(user.balance) : "—",
      change: "Available to bet",
      up: null,
      icon: Wallet,
      color: "text-purple bg-purple/10",
    },
    {
      label: "Total Predictions",
      value: String(totalPredictions),
      change: `${active.length} active`,
      up: totalPredictions > 0 ? true : null,
      icon: Activity,
      color: "text-charcoal bg-graphite/10",
    },
    {
      label: "Accuracy",
      value: past.length > 0 ? `${accuracy}%` : "—",
      change: `${won} wins · ${lost} losses`,
      up: accuracy >= 50 ? true : accuracy > 0 ? false : null,
      icon: Target,
      color: "text-emerald bg-emerald-soft",
    },
    {
      label: "Net Profit",
      value: past.length > 0 ? formatNaira(Math.abs(netProfit)) : "—",
      change: past.length > 0 ? `${totalReturns > 0 ? "+" : ""}${((netProfit / totalWagered) * 100).toFixed(1)}% ROI` : "No trades yet",
      up: netProfit > 0 ? true : netProfit < 0 ? false : null,
      icon: Trophy,
      color: netProfit >= 0 ? "text-amber-600 bg-amber-50" : "text-coral bg-coral-soft",
    },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-20 text-center">
          <h2 className="text-2xl font-bold mb-3 text-charcoal">Sign in to view your dashboard</h2>
          <p className="text-graphite">Track your positions, balance, and accuracy.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-5xl mx-auto py-10 px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">
            Hey, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-graphite mt-1 text-sm">Track your balance, positions, and accuracy.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-up">
          {stats.map((s, index) => {
            const isBalanceCard = s.label === "Balance";
            const CardWrapper = isBalanceCard ? Link : "div";
            const cardProps = isBalanceCard ? { to: "/wallet" } : {};
            
            return (
              <CardWrapper
                key={s.label}
                {...cardProps}
                className={`bg-off-white rounded-lg p-5 shadow-card border border-border/50 hover:shadow-elevated transition-fast ${
                  isBalanceCard ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]" : ""
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl grid place-items-center mb-4 ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="text-tiny text-graphite font-medium uppercase tracking-wide">{s.label}</div>
                <div className="text-2xl font-extrabold mt-1 tracking-tight text-charcoal">{s.value}</div>
                {s.change && (
                  <div className={`flex items-center gap-1 text-xs mt-1.5 font-medium ${
                    s.up === true ? "text-emerald" : s.up === false ? "text-coral" : "text-graphite"
                  }`}>
                    {s.up === true && <ArrowUpRight className="w-3 h-3" />}
                    {s.up === false && <ArrowDownRight className="w-3 h-3" />}
                    {s.change}
                  </div>
                )}
              </CardWrapper>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active positions */}
          <div className="bg-off-white rounded-lg p-6 shadow-card border border-border/50">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-base text-charcoal">Active Positions</h2>
              <span className="text-xs text-graphite bg-graphite/10 px-2.5 py-1 rounded-full font-medium">
                {active.length} open
              </span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-14 rounded-xl bg-graphite/10 animate-shimmer" style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
            ) : active.length === 0 ? (
              <div className="text-center py-10 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-graphite/10 grid place-items-center mx-auto mb-4 text-3xl">
                  📊
                </div>
                <p className="text-sm font-semibold mb-1 text-charcoal">No active positions</p>
                <p className="text-xs text-graphite mb-4">Start predicting to see your positions here</p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-sm text-purple font-semibold hover:underline"
                >
                  Browse markets →
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {active.map((p, index) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-graphite/5 transition-fast cursor-pointer animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-graphite/10 grid place-items-center text-lg shrink-0">
                        {p.market_icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate text-charcoal">{p.market_question}</div>
                        <div className="text-xs text-graphite mt-0.5">
                          Stake {formatNaira(p.stake)} · {p.closes_in} left
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      p.side === "YES" ? "bg-emerald-soft text-emerald" : "bg-coral-soft text-coral"
                    }`}>
                      {p.side}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Past results */}
          <div className="bg-off-white rounded-lg p-6 shadow-card border border-border/50">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-base text-charcoal">Past Results</h2>
              {past.length > 0 && (
                <span className="text-xs text-emerald bg-emerald-soft px-2.5 py-1 rounded-full font-semibold">
                  {won} won · {past.length - won} lost
                </span>
              )}
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-14 rounded-xl bg-graphite/10 animate-shimmer" style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
            ) : past.length === 0 ? (
              <div className="text-center py-10 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-graphite/10 grid place-items-center mx-auto mb-4 text-3xl">
                  🏆
                </div>
                <p className="text-sm font-semibold mb-1 text-charcoal">No resolved positions</p>
                <p className="text-xs text-graphite">Your prediction results will appear here</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {past.slice(0, 5).map((p, index) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-graphite/5 transition-fast cursor-pointer animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate text-charcoal">{p.market_question}</div>
                      <div className="text-xs text-graphite mt-0.5">Took {p.side} · Stake {formatNaira(p.stake)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                        p.outcome === "WON" ? "bg-emerald-soft text-emerald" : "bg-coral-soft text-coral"
                      }`}>
                        {p.outcome}
                      </div>
                      {p.payout != null && (
                        <div className={`text-sm font-extrabold mt-1 ${p.payout > p.stake ? "text-emerald" : "text-coral"}`}>
                          {p.payout > p.stake ? "+" : ""}{formatNaira(Math.abs(p.payout - p.stake))}
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
