import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { Wallet, Target, TrendingUp, Activity, Bookmark, Star } from "lucide-react";
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

const Dashboard = () => {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch real positions from API
    setLoading(true);
    // TODO: Replace with actual API call
    // For now, set empty array
    setTimeout(() => {
      setPositions([]);
      setLoading(false);
    }, 500);
  }, [user]);

  const active = positions.filter(p => !p.outcome);
  const past = positions.filter(p => !!p.outcome);
  const won = past.filter(p => p.outcome === "WON").length;
  const totalForecasts = positions.length;
  const accuracy = past.length > 0 ? Math.round((won / past.length) * 100) : 0;

  // Calculate portfolio value (active positions)
  const portfolioValue = active.reduce((sum, p) => sum + p.stake, 0);
  
  // Points system (mock for now)
  const pointsEarned = won * 10 + totalForecasts * 2;
  
  // Watchlist count (mock for now)
  const watchlistCount = 0;

  const stats = [
    {
      label: "Balance",
      value: user ? formatNaira(user.balance) : "—",
      subtitle: "Available funds",
      icon: Wallet,
      color: "text-purple bg-purple/10",
      link: "/wallet",
    },
    {
      label: "Active Forecasts",
      value: String(active.length),
      subtitle: `${totalForecasts} total made`,
      icon: Activity,
      color: "text-purple bg-purple/10",
      link: "/portfolio",
    },
    {
      label: "Accuracy Score",
      value: past.length > 0 ? `${accuracy}%` : "—",
      subtitle: past.length > 0 ? `${won} of ${past.length} correct` : "No results yet",
      icon: Target,
      color: "text-charcoal bg-graphite/10",
    },
    {
      label: "Portfolio Value",
      value: active.length > 0 ? formatNaira(portfolioValue) : "—",
      subtitle: active.length > 0 ? `${active.length} position${active.length !== 1 ? "s" : ""}` : "No positions",
      icon: TrendingUp,
      color: "text-charcoal bg-graphite/10",
      link: "/portfolio",
    },
    {
      label: "Watchlist",
      value: String(watchlistCount),
      subtitle: "Markets saved",
      icon: Bookmark,
      color: "text-graphite bg-graphite/10",
    },
    {
      label: "Points Earned",
      value: String(pointsEarned),
      subtitle: "Keep forecasting!",
      icon: Star,
      color: "text-graphite bg-graphite/10",
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
    <div className="min-h-screen flex flex-col bg-white pb-20 md:pb-0">
      <Header />
      <main className="flex-1 container max-w-5xl mx-auto py-10 px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">
            Hey, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-graphite mt-1 text-sm">Your forecasting dashboard and activity overview.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8 animate-fade-up">
          {stats.map((s, index) => {
            const hasLink = !!s.link;
            const CardWrapper = hasLink ? Link : "div";
            const cardProps = hasLink ? { to: s.link } : {};
            
            return (
              <CardWrapper
                key={s.label}
                {...cardProps}
                className={`bg-white rounded-xl p-6 border border-graphite/10 shadow-card transition-normal ${
                  hasLink ? "cursor-pointer hover:shadow-elevated hover:-translate-y-0.5" : ""
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl grid place-items-center mb-3 ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="text-xs text-graphite font-semibold uppercase tracking-wider">{s.label}</div>
                <div className="text-2xl font-bold mt-1 tracking-tight text-charcoal">{s.value}</div>
                <div className="text-xs mt-1.5 text-graphite">
                  {s.subtitle}
                </div>
              </CardWrapper>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active positions */}
          <div className="bg-white rounded-xl p-6 shadow-card border border-graphite/10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-charcoal">Active Positions</h2>
              <span className="text-xs text-graphite bg-graphite/10 px-3 py-1 rounded-lg font-semibold">
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
                <p className="text-xs text-graphite mb-4">Start forecasting to see your positions here</p>
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
          <div className="bg-white rounded-xl p-6 shadow-card border border-graphite/10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-charcoal">Recent Activity</h2>
              {past.length > 0 && (
                <span className="text-xs text-graphite bg-graphite/10 px-3 py-1 rounded-lg font-semibold">
                  {past.length} resolved
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
                  📈
                </div>
                <p className="text-sm font-semibold mb-1 text-charcoal">No activity yet</p>
                <p className="text-xs text-graphite">Your forecast results will appear here</p>
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
                      <div className="text-xs text-graphite mt-0.5">Forecasted {p.side} · {formatNaira(p.stake)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                        p.outcome === "WON" ? "bg-emerald-soft text-emerald" : "bg-graphite/10 text-graphite"
                      }`}>
                        {p.outcome === "WON" ? "Correct" : "Resolved"}
                      </div>
                      {p.outcome === "WON" && p.payout != null && p.payout > p.stake && (
                        <div className="text-sm font-extrabold mt-1 text-emerald">
                          +{formatNaira(p.payout - p.stake)}
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
      <MobileNav />
    </div>
  );
};

export default Dashboard;
