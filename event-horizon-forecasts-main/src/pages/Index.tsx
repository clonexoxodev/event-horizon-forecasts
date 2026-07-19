import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { FlippeSymbol } from "@/components/FlippeBrand";
import { MobileNav } from "@/components/MobileNav";
import { MarketCard } from "@/components/MarketCard";
import { getTrendingScore, formatNaira } from "@/lib/markets";
import { useMarketState } from "@/lib/market-state";
import { useAuth } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";
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
      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:py-8">

        {/* ── Mobile Header ── */}
        <section className="mb-6 flex items-center justify-between gap-3 md:hidden">
          <Link to="/" className="flex items-center gap-2.5">
            <FlippeSymbol size="sm" />
            <span className="text-lg font-extrabold tracking-[0.04em] text-[#111827]">FLIPPE</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/wallet"
              className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#111827] shadow-sm"
            >
              <Wallet className="h-3.5 w-3.5 text-[#4F46E5]" />
              {formatNaira(user?.balance || 0)}
            </Link>
            <NotificationBell />
          </div>
        </section>

        {/* ── Hero ── */}
        {!isSearching && category === "Trending" && (
          <section className="mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-[#111827] sm:text-4xl">
                  {heroGreeting}
                </h1>
                <p className="mt-2 text-sm font-medium text-[#6B7280]">
                  {liveCount > 0 ? `${liveCount} live markets` : "Loading markets..."}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Search Bar ── */}
        <section className="mb-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9CA3AF]" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search markets"
              aria-label="Search markets"
              role="searchbox"
              className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-11 pr-20 text-[15px] font-bold text-[#111827] shadow-sm outline-none placeholder:text-[#9CA3AF] focus:border-[#4F46E5]/60 focus:ring-4 focus:ring-[#4F46E5]/10 transition-all"
            />
            <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-bold text-[#9CA3AF] shadow-sm">
              Ctrl K
            </kbd>
          </div>
        </section>

        {/* ── Category Pills ── */}
        <section className="mb-6">
          <div
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
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
                  className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${
                    category === chip
                      ? "bg-[#4F46E5] text-white shadow-[0_2px_8px_rgba(79,70,229,0.25)]"
                      : "border border-[#E5E7EB] bg-white text-[#667085] hover:border-[#C7D2FE] hover:text-[#111827]"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Market Grid ── */}
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-black tracking-tight">{sectionTitle}</h2>
          </div>

          {isLoadingMarkets && markets.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-64 rounded-2xl border border-[#E5E7EB] soft-shimmer" />
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
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" role="list">
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
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4F46E5]/8">
                {isSearching ? (
                  <Search className="h-6 w-6 text-[#4F46E5]" />
                ) : (
                  <Sparkles className="h-6 w-6 text-[#4F46E5]" />
                )}
              </div>
              <h3 className="text-lg font-bold">{emptyTitle}</h3>
              <p className="mt-2 max-w-sm mx-auto text-sm text-[#6B7280]">
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
