import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { TrendingUp, TrendingDown, Target, Trophy } from "lucide-react";
import { formatNaira } from "@/lib/markets";

export default function Portfolio() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-20 text-center">
          <h2 className="text-2xl font-bold mb-3">Sign in to view your portfolio</h2>
          <p className="text-muted-foreground">Track your performance and statistics.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const stats = [
    {
      label: "Total Wagered",
      value: formatNaira(15000),
      change: "+12% this month",
      icon: TrendingUp,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Total Returns",
      value: formatNaira(18500),
      change: "+23% profit",
      icon: Trophy,
      color: "text-emerald bg-emerald-soft",
    },
    {
      label: "Win Rate",
      value: "68%",
      change: "34 wins, 16 losses",
      icon: Target,
      color: "text-purple bg-purple/10",
    },
    {
      label: "ROI",
      value: "+23.3%",
      change: "Above average",
      icon: TrendingUp,
      color: "text-emerald bg-emerald-soft",
    },
  ];

  const topMarkets = [
    { category: "Politics", profit: 3500, trades: 12, winRate: 75 },
    { category: "Finance", profit: 2200, trades: 8, winRate: 62 },
    { category: "Technology", profit: 1800, trades: 15, winRate: 60 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Portfolio</h1>
          <p className="text-graphite mt-1 text-sm">
            Your performance and statistics overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-off-white rounded-2xl p-5 shadow-card border border-graphite/10 hover:shadow-elevated transition-fast"
            >
              <div className={`w-10 h-10 rounded-xl grid place-items-center mb-4 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-xs text-graphite font-medium uppercase tracking-wide">
                {s.label}
              </div>
              <div className="text-2xl font-extrabold mt-1 tracking-tight text-charcoal">{s.value}</div>
              <div className="text-xs text-graphite mt-1.5 font-medium">{s.change}</div>
            </div>
          ))}
        </div>

        {/* Performance Chart Placeholder */}
        <div className="bg-off-white rounded-2xl p-6 shadow-card border border-graphite/10 mb-8">
          <h2 className="font-bold text-base mb-5 text-charcoal">Performance Over Time</h2>
          <div className="h-64 rounded-xl bg-graphite/5 grid place-items-center border border-graphite/10">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-graphite mx-auto mb-2" />
              <p className="text-sm text-graphite">Chart coming soon</p>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-off-white rounded-2xl p-6 shadow-card border border-graphite/10">
          <h2 className="font-bold text-base mb-5 text-charcoal">Top Performing Categories</h2>
          <ul className="space-y-3">
            {topMarkets.map((market) => (
              <li
                key={market.category}
                className="flex items-center justify-between p-4 rounded-xl bg-graphite/5 hover:bg-graphite/10 transition-fast border border-graphite/10"
              >
                <div>
                  <div className="font-semibold text-charcoal">{market.category}</div>
                  <div className="text-xs text-graphite mt-1">
                    {market.trades} trades · {market.winRate}% win rate
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-emerald">
                    +{formatNaira(market.profit)}
                  </div>
                  <div className="text-xs text-graphite">Total profit</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
