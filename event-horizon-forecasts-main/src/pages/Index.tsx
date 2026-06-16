import { useEffect, useMemo, useState } from "react";
import { Award, Clock, Search, Trophy, UserCircle, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { FlippeSymbol } from "@/components/FlippeBrand";
import { MobileNav } from "@/components/MobileNav";
import { MarketCard } from "@/components/MarketCard";
import { formatCountdown, getTrendingScore } from "@/lib/markets";
import { useMarketState } from "@/lib/market-state";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import { NotificationBell } from "@/components/NotificationBell";
import { categoryMatches, HOME_MARKET_FILTERS, type HomeMarketFilter, normalizeCategory } from "@/lib/categories";
import apiService, { type ApiPosition, type ApiProfileStats } from "@/lib/api";

const VISIT_KEY = "flippe_home_last_visit_v1";
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
  const { markets, loadMarkets, isLoadingMarkets, marketError } = useMarketState();
  const [now, setNow] = useState(Date.now());
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [stats, setStats] = useState<ApiProfileStats>(emptyStats);
  const [lastVisit] = useState<VisitSnapshot | null>(() => readVisitSnapshot());

  useEffect(() => {
    loadMarkets().catch(() => {
      // The shared market state keeps the last successful list, so Home should not flash empty.
    });
  }, [loadMarkets]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

  const filtered = useMemo(() => {
    let next = markets.filter(isLiveMarket);
    if (category !== "Trending") {
      next = next.filter((market) => categoryMatches(market.category, category));
    }
    next.sort((a, b) => getTrendingScore(b) - getTrendingScore(a));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      next = next.filter((market) =>
        market.question.toLowerCase().includes(query) ||
        normalizeCategory(market.category).toLowerCase().includes(query)
      );
    }
    return next;
  }, [markets, category, searchQuery]);

  const liveCount = markets.filter(isLiveMarket).length;
  const liveMarkets = useMemo(() => markets.filter(isLiveMarket), [markets]);
  const totalTradeCount = liveMarkets.reduce((sum, market) => sum + Number(market.tradeCount || 0), 0);
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
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<HomeMarketFilter, number>> = { Trending: liveMarkets.length };
    liveMarkets.forEach((market) => {
      const normalized = normalizeCategory(market.category);
      counts[normalized] = (counts[normalized] || 0) + 1;
    });
    return counts;
  }, [liveMarkets]);

  return (
    <div className="app-bg min-h-screen pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-[1320px] px-4 py-4 sm:px-6 lg:py-6">
        <section className="mb-4 flex items-center justify-between gap-3 md:hidden">
          <div className="flex items-center gap-3">
            <FlippeSymbol size="md" />
            <div>
              <div className="text-2xl font-black tracking-[0.04em]">FLIPPE</div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#8B98A8]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#12B886]" />
                {liveCount} live markets
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/wallet" className="rounded-xl border border-[#263241] bg-[#101720] px-3 py-2 text-xs font-black">
              <Wallet className="mr-1 inline h-3.5 w-3.5 text-[#12B886]" />
              {formatNaira(user?.balance || 0)}
            </Link>
            <NotificationBell />
            <Link to={user ? "/more" : "/login"} className="grid h-10 w-10 place-items-center rounded-full border border-[#263241] bg-[#151E28] text-white">
              {user?.username?.charAt(0).toUpperCase() || <UserCircle className="h-5 w-5" />}
            </Link>
          </div>
        </section>

        <section className="sticky top-0 z-30 mb-4 space-y-3 border-b border-[#263241] bg-[#080c10]/94 py-2 backdrop-blur-xl md:top-[65px]" data-now={now}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B98A8]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search markets or topics"
              className="h-12 w-full rounded-xl border border-[#263241] bg-[#101720] pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-[#8B98A8] focus:border-[#12B886]/70"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {HOME_MARKET_FILTERS.map((chip) => (
              <button
                key={chip}
                onClick={() => setCategory(chip)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                  category === chip
                    ? "bg-[#12B886] text-[#06100d]"
                    : "border border-[#263241] bg-[#101720] text-[#8B98A8] hover:text-white"
                }`}
              >
                {chip}
                {chip !== "Trending" && Number(categoryCounts[chip] || 0) > 0 && (
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                    category === chip ? "bg-[#06100d]/15 text-[#06100d]" : "bg-[#151E28] text-[#8B98A8]"
                  }`}>
                    {categoryCounts[chip]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5 grid gap-3 md:grid-cols-2">
          <HomeSummaryCard icon={Clock} title="Since Your Last Visit" items={[
            newPredictionsSince > 0 ? `${newPredictionsSince} market updates` : "No market updates",
            newMarketsSince > 0 ? `${newMarketsSince} new markets` : "No new markets",
            activePositions.length > 0 ? `${activePositions.length} predictions still open` : "No open predictions",
          ]} />
          <ProgressSummaryCard level={user ? level : "Log in to track score"} streak={user ? currentStreak : 0} accuracy={user ? accuracy : 0} />
        </section>

        <section>
            <div className="mb-4">
              <h1 className="text-2xl font-black tracking-tight">Trending Now</h1>
              <p className="mt-1 text-xs font-bold text-[#8B98A8]">
                Pick a question, choose YES or NO, and track it in My Predictions.
              </p>
            </div>

            {isLoadingMarkets && markets.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="h-64 rounded-2xl border border-[#263241] soft-shimmer" />
                ))}
              </div>
            ) : marketError && filtered.length === 0 ? (
              <div className="rounded-2xl border border-[#F2C94C]/25 bg-[#F2C94C]/10 p-10 text-center">
                <h3 className="text-lg font-black">Could not load markets</h3>
                <p className="mt-1 text-sm text-amber-100/70">{marketError}</p>
                <button
                  onClick={() => loadMarkets({ force: true })}
                  className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#080c10]"
                >
                  Retry
                </button>
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {filtered.map((market, index) => (
                  <div key={market.id} className="animate-fade-up" style={{ animationDelay: `${index * 30}ms` }}>
                    <MarketCard m={market} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#263241] bg-[#101720]/60 p-10 text-center">
                <h3 className="text-lg font-black">{category === "Trending" ? "No trending markets yet" : `No ${category} markets yet`}</h3>
                <p className="mt-1 text-sm text-[#8B98A8]">
                  {category === "Trending" ? "Check back soon or try a category." : "Try Trending or check back soon."}
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
  <div className="rounded-2xl border border-[#263241] bg-[#101720] p-4">
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-[#12B886]" />
      <h2 className="text-sm font-black">{title}</h2>
    </div>
    <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item} className="rounded-xl border border-[#263241] bg-[#151E28] px-3 py-2 text-xs font-bold text-[#D5DEE8]">
          {item}
        </div>
      ))}
    </div>
  </div>
);

const ProgressSummaryCard = ({ level, streak, accuracy }: { level: string; streak: number; accuracy: number }) => (
  <div className="rounded-2xl border border-[#263241] bg-[#101720] p-4">
    <div className="mb-3 flex items-center gap-2">
      <Award className="h-4 w-4 text-[#12B886]" />
      <h2 className="text-sm font-black">Your Progress</h2>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-xl border border-[#263241] bg-[#151E28] p-3">
        <div className="text-[11px] font-bold text-[#8B98A8]">Level</div>
        <div className="mt-1 truncate text-sm font-black">{level}</div>
      </div>
      <div className="rounded-xl border border-[#263241] bg-[#151E28] p-3">
        <div className="text-[11px] font-bold text-[#8B98A8]">Streak</div>
        <div className="mt-1 text-sm font-black">{streak}</div>
      </div>
      <div className="rounded-xl border border-[#263241] bg-[#151E28] p-3">
        <div className="text-[11px] font-bold text-[#8B98A8]">Accuracy</div>
        <div className="mt-1 text-sm font-black">{accuracy ? `${accuracy}%` : "-"}</div>
      </div>
    </div>
  </div>
);

const getCurrentWinStreak = (resolved: ApiPosition[]) => {
  const recent = [...resolved].sort((a, b) => new Date(b.resolvedAt || b.createdAt).getTime() - new Date(a.resolvedAt || a.createdAt).getTime());
  let streak = 0;
  for (const position of recent) {
    if (!position.isWinner) break;
    streak += 1;
  }
  return streak;
};

const LEVELS = [
  { name: "Rookie", score: 0 },
  { name: "Sharp Thinker", score: 5 },
  { name: "Analyst", score: 18 },
  { name: "Expert", score: 40 },
  { name: "Elite Forecaster", score: 70 },
  { name: "Market Master", score: 120 },
];

const getScore = (totalPredictions: number, wins: number) => totalPredictions + wins * 2;

const getForecasterLevel = (totalPredictions: number, wins: number) => {
  const score = getScore(totalPredictions, wins);
  return [...LEVELS].reverse().find((level) => score >= level.score)?.name || "Rookie";
};

export default Index;
