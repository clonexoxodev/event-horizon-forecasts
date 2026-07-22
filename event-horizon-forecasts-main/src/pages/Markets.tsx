import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { MarketCard } from "@/components/MarketCard";
import { fetchMarkets, getTrendingScore } from "@/lib/markets";
import { useMarketState } from "@/lib/market-state";
import { BarChart3, TrendingUp } from "lucide-react";
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
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-bold text-[#6B7280]">
              {loading ? "Loading..." : `${trending.length} markets`}
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            {normalizedCategory ? `${normalizedCategory} markets` : "Active markets"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#6B7280]">
            Markets ranked by volume, trade activity, and participation.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-[360px] rounded-3xl border border-[#E5E7EB] soft-shimmer" />
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
          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-10 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
              <TrendingUp className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black">No active markets</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Markets will appear here once they are listed.</p>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
