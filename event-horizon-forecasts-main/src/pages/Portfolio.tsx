import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { SellPositionModal } from "@/components/SellPositionModal";
import { useAuth } from "@/lib/auth";
import { TrendingUp, Target, Trophy, Activity, Tag, TrendingDown } from "lucide-react";
import { formatNaira } from "@/lib/markets";
import { Position, fetchUserPositions } from "@/lib/positions";

export default function Portfolio() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadPositions();
    }
  }, [user]);

  const loadPositions = async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchUserPositions(user.id);
    setPositions(data);
    setLoading(false);
  };

  const handleSellClick = (position: Position) => {
    setSelectedPosition(position);
    setIsSellModalOpen(true);
  };

  const handleSellSuccess = () => {
    loadPositions(); // Refresh positions
  };

  const activePositions = positions.filter(p => p.marketStatus === "active" && !p.isListed);
  const listedPositions = positions.filter(p => p.isListed);

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

  // Empty stats - no fake data
  const stats = [
    {
      label: "Total Staked",
      value: formatNaira(0),
      change: "No forecasts yet",
      icon: Activity,
      color: "text-purple bg-purple/10",
    },
    {
      label: "Total Returns",
      value: formatNaira(0),
      change: "No returns yet",
      icon: Trophy,
      color: "text-charcoal bg-graphite/10",
    },
    {
      label: "Win Rate",
      value: "—",
      change: "No forecasts yet",
      icon: Target,
      color: "text-charcoal bg-graphite/10",
    },
    {
      label: "ROI",
      value: "—",
      change: "No data yet",
      icon: TrendingUp,
      color: "text-graphite bg-graphite/10",
    },
  ];

  // Empty array - no fake data
  const topMarkets: any[] = [];

  return (
    <div className="min-h-screen flex flex-col bg-white pb-20 md:pb-0">
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
              className="bg-white rounded-xl p-6 shadow-card border border-graphite/10 hover:shadow-elevated transition-normal hover:-translate-y-0.5"
            >
              <div className={`w-10 h-10 rounded-xl grid place-items-center mb-3 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-xs text-graphite font-semibold uppercase tracking-wider">
                {s.label}
              </div>
              <div className="text-2xl font-bold mt-1 tracking-tight text-charcoal">{s.value}</div>
              <div className="text-xs text-graphite mt-1.5">{s.change}</div>
            </div>
          ))}
        </div>

        {/* Performance Chart Placeholder */}
        <div className="bg-white rounded-xl p-6 shadow-card border border-graphite/10 mb-8">
          <h2 className="font-bold text-lg mb-5 text-charcoal">Performance Over Time</h2>
          <div className="h-64 rounded-xl bg-graphite/5 grid place-items-center border border-graphite/10">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-graphite mx-auto mb-2" />
              <p className="text-sm font-semibold text-charcoal mb-1">No data yet</p>
              <p className="text-xs text-graphite">Start forecasting to see your performance</p>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-xl p-6 shadow-card border border-graphite/10 mb-8">
          <h2 className="font-bold text-lg mb-5 text-charcoal">Active Positions</h2>
          {loading ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 border-4 border-purple/20 border-t-purple rounded-full animate-spin mx-auto" />
              <p className="text-xs text-graphite mt-3">Loading positions...</p>
            </div>
          ) : activePositions.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-graphite/10 grid place-items-center mx-auto mb-4 text-3xl">
                📊
              </div>
              <p className="text-sm font-semibold mb-1 text-charcoal">No active positions</p>
              <p className="text-xs text-graphite">Start forecasting to see your positions here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activePositions.map((position) => {
                const valueChange = position.currentValue - position.stake;
                const isProfit = valueChange > 0;
                const priceChange = position.currentPrice - position.entryPrice;

                return (
                  <div
                    key={position.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-graphite/5 hover:bg-graphite/8 transition-fast border border-graphite/10"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-white grid place-items-center text-xl shrink-0">
                        {position.marketIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-charcoal line-clamp-1 mb-1">
                          {position.marketQuestion}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              position.side === "YES"
                                ? "bg-emerald-soft text-emerald"
                                : "bg-coral-soft text-coral"
                            }`}
                          >
                            {position.side}
                          </span>
                          <span className="text-xs text-graphite">
                            Entry: {position.entryPrice}% → {position.currentPrice}%
                          </span>
                          {priceChange !== 0 && (
                            <span
                              className={`flex items-center gap-0.5 text-xs font-bold ${
                                isProfit ? "text-emerald" : "text-coral"
                              }`}
                            >
                              {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {Math.abs(priceChange).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold text-charcoal">
                          {formatNaira(position.currentValue)}
                        </div>
                        <div
                          className={`text-xs font-semibold ${
                            isProfit ? "text-emerald" : "text-coral"
                          }`}
                        >
                          {isProfit ? "+" : ""}{formatNaira(valueChange)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSellClick(position)}
                        className="h-9 px-4 bg-purple text-white rounded-lg font-semibold text-xs hover:bg-purple/90 active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        Sell
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Listed Positions */}
        {listedPositions.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-card border border-graphite/10">
            <h2 className="font-bold text-lg mb-5 text-charcoal">Listed for Sale</h2>
            <div className="space-y-3">
              {listedPositions.map((position) => (
                <div
                  key={position.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-purple/5 border border-purple/20"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-white grid place-items-center text-xl shrink-0">
                      {position.marketIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-charcoal line-clamp-1 mb-1">
                        {position.marketQuestion}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            position.side === "YES"
                              ? "bg-emerald-soft text-emerald"
                              : "bg-coral-soft text-coral"
                          }`}
                        >
                          {position.side}
                        </span>
                        <span className="text-xs text-purple font-semibold">
                          Code: {position.listingCode}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-graphite font-medium mb-0.5">Asking Price</div>
                    <div className="text-sm font-bold text-charcoal">
                      {formatNaira(position.askingPrice ?? 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
      <MobileNav />

      {/* Sell Position Modal */}
      {selectedPosition && (
        <SellPositionModal
          position={selectedPosition}
          isOpen={isSellModalOpen}
          onClose={() => {
            setIsSellModalOpen(false);
            setSelectedPosition(null);
          }}
          onSuccess={handleSellSuccess}
        />
      )}
    </div>
  );
}
