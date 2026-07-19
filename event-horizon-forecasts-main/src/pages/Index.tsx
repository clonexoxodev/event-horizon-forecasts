import { useEffect, useMemo, useRef, useState } from "react";
import { Award, Clock, Search, Sparkles, TrendingUp, Wallet } from "lucide-react";
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
import apiService, { type ApiPosition, type ApiProfileStats } from "@/lib/api";
import { getCurrentWinStreak, getForecasterLevel } from "@/lib/levels";

const VISIT_KEY = "flippe_home_last_visit_v1";
const HOME_SUMMARY_VISIBLE_MS = 7000;
const HOME_SUMMARY_FADE_MS = 400;
const emptyStats: ApiProfileStats = {
  totalPredictions: 0,
  activePredictions: 0,
  wonPredictions: 0,
  winRate: 0,
  totalStaked: 0,
  totalEarnings: 0,
  rank: null,
  score: 0,
  level: "Rookie",
  totalRankedUsers: 0,
};

type VisitSnapshot = {
  visitedAt: number;
  marketCount: number;
  tradeCount: number;
};

const readVisitSnapshot = (): VisitSnapshot | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(VISIT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeVisitSnapshot = (snapshot: VisitSnapshot) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VISIT_KEY, JSON.stringify(snapshot));
  } catch {
    // Visit tracking is only a local UX helper.
  }
};

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
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [stats, setStats] = useState<ApiProfileStats>(emptyStats);
  const [lastVisit] = useState<VisitSnapshot | null>(() => readVisitSnapshot());
  const [showSummary, setShowSummary] = useState(true);
  const [summaryInteracting, setSummaryInteracting] = useState(false);
  const [summaryCollapsing, setSummaryCollapsing] = useState(false);
  const summaryRemainingMs = useRef(HOME_SUMMARY_VISIBLE_MS);
  const summaryTimerStartedAt = useRef<number | null>(null);
  const summaryTimerRef = useRef<number | null>(null);
  const summaryFadeRef = useRef<number | null>(null);

  useEffect(() => {
    loadMarkets().catch(() => {
      // The shared market state keeps the last successful list, so Home should not flash empty.
    });
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
    if (!user) return;
    let mounted = true;
    const loadProgress = async () => {
      try {
        const [positionResponse, statsResponse] = await Promise.all([
          apiService.getPositions(),
          apiService.getProfileStats(),
        ]);
        if (!mounted) return;
        setPositions(positionResponse.positions || []);
        setStats(statsResponse.stats || emptyStats);
      } catch (error) {
        console.warn("Home progress request failed", error);
      }
    };
    loadProgress();
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") loadProgress();
    }, 30000);
    return () => {
      mounted = false;
      window.clearInterval(refresh);
    };
  }, [user]);

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
  const totalTradeCount = liveMarkets.reduce((sum, market) => sum + Number(market.tradeCount || 0), 0);
  const totalVolume = liveMarkets.reduce((sum, market) => sum + Number(market.totalVolume || 0), 0);
  const newPredictionsSince = lastVisit ? Math.max(0, totalTradeCount - lastVisit.tradeCount) : 0;
  const newMarketsSince = lastVisit ? Math.max(0, liveMarkets.length - lastVisit.marketCount) : 0;
  const activePositions = positions.filter((position) => position.marketStatus === "active");
  const resolvedPositions = positions.filter((position) => position.resolvedAt);
  const wonPositions = resolvedPositions.filter((position) => position.isWinner);
  const accuracy = resolvedPositions.length ? Math.round((wonPositions.length / resolvedPositions.length) * 100) : 0;
  const level = stats.level || getForecasterLevel(stats.totalPredictions, wonPositions.length);
  const currentStreak = getCurrentWinStreak(resolvedPositions);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      writeVisitSnapshot({
        visitedAt: Date.now(),
        marketCount: liveMarkets.length,
        tradeCount: totalTradeCount,
      });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [liveMarkets.length, totalTradeCount]);

  useEffect(() => {
    if (!showSummary) return;

    if (summaryTimerRef.current) {
      window.clearTimeout(summaryTimerRef.current);
      summaryTimerRef.current = null;
    }
    if (summaryFadeRef.current) {
      window.clearTimeout(summaryFadeRef.current);
      summaryFadeRef.current = null;
    }

    if (summaryInteracting) {
      if (summaryTimerStartedAt.current !== null) {
        summaryRemainingMs.current = Math.max(
          0,
          summaryRemainingMs.current - (Date.now() - summaryTimerStartedAt.current)
        );
        summaryTimerStartedAt.current = null;
      }
      return;
    }

    summaryTimerStartedAt.current = Date.now();
    summaryTimerRef.current = window.setTimeout(() => {
      setSummaryCollapsing(true);
      summaryFadeRef.current = window.setTimeout(() => {
        setShowSummary(false);
        setSummaryCollapsing(false);
        summaryRemainingMs.current = HOME_SUMMARY_VISIBLE_MS;
        summaryTimerStartedAt.current = null;
      }, HOME_SUMMARY_FADE_MS);
    }, summaryRemainingMs.current);

    return () => {
      if (summaryTimerRef.current) {
        window.clearTimeout(summaryTimerRef.current);
        summaryTimerRef.current = null;
      }
    };
  }, [showSummary, summaryInteracting]);

  const sectionTitle = isSearching ? `Search results for '${trimmedSearch}'` : category === "Trending" ? "Trending Now" : `${category} Markets`;
  const sectionSubtext = isSearching
    ? "Searching all live markets."
    : category === "Trending"
      ? "Pick a question, choose YES or NO, and track it in My Predictions."
      : `Live ${category.toLowerCase()}-related questions will appear here.`;

  const emptyTitle = isSearching
    ? `No markets found for '${trimmedSearch}'`
    : category === "Trending"
      ? "No trending markets yet"
      : `No ${category} markets yet`;
  const emptyBody = isSearching ? "Try another keyword or browse Trending." : category === "Trending" ? "Check back soon or try a category." : "Try Trending or check back soon.";

  const reopenSummary = () => {
    summaryRemainingMs.current = HOME_SUMMARY_VISIBLE_MS;
    summaryTimerStartedAt.current = null;
    setSummaryCollapsing(false);
    setSummaryInteracting(false);
    setShowSummary(true);
  };

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<HomeMarketFilter, number>> = { Trending: liveMarkets.length };
    liveMarkets.forEach((market) => {
      const normalized = normalizeCategory(market.category);
      counts[normalized] = (counts[normalized] || 0) + 1;
    });
    return counts;
  }, [liveMarkets]);

  const heroGreeting = user?.username ? `Welcome back, ${user.username}` : "Welcome";
  const heroSubtext = user ? "Your prediction dashboard" : "Explore live prediction markets";

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-[1320px] px-4 py-4 sm:px-6 lg:py-6">

        {/* ── Mobile Header ── */}
        <section className="mb-5 flex items-center justify-between gap-3 md:hidden">
          <Link to="/" className="flex items-center gap-2.5">
            <FlippeSymbol size="sm" />
            <span className="text-lg font-black tracking-[0.04em] text-[#111827]">FLIPPE</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/wallet"
              className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-black text-[#111827] shadow-sm"
            >
              <Wallet className="h-3.5 w-3.5 text-[#4F46E5]" />
              {formatNaira(user?.balance || 0)}
            </Link>
            <NotificationBell />
          </div>
        </section>

        {/* ── Hero Section (only when no search / no filter active) ── */}
        {!isSearching && category === "Trending" && (
          <section className="mb-6 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_14px_36px_rgba(17,24,39,0.05)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">
                  {heroGreeting}
                </h1>
                <p className="mt-1 text-sm font-bold text-[#6B7280]">{heroSubtext}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-xl bg-[#4F46E5]/8 px-3.5 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#12B886] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#12B886]" />
                  </span>
                  <span className="text-sm font-black text-[#111827]">{liveCount}</span>
                  <span className="text-xs font-bold text-[#6B7280]">live markets</span>
                </div>
                {totalVolume > 0 && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-[#F3F4F6] px-3.5 py-2">
                    <TrendingUp className="h-3.5 w-3.5 text-[#4F46E5]" />
                    <span className="text-sm font-black text-[#111827]">{formatNaira(totalVolume)}</span>
                    <span className="text-xs font-bold text-[#6B7280]">volume</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Search Bar ── */}
        <section className="mb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9CA3AF]" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search markets or topics"
              aria-label="Search markets"
              role="searchbox"
              className="h-[52px] w-full rounded-2xl border border-[#E5E7EB] bg-white pl-12 pr-20 text-[15px] font-bold text-[#111827] shadow-[0_8px_24px_rgba(17,24,39,0.05)] outline-none placeholder:text-[#9CA3AF] focus:border-[#4F46E5]/60 focus:ring-4 focus:ring-[#4F46E5]/10 transition-all"
            />
            <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-bold text-[#9CA3AF] shadow-sm">
              Ctrl K
            </kbd>
          </div>
        </section>

        {/* ── Category Pills ── */}
        <section className="mb-5">
          <div
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
            style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}
          >
            {HOME_MARKET_FILTERS.map((chip) => {
              const count = chip === "Trending" ? liveCount : Number(categoryCounts[chip] || 0);
              return (
                <button
                  key={chip}
                  onClick={() => setCategory(chip)}
                  role="tab"
                  aria-selected={category === chip}
                  className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-black transition-all duration-200 ease-out ${
                    category === chip
                      ? "bg-[#4F46E5] text-white shadow-[0_8px_20px_rgba(79,70,229,0.22)]"
                      : "border border-[#E5E7EB] bg-white text-[#667085] hover:border-[#C7D2FE] hover:text-[#111827]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {chip}
                    {count > 0 && (
                      <span
                        className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                          category === chip
                            ? "bg-white/20 text-white"
                            : "bg-[#F3F4F6] text-[#6B7280]"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Visit Summary ── */}
        {showSummary ? (
          <section
            className={`grid overflow-hidden transition-all duration-500 ease-out md:grid-cols-2 ${
              summaryCollapsing ? "mb-0 max-h-0 gap-0 -translate-y-2 opacity-0" : "mb-5 max-h-[340px] gap-3 translate-y-0 opacity-100"
            }`}
            onMouseEnter={() => setSummaryInteracting(true)}
            onMouseLeave={() => setSummaryInteracting(false)}
            onPointerDown={() => setSummaryInteracting(true)}
            onPointerUp={() => setSummaryInteracting(false)}
            onPointerCancel={() => setSummaryInteracting(false)}
            onFocus={() => setSummaryInteracting(true)}
            onBlur={() => setSummaryInteracting(false)}
          >
            <HomeSummaryCard icon={Clock} title="Since Your Last Visit" items={[
              newPredictionsSince > 0 ? `${newPredictionsSince} market updates` : "No market updates",
              newMarketsSince > 0 ? `${newMarketsSince} new markets` : "No new markets",
              activePositions.length > 0 ? `${activePositions.length} predictions still open` : "No open predictions",
            ]} />
            <ProgressSummaryCard level={user ? level : "Log in to track score"} streak={user ? currentStreak : 0} accuracy={user ? accuracy : 0} />
          </section>
        ) : (
          <button
            onClick={reopenSummary}
            className="mb-5 flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-black text-[#6B7280] shadow-sm transition-all duration-200 hover:border-[#4F46E5]/30 hover:shadow-md hover:text-[#111827]"
          >
            <Clock className="h-3 w-3" />
            Today's summary
          </button>
        )}

        {/* ── Market Grid ── */}
        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-black tracking-tight">{sectionTitle}</h2>
            <p className="mt-1 text-xs font-bold text-[#6B7280]">
              {sectionSubtext}
            </p>
          </div>

          {isLoadingMarkets && markets.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-64 rounded-2xl border border-[#E5E7EB] soft-shimmer" />
              ))}
            </div>
          ) : marketError && filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#F2C94C]/25 bg-[#F2C94C]/10 p-10 text-center">
              <h3 className="text-lg font-black">Could not load markets</h3>
              <p className="mt-1 text-sm text-amber-900/70">{marketError}</p>
              <button
                onClick={() => loadMarkets({ force: true })}
                className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#080c10]"
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4F46E5]/8">
                {isSearching ? (
                  <Search className="h-7 w-7 text-[#4F46E5]" />
                ) : (
                  <Sparkles className="h-7 w-7 text-[#4F46E5]" />
                )}
              </div>
              <h3 className="text-lg font-black">{emptyTitle}</h3>
              <p className="mt-2 max-w-sm mx-auto text-sm font-bold leading-relaxed text-[#6B7280]">
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

const HomeSummaryCard = ({ icon: Icon, title, items }: { icon: any; title: string; items: string[] }) => (
  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_14px_36px_rgba(17,24,39,0.06)]">
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F46E5]/10">
        <Icon className="h-3.5 w-3.5 text-[#4F46E5]" />
      </div>
      <h3 className="text-sm font-black text-[#111827]">{title}</h3>
    </div>
    <div className="grid gap-2 divide-y divide-[#F3F4F6] sm:grid-cols-3 sm:divide-x sm:divide-y-0 md:grid-cols-1 md:divide-x-0 md:divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0">
      {items.map((item) => (
        <div key={item} className="px-3 py-2">
          <span className="text-xs font-bold leading-relaxed text-[#6B7280]">{item}</span>
        </div>
      ))}
    </div>
  </div>
);

const ProgressSummaryCard = ({ level, streak, accuracy }: { level: string; streak: number; accuracy: number }) => (
  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_14px_36px_rgba(17,24,39,0.06)]">
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F46E5]/10">
        <Award className="h-3.5 w-3.5 text-[#4F46E5]" />
      </div>
      <h3 className="text-sm font-black text-[#111827]">Your Progress</h3>
    </div>
    <div className="grid grid-cols-3 divide-x divide-[#F3F4F6]">
      <div className="min-w-0 px-2.5 py-2 sm:px-3">
        <div className="text-[11px] font-bold text-[#6B7280]">Level</div>
        <div className="mt-1 break-words text-[12px] font-black leading-tight sm:text-sm">{level}</div>
      </div>
      <div className="min-w-0 px-2.5 py-2 sm:px-3">
        <div className="text-[11px] font-bold text-[#6B7280]">Streak</div>
        <div className="mt-1 break-words text-[12px] font-black leading-tight sm:text-sm">{streak}</div>
      </div>
      <div className="min-w-0 px-2.5 py-2 sm:px-3">
        <div className="text-[11px] font-bold text-[#6B7280]">Accuracy</div>
        <div className="mt-1 break-words text-[12px] font-black leading-tight sm:text-sm">{accuracy ? `${accuracy}%` : "-"}</div>
      </div>
    </div>
  </div>
);

export default Index;
