import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { MarketCard } from "@/components/MarketCard";
import { fetchMarkets, getTrendingScore } from "@/lib/markets";
import { useMarketState } from "@/lib/market-state";
import { TrendingUp } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { normalizeCategory } from "@/lib/categories";

export default function Markets() {
  const { markets, setMarkets } = useMarketState();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const category = searchParams.get("category");
  const normalizedCategory = category ? normalizeCategory(category) : null;

  useEffect(() => {
    fetchMarkets()
      .then(setMarkets)
      .finally(() => setLoading(false));
  }, [setMarkets]);

  const trending = useMemo(() => {
    const filtered = category
      ? markets.filter((market) => normalizeCategory(market.category) === normalizedCategory)
      : markets;
    return [...filtered].sort((a, b) => getTrendingScore(b) - getTrendingScore(a));
  }, [category, normalizedCategory, markets]);

  return (
    <div className="app-bg min-h-screen pb-20 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">
        <div className="mb-6 rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F3F4F6] px-3 py-1 text-xs font-bold text-[#667085]">
            Active markets
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            {normalizedCategory ? `${normalizedCategory} markets` : "Most active markets"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#667085]">
            Markets with the most volume, trades, and participation.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-[360px] rounded-2xl border border-[#E5E7EB] soft-shimmer" />
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
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-10 text-center">
            <TrendingUp className="mx-auto mb-3 h-10 w-10 text-[#12B886]" />
            <h2 className="text-xl font-black">No active markets</h2>
            <p className="mt-1 text-sm text-[#667085]">Add markets in the backend to fill this page.</p>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
