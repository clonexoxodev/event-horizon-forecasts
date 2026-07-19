import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Clock,
  Flame,
  LineChart,
  Loader2,
  Medal,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import apiService, { type ApiPosition, type ApiProfileStats } from "@/lib/api";
import { formatCountdown, formatNaira, formatNairaPrice, MARKET_ACTIVATION_REQUIREMENTS } from "@/lib/markets";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import {
  getCurrentWinStreak,
  getBestWinStreak,
  getScore,
  getForecasterLevel,
  getNextLevel,
  getLevelProgress,
  LEVELS,
} from "@/lib/levels";

type PositionFilterTab = "active" | "resolved" | "all";

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

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getLevelIcon = (levelName: string) => {
  switch (levelName) {
    case "Rookie":
      return Shield;
    case "Sharp Thinker":
      return Zap;
    case "Analyst":
      return BarChart3;
    case "Expert":
      return Award;
    case "Elite Forecaster":
      return Medal;
    case "Market Master":
      return Trophy;
    default:
      return Shield;
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [stats, setStats] = useState<ApiProfileStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [positionTab, setPositionTab] = useState<PositionFilterTab>("active");
  const [selectedPosition, setSelectedPosition] = useState<ApiPosition | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const loadPortfolio = async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const [positionResponse, statsResponse] = await Promise.all([
          apiService.getPositions(),
          apiService.getProfileStats(),
        ]);
        if (!mounted) return;
        setPositions(positionResponse.positions || []);
        setStats(statsResponse.stats || emptyStats);
      } catch (error) {
        if (!mounted) return;
        console.warn("My Predictions request failed", error);
      } finally {
        if (mounted) {
          if (!silent) {
            setLoading(false);
          }
        }
      }
    };

    loadPortfolio();
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") loadPortfolio({ silent: true });
    }, 30000);
    return () => {
      mounted = false;
      window.clearInterval(refresh);
    };
  }, [authLoading, userId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activePositions = useMemo(
    () => positions.filter((position) => getPredictionDisplayStatus(position, now).isOpen),
    [positions, now]
  );

  const settledPositions = useMemo(
    () => positions.filter((position) => !getPredictionDisplayStatus(position, now).isOpen),
    [positions, now]
  );

  const resolvedPositions = useMemo(
    () => positions.filter((position) => position.resolvedAt),
    [positions]
  );

  const wonPositions = useMemo(
    () => resolvedPositions.filter((position) => position.isWinner),
    [resolvedPositions]
  );

  const filteredPositions = useMemo(() => {
    if (positionTab === "active") return activePositions;
    if (positionTab === "resolved") return settledPositions;
    return positions;
  }, [positionTab, activePositions, settledPositions, positions]);

  const totalScore = getScore(stats.totalPredictions, wonPositions.length);
  const level = stats.level || getForecasterLevel(stats.totalPredictions, wonPositions.length);
  const nextLevel = getNextLevel(level);
  const progress = getLevelProgress(stats.totalPredictions, wonPositions.length);
  const winRate = resolvedPositions.length ? Math.round((wonPositions.length / resolvedPositions.length) * 100) : 0;
  const LevelIcon = getLevelIcon(level);

  const currentLevelIndex = Math.max(0, LEVELS.findIndex((l) => l.name === level));
  const currentLevelScore = LEVELS[currentLevelIndex]?.score || 0;
  const nextLevelObj = LEVELS[Math.min(currentLevelIndex + 1, LEVELS.length - 1)];
  const nextLevelScore = nextLevelObj?.score || currentLevelScore;
  const pointsToNext = level === nextLevel ? 0 : Math.max(0, nextLevelScore - totalScore);

  if (authLoading) {
    return <SessionLoading label="Restoring your predictions..." />;
  }

  if (!user) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 text-center">
          <div>
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-[#E5E7EB] bg-white text-[#4F46E5]">
              <LineChart className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Track your predictions</h1>
            <p className="mt-3 text-sm text-[#6B7280]">
              Log in to see open predictions, resolved results, and wallet-linked history.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex h-12 items-center rounded-xl bg-[#4F46E5] px-6 text-sm font-bold text-white hover:bg-[#4338CA]"
            >
              Log in
            </Link>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen overflow-x-hidden pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
        {/* ── Header Section ── */}
        <section className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#6B7280]">{getGreeting()},</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                {user.name || user.username || "Forecaster"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 shadow-sm">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#4F46E5]/10">
                  <LevelIcon className="h-4 w-4 text-[#4F46E5]" />
                </div>
                <span className="text-sm font-bold text-[#111827]">{level}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-4 py-2.5 text-white shadow-lg shadow-[#4F46E5]/25">
                <Zap className="h-4 w-4" />
                <AnimatedNumber value={totalScore} className="text-sm font-bold" />
                <span className="text-xs font-bold opacity-80">pts</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Grid ── */}
        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={Target}
            label="Total Predictions"
            value={stats.totalPredictions}
            bgGradient="from-[#EEF2FF] to-[#F5F3FF]"
            iconBg="bg-[#4F46E5]/10"
            iconColor="text-[#4F46E5]"
          />
          <StatCard
            icon={Zap}
            label="Active"
            value={activePositions.length}
            bgGradient="from-[#FEF3C7] to-[#FFFBEB]"
            iconBg="bg-[#D97706]/10"
            iconColor="text-[#D97706]"
          />
          <StatCard
            icon={Trophy}
            label="Won"
            value={wonPositions.length}
            bgGradient="from-[#D1FAE5] to-[#ECFDF5]"
            iconBg="bg-[#059669]/10"
            iconColor="text-[#059669]"
          />
          <StatCard
            icon={TrendingUp}
            label="Win Rate"
            value={winRate}
            suffix="%"
            bgGradient="from-[#EDE9FE] to-[#F5F3FF]"
            iconBg="bg-[#7C3AED]/10"
            iconColor="text-[#7C3AED]"
          />
        </section>

        {/* ── Level Progress ── */}
        <section className="mb-6 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5]">
                <LevelIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#111827]">{level}</div>
                <div className="text-xs text-[#6B7280]">
                  {level === nextLevel
                    ? "Top level reached!"
                    : `${pointsToNext} pts to ${nextLevel}`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1">
                <AnimatedNumber value={totalScore} className="text-2xl font-black text-[#4F46E5]" />
              </div>
              <div className="text-xs font-bold text-[#6B7280]">total points</div>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#E5E7EB]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-bold text-[#6B7280]">
            <span>{progress}%</span>
            <span>{level === nextLevel ? "Max level" : `Next: ${nextLevel}`}</span>
          </div>
        </section>

        {/* ── Tab Navigation ── */}
        <section className="mb-5">
          <div
            role="tablist"
            className="flex gap-1 rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-sm"
          >
            {(["active", "resolved", "all"] as PositionFilterTab[]).map((item) => {
              const count =
                item === "active"
                  ? activePositions.length
                  : item === "resolved"
                    ? settledPositions.length
                    : positions.length;
              const isActive = positionTab === item;
              const tabId = `position-tab-${item}`;
              const panelId = `position-panel-${item}`;
              return (
                <button
                  key={item}
                  role="tab"
                  id={tabId}
                  aria-selected={isActive}
                  aria-controls={panelId}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setPositionTab(item)}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-bold capitalize transition-all duration-200 ${
                    isActive
                      ? "bg-[#4F46E5] text-white shadow-md shadow-[#4F46E5]/25"
                      : "text-[#6B7280] hover:bg-[#F8F7F4] hover:text-[#111827]"
                  }`}
                >
                  <span className="hidden sm:inline">{item === "active" ? "Active" : item === "resolved" ? "Resolved" : "All"}</span>
                  <span className="sm:hidden">{item === "active" ? "Active" : item === "resolved" ? "Done" : "All"}</span>
                  <span
                    className={`ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#F3F4F6] text-[#6B7280]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Position Cards ── */}
        <div
          role="tabpanel"
          id={`position-panel-${positionTab}`}
          aria-labelledby={`position-tab-${positionTab}`}
        >
          {loading ? (
            <div className="grid min-h-[360px] place-items-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" />
            </div>
          ) : filteredPositions.length === 0 ? (
            positionTab === "active" ? (
              <EmptyState
                icon={Target}
                title="No active predictions"
                body="Your open positions will appear here. Pick a market and back your instinct."
                action={
                  <Link
                    to="/"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#4F46E5] px-5 text-sm font-bold text-white hover:bg-[#4338CA]"
                  >
                    Explore markets <ArrowRight className="h-4 w-4" />
                  </Link>
                }
              />
            ) : positionTab === "resolved" ? (
              <EmptyState
                icon={CheckCircle}
                title="No resolved predictions yet"
                body="Won, lost, and refunded predictions will show here once markets resolve."
                action={
                  <Link
                    to="/"
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#111827] transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Explore markets <ArrowRight className="h-4 w-4" />
                  </Link>
                }
              />
            ) : (
              <EmptyState
                icon={LineChart}
                title="No predictions yet"
                body="Start forecasting to build your prediction portfolio and track your performance."
                action={
                  <Link
                    to="/"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#4F46E5] px-5 text-sm font-bold text-white hover:bg-[#4338CA]"
                  >
                    Make your first prediction <ArrowRight className="h-4 w-4" />
                  </Link>
                }
              />
            )
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredPositions.map((position) => (
                <PositionCard
                  key={position.id}
                  position={position}
                  now={now}
                  onClick={() => setSelectedPosition(position)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Activity Feed ── */}
        <ActivityFeed positions={positions} settledCount={settledPositions.length} />

        {/* ── Achievements ── */}
        <AchievementsSection positions={positions} stats={stats} />
      </main>

      {selectedPosition && (
        <PredictionDetailModal
          position={selectedPosition}
          now={now}
          onClose={() => setSelectedPosition(null)}
          onViewMarket={() => {
            const marketId = selectedPosition?.marketId;
            setSelectedPosition(null);
            if (marketId) navigate(`/market/${marketId}`);
          }}
        />
      )}
      <MobileNav />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Stat Card
   ═══════════════════════════════════════════════════════════════ */

const StatCard = ({
  icon: Icon,
  label,
  value,
  suffix = "",
  bgGradient,
  iconBg,
  iconColor,
}: {
  icon: any;
  label: string;
  value: number;
  suffix?: string;
  bgGradient: string;
  iconBg: string;
  iconColor: string;
}) => (
  <div
    className={`group min-h-[130px] rounded-2xl border border-[#E5E7EB] bg-gradient-to-br ${bgGradient} p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
  >
    <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${iconBg} transition-colors duration-200 group-hover:scale-105`}>
      <Icon className={`h-[18px] w-[18px] ${iconColor}`} />
    </div>
    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">{label}</div>
    <div className="mt-1">
      <AnimatedNumber value={value} className="text-2xl font-black text-[#111827]" suffix={suffix} />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   Position Card
   ═══════════════════════════════════════════════════════════════ */

const PositionCard = ({
  position,
  now,
  onClick,
}: {
  position: ApiPosition;
  now: number;
  onClick: () => void;
}) => {
  const insight = getPredictionInsight(position);
  const displayStatus = getPredictionDisplayStatus(position, now);
  const profitPositive = insight.profitLoss >= 0;
  const timeLeft = formatPositionCountdown(position);

  return (
    <button
      onClick={onClick}

      className="group rounded-2xl border border-[#E5E7EB] bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4F46E5]/30 hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={displayStatus} />
        </div>
        <SideBadge side={position.side} />
      </div>

      <h3 className="mt-3 line-clamp-2 text-base font-bold leading-tight text-[#111827]">
        {position.marketQuestion}
      </h3>

      {insight.isProtected ? (
        <div className="mt-4 rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-3">
          <div className="text-sm font-bold text-[#101828]">Refund Protected</div>
          <p className="mt-1 text-xs font-bold text-[#475467]">
            Value appears once this market goes live.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#F3F4F6] pt-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">Stake</div>
            <div className="mt-1 text-sm font-bold text-[#111827]">{formatNaira(position.stake)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">Value</div>
            <div className="mt-1 text-sm font-bold text-[#111827]">{formatNaira(insight.currentValue)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">P/L</div>
            <div
              className={`mt-1 text-sm font-bold ${
                profitPositive ? "text-[#12B886]" : "text-[#E85D5D]"
              }`}
            >
              {profitPositive ? "+" : ""}
              {formatNaira(insight.profitLoss)}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-bold text-[#9CA3AF]">{timeLeft} left</span>
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-[#6B7280] transition group-hover:text-[#4F46E5]">
          View Market <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Status Badge
   ═══════════════════════════════════════════════════════════════ */

const StatusBadge = ({ status }: { status: { isOpen: boolean; label: string } }) => {
  let colorClasses = "bg-gray-100 text-gray-600";
  let dotColor = "bg-gray-400";

  if (status.isOpen) {
    colorClasses = "bg-[#D1FAE5] text-[#047857]";
    dotColor = "bg-[#12B886]";
  } else if (status.label.includes("pending")) {
    colorClasses = "bg-[#FEF3C7] text-[#92400E]";
    dotColor = "bg-[#D97706]";
  } else if (status.label === "resolved") {
    colorClasses = "bg-[#EEF2FF] text-[#4F46E5]";
    dotColor = "bg-[#4F46E5]";
  } else if (status.label === "refunded") {
    colorClasses = "bg-[#F3F4F6] text-[#6B7280]";
    dotColor = "bg-[#9CA3AF]";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${colorClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {status.label.charAt(0).toUpperCase() + status.label.slice(1)}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Side Badge
   ═══════════════════════════════════════════════════════════════ */

const SideBadge = ({ side }: { side?: string }) => (
  <span
    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
      side === "YES"
        ? "bg-[#12B886]/10 text-[#047857]"
        : "bg-[#E85D5D]/10 text-[#B42318]"
    }`}
  >
    {side || "N/A"}
  </span>
);

/* ═══════════════════════════════════════════════════════════════
   Activity Feed
   ═══════════════════════════════════════════════════════════════ */

const ActivityFeed = ({
  positions,
  settledCount,
}: {
  positions: ApiPosition[];
  settledCount: number;
}) => {
  const activities = useMemo(() => {
    return positions
      .filter((p) => p.resolvedAt || p.marketStatus !== "active")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [positions]);

  if (activities.length === 0) return null;

  return (
    <section className="mt-6 mb-2 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#111827]">Recent Activity</h2>
        <span className="rounded-full border border-[#E5E7EB] bg-[#F8F7F4] px-3 py-1 text-xs font-bold text-[#6B7280]">
          {settledCount} settled
        </span>
      </div>
      <div className="relative">
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-[#E5E7EB]" />
        <div className="space-y-0">
          {activities.map((position, index) => (
            <ActivityItem
              key={position.id}
              position={position}
              isLast={index === activities.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const ActivityItem = ({
  position,
  isLast,
}: {
  position: ApiPosition;
  isLast: boolean;
}) => {
  const isWon = position.resolvedAt && position.isWinner;
  const isLost = position.resolvedAt && !position.isWinner;
  const isRefunded =
    position.status === "refunded" || position.marketStatus === "refunded";
  const isPending = !position.resolvedAt;

  let iconBg = "bg-[#F3F4F6] text-[#6B7280]";
  let Icon = Clock;
  let amountColor = "text-[#6B7280]";
  let label = "Prediction placed";

  if (isWon) {
    iconBg = "bg-[#D1FAE5] text-[#059669]";
    Icon = Trophy;
    amountColor = "text-[#12B886]";
    label = "Won";
  } else if (isLost) {
    iconBg = "bg-[#FEE2E2] text-[#DC2626]";
    Icon = X;
    amountColor = "text-[#E85D5D]";
    label = "Lost";
  } else if (isRefunded) {
    iconBg = "bg-[#EDE9FE] text-[#7C3AED]";
    Icon = Shield;
    amountColor = "text-[#4F46E5]";
    label = "Refunded";
  } else if (isPending) {
    iconBg = "bg-[#FEF3C7] text-[#D97706]";
    Icon = Clock;
    label = "Pending";
  }

  const amount = position.resolvedAt
    ? position.isWinner
      ? position.payout || 0
      : position.stake || 0
    : position.stake || 0;

  const dateStr = position.resolvedAt
    ? new Date(position.resolvedAt).toLocaleDateString()
    : new Date(position.createdAt).toLocaleDateString();

  return (
    <Link
      to={`/market/${position.marketId}`}
      aria-label={`${label}: ${position.marketQuestion}, ${position.side}, ${formatNaira(amount)}`}
      className="relative flex items-start gap-3 py-3 pl-0 transition hover:bg-[#F8F7F4]"
    >
      <div
        className={`relative z-10 grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl ${iconBg}`}
      >
        <Icon className="h-[16px] w-[16px]" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-[#111827]">
              {position.marketQuestion}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#9CA3AF]">
              <span className="font-bold">{label}</span>
              <span>·</span>
              <span>{position.side}</span>
              <span>·</span>
              <span>{dateStr}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className={`text-sm font-bold ${amountColor}`}>
              {isWon ? "+" : ""}
              {formatNaira(amount)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Achievements Section
   ═══════════════════════════════════════════════════════════════ */

const AchievementsSection = ({
  positions,
  stats,
}: {
  positions: ApiPosition[];
  stats: ApiProfileStats;
}) => {
  const resolved = positions.filter((p) => p.resolvedAt);
  const won = resolved.filter((p) => p.isWinner);
  const currentStreak = getCurrentWinStreak(resolved);
  const bestStreak = getBestWinStreak(resolved);
  const accuracy = resolved.length ? Math.round((won.length / resolved.length) * 100) : 0;
  const level = stats.level || getForecasterLevel(stats.totalPredictions, won.length);

  const achievements = getAchievements({
    totalPredictions: stats.totalPredictions,
    wins: won.length,
    currentStreak,
    bestStreak,
    accuracy,
    level,
    rank: stats.rank || null,
  });

  return (
    <section className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Medal className="h-5 w-5 text-[#4F46E5]" />
        <h2 className="text-lg font-bold">Achievements</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {achievements.map((achievement) => (
          <AchievementCard key={achievement.title} {...achievement} />
        ))}
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Achievement Card
   ═══════════════════════════════════════════════════════════════ */

type Achievement = {
  icon: any;
  title: string;
  description: string;
  unlocked: boolean;
};

const AchievementCard = ({
  icon: Icon,
  title,
  description,
  unlocked,
}: Achievement) => (
  <div
    className={`rounded-xl border p-3 transition ${
      unlocked
        ? "border-[#4F46E5]/30 bg-[#EEF2FF]"
        : "border-[#E5E7EB] bg-[#F8F7F4]"
    }`}
  >
    <div
      className={`mb-2 grid h-8 w-8 place-items-center rounded-lg ${
        unlocked ? "bg-[#4F46E5] text-white" : "bg-white text-[#6B7280]"
      }`}
    >
      <Icon className="h-4 w-4" />
    </div>
    <div className="text-xs font-bold leading-tight">{title}</div>
    <div
      className={`mt-1 text-[11px] font-bold ${
        unlocked ? "text-[#4F46E5]" : "text-[#6B7280]"
      }`}
    >
      {unlocked ? "Unlocked" : "Locked"}
    </div>
    <p className="mt-1 hidden text-[11px] font-bold leading-relaxed text-[#6B7280] sm:block">
      {description}
    </p>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   Empty State
   ═══════════════════════════════════════════════════════════════ */

const EmptyState = ({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: any;
  title: string;
  body: string;
  action?: React.ReactNode;
}) => (
  <div className="grid min-h-[300px] place-items-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white/70 p-6 text-center">
    <div>
      <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl border border-[#E5E7EB] bg-[#EEF2FF]/80 text-[#4F46E5] shadow-sm">
        <Icon className="h-10 w-10" strokeWidth={1.5} />
      </div>
      <div className="text-xl font-bold">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[#6B7280]">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

const getPredictionCloseTime = (position: ApiPosition) =>
  position.tradingCloseTime || position.marketCloseTime || "";

const getPredictionDisplayStatus = (position: ApiPosition, now = Date.now()) => {
  const status = String(position.status || position.marketStatus || "active").toLowerCase();
  const closeTime = getPredictionCloseTime(position);
  const closeMs = closeTime ? new Date(closeTime).getTime() : NaN;
  const hasEnded = Number.isFinite(closeMs) && closeMs <= now;
  const unresolvedClosed = hasEnded && ["active", "open", "closed"].includes(status);
  const isOpen =
    !hasEnded && position.marketStatus === "active" && ["active", "open"].includes(status);

  return {
    isOpen,
    hasEnded,
    label: unresolvedClosed ? "pending resolution" : status.replace(/_/g, " "),
  };
};

const formatPositionCountdown = (position: ApiPosition) =>
  formatCountdown(getPredictionCloseTime(position));

const formatMovement = (movement: number) => {
  if (Math.abs(movement) < 0.5) return "0";
  return `${movement > 0 ? "+" : ""}${movement.toFixed(0)}`;
};

/* ═══════════════════════════════════════════════════════════════
   Prediction Insight
   ═══════════════════════════════════════════════════════════════ */

type PredictionInsight = {
  entryCrowdView: number;
  currentCrowdView: number;
  movement: number;
  direction: "toward" | "against" | "unchanged";
  directionLabel: string;
  strength: "Excellent" | "Strong" | "Balanced" | "Weak" | "At Risk";
  strengthDetail: string;
  strengthTone: "green" | "neutral" | "red" | "yellow";
  multiplier: number | null;
  multiplierLabel: string;
  multiplierDetail: string;
  totalPool: number;
  sidePool: number;
  opposingPool: number;
  isProtected: boolean;
  currentValue: number;
  profitLoss: number;
};

const getPredictionInsight = (position: ApiPosition): PredictionInsight => {
  const entryCrowdView = Number(position.entryPrice || 0);
  const currentCrowdView = Number(position.currentPrice || position.entryPrice || 0);
  const movement = currentCrowdView - entryCrowdView;
  const direction = movement > 0.4 ? "toward" : movement < -0.4 ? "against" : "unchanged";
  const totalPool = Number(position.totalPool || 0);
  const sidePool = Number(position.sidePool || 0);
  const opposingPool = Number(position.opposingPool || 0);
  const stake = Number(position.stake || 0);
  const currentValue = Number(
    position.currentValue || position.positionValue || position.projectedPayout || 0
  );
  const profitLoss =
    currentValue > 0
      ? currentValue - stake
      : Number(position.projectedProfit || position.estimatedProfit || 0);
  const isProtected =
    totalPool < MARKET_ACTIVATION_REQUIREMENTS.totalPool ||
    sidePool < MARKET_ACTIVATION_REQUIREMENTS.yesPool ||
    opposingPool < MARKET_ACTIVATION_REQUIREMENTS.noPool;
  const projectedPayout = Number(position.projectedPayout || position.estimatedPayout || 0);
  const fallbackPayout =
    opposingPool > 0 && sidePool > 0 && stake > 0
      ? stake + (stake / sidePool) * opposingPool
      : 0;
  const currentPayoutEstimate = projectedPayout > 0 ? projectedPayout : fallbackPayout;
  const multiplier =
    !isProtected && opposingPool > 0 && stake > 0 && currentPayoutEstimate > 0
      ? currentPayoutEstimate / stake
      : null;

  let strength: PredictionInsight["strength"] = "Balanced";
  let strengthTone: PredictionInsight["strengthTone"] = "neutral";
  let strengthDetail = "The crowd view is close to where you entered.";
  if (movement >= 15) {
    strength = "Excellent";
    strengthTone = "green";
    strengthDetail = "The crowd has moved sharply toward your side.";
  } else if (movement >= 5) {
    strength = "Strong";
    strengthTone = "green";
    strengthDetail = "The crowd is moving toward your opinion.";
  } else if (movement <= -15) {
    strength = "At Risk";
    strengthTone = "red";
    strengthDetail = "The crowd has moved sharply away from your side.";
  } else if (movement <= -5) {
    strength = "Weak";
    strengthTone = "yellow";
    strengthDetail = "The crowd is moving against your opinion.";
  }

  return {
    entryCrowdView,
    currentCrowdView,
    movement,
    direction,
    directionLabel:
      direction === "toward"
        ? "Crowd moved toward you"
        : direction === "against"
          ? "Crowd moved against you"
          : "Crowd unchanged",
    strength,
    strengthDetail,
    strengthTone,
    multiplier,
    multiplierLabel: multiplier ? `${multiplier.toFixed(2)}x stake` : "Refund Protected",
    multiplierDetail: multiplier
      ? "This changes as people join either side. Final payout is calculated after resolution."
      : "Value appears once the market goes live.",
    totalPool,
    sidePool,
    opposingPool,
    isProtected,
    currentValue,
    profitLoss,
  };
};

/* ═══════════════════════════════════════════════════════════════
   Movement Pill
   ═══════════════════════════════════════════════════════════════ */

const MovementPill = ({ movement }: { movement?: number }) => {
  if (!movement || Math.abs(movement) < 0.5) return null;
  const positive = movement > 0;
  return (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        positive ? "bg-[#12B886]/10 text-[#047857]" : "bg-[#E85D5D]/10 text-[#B42318]"
      }`}
    >
      {formatMovement(movement)}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Metric
   ═══════════════════════════════════════════════════════════════ */

const Metric = ({
  label,
  value,
  large = false,
  tone = "neutral",
  movement,
}: {
  label: string;
  value: string;
  large?: boolean;
  tone?: "neutral" | "green" | "red";
  movement?: number;
}) => (
  <div className="min-w-0 transition-colors duration-300">
    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">{label}</div>
    <div
      className={`mt-2 flex items-center font-bold transition-all duration-300 ${
        large ? "text-2xl" : "text-sm"
      } ${
        tone === "green"
          ? "text-[#12B886]"
          : tone === "red"
            ? "text-[#E85D5D]"
            : "text-[#111827]"
      }`}
    >
      {value}
      <MovementPill movement={movement} />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   Prediction Detail Modal
   ═══════════════════════════════════════════════════════════════ */

const PredictionDetailModal = ({
  position,
  now,
  onClose,
  onViewMarket,
}: {
  position: ApiPosition;
  now: number;
  onClose: () => void;
  onViewMarket: () => void;
}) => {
  const shares = Number(position.sharesOwned ?? position.sharesReceived ?? 0);
  const rules = (position as ApiPosition & { rules?: string }).rules;
  const resolutionSource = (position as ApiPosition & { resolutionSource?: string }).resolutionSource;
  const timeLeft = formatPositionCountdown(position);
  const displayStatus = getPredictionDisplayStatus(position, now).label;
  const marketQuestion = position.marketQuestion || "Prediction details unavailable";
  const insight = getPredictionInsight(position);
  const modalRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const optionalPoolMetrics = [
    insight.totalPool > 0 ? { label: "Total Pool", value: formatNaira(insight.totalPool) } : null,
    insight.sidePool > 0 ? { label: "Your Side Pool", value: formatNaira(insight.sidePool) } : null,
    insight.opposingPool > 0
      ? { label: "Opposing Pool", value: formatNaira(insight.opposingPool) }
      : null,
    shares > 0 ? { label: "Units", value: shares.toFixed(2) } : null,
    { label: "Status", value: displayStatus },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (modalRef.current) {
      const focusable = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }
  }, []);

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="Prediction details"
      className="fixed inset-0 z-[70] flex animate-in fade-in duration-200 items-end justify-center bg-black/70 px-3 pb-[calc(84px+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-6"
    >
      <section className="max-h-[88vh] w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_90px_rgba(17,24,39,0.18)] sm:zoom-in-95">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white/95 p-4 backdrop-blur">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
              Prediction detail
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#111827]">
              Your {position.side || "selected"} prediction
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] transition hover:text-[#111827]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div>
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold leading-tight">{marketQuestion}</h3>
              <SideBadge side={position.side} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#E5E7EB] pt-4 sm:grid-cols-4">
              <Metric label="Amount backed" value={formatNaira(position.stake)} />
              <Metric label="Your pick" value={position.side || "N/A"} />
              <Metric label="Time left" value={timeLeft} />
              <Metric label="Status" value={displayStatus} />
            </div>
          </div>

          {insight.isProtected ? (
            <section className="rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] p-4">
              <h4 className="text-base font-bold text-[#101828]">Refund Protected</h4>
              <p className="mt-2 text-sm font-bold leading-6 text-[#344054]">
                Your stake is protected if this market does not reach enough activity before closing.
                Value appears once this market goes live.
              </p>
            </section>
          ) : (
            <section className="grid grid-cols-2 gap-4 border-t border-[#E5E7EB] pt-4">
              <Metric label="Current Value" value={formatNaira(insight.currentValue)} large />
              <Metric
                label="Profit/Loss"
                value={`${insight.profitLoss >= 0 ? "+" : ""}${formatNaira(insight.profitLoss)}`}
                tone={insight.profitLoss >= 0 ? "green" : "red"}
                large
              />
            </section>
          )}

          <details className="group border-t border-[#E5E7EB] pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-[#111827]">
              More Details
              <span className="text-xs font-bold text-[#6B7280] group-open:hidden">Show</span>
              <span className="hidden text-xs font-bold text-[#6B7280] group-open:inline">Hide</span>
            </summary>
            <div className="mt-4 space-y-5">
              <section>
                <h4 className="text-sm font-bold">Market View</h4>
                <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-3">
                  <Metric
                    label="Entry market view"
                    value={
                      insight.entryCrowdView ? formatNairaPrice(insight.entryCrowdView) : "-"
                    }
                  />
                  <Metric
                    label="Current market view"
                    value={
                      insight.currentCrowdView ? formatNairaPrice(insight.currentCrowdView) : "-"
                    }
                    movement={insight.movement}
                  />
                  <Metric
                    label="Movement"
                    value={formatMovement(insight.movement)}
                    tone={
                      insight.direction === "toward"
                        ? "green"
                        : insight.direction === "against"
                          ? "red"
                          : "neutral"
                    }
                  />
                </div>
              </section>

              {optionalPoolMetrics.length > 0 && (
                <section>
                  <h4 className="text-sm font-bold">Pool Snapshot</h4>
                  <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2">
                    {optionalPoolMetrics.map((metric) => (
                      <Metric key={metric.label} label={metric.label} value={metric.value} />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h4 className="text-sm font-bold">Prediction history</h4>
                <div className="mt-2 text-sm font-bold text-[#6B7280]">
                  You predicted {position.side} with {formatNaira(position.stake)} on{" "}
                  {new Date(position.createdAt).toLocaleString()}.
                </div>
              </section>

              <section>
                <h4 className="text-sm font-bold">Rules and resolution</h4>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                  {rules || "Open the market to review the full rules and resolution criteria."}
                </p>
                <p className="mt-3 text-xs font-bold text-[#6B7280]">
                  Resolution source:{" "}
                  {resolutionSource || "Shown on the market page when available."}
                </p>
                {getPredictionCloseTime(position) && (
                  <p className="mt-2 text-xs font-bold text-[#6B7280]">
                    Trading close time:{" "}
                    {new Date(getPredictionCloseTime(position)).toLocaleString()}
                  </p>
                )}
              </section>
            </div>
          </details>

          <button
            onClick={onViewMarket}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#4F46E5] text-sm font-bold text-white transition hover:bg-[#4338CA]"
          >
            View Market <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Achievements Data
   ═══════════════════════════════════════════════════════════════ */

const getAchievements = ({
  totalPredictions,
  wins,
  currentStreak,
  bestStreak,
  accuracy,
  level,
  rank,
}: {
  totalPredictions: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  accuracy: number;
  level: string;
  rank: number | null;
}): Achievement[] => [
  {
    icon: Target,
    title: "First Prediction",
    description: "Lock your first prediction.",
    unlocked: totalPredictions >= 1,
  },
  {
    icon: Trophy,
    title: "First Win",
    description: "Resolve a market correctly.",
    unlocked: wins >= 1,
  },
  {
    icon: Flame,
    title: "3 Win Streak",
    description: "Win three resolved markets in a row.",
    unlocked: currentStreak >= 3 || bestStreak >= 3,
  },
  {
    icon: Flame,
    title: "5 Win Streak",
    description: "Build a five-win streak.",
    unlocked: currentStreak >= 5 || bestStreak >= 5,
  },
  {
    icon: CheckCircle,
    title: "10 Predictions",
    description: "Join ten markets.",
    unlocked: totalPredictions >= 10,
  },
  {
    icon: CheckCircle,
    title: "50 Predictions",
    description: "Join fifty markets.",
    unlocked: totalPredictions >= 50,
  },
  {
    icon: Award,
    title: "60% Accuracy",
    description: "Reach 60% accuracy from resolved predictions.",
    unlocked: accuracy >= 60,
  },
  {
    icon: Award,
    title: "70% Accuracy",
    description: "Reach 70% accuracy from resolved predictions.",
    unlocked: accuracy >= 70,
  },
  {
    icon: Medal,
    title: "Top 100 Forecaster",
    description: "Reach the top 100 on the real leaderboard.",
    unlocked: Boolean(rank && rank <= 100),
  },
  {
    icon: Trophy,
    title: "Top 10 Forecaster",
    description: "Reach the top 10 on the real leaderboard.",
    unlocked: Boolean(rank && rank <= 10),
  },
  {
    icon: Medal,
    title: "Elite Forecaster",
    description: "Reach the Elite Forecaster level.",
    unlocked: ["Elite Forecaster", "Market Master"].includes(level),
  },
];

/* ═══════════════════════════════════════════════════════════════
   Session Loading
   ═══════════════════════════════════════════════════════════════ */

const SessionLoading = ({ label }: { label: string }) => (
  <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
    <Header />
    <main className="grid min-h-[70vh] place-items-center px-4">
      <DelayedFlippeLoader active label={label} />
    </main>
    <MobileNav />
  </div>
);

export default Dashboard;
