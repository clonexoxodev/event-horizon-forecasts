import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Award, BarChart3, CheckCircle, Clock, Flame, LineChart, Loader2, Medal, Target, Trophy } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import apiService, { type ApiPosition, type ApiProfileStats } from "@/lib/api";
import { formatCountdown, formatNaira, formatNairaPrice } from "@/lib/markets";
import { getCategoryLabel } from "@/lib/categories";
import { FlippeLoader } from "@/components/FlippeBrand";

type PortfolioTab = "positions" | "activity" | "performance";
const tabLabels: Record<PortfolioTab, string> = {
  positions: "Open Predictions",
  activity: "Prediction History",
  performance: "My Score",
};

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

const Dashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [stats, setStats] = useState<ApiProfileStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<PortfolioTab>("positions");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const loadPortfolio = async () => {
      setLoading(true);
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
        if (mounted) setLoading(false);
      }
    };

    loadPortfolio();
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") loadPortfolio();
    }, 20000);
    return () => {
      mounted = false;
      window.clearInterval(refresh);
    };
  }, [authLoading, user]);

  const activePositions = useMemo(
    () => positions.filter((position) => position.marketStatus === "active"),
    [positions]
  );

  const settledPositions = useMemo(
    () => positions.filter((position) => position.marketStatus !== "active"),
    [positions]
  );

  const projectedValue = activePositions.reduce((sum, position) => sum + Number(position.projectedPayout ?? position.currentValue ?? position.stake ?? 0), 0);
  const openStake = activePositions.reduce((sum, position) => sum + Number(position.stake || 0), 0);
  const projectedPnl = activePositions.reduce((sum, position) => sum + Number(position.projectedProfit ?? position.unrealizedPnl ?? 0), 0);
  const resolvedWinnings = settledPositions.reduce((sum, position) => sum + Number(position.payout || 0), 0);

  if (authLoading) {
    return <SessionLoading label="Restoring your predictions..." />;
  }

  if (!user) {
    return (
      <div className="app-bg min-h-screen text-white xl:pl-64">
        <Header />
        <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 text-center">
          <div>
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-[#263241] bg-[#101720] text-[#12B886]">
              <LineChart className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Track your predictions</h1>
            <p className="mt-3 text-sm text-[#8B98A8]">Log in to see open predictions, resolved results, and wallet-linked history.</p>
            <Link to="/login" className="mt-6 inline-flex h-12 items-center rounded-xl bg-[#12B886] px-6 text-sm font-black text-[#06100d]">
              Log in
            </Link>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen overflow-x-hidden pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
        <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5 shadow-[0_18px_52px_rgba(0,0,0,0.28)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">My Predictions</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{formatNaira(projectedValue)}</h1>
              <p className="mt-2 max-w-xl text-sm text-[#8B98A8]">
                Projected value across your open predictions. Final payouts are confirmed only after market resolution.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
              <HeroStat icon={Target} label="Open predictions" value={`${activePositions.length}`} />
              <HeroStat icon={BarChart3} label="Total staked" value={formatNaira(openStake)} />
              <HeroStat icon={LineChart} label="Projected gain" value={`${projectedPnl >= 0 ? "+" : ""}${formatNaira(projectedPnl)}`} tone={projectedPnl >= 0 ? "green" : "red"} />
              <HeroStat icon={Trophy} label="Resolved winnings" value={formatNaira(resolvedWinnings)} />
            </div>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-[#263241] bg-[#101720] p-1">
          {(["positions", "activity", "performance"] as PortfolioTab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`h-11 rounded-lg text-sm font-black capitalize transition ${
                tab === item ? "bg-[#12B886] text-[#06100d]" : "text-[#8B98A8] hover:bg-[#151E28] hover:text-white"
              }`}
            >
              {tabLabels[item]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid min-h-[360px] place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#12B886]" />
          </div>
        ) : (
          <div className="mt-5">
            {tab === "positions" && <PositionsView positions={activePositions} />}
            {tab === "activity" && <ActivityView positions={positions} settledCount={settledPositions.length} />}
            {tab === "performance" && <PerformanceView positions={positions} stats={stats} />}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
};

const HeroStat = ({ icon: Icon, label, value, tone = "neutral" }: { icon: any; label: string; value: string; tone?: "neutral" | "green" | "red" }) => (
  <div className="rounded-xl border border-[#263241] bg-[#151E28] p-3">
    <Icon className={`mb-3 h-4 w-4 ${tone === "green" ? "text-[#12B886]" : tone === "red" ? "text-[#E85D5D]" : "text-[#8B98A8]"}`} />
    <div className="text-[11px] font-bold text-[#8B98A8]">{label}</div>
    <div className="mt-1 text-lg font-black">{value}</div>
  </div>
);

const PositionsView = ({ positions }: { positions: ApiPosition[] }) => {
  if (positions.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="No open predictions"
        body="Pick a market, choose YES or NO, and your open predictions will appear here."
        action={<Link to="/" className="rounded-xl bg-[#12B886] px-5 py-3 text-sm font-black text-[#06100d]">Explore markets</Link>}
      />
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {positions.map((position) => {
        const projectedProfit = Number(position.projectedProfit ?? position.unrealizedPnl ?? 0);
        return (
          <Link key={position.id} to={`/market/${position.marketId}`} className="rounded-2xl border border-[#263241] bg-[#101720] p-4 transition hover:border-[#12B886]/45 hover:bg-[#151E28]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">Open prediction</div>
                <h2 className="mt-2 line-clamp-2 text-lg font-black leading-tight">{position.marketQuestion}</h2>
                <div className="mt-2 text-xs font-bold text-[#8B98A8]">
                  {getCategoryLabel(position.category)} · {new Date(position.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${position.side === "YES" ? "bg-[#12B886]/10 text-[#7AE4BD]" : "bg-[#E85D5D]/10 text-[#FF9C9C]"}`}>
                {position.side}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <Metric label="Amount predicted" value={formatNaira(position.stake)} />
              <Metric label="Current confidence" value={formatNairaPrice(position.currentPrice || position.entryPrice || 0)} />
              <Metric label="Potential payout" value={formatNaira(position.projectedPayout ?? position.currentValue ?? position.positionValue ?? position.stake)} />
              <Metric label="Time left" value={formatCountdown(position.tradingCloseTime || position.marketCloseTime)} />
              <Metric label="Status" value={position.marketStatus.replace(/_/g, " ")} />
              <Metric label="Projected gain" value={`${projectedProfit >= 0 ? "+" : ""}${formatNaira(projectedProfit)}`} tone={projectedProfit >= 0 ? "green" : "red"} />
            </div>
            <p className="mt-3 text-xs font-bold text-[#8B98A8]">
              Tap to see entry confidence, units, market movement, rules, and resolution source.
            </p>
          </Link>
        );
      })}
    </div>
  );
};

const ActivityView = ({ positions, settledCount }: { positions: ApiPosition[]; settledCount: number }) => {
  const sorted = positions
    .filter((position) => position.marketStatus !== "active" || Boolean(position.resolvedAt))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (sorted.length === 0) {
    return <EmptyState icon={Activity} title="No resolved predictions yet" body="Won, lost, refunded, and cancelled predictions will appear here after markets resolve." />;
  }

  return (
    <section className="rounded-2xl border border-[#263241] bg-[#101720] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black">Prediction History</h2>
        <span className="rounded-full border border-[#263241] bg-[#151E28] px-3 py-1 text-xs font-bold text-[#8B98A8]">{settledCount} settled</span>
      </div>
      <div className="space-y-2">
        {sorted.map((position) => (
          <Link key={position.id} to={`/market/${position.marketId}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#263241] bg-[#151E28] p-4 transition hover:border-[#12B886]/45">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#101720] text-[#12B886]">
                {position.marketStatus === "active" ? <Clock className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black">{position.marketQuestion}</div>
                <div className="mt-1 text-xs text-[#8B98A8]">{getCategoryLabel(position.category)} · {position.side} prediction · {new Date(position.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-black">
                {position.resolvedAt ? formatNaira(position.payout || 0) : formatNaira(position.stake)}
              </div>
              <div className={`mt-1 text-xs capitalize ${position.resolvedAt ? (position.isWinner ? "text-[#12B886]" : "text-[#E85D5D]") : "text-[#8B98A8]"}`}>
                {position.resolvedAt ? (position.isWinner ? "won" : "lost") : position.marketStatus}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

const PerformanceView = ({ positions, stats }: { positions: ApiPosition[]; stats: ApiProfileStats }) => {
  const resolved = positions.filter((position) => position.resolvedAt);
  const won = resolved.filter((position) => position.isWinner);
  const lost = resolved.filter((position) => !position.isWinner);
  const currentStreak = getCurrentWinStreak(resolved);
  const bestStreak = getBestWinStreak(resolved);
  const accuracy = resolved.length ? Math.round((won.length / resolved.length) * 100) : 0;
  const level = stats.level || getForecasterLevel(stats.totalPredictions, won.length);
  const progress = getLevelProgress(stats.totalPredictions, won.length);
  const nextLevel = getNextLevel(level);
  const rankLabel = stats.rank ? `#${stats.rank}` : "Unranked";
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
    <div className="grid gap-4">
      <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">My Score</p>
                <h2 className="mt-2 text-3xl font-black">{level}</h2>
                <p className="mt-2 max-w-xl text-sm text-[#8B98A8]">
                  Build your forecasting record through resolved predictions. Streaks and accuracy use real results only.
                </p>
              </div>
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#12B886]/10 text-[#7AE4BD]">
                <Award className="h-7 w-7" />
              </div>
            </div>
            <div className="mt-6 h-4 overflow-hidden rounded-full bg-[#263241]">
              <div className="h-full rounded-full bg-[#12B886] transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-bold text-[#8B98A8]">
              <span>{progress}% progress</span>
              <span>{nextLevel === level ? "Top level reached" : `Next: ${nextLevel}`}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-[#263241] bg-[#151E28] p-4">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-[#8B98A8]">Rank</div>
            <div className="mt-2 text-2xl font-black">{rankLabel}</div>
            <p className="mt-2 text-xs font-bold text-[#8B98A8]">
              {stats.rank
                ? `${stats.totalRankedUsers || 0} forecasters are ranked from real prediction results.`
                : "Make a prediction to enter the leaderboard."}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Accuracy score" value={resolved.length ? `${accuracy}%` : "-"} large />
          <Metric label="Current streak" value={String(currentStreak)} large />
          <Metric label="Best streak" value={String(bestStreak)} large />
          <Metric label="Total predictions" value={String(stats.totalPredictions)} large />
          <Metric label="Wins" value={String(won.length)} large />
          <Metric label="Losses" value={String(lost.length)} large />
          <Metric label="Rank" value={rankLabel} large />
          <Metric label="Level" value={level} large />
        </div>
      </section>
      <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Medal className="h-5 w-5 text-[#12B886]" />
          <h2 className="text-xl font-black">Achievements</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {achievements.map((achievement) => (
            <AchievementCard key={achievement.title} {...achievement} />
          ))}
        </div>
      </section>
    </div>
  );
};

const getCurrentWinStreak = (resolved: ApiPosition[]) => {
  const recent = [...resolved].sort((a, b) => new Date(b.resolvedAt || b.createdAt).getTime() - new Date(a.resolvedAt || a.createdAt).getTime());
  let streak = 0;
  for (const position of recent) {
    if (!position.isWinner) break;
    streak += 1;
  }
  return streak;
};

const getBestWinStreak = (resolved: ApiPosition[]) => {
  const ordered = [...resolved].sort((a, b) => new Date(a.resolvedAt || a.createdAt).getTime() - new Date(b.resolvedAt || b.createdAt).getTime());
  let best = 0;
  let current = 0;
  for (const position of ordered) {
    current = position.isWinner ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
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

const getNextLevel = (levelName: string) => {
  const index = LEVELS.findIndex((level) => level.name === levelName);
  return LEVELS[Math.min(index + 1, LEVELS.length - 1)]?.name || levelName;
};

const getLevelProgress = (totalPredictions: number, wins: number) => {
  const score = totalPredictions + wins * 2;
  const currentIndex = Math.max(0, LEVELS.findIndex((level) => level.name === getForecasterLevel(totalPredictions, wins)));
  const current = LEVELS[currentIndex] || LEVELS[0];
  const next = LEVELS[Math.min(currentIndex + 1, LEVELS.length - 1)] || current;
  if (current.name === next.name) return 100;
  return Math.max(0, Math.min(100, Math.round(((score - current.score) / (next.score - current.score)) * 100)));
};

type Achievement = {
  icon: any;
  title: string;
  description: string;
  unlocked: boolean;
};

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
  { icon: Target, title: "First Prediction", description: "Lock your first prediction.", unlocked: totalPredictions >= 1 },
  { icon: Trophy, title: "First Win", description: "Resolve a market correctly.", unlocked: wins >= 1 },
  { icon: Flame, title: "3 Win Streak", description: "Win three resolved markets in a row.", unlocked: currentStreak >= 3 || bestStreak >= 3 },
  { icon: Flame, title: "5 Win Streak", description: "Build a five-win streak.", unlocked: currentStreak >= 5 || bestStreak >= 5 },
  { icon: CheckCircle, title: "10 Predictions", description: "Join ten markets.", unlocked: totalPredictions >= 10 },
  { icon: CheckCircle, title: "50 Predictions", description: "Join fifty markets.", unlocked: totalPredictions >= 50 },
  { icon: Award, title: "60% Accuracy", description: "Reach 60% accuracy from resolved predictions.", unlocked: accuracy >= 60 },
  { icon: Award, title: "70% Accuracy", description: "Reach 70% accuracy from resolved predictions.", unlocked: accuracy >= 70 },
  { icon: Medal, title: "Top 100 Forecaster", description: "Reach the top 100 on the real leaderboard.", unlocked: Boolean(rank && rank <= 100) },
  { icon: Trophy, title: "Top 10 Forecaster", description: "Reach the top 10 on the real leaderboard.", unlocked: Boolean(rank && rank <= 10) },
  { icon: Medal, title: "Elite Forecaster", description: "Reach the Elite Forecaster level.", unlocked: ["Elite Forecaster", "Market Master"].includes(level) },
];

const AchievementCard = ({ icon: Icon, title, description, unlocked }: Achievement) => (
  <div className={`rounded-xl border p-3 transition ${unlocked ? "border-[#12B886]/30 bg-[#12B886]/10" : "border-[#263241] bg-[#151E28]"}`}>
    <div className={`mb-2 grid h-8 w-8 place-items-center rounded-lg ${unlocked ? "bg-[#12B886] text-[#06100d]" : "bg-[#101720] text-[#8B98A8]"}`}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="text-xs font-black leading-tight">{title}</div>
    <div className={`mt-1 text-[11px] font-black ${unlocked ? "text-[#7AE4BD]" : "text-[#8B98A8]"}`}>
      {unlocked ? "Unlocked" : "Locked"}
    </div>
    <p className="mt-1 hidden text-[11px] font-bold leading-relaxed text-[#8B98A8] sm:block">{description}</p>
  </div>
);

const Metric = ({ label, value, large = false, tone = "neutral" }: { label: string; value: string; large?: boolean; tone?: "neutral" | "green" | "red" }) => (
  <div className="rounded-xl border border-[#263241] bg-[#151E28] p-3">
    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8B98A8]">{label}</div>
    <div className={`mt-2 font-black ${large ? "text-2xl" : "text-sm"} ${tone === "green" ? "text-[#12B886]" : tone === "red" ? "text-[#E85D5D]" : "text-white"}`}>{value}</div>
  </div>
);

const EmptyState = ({ icon: Icon, title, body, action }: { icon: any; title: string; body: string; action?: React.ReactNode }) => (
  <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-[#263241] bg-[#101720]/70 p-6 text-center">
    <div>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-[#263241] bg-[#151E28] text-[#12B886]">
        <Icon className="h-8 w-8" />
      </div>
      <div className="text-xl font-black">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[#8B98A8]">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  </div>
);

export default Dashboard;

const SessionLoading = ({ label }: { label: string }) => (
  <div className="app-bg min-h-screen text-white xl:pl-64">
    <Header />
    <main className="grid min-h-[70vh] place-items-center px-4">
      <FlippeLoader label={label} />
    </main>
    <MobileNav />
  </div>
);
