import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { MarketCard } from "@/components/MarketCard";
import apiService, { type ApiMarket } from "@/lib/api";
import { useMarketState } from "@/lib/market-state";
import { BarChart3, Clock, Loader2, Search, TrendingUp, Zap } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { MARKET_CATEGORIES, normalizeCategory } from "@/lib/categories";

type SortMode = "trending" | "newest" | "closing_soon";

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "closing_soon", label: "Closing soon" },
];

export default function Markets() {
  const { setMarkets } = useMarketState();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category");
  const normalizedCategory = category ? normalizeCategory(category) : null;
  const query = searchParams.get("q") || "";
  const sortRaw = searchParams.get("sort") || "trending";
  const sort = (SORT_OPTIONS.some((s) => s.value === sortRaw) ? sortRaw : "trending") as SortMode;

  const [items, setItems] = useState<ApiMarket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(query);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (!value) next.delete(key);
      else next.set(key, value);
      if (key === "category" && next.has("q")) next.delete("q");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiService
      .getMarkets({
        sort,
        q: query || undefined,
        category: normalizedCategory || undefined,
        status: "active",
        limit: 50,
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.markets || []);
        setTotal(Number(res.count || 0));
        setMarkets(res.markets || []);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sort, query, normalizedCategory, setMarkets]);

  const searchedItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) => `${m.question} ${m.category} ${m.description || ""}`.toLowerCase().includes(q));
  }, [items, query]);

  const activeCount = Number(total || 0);

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
              {loading ? "Loading..." : `${activeCount} markets`}
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            {normalizedCategory ? `${normalizedCategory} markets` : "Active markets"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#6B7280]">
            Markets ranked by volume, activity, and participation.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateParam("q", searchInput.trim() || null);
                }}
                placeholder="Search markets..."
                aria-label="Search markets"
                className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-11 pr-4 text-sm font-medium text-[#111827] shadow-sm outline-none placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
              />
            </div>
            <div className="flex rounded-xl border border-[#E5E7EB] bg-white p-1">
              {SORT_OPTIONS.map((option) => {
                const Icon = option.value === "trending" ? TrendingUp : option.value === "newest" ? Clock : Zap;
                return (
                  <button
                    key={option.value}
                    onClick={() => updateParam("sort", option.value === "trending" ? null : option.value)}
                    title={option.label}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                      sort === option.value ? "bg-[#4F46E5] text-white shadow-sm" : "text-[#9CA3AF] hover:text-[#6B7280]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => {
                updateParam("category", null);
              }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${
                !normalizedCategory
                  ? "bg-[#4F46E5] text-white shadow-[0_2px_12px_rgba(79,70,229,0.3)]"
                  : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#C7D2FE] hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
              }`}
            >
              All
            </button>
            {MARKET_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => updateParam("category", normalizedCategory === cat.value ? null : cat.value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${
                  normalizedCategory === cat.value
                    ? "bg-[#4F46E5] text-white shadow-[0_2px_12px_rgba(79,70,229,0.3)]"
                    : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#C7D2FE] hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
                }`}
              >
                {cat.value}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-[360px] rounded-3xl border border-[#E5E7EB] soft-shimmer" />
            ))}
          </div>
        ) : searchedItems.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {searchedItems.map((market, index) => (
              <div key={market.id} className="animate-fade-up" style={{ animationDelay: `${index * 35}ms` }}>
                <MarketCard m={market} compact />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-10 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
              <BarChart3 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black">No active markets found</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Try a different search, category, or check back soon.</p>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}