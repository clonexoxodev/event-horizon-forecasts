import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { MarketCard } from "@/components/MarketCard";
import { fetchMarkets } from "@/lib/markets";
import { useMarketState } from "@/lib/market-state";
import { Flame, TrendingUp } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function Markets() {
  const { markets, setMarkets } = useMarketState();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const category = searchParams.get("category");

  useEffect(() => {
    fetchMarkets()
      .then(setMarkets)
      .finally(() => setLoading(false));
  }, [setMarkets]);

  const trending = useMemo(() => {
    const filtered = category
      ? markets.filter((market) => market.category.toLowerCase() === category.toLowerCase())
      : markets;
    return [...filtered].sort((a, b) => (b.totalPool + b.participants * 1000) - (a.totalPool + a.participants * 1000));
  }, [category, markets]);

  return (
    <div className="min-h-screen bg-[#050711] pb-20 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">
        <div className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-200">
            <Flame className="h-3.5 w-3.5" />
            Trending now
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            {category ? `${category} markets` : "Most active markets"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Markets with the most money, people, and heat.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-[360px] animate-pulse rounded-3xl border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : trending.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {trending.map((market, index) => (
              <div key={market.id} className="animate-fade-up" style={{ animationDelay: `${index * 35}ms` }}>
                <MarketCard m={market} compact />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <TrendingUp className="mx-auto mb-3 h-10 w-10 text-violet-300" />
            <h2 className="text-xl font-black">No active markets</h2>
            <p className="mt-1 text-sm text-slate-400">Add markets in the backend to fill this page.</p>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
