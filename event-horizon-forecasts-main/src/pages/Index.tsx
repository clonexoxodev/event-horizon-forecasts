import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { MarketCard } from "@/components/MarketCard";
import { getTrendingScore } from "@/lib/markets";
import { useMarketState } from "@/lib/market-state";
import { useAuth } from "@/lib/auth";
import { categoryMatches, HOME_MARKET_FILTERS, type HomeMarketFilter, normalizeCategory } from "@/lib/categories";

const isLiveMarket = (market: { status?: string; closeTime?: string; tradingCloseTime?: string }) => {
  const closeTime = market.tradingCloseTime || market.closeTime;
  const hasEnded = closeTime ? new Date(closeTime).getTime() <= Date.now() : false;
  return market.status === "active" && !hasEnded;
};

const Index = () => {
  const { user } = useAuth();
  const [category, setCategory] = useState<HomeMarketFilter>("Trending");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { markets, loadMarkets, isLoadingMarkets, marketError } = useMarketState();

  useEffect(() => {
    loadMarkets().catch(() => {});
  }, [loadMarkets]);

  useEffect(() => {
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMarkets({ force: true }).catch(() => {});
      }
    }, 15000);
    return () => window.clearInterval(refresh);
  }, [loadMarkets]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      const inInput = tag === "input" || tag === "textarea" || tag === "select";
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !inInput)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const trimmedSearch = searchQuery.trim();
  const isSearching = trimmedSearch.length > 0;

  const filtered = useMemo(() => {
    let next = markets.filter(isLiveMarket);

    if (!isSearching && category !== "Trending") {
      next = next.filter((market) => categoryMatches(market.category, category));
    }
    next.sort((a, b) => getTrendingScore(b) - getTrendingScore(a));

    if (isSearching) {
      const query = trimmedSearch.toLowerCase();
      next = next.filter((market) => {
        const searchable = [
          market.question,
          market.category,
          normalizeCategory(market.category),
          market.rules,
          market.source,
          market.description,
          (market as any).resolutionSource,
          (market as any).resolution_source,
          Array.isArray((market as any).tags) ? (market as any).tags.join(" ") : (market as any).tags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(query);
      });
    }
    return next;
  }, [markets, category, isSearching, trimmedSearch]);

  const liveCount = markets.filter(isLiveMarket).length;

  const liveMarkets = useMemo(() => markets.filter(isLiveMarket), [markets]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<HomeMarketFilter, number>> = { Trending: liveMarkets.length };
    liveMarkets.forEach((market) => {
      const normalized = normalizeCategory(market.category);
      counts[normalized] = (counts[normalized] || 0) + 1;
    });
    return counts;
  }, [liveMarkets]);

  const heroGreeting = user?.username ? `Welcome back, ${user.username}` : "Welcome to Flippe";
  const sectionTitle = isSearching ? `Results for "${trimmedSearch}"` : category === "Trending" ? "Trending Now" : `${category} Markets`;

  const emptyTitle = isSearching
    ? `No markets found for "${trimmedSearch}"`
    : category === "Trending"
      ? "No trending markets yet"
      : `No ${category} markets yet`;
  const emptyBody = isSearching ? "Try another keyword or browse all categories." : "Check back soon.";

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:py-6">

        {/* ── Hero ── */}
        {!isSearching && category === "Trending" && (
          <section className="mb-6">
            <h1 className="text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">
              {heroGreeting}
            </h1>
            <p className="mt-1 text-sm font-medium text-[#9CA3AF]">
              {liveCount > 0 ? `${liveCount} live markets` : "Loading markets..."}
            </p>
          </section>
        )}

        {/* ── Search Bar ── */}
        <section className="mb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search markets..."
              aria-label="Search markets"
              role="searchbox"
              className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white pl-10 pr-16 text-[14px] font-medium text-[#111827] shadow-sm outline-none placeholder:text-[#9CA3AF] focus:border-[#4F46E5]/50 focus:ring-2 focus:ring-[#4F46E5]/10 transition-all"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[#E5E7EB] bg-[#F3F4F6] px-1.5 py-0.5 text-[10px] font-bold text-[#9CA3AF]">
              Ctrl K
            </kbd>
          </div>
        </section>

        {/* ── Category Pills ── */}
        <section className="mb-5">
          <div
            className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
            style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}
            role="tablist"
          >
            {HOME_MARKET_FILTERS.map((chip) => {
              const count = chip === "Trending" ? liveCount : Number(categoryCounts[chip] || 0);
              return (
                <button
                  key={chip}
                  onClick={() => setCategory(chip)}
                  role="tab"
                  aria-selected={category === chip}
                  className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-all duration-200 ${
                    category === chip
                      ? "bg-[#4F46E5] text-white shadow-[0_2px_8px_rgba(79,70,229,0.25)]"
                      : "border border-[#E5E7EB] bg-white text-[#667085] hover:border-[#C7D2FE] hover:text-[#111827]"
                  }`}
                >
                  {chip}
                  {count > 0 && category !== chip && (
                    <span className="ml-1 text-[10px] opacity-60">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Market Grid ── */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-black tracking-tight">{sectionTitle}</h2>
          </div>

          {isLoadingMarkets && markets.length === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-56 rounded-2xl border border-[#E5E7EB] soft-shimmer" />
              ))}
            </div>
          ) : marketError && filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-10 text-center">
              <h3 className="text-lg font-bold">Could not load markets</h3>
              <p className="mt-1 text-sm text-[#6B7280]">{marketError}</p>
              <button
                onClick={() => loadMarkets({ force: true })}
                className="mt-5 rounded-xl border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-bold text-[#111827] transition hover:bg-[#F3F4F6]"
              >
                Retry
              </button>
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3" role="list">
              {filtered.map((market, index) => (
                <div
                  key={market.id}
                  role="listitem"
                  className="opacity-0 animate-fade-up"
                  style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                >
                  <MarketCard m={market} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white/60 p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4F46E5]/8">
                {isSearching ? (
                  <Search className="h-5 w-5 text-[#4F46E5]" />
                ) : (
                  <Sparkles className="h-5 w-5 text-[#4F46E5]" />
                )}
              </div>
              <h3 className="text-base font-bold">{emptyTitle}</h3>
              <p className="mt-1.5 max-w-sm mx-auto text-sm text-[#9CA3AF]">
                {emptyBody}
              </p>
            </div>
          )}
        </section>
      </main>
      <MobileNav />
    </div>
  );
};

export default Index;
