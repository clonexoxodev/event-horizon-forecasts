import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Search, TrendingUp, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { MarketCard } from "@/components/MarketCard";
import { getTrendingScore, formatNaira } from "@/lib/markets";
import { useMarketState } from "@/lib/market-state";
import { useAuth } from "@/lib/auth";
import { categoryMatches, HOME_MARKET_FILTERS, normalizeCategory } from "@/lib/categories";

const isLiveMarket = (market: { status?: string; closeTime?: string; tradingCloseTime?: string }) => {
  const closeTime = market.tradingCloseTime || market.closeTime;
  const hasEnded = closeTime ? new Date(closeTime).getTime() <= Date.now() : false;
  return market.status === "active" && !hasEnded;
};

const Index = () => {
  const { user } = useAuth();
  const [category, setCategory] = useState<string>("Trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"trending" | "newest" | "closing">("trending");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { markets, loadMarkets, isLoadingMarkets, marketError } = useMarketState();

  const isLoggedIn = !!user;

  useEffect(() => { loadMarkets().catch(() => {}); }, [loadMarkets]);

  useEffect(() => {
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") loadMarkets({ force: true }).catch(() => {});
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
  const liveMarkets = useMemo(() => markets.filter(isLiveMarket), [markets]);
  const liveCount = liveMarkets.length;

  const filtered = useMemo(() => {
    let next = [...liveMarkets];
    if (!isSearching && category !== "Trending") {
      next = next.filter((m) => categoryMatches(m.category, category));
    }
    if (isSearching) {
      const q = trimmedSearch.toLowerCase();
      next = next.filter((m) => {
        const text = [
          m.question, m.category, normalizeCategory(m.category), m.rules,
          m.source, m.description, (m as any).resolutionSource, (m as any).resolution_source,
          Array.isArray((m as any).tags) ? (m as any).tags.join(" ") : (m as any).tags,
        ].filter(Boolean).join(" ").toLowerCase();
        return text.includes(q);
      });
    }
    if (sortMode === "trending") next.sort((a, b) => getTrendingScore(b) - getTrendingScore(a));
    else if (sortMode === "newest") next.sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime());
    else if (sortMode === "closing") next.sort((a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime());
    return next;
  }, [liveMarkets, category, isSearching, trimmedSearch, sortMode]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<string, number>> = { Trending: liveMarkets.length };
    liveMarkets.forEach((m) => {
      const n = normalizeCategory(m.category);
      counts[n] = (counts[n] || 0) + 1;
    });
    return counts;
  }, [liveMarkets]);

  const sectionTitle = isSearching
    ? `Results for "${trimmedSearch}"`
    : category === "Trending" ? "All Markets" : `${category} Markets`;
  const emptyTitle = isSearching
    ? `No markets found for "${trimmedSearch}"`
    : category === "Trending" ? "No trending markets yet" : `No ${category} markets yet`;
  const emptyBody = isSearching ? "Try another keyword or browse all categories." : "Check back soon.";

  if (!isLoggedIn) {
    const trendingMarkets = [...liveMarkets]
      .sort((a, b) => getTrendingScore(b) - getTrendingScore(a))
      .slice(0, 6);

    return (
      <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
        <Header />
        <main>
          <section className="relative overflow-hidden bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#818CF8] px-4 py-10 sm:px-6 sm:py-14">
            <div className="relative mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
                <Zap className="h-4 w-4" />{liveCount} Live Markets
              </div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Trade Real-World Outcomes
              </h1>
              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/80">
                Predict what happens next. Earn from your insights.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link to="/signup" className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3 text-sm font-bold text-[#4F46E5] shadow-lg transition-all hover:bg-[#F9FAFB] active:scale-[0.98]">
                  Get Started
                </Link>
                <Link to="/how-it-works" className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 px-7 py-3 text-sm font-bold text-white transition-all hover:bg-white/10">
                  How It Works
                </Link>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#111827]">Trending Markets</h2>
              <Link to="/markets" className="text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA]">View All</Link>
            </div>
            {isLoadingMarkets && markets.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-56 rounded-2xl border border-[#E5E7EB] bg-white soft-shimmer" />
                ))}
              </div>
            ) : trendingMarkets.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {trendingMarkets.map((m, i) => (
                  <div key={m.id} className="opacity-0 animate-fade-up" style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}>
                    <MarketCard m={m} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white/60 p-12 text-center">
                <p className="text-sm font-semibold text-[#6B7280]">Markets are loading...</p>
              </div>
            )}
          </section>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:py-8">

        <section className="mb-5">
          <div className="relative group">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9CA3AF] transition-colors group-focus-within:text-[#4F46E5]" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search markets, topics, events..."
              aria-label="Search markets"
              className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-11 pr-20 text-sm font-medium text-[#111827] shadow-sm outline-none placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06] transition-all duration-200"
            />
            <kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-1 text-[11px] font-semibold text-[#9CA3AF] tabular-nums">
              Ctrl K
            </kbd>
          </div>
        </section>

        <section className="mb-4">
          <div
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
            style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}
            role="tablist"
          >
            {HOME_MARKET_FILTERS.map((chip) => {
              const count = chip === "Trending" ? liveCount : Number(categoryCounts[chip] || 0);
              const isActive = category === chip;
              return (
                <button
                  key={chip}
                  onClick={() => setCategory(chip)}
                  role="tab"
                  aria-selected={isActive}
                  className={`relative shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-[#4F46E5] text-white shadow-[0_2px_12px_rgba(79,70,229,0.3)]"
                      : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#C7D2FE] hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
                  }`}
                >
                  {chip}
                  {count > 0 && !isActive && (
                    <span className="ml-1.5 rounded-full bg-[#F3F4F6] px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-[#111827]">{sectionTitle}</h2>
            <div className="flex items-center gap-2">
              {!isSearching && filtered.length > 0 && (
                <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-xs font-bold text-[#4F46E5] tabular-nums">
                  {filtered.length}
                </span>
              )}
              {!isSearching && (
                <div className="flex rounded-lg border border-[#E5E7EB] bg-white p-0.5">
                  {([["trending", TrendingUp], ["newest", Clock], ["closing", Zap]] as const).map(([mode, Icon]) => (
                    <button
                      key={mode}
                      onClick={() => setSortMode(mode)}
                      title={mode === "trending" ? "Trending" : mode === "newest" ? "Newest" : "Closing Soon"}
                      className={`rounded-md p-1.5 transition-all ${
                        sortMode === mode ? "bg-[#4F46E5] text-white shadow-sm" : "text-[#9CA3AF] hover:text-[#6B7280]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isLoadingMarkets && markets.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-56 rounded-2xl border border-[#E5E7EB] bg-white soft-shimmer" />
              ))}
            </div>
          ) : marketError && filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-12 text-center">
              <h3 className="text-base font-bold text-[#111827]">Could not load markets</h3>
              <p className="mt-1.5 text-sm text-[#6B7280]">{marketError}</p>
              <button
                onClick={() => loadMarkets({ force: true })}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-6 py-2.5 text-sm font-bold text-[#111827] transition hover:bg-[#F3F4F6]"
              >
                Retry
              </button>
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" role="list">
              {filtered.map((m, i) => (
                <div
                  key={m.id}
                  role="listitem"
                  className="opacity-0 animate-fade-up"
                  style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
                >
                  <MarketCard m={m} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white/60 p-14 text-center">
              <h3 className="text-base font-bold text-[#111827]">{emptyTitle}</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#9CA3AF]">{emptyBody}</p>
            </div>
          )}
        </section>
      </main>
      <MobileNav />
    </div>
  );
};

export default Index;
