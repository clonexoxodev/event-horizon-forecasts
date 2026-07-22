import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Coins,
  History,
  Layers,
  Loader2,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { MarketCard } from "@/components/MarketCard";
import { getTrendingScore, formatNaira, formatCountdown } from "@/lib/markets";
import { useMarketState } from "@/lib/market-state";
import { useAuth } from "@/lib/auth";
import {
  categoryMatches,
  HOME_MARKET_FILTERS,
  type HomeMarketFilter,
  normalizeCategory,
} from "@/lib/categories";
import apiService from "@/lib/api";

const isLiveMarket = (market: {
  status?: string;
  closeTime?: string;
  tradingCloseTime?: string;
}) => {
  const closeTime = market.tradingCloseTime || market.closeTime;
  const hasEnded = closeTime ? new Date(closeTime).getTime() <= Date.now() : false;
  return market.status === "active" && !hasEnded;
};

const OPEN_ORDER_STATUSES = new Set(["pending", "waiting", "partial"]);

const PositionItem = ({
  marketQuestion,
  side,
  stake,
  currentValue,
  marketId,
}: {
  marketQuestion: string;
  side: string;
  stake: number;
  currentValue: number;
  marketId: string;
}) => {
  const pnl = currentValue - stake;
  const pnlPercent = stake > 0 ? ((pnl / stake) * 100).toFixed(1) : "0.0";
  const isProfit = pnl >= 0;
  return (
    <Link
      to={`/market/${marketId}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 transition-all hover:border-[#4F46E5]/20 hover:shadow-sm"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-[#111827]">
          {marketQuestion}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              side === "YES"
                ? "bg-[#12B886]/10 text-[#047857]"
                : "bg-[#E85D5D]/10 text-[#B42318]"
            }`}
          >
            {side}
          </span>
          <span className="text-[11px] text-[#9CA3AF]">
            {formatNaira(stake)}
          </span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-bold text-[#111827]">
          {formatNaira(currentValue)}
        </p>
        <p
          className={`text-[11px] font-semibold ${
            isProfit ? "text-[#12B886]" : "text-[#E85D5D]"
          }`}
        >
          {isProfit ? "+" : ""}
          {pnlPercent}%
        </p>
      </div>
    </Link>
  );
};

const TrendingMiniCard = ({
  market,
  onClick,
}: {
  market: any;
  onClick: () => void;
}) => {
  const tradingCloseTime = market.tradingCloseTime || market.closeTime;
  const nairaSymbol = "\u20A6";
  return (
    <button
      onClick={onClick}
      className="group flex w-[260px] shrink-0 flex-col rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#4F46E5]/15 hover:shadow-[0_6px_24px_rgba(17,24,39,0.08)] active:translate-y-0"
    >
      <p className="line-clamp-2 text-[13px] font-bold leading-snug text-[#111827]">
        {market.question}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className="inline-flex items-center gap-1 rounded-lg bg-[#12B886]/10 px-2 py-1 text-[12px] font-bold text-[#047857]">
          YES {nairaSymbol}
          {Math.round(market.yesPrice)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-[#E85D5D]/10 px-2 py-1 text-[12px] font-bold text-[#B42318]">
          NO {nairaSymbol}
          {Math.round(market.noPrice)}
        </span>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] font-semibold text-[#9CA3AF]">
          <Clock className="h-2.5 w-2.5" />
          {formatCountdown(tradingCloseTime, market.closesIn)}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-[#9CA3AF]">
          <Users className="h-2.5 w-2.5" />
          {(market.participants || 0).toLocaleString()}
        </span>
      </div>
      {market.priceHistory && market.priceHistory.length > 1 && (
        <div className="mt-2 h-6 w-full">
          <MiniSparkline
            data={market.priceHistory.map((p: any) => p.yesPrice)}
          />
        </div>
      )}
    </button>
  );
};

const MiniSparkline = ({ data }: { data: number[] }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 24;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const isUp = data[data.length - 1] >= data[0];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? "#12B886" : "#E85D5D"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const SectionDivider = () => (
  <div className="my-6 h-px bg-gradient-to-r from-transparent via-[#E5E7EB] to-transparent" />
);

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<HomeMarketFilter>("Trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"trending" | "newest" | "closing">(
    "trending"
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { markets, loadMarkets, isLoadingMarkets, marketError } =
    useMarketState();

  const [walletData, setWalletData] = useState<{
    available: number;
    locked: number;
  } | null>(null);
  const [userPositions, setUserPositions] = useState<any[]>([]);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [dashLoading, setDashLoading] = useState(false);

  const isLoggedIn = !!user;

  const loadDashboardData = useCallback(async () => {
    if (!isLoggedIn) return;
    setDashLoading(true);
    try {
      const [walletRes, positionsRes] = await Promise.allSettled([
        apiService.getWallet(),
        apiService.getPositions(),
      ]);

      if (walletRes.status === "fulfilled") {
        const w = walletRes.value.wallet;
        const available =
          typeof w.available === "number"
            ? w.available
            : typeof w.availableNgn === "number"
              ? w.availableNgn
              : typeof w.availableNgnKobo === "number"
                ? w.availableNgnKobo / 100
                : typeof w.balanceNgn === "number"
                  ? w.balanceNgn
                  : typeof w.balanceNgnKobo === "number"
                    ? w.balanceNgnKobo / 100
                    : 0;
        const locked =
          typeof w.locked === "number"
            ? w.locked
            : typeof w.lockedNgn === "number"
              ? w.lockedNgn
              : typeof w.lockedNgnKobo === "number"
                ? w.lockedNgnKobo / 100
                : 0;
        setWalletData({ available, locked });
      }

      if (positionsRes.status === "fulfilled") {
        const positions = positionsRes.value.positions || [];
        setUserPositions(positions);

        const activePositions = positions.filter(
          (p: any) =>
            p.marketStatus === "active" &&
            (!p.tradingCloseTime ||
              new Date(p.tradingCloseTime).getTime() > Date.now())
        );
        setOpenOrders(activePositions.slice(0, 5));
      }
    } catch {
    } finally {
      setDashLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadMarkets().catch(() => {});
  }, [loadMarkets]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMarkets({ force: true }).catch(() => {});
        if (isLoggedIn) loadDashboardData();
      }
    }, 15000);
    return () => window.clearInterval(refresh);
  }, [loadMarkets, isLoggedIn, loadDashboardData]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      const inInput = tag === "input" || tag === "textarea" || tag === "select";
      if (
        (e.key === "k" && (e.ctrlKey || e.metaKey)) ||
        (e.key === "/" && !inInput)
      ) {
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

  const trendingMarkets = useMemo(
    () =>
      [...liveMarkets]
        .sort((a, b) => getTrendingScore(b) - getTrendingScore(a))
        .slice(0, 5),
    [liveMarkets]
  );

  const topMarketsPreview = useMemo(
    () =>
      [...liveMarkets]
        .sort((a, b) => getTrendingScore(b) - getTrendingScore(a))
        .slice(0, 6),
    [liveMarkets]
  );

  const filtered = useMemo(() => {
    let next = [...liveMarkets];

    if (!isSearching && category !== "Trending") {
      next = next.filter((market) =>
        categoryMatches(market.category, category)
      );
    }

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
          Array.isArray((market as any).tags)
            ? (market as any).tags.join(" ")
            : (market as any).tags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(query);
      });
    }

    if (sortMode === "trending") {
      next.sort((a, b) => getTrendingScore(b) - getTrendingScore(a));
    } else if (sortMode === "newest") {
      next.sort(
        (a, b) =>
          new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime()
      );
    } else if (sortMode === "closing") {
      next.sort(
        (a, b) =>
          new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
      );
    }

    return next;
  }, [liveMarkets, category, isSearching, trimmedSearch, sortMode]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<HomeMarketFilter, number>> = {
      Trending: liveMarkets.length,
    };
    liveMarkets.forEach((market) => {
      const normalized = normalizeCategory(market.category);
      counts[normalized] = (counts[normalized] || 0) + 1;
    });
    return counts;
  }, [liveMarkets]);

  const portfolioValue = walletData
    ? walletData.available + walletData.locked
    : user?.balance || 0;
  const todayPnl = useMemo(() => {
    return userPositions.reduce((sum: number, p: any) => {
      const pnl =
        (p.currentValue || p.stake || 0) - (p.stake || 0);
      return sum + pnl;
    }, 0);
  }, [userPositions]);

  const totalVolumeTraded = useMemo(() => {
    return liveMarkets.reduce(
      (sum: number, m: any) => sum + (m.totalPool || m.totalVolume || m.pool || 0),
      0
    );
  }, [liveMarkets]);

  const totalTraders = useMemo(() => {
    const seen = new Set<string>();
    liveMarkets.forEach((m: any) => {
      if (m.participants) seen.add(String(m.participants));
    });
    return liveMarkets.reduce(
      (sum: number, m: any) => sum + (m.participants || 0),
      0
    );
  }, [liveMarkets]);

  const sectionTitle = isSearching
    ? `Results for "${trimmedSearch}"`
    : category === "Trending"
      ? "All Markets"
      : `${category} Markets`;

  const emptyTitle = isSearching
    ? `No markets found for "${trimmedSearch}"`
    : category === "Trending"
      ? "No trending markets yet"
      : `No ${category} markets yet`;
  const emptyBody = isSearching
    ? "Try another keyword or browse all categories."
    : "Check back soon.";

  if (!isLoggedIn) {
    return (
      <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
        <Header />
        <main>
          <section className="relative overflow-hidden bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#818CF8] px-4 py-16 sm:px-6 sm:py-24">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2Mkg0di0yaDM2em0wLTR2MkgyMHYtMmgxNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
            <div className="relative mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
                <Zap className="h-4 w-4" />
                {liveCount} Live Markets
              </div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Trade Real-World
                <br />
                Outcomes
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/80">
                Predict what happens next. Join thousands of traders on Flippe
                and earn from your insights.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-[#4F46E5] shadow-lg shadow-black/10 transition-all hover:bg-[#F9FAFB] hover:shadow-xl active:scale-[0.98]"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10"
                >
                  See How It Works
                </a>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#111827]">
                Trending Markets
              </h2>
              <Link
                to="/markets"
                className="flex items-center gap-1 text-sm font-semibold text-[#4F46E5] transition-colors hover:text-[#4338CA]"
              >
                View All
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {isLoadingMarkets && markets.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-56 rounded-2xl border border-[#E5E7EB] bg-white soft-shimmer"
                  />
                ))}
              </div>
            ) : topMarketsPreview.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topMarketsPreview.map((market, index) => (
                  <div
                    key={market.id}
                    className="opacity-0 animate-fade-up"
                    style={{
                      animationDelay: `${Math.min(index * 60, 300)}ms`,
                    }}
                  >
                    <MarketCard m={market} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white/60 p-12 text-center">
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-[#4F46E5]" />
                <p className="text-sm font-semibold text-[#6B7280]">
                  Markets are loading...
                </p>
              </div>
            )}
          </section>

          <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
            <SectionDivider />
          </div>

          <section
            id="how-it-works"
            className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6"
          >
            <h2 className="mb-8 text-center text-xl font-bold text-[#111827]">
              How It Works
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Fund Your Wallet",
                  desc: "Deposit NGN securely via bank transfer or card.",
                  icon: Wallet,
                },
                {
                  step: "2",
                  title: "Choose a Market",
                  desc: "Browse live markets on topics you know best.",
                  icon: Layers,
                },
                {
                  step: "3",
                  title: "Place Your Order",
                  desc: "Buy YES or NO shares at current prices.",
                  icon: Zap,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="relative rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center shadow-sm"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF2FF]">
                    <item.icon className="h-5 w-5 text-[#4F46E5]" />
                  </div>
                  <span className="absolute right-4 top-4 text-3xl font-black text-[#E5E7EB]">
                    {item.step}
                  </span>
                  <h3 className="text-[15px] font-bold text-[#111827]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7280]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
            <SectionDivider />
          </div>

          <section className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 text-center shadow-sm">
                <p className="text-2xl font-black tabular-nums text-[#111827]">
                  {liveCount}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                  Active Markets
                </p>
              </div>
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 text-center shadow-sm">
                <p className="text-2xl font-black tabular-nums text-[#111827]">
                  {formatNaira(totalVolumeTraded)}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                  Total Traded
                </p>
              </div>
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 text-center shadow-sm">
                <p className="text-2xl font-black tabular-nums text-[#111827]">
                  {totalTraders.toLocaleString()}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                  Traders
                </p>
              </div>
            </div>
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

        <section className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#111827] sm:text-3xl">
                Welcome back, {user?.username || "Trader"}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[#6B7280]">
                {liveCount > 0 ? (
                  <>
                    <span className="inline-flex h-2 w-2 rounded-full bg-[#12B886] shadow-[0_0_6px_rgba(18,184,134,0.5)]" />
                    {liveCount} live markets
                  </>
                ) : (
                  "Loading markets..."
                )}
              </p>
            </div>
            <Link
              to="/wallet"
              className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-5 py-2.5 text-sm font-bold text-white shadow-[0_2px_12px_rgba(79,70,229,0.3)] transition-all hover:bg-[#4338CA] hover:shadow-[0_4px_16px_rgba(79,70,229,0.4)] active:scale-[0.97]"
            >
              <Wallet className="h-4 w-4" />
              Deposit
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#F3F4F6] px-3.5 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Portfolio
              </p>
              <p className="mt-0.5 text-base font-black tabular-nums text-[#111827]">
                {dashLoading ? (
                  <Loader2 className="inline h-4 w-4 animate-spin text-[#9CA3AF]" />
                ) : (
                  formatNaira(portfolioValue)
                )}
              </p>
            </div>
            <div className="rounded-xl bg-[#F3F4F6] px-3.5 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Today P&L
              </p>
              <p
                className={`mt-0.5 text-base font-black tabular-nums ${
                  todayPnl >= 0 ? "text-[#12B886]" : "text-[#E85D5D]"
                }`}
              >
                {dashLoading ? (
                  <Loader2 className="inline h-4 w-4 animate-spin text-[#9CA3AF]" />
                ) : (
                  <>
                    {todayPnl >= 0 ? "+" : ""}
                    {formatNaira(todayPnl)}
                  </>
                )}
              </p>
            </div>
            <div className="rounded-xl bg-[#F3F4F6] px-3.5 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Positions
              </p>
              <p className="mt-0.5 text-base font-black tabular-nums text-[#111827]">
                {dashLoading ? (
                  <Loader2 className="inline h-4 w-4 animate-spin text-[#9CA3AF]" />
                ) : (
                  userPositions.length
                )}
              </p>
            </div>
          </div>
        </section>

        {openOrders.length > 0 && (
          <>
            <SectionDivider />
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-bold text-[#111827]">
                  <History className="h-4 w-4 text-[#4F46E5]" />
                  Your Positions
                </h2>
                <Link
                  to="/portfolio"
                  className="flex items-center gap-1 text-xs font-semibold text-[#4F46E5] transition-colors hover:text-[#4338CA]"
                >
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {openOrders.map((pos: any) => (
                  <PositionItem
                    key={pos.id}
                    marketQuestion={pos.marketQuestion || "Unknown market"}
                    side={pos.side}
                    stake={pos.stake || 0}
                    currentValue={pos.currentValue || pos.stake || 0}
                    marketId={pos.marketId}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        <SectionDivider />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#111827]">
              <TrendingUp className="h-4 w-4 text-[#4F46E5]" />
              Trending Now
            </h2>
          </div>
          <div
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollBehavior: "smooth",
            }}
          >
            {trendingMarkets.length > 0 ? (
              trendingMarkets.map((market) => (
                <TrendingMiniCard
                  key={market.id}
                  market={market}
                  onClick={() => navigate(`/market/${market.id}`)}
                />
              ))
            ) : (
              <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-dashed border-[#D1D5DB]">
                <Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" />
              </div>
            )}
          </div>
        </section>

        <SectionDivider />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#111827]">
              <Trophy className="h-4 w-4 text-[#4F46E5]" />
              Recently Traded
            </h2>
          </div>
          {userPositions.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {userPositions.slice(0, 5).map((pos: any) => {
                const pnl =
                  (pos.currentValue || pos.stake || 0) - (pos.stake || 0);
                return (
                  <Link
                    key={pos.id}
                    to={`/market/${pos.marketId}`}
                    className="flex w-[240px] shrink-0 flex-col rounded-2xl border border-[#E5E7EB] bg-white p-3.5 transition-all hover:border-[#4F46E5]/20 hover:shadow-sm"
                  >
                    <p className="line-clamp-2 text-[12px] font-bold text-[#111827]">
                      {pos.marketQuestion || "Unknown market"}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          pos.side === "YES"
                            ? "bg-[#12B886]/10 text-[#047857]"
                            : "bg-[#E85D5D]/10 text-[#B42318]"
                        }`}
                      >
                        {pos.side}
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          pnl >= 0 ? "text-[#12B886]" : "text-[#E85D5D]"
                        }`}
                      >
                        {pnl >= 0 ? "+" : ""}
                        {formatNaira(pnl)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white/60 p-8 text-center">
              <Coins className="mx-auto mb-2 h-6 w-6 text-[#9CA3AF]" />
              <p className="text-[13px] font-semibold text-[#9CA3AF]">
                No positions yet. Start trading to see them here.
              </p>
            </div>
          )}
        </section>

        <SectionDivider />

        <section className="mb-5">
          <div
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollBehavior: "smooth",
            }}
            role="tablist"
          >
            {HOME_MARKET_FILTERS.map((chip) => {
              const count =
                chip === "Trending"
                  ? liveCount
                  : Number(categoryCounts[chip] || 0);
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
                  {isActive && chip === "Trending" && (
                    <TrendingUp className="mr-1 inline h-3.5 w-3.5 -mt-0.5" />
                  )}
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

        <section className="mb-5">
          <div className="relative group">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9CA3AF] transition-colors group-focus-within:text-[#4F46E5]" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search markets, topics, events..."
              aria-label="Search markets"
              role="searchbox"
              className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-11 pr-20 text-sm font-medium text-[#111827] shadow-sm outline-none placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06] transition-all duration-200"
            />
            <kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-1 text-[11px] font-semibold text-[#9CA3AF] tabular-nums">
              Ctrl K
            </kbd>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-[#111827]">
              {sectionTitle}
            </h2>
            <div className="flex items-center gap-2">
              {!isSearching && filtered.length > 0 && (
                <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-xs font-bold text-[#4F46E5] tabular-nums">
                  {filtered.length}
                </span>
              )}
              {!isSearching && (
                <div className="flex rounded-lg border border-[#E5E7EB] bg-white p-0.5">
                  {(
                    [
                      ["trending", TrendingUp],
                      ["newest", Clock],
                      ["closing", Zap],
                    ] as const
                  ).map(([mode, Icon]) => (
                    <button
                      key={mode}
                      onClick={() => setSortMode(mode)}
                      title={
                        mode === "trending"
                          ? "Trending"
                          : mode === "newest"
                            ? "Newest"
                            : "Closing Soon"
                      }
                      className={`rounded-md p-1.5 transition-all ${
                        sortMode === mode
                          ? "bg-[#4F46E5] text-white shadow-sm"
                          : "text-[#9CA3AF] hover:text-[#6B7280]"
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
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="h-56 rounded-2xl border border-[#E5E7EB] bg-white soft-shimmer"
                />
              ))}
            </div>
          ) : marketError && filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                <Sparkles className="h-5 w-5 text-[#E85D5D]" />
              </div>
              <h3 className="text-base font-bold text-[#111827]">
                Could not load markets
              </h3>
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
              {filtered.map((market, index) => (
                <div
                  key={market.id}
                  role="listitem"
                  className="opacity-0 animate-fade-up"
                  style={{
                    animationDelay: `${Math.min(index * 50, 400)}ms`,
                  }}
                >
                  <MarketCard m={market} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white/60 p-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                {isSearching ? (
                  <Search className="h-6 w-6 text-[#4F46E5]" />
                ) : (
                  <TrendingUp className="h-6 w-6 text-[#4F46E5]" />
                )}
              </div>
              <h3 className="text-base font-bold text-[#111827]">
                {emptyTitle}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#9CA3AF]">
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
