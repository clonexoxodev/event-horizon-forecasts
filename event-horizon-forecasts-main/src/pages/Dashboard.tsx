import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
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
    case "Rookie": return Shield;
    case "Sharp Thinker": return Zap;
    case "Analyst": return BarChart3;
    case "Expert": return Award;
    case "Elite Forecaster": return Medal;
    case "Market Master": return Trophy;
    default: return Shield;
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
  const [showActivity, setShowActivity] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) { setLoading(false); return; }

    let mounted = true;
    const loadPortfolio = async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
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
        if (mounted && !silent) setLoading(false);
      }
    };

    loadPortfolio();
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") loadPortfolio({ silent: true });
    }, 30000);
    return () => { mounted = false; window.clearInterval(refresh); };
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
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5]">
              <LineChart className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-black tracking-tight">Track your predictions</h1>
            <p className="mt-1.5 text-sm text-[#9CA3AF]">
              Log in to see open predictions, resolved results, and wallet-linked history.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#4F46E5] px-5 text-sm font-bold text-white hover:bg-[#4338CA]"
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
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-6">
        {/* ── Header ── */}
        <section className="mb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">{getGreeting()}</p>
              <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">
                {user.name || user.username || "Forecaster"}
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 shadow-sm">
                <LevelIcon className="h-3.5 w-3.5 text-[#4F46E5]" />
                <span className="text-xs font-bold text-[#111827]">{level}</span>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-[#4F46E5] px-2.5 py-1.5 text-white shadow-sm">
                <Zap className="h-3 w-3" />
                <AnimatedNumber value={totalScore} className="text-xs font-bold" />
                <span className="text-[9px] font-bold opacity-80">pts</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Row ── */}
        <section className="mb-4 grid grid-cols-4 gap-2">
          <StatCard label="Total" value={stats.totalPredictions} />
          <StatCard label="Active" value={activePositions.length} />
          <StatCard label="Won" value={wonPositions.length} />
          <StatCard label="Win Rate" value={winRate} suffix="%" />
        </section>

        {/* ── Level Progress ── */}
        <section className="mb-4 rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#4F46E5]/10 text-[#4F46E5]">
                <LevelIcon className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#111827]">{level}</div>
                <div className="text-[10px] text-[#9CA3AF]">
                  {level === nextLevel ? "Top level" : `${pointsToNext} pts to ${nextLevel}`}
                </div>
              </div>
            </div>
            <AnimatedNumber value={totalScore} className="text-base font-black text-[#4F46E5]" />
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
            <div
              className="h-full rounded-full bg-[#4F46E5] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        {/* ── Tab Navigation ── */}
        <section className="mb-4">
          <div
            role="tablist"
            className="flex gap-1 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-0.5"
          >
            {(["active", "resolved", "all"] as PositionFilterTab[]).map((item) => {
              const count =
                item === "active" ? activePositions.length
                  : item === "resolved" ? settledPositions.length
                    : positions.length;
              const isActive = positionTab === item;
              return (
                <button
                  key={item}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setPositionTab(item)}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? "bg-white text-[#111827] shadow-sm"
                      : "text-[#9CA3AF] hover:text-[#6B7280]"
                  }`}
                >
                  {item === "active" ? "Active" : item === "resolved" ? "Done" : "All"}
                  <span
                    className={`ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] ${
                      isActive ? "bg-[#4F46E5]/10 text-[#4F46E5]" : "bg-[#E5E7EB] text-[#9CA3AF]"
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
        <div role="tabpanel">
          {loading ? (
            <div className="grid min-h-[300px] place-items-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#4F46E5]" />
            </div>
          ) : filteredPositions.length === 0 ? (
            positionTab === "active" ? (
              <EmptyState
                icon={Target}
                title="No active predictions"
                body="Your open positions will appear here."
                action={
                  <Link to="/" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#4F46E5] px-4 text-sm font-bold text-white hover:bg-[#4338CA]">
                    Explore markets <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
            ) : positionTab === "resolved" ? (
              <EmptyState
                icon={CheckCircle}
                title="No resolved predictions"
                body="Won, lost, and refunded predictions will show here."
                action={
                  <Link to="/" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] transition hover:shadow-md">
                    Explore markets <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
            ) : (
              <EmptyState
                icon={LineChart}
                title="No predictions yet"
                body="Start forecasting to build your portfolio."
                action={
                  <Link to="/" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#4F46E5] px-4 text-sm font-bold text-white hover:bg-[#4338CA]">
                    Make your first prediction <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
            )
          ) : (
            <div className="grid gap-2.5 lg:grid-cols-2">
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

        {/* ── Activity Feed (Collapsible) ── */}
        {positions.some((p) => p.resolvedAt || p.marketStatus !== "active") && (
          <section className="mt-4">
            <button
              onClick={() => setShowActivity(!showActivity)}
              className="flex w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#9CA3AF]" />
                <span className="text-sm font-bold text-[#111827]">Recent Activity</span>
              </div>
              {showActivity ? (
                <ChevronUp className="h-4 w-4 text-[#9CA3AF]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
              )}
            </button>
            {showActivity && (
              <div className="mt-2 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
                <ActivityFeed positions={positions} settledCount={settledPositions.length} />
              </div>
            )}
          </section>
        )}

        {/* ── Achievements (Collapsible) ── */}
        <section className="mt-4">
          <button
            onClick={() => setShowAchievements(!showAchievements)}
            className="flex w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Medal className="h-4 w-4 text-[#4F46E5]" />
              <span className="text-sm font-bold text-[#111827]">Achievements</span>
            </div>
            {showAchievements ? (
              <ChevronUp className="h-4 w-4 text-[#9CA3AF]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
            )}
          </button>
          {showAchievements && (
            <div className="mt-2 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
              <AchievementsSection positions={positions} stats={stats} />
            </div>
          )}
        </section>
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
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) => (
  <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
    <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">{label}</div>
    <div className="mt-0.5">
      <AnimatedNumber value={value} className="text-lg font-black text-[#111827]" suffix={suffix} />
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
      className="group rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-[#4F46E5]/20 hover:shadow-[0_4px_16px_rgba(17,24,39,0.06)] active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <StatusBadge status={displayStatus} />
        <SideBadge side={position.side} />
      </div>

      <h3 className="mt-2.5 line-clamp-2 text-[14px] font-bold leading-snug text-[#111827]">
        {position.marketQuestion}
      </h3>

      {insight.isProtected ? (
        <div className="mt-3 rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] p-2.5">
          <div className="text-xs font-bold text-[#101828]">Refund Protected</div>
          <p className="mt-0.5 text-[10px] font-bold text-[#475467]">
            Value appears once market goes live.
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#F3F4F6] pt-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Stake</div>
            <div className="mt-0.5 text-xs font-bold text-[#111827]">{formatNaira(position.stake)}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Value</div>
            <div className="mt-0.5 text-xs font-bold text-[#111827]">{formatNaira(insight.currentValue)}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">P/L</div>
            <div className={`mt-0.5 text-xs font-bold ${profitPositive ? "text-[#12B886]" : "text-[#E85D5D]"}`}>
              {profitPositive ? "+" : ""}{formatNaira(insight.profitLoss)}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#9CA3AF]">{timeLeft} left</span>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#6B7280] transition group-hover:text-[#4F46E5]">
          View <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Status & Side Badges
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
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${colorClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {status.label.charAt(0).toUpperCase() + status.label.slice(1)}
    </span>
  );
};

const SideBadge = ({ side }: { side?: string }) => (
  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
    side === "YES" ? "bg-[#12B886]/10 text-[#047857]" : "bg-[#E85D5D]/10 text-[#B42318]"
  }`}>
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
      .slice(0, 5);
  }, [positions]);

  if (activities.length === 0) return null;

  return (
    <div className="relative">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[#F3F4F6]" />
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
  const isRefunded = position.status === "refunded" || position.marketStatus === "refunded";

  let iconBg = "bg-[#F3F4F6] text-[#6B7280]";
  let Icon = Clock;
  let amountColor = "text-[#6B7280]";
  let label = "Placed";

  if (isWon) { iconBg = "bg-[#D1FAE5] text-[#059669]"; Icon = Trophy; amountColor = "text-[#12B886]"; label = "Won"; }
  else if (isLost) { iconBg = "bg-[#FEE2E2] text-[#DC2626]"; Icon = X; amountColor = "text-[#E85D5D]"; label = "Lost"; }
  else if (isRefunded) { iconBg = "bg-[#EDE9FE] text-[#7C3AED]"; Icon = Shield; amountColor = "text-[#4F46E5]"; label = "Refunded"; }

  const amount = position.resolvedAt ? (position.isWinner ? position.payout || 0 : position.stake || 0) : position.stake || 0;
  const dateStr = position.resolvedAt ? new Date(position.resolvedAt).toLocaleDateString() : new Date(position.createdAt).toLocaleDateString();

  return (
    <Link
      to={`/market/${position.marketId}`}
      className="relative flex items-start gap-2.5 py-2.5 pl-0 transition hover:bg-[#F8F7F4] rounded-lg"
    >
      <div className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconBg}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-[#111827]">
              {position.marketQuestion}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#9CA3AF]">
              <span className="font-bold">{label}</span>
              <span>&middot;</span>
              <span>{position.side}</span>
              <span>&middot;</span>
              <span>{dateStr}</span>
            </div>
          </div>
          <div className={`shrink-0 text-xs font-bold ${amountColor}`}>
            {isWon ? "+" : ""}{formatNaira(amount)}
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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {achievements.map((achievement) => (
        <AchievementCard key={achievement.title} {...achievement} />
      ))}
    </div>
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
  unlocked,
}: Achievement) => (
  <div className={`rounded-lg border p-2.5 transition ${
    unlocked ? "border-[#4F46E5]/20 bg-[#4F46E5]/[0.04]" : "border-[#E5E7EB] bg-[#F8F7F4]"
  }`}>
    <div className={`mb-1 grid h-6 w-6 place-items-center rounded-md ${
      unlocked ? "bg-[#4F46E5] text-white" : "bg-white text-[#9CA3AF]"
    }`}>
      <Icon className="h-3 w-3" />
    </div>
    <div className="text-[10px] font-bold leading-tight">{title}</div>
    <div className={`mt-0.5 text-[9px] font-bold ${unlocked ? "text-[#4F46E5]" : "text-[#9CA3AF]"}`}>
      {unlocked ? "Unlocked" : "Locked"}
    </div>
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
  <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white/60 p-6 text-center">
    <div>
      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-[#4F46E5]/8 text-[#4F46E5]">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <div className="text-sm font-bold">{title}</div>
      <p className="mx-auto mt-1 max-w-xs text-xs text-[#9CA3AF]">{body}</p>
      {action && <div className="mt-3">{action}</div>}
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
  const isOpen = !hasEnded && position.marketStatus === "active" && ["active", "open"].includes(status);

  return {
    isOpen,
    hasEnded,
    label: unresolvedClosed ? "pending resolution" : status.replace(/_/g, " "),
  };
};

const formatPositionCountdown = (position: ApiPosition) =>
  formatCountdown(getPredictionCloseTime(position));

const getNextLevel = (current: string) => {
  const idx = LEVELS.findIndex((l) => l.name === current);
  return idx >= 0 && idx < LEVELS.length - 1 ? LEVELS[idx + 1].name : current;
};

/* ═══════════════════════════════════════════════════════════════
   Prediction Insight
   ═══════════════════════════════════════════════════════════════ */

type PredictionInsight = {
  entryCrowdView: number;
  currentCrowdView: number;
  movement: number;
  direction: "toward" | "against" | "unchanged";
  multiplier: number | null;
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
  const currentValue = Number(position.currentValue || position.positionValue || position.projectedPayout || 0);
  const profitLoss = currentValue > 0 ? currentValue - stake : Number(position.projectedProfit || position.estimatedProfit || 0);
  const isProtected = totalPool < MARKET_ACTIVATION_REQUIREMENTS.totalPool || sidePool < MARKET_ACTIVATION_REQUIREMENTS.yesPool || opposingPool < MARKET_ACTIVATION_REQUIREMENTS.noPool;
  const projectedPayout = Number(position.projectedPayout || position.estimatedPayout || 0);
  const fallbackPayout = opposingPool > 0 && sidePool > 0 && stake > 0 ? stake + (stake / sidePool) * opposingPool : 0;
  const currentPayoutEstimate = projectedPayout > 0 ? projectedPayout : fallbackPayout;
  const multiplier = !isProtected && opposingPool > 0 && stake > 0 && currentPayoutEstimate > 0 ? currentPayoutEstimate / stake : null;

  return {
    entryCrowdView,
    currentCrowdView,
    movement,
    direction,
    multiplier,
    totalPool,
    sidePool,
    opposingPool,
    isProtected,
    currentValue,
    profitLoss,
  };
};

/* ═══════════════════════════════════════════════════════════════
   Metric
   ═══════════════════════════════════════════════════════════════ */

const Metric = ({
  label,
  value,
  large = false,
  tone = "neutral",
}: {
  label: string;
  value: string;
  large?: boolean;
  tone?: "neutral" | "green" | "red";
}) => (
  <div className="min-w-0">
    <div className="text-[9px] font-bold uppercase tracking-wider text-[#6B7280]">{label}</div>
    <div className={`mt-1 font-bold ${large ? "text-xl" : "text-sm"} ${
      tone === "green" ? "text-[#12B886]" : tone === "red" ? "text-[#E85D5D]" : "text-[#111827]"
    }`}>
      {value}
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
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
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 px-3 pb-[calc(84px+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-6"
    >
      <section className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_90px_rgba(17,24,39,0.18)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white/95 p-4 backdrop-blur">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">Prediction detail</p>
            <h2 className="mt-0.5 text-base font-bold text-[#111827]">
              Your {position.side || "selected"} prediction
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] transition hover:text-[#111827]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <div className="mb-2.5 flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold leading-tight">{marketQuestion}</h3>
              <SideBadge side={position.side} />
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#E5E7EB] pt-3">
              <Metric label="Amount" value={formatNaira(position.stake)} />
              <Metric label="Side" value={position.side || "N/A"} />
              <Metric label="Time left" value={timeLeft} />
              <Metric label="Status" value={displayStatus} />
            </div>
          </div>

          {insight.isProtected ? (
            <section className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-3">
              <h4 className="text-sm font-bold text-[#101828]">Refund Protected</h4>
              <p className="mt-1 text-xs font-bold leading-relaxed text-[#344054]">
                Your stake is protected. Value appears once market goes live.
              </p>
            </section>
          ) : (
            <section className="grid grid-cols-2 gap-3 border-t border-[#E5E7EB] pt-3">
              <Metric label="Current Value" value={formatNaira(insight.currentValue)} large />
              <Metric
                label="Profit/Loss"
                value={`${insight.profitLoss >= 0 ? "+" : ""}${formatNaira(insight.profitLoss)}`}
                tone={insight.profitLoss >= 0 ? "green" : "red"}
                large
              />
            </section>
          )}

          <details className="group border-t border-[#E5E7EB] pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-[#111827]">
              More Details
              <span className="text-xs font-bold text-[#6B7280] group-open:hidden">Show</span>
              <span className="hidden text-xs font-bold text-[#6B7280] group-open:inline">Hide</span>
            </summary>
            <div className="mt-3 space-y-3">
              <div className="grid gap-x-3 gap-y-2 sm:grid-cols-3">
                <Metric label="Entry price" value={insight.entryCrowdView ? formatNairaPrice(insight.entryCrowdView) : "-"} />
                <Metric label="Current price" value={insight.currentCrowdView ? formatNairaPrice(insight.currentCrowdView) : "-"} />
                <Metric label="Movement" value={`${insight.movement > 0 ? "+" : ""}${insight.movement.toFixed(0)}`} tone={insight.direction === "toward" ? "green" : insight.direction === "against" ? "red" : "neutral"} />
              </div>
              {shares > 0 && <Metric label="Units" value={shares.toFixed(2)} />}
              <div className="text-xs font-bold text-[#6B7280]">
                Predicted {position.side} with {formatNaira(position.stake)} on {new Date(position.createdAt).toLocaleString()}.
              </div>
              {rules && <p className="text-xs leading-relaxed text-[#6B7280]">{rules}</p>}
              {resolutionSource && <p className="text-[10px] font-bold text-[#9CA3AF]">Source: {resolutionSource}</p>}
            </div>
          </details>

          <button
            onClick={onViewMarket}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#4F46E5] text-sm font-bold text-white transition hover:bg-[#4338CA]"
          >
            View Market <ArrowRight className="h-3.5 w-3.5" />
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
  { icon: Target, title: "First Prediction", description: "", unlocked: totalPredictions >= 1 },
  { icon: Trophy, title: "First Win", description: "", unlocked: wins >= 1 },
  { icon: Flame, title: "3 Win Streak", description: "", unlocked: currentStreak >= 3 || bestStreak >= 3 },
  { icon: Flame, title: "5 Win Streak", description: "", unlocked: currentStreak >= 5 || bestStreak >= 5 },
  { icon: CheckCircle, title: "10 Predictions", description: "", unlocked: totalPredictions >= 10 },
  { icon: CheckCircle, title: "50 Predictions", description: "", unlocked: totalPredictions >= 50 },
  { icon: Award, title: "60% Accuracy", description: "", unlocked: accuracy >= 60 },
  { icon: Award, title: "70% Accuracy", description: "", unlocked: accuracy >= 70 },
  { icon: Medal, title: "Top 100", description: "", unlocked: Boolean(rank && rank <= 100) },
  { icon: Trophy, title: "Top 10", description: "", unlocked: Boolean(rank && rank <= 10) },
  { icon: Medal, title: "Elite Forecaster", description: "", unlocked: ["Elite Forecaster", "Market Master"].includes(level) },
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
