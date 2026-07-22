import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  Camera,
  ChevronDown,
  ChevronRight,
  Crown,
  Flame,
  LineChart,
  LogOut,
  Medal,
  Settings,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import apiService, { type ApiPosition, type ApiProfileStats } from "@/lib/api";
import { toast } from "sonner";
import { getCategoryLabel } from "@/lib/categories";
import { LEVELS } from "@/lib/levels";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import {
  getCurrentWinStreak, getBestWinStreak, getScore, getTraderLevel,
  getLevelProgress, getNextLevel,
} from "@/lib/levels";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const emptyStats: ApiProfileStats = {
  totalPredictions: 0,
  activePredictions: 0,
  wonPredictions: 0,
  winRate: 0,
  totalStaked: 0,
  totalEarnings: 0,
  rank: 0,
  score: 0,
  level: "",
  totalRankedUsers: 0,
};

const ACHIEVEMENTS = [
  {
    id: "first_trade",
    label: "First Trade",
    description: "Placed your first position",
    icon: Zap,
    check: (s: ApiProfileStats) => s.totalPredictions >= 1,
  },
  {
    id: "ten_trades",
    label: "Active Trader",
    description: "Completed 10 trades",
    icon: TrendingUp,
    check: (s: ApiProfileStats) => s.totalPredictions >= 10,
  },
  {
    id: "fifty_trades",
    label: "Market Veteran",
    description: "Completed 50 trades",
    icon: Crown,
    check: (s: ApiProfileStats) => s.totalPredictions >= 50,
  },
  {
    id: "win_streak",
    label: "On Fire",
    description: "Achieved 70%+ win rate",
    icon: Trophy,
    check: (s: ApiProfileStats) => s.totalPredictions >= 5 && s.winRate >= 70,
  },
  {
    id: "high_earner",
    label: "Big Earner",
    description: "Earned over 100,000",
    icon: Award,
    check: (s: ApiProfileStats) => s.totalEarnings >= 100000,
  },
  {
    id: "top_rank",
    label: "Top Ranked",
    description: "Reached top 10 on leaderboard",
    icon: Target,
    check: (s: ApiProfileStats) => s.rank > 0 && s.rank <= 10,
  },
];

export default function Profile() {
  const { user, refreshUser, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ApiProfileStats>(emptyStats);
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const [statsResponse, positionsResponse] = await Promise.all([
          apiService.getProfileStats(),
          apiService.getPositions(),
        ]);
        setStats(statsResponse.stats);
        setPositions(positionsResponse.positions || []);
      } catch (error: any) {
        toast("Could not load profile", {
          description: error.message || "Please refresh and try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [authLoading, user]);

  const handleImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      await apiService.uploadProfilePicture(file);
      await refreshUser();
      toast.success("Profile picture saved.");
    } catch (error: any) {
      toast.error(error.message || "Could not save profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (authLoading) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4">
          <DelayedFlippeLoader active label="Restoring your profile" />
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-[#EEF2FF]">
            <Trophy className="h-8 w-8 text-[#4F46E5]" />
          </div>
          <h2 className="text-2xl font-black">Log in to see your profile</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Your trading history and stats will show here.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#4F46E5] px-6 text-sm font-bold text-white transition hover:bg-[#4338CA]"
          >
            Sign in
          </Link>
        </main>
        <MobileNav />
      </div>
    );
  }

  const initials =
    user.name?.charAt(0).toUpperCase() ||
    user.username?.charAt(0).toUpperCase() ||
    "U";
  const activeValue = positions
    .filter((position) => position.marketStatus === "active")
    .reduce(
      (sum, position) =>
        sum + Number(position.currentValue || position.stake || 0),
      0
    );

  const level = stats.level || "Beginner";
  const score = stats.score || 0;
  const currentLevelIndex = LEVELS.findIndex((l) => l.name === level);
  const nextThreshold =
    currentLevelIndex >= 0 && currentLevelIndex < LEVELS.length - 1
      ? LEVELS[currentLevelIndex + 1].score
      : LEVELS[LEVELS.length - 1].score;
  const progress = Math.min((score / nextThreshold) * 100, 100);

  const earnedAchievements = ACHIEVEMENTS.filter((a) => a.check(stats));

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        {/* ── Profile Hero ── */}
        <section className="relative overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-[#EEF2FF] to-white" />
          <div className="relative flex flex-col items-center sm:flex-row sm:items-start sm:gap-6">
            <div className="relative">
              <div className="h-28 w-28 overflow-hidden rounded-2xl border-4 border-white bg-[#F3F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || "Profile picture"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-4xl font-black text-[#4F46E5]">
                    {initials}
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-[#E5E7EB] bg-white text-[#4F46E5] shadow-md transition hover:bg-[#F3F4F6]">
                <Camera
                  className={`h-4 w-4 ${uploading ? "animate-pulse" : ""}`}
                />
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(event) => handleImage(event.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-4 flex-1 text-center sm:mt-0 sm:text-left">
              <h1 className="text-2xl font-black">
                {user.name || user.username}
              </h1>
              <p className="mt-1 text-sm text-[#6B7280]">@{user.username}</p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3 py-1">
                  <Trophy className="h-3.5 w-3.5 text-[#4F46E5]" />
                  <span className="text-xs font-bold text-[#4F46E5]">
                    {level}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-3 py-1">
                  <Zap className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span className="text-xs font-bold text-[#6B7280]">
                    {score} pts
                  </span>
                </span>
                {stats.rank > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#12B886]/10 px-3 py-1">
                    <Crown className="h-3.5 w-3.5 text-[#047857]" />
                    <span className="text-xs font-bold text-[#047857]">
                      Rank #{stats.rank}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Level Progress ── */}
          <div className="relative mt-6">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-bold text-[#9CA3AF]">
                Level Progress
              </span>
              <span className="font-black text-[#111827]">
                {score} / {nextThreshold} pts
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#F3F4F6]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#6366F1] transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-[#9CA3AF]">
              <span>{level}</span>
              <span>
                {currentLevelIndex >= 0 && currentLevelIndex < LEVELS.length - 1
                  ? LEVELS[currentLevelIndex + 1].name
                  : "Max Level"}
              </span>
            </div>
          </div>
        </section>

        {/* ── Stats Grid ── */}
        <section
          className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
          aria-label="Trading statistics"
        >
          <StatCard
            icon={LineChart}
            label="Total Trades"
            value={String(stats.totalPredictions)}
          />
          <StatCard
            icon={Trophy}
            label="Wins"
            value={String(stats.wonPredictions)}
          />
          <StatCard
            icon={Target}
            label="Win Rate"
            value={
              stats.totalPredictions
                ? `${Math.round(stats.winRate)}%`
                : "—"
            }
          />
          <StatCard
            icon={Wallet}
            label="Total Staked"
            value={formatNaira(stats.totalStaked)}
          />
          <StatCard
            icon={TrendingUp}
            label="Total Earned"
            value={formatNaira(stats.totalEarnings)}
          />
          <StatCard
            icon={Zap}
            label="Active Value"
            value={formatNaira(activeValue)}
          />
        </section>

        {/* ── Quick Links ── */}
        <section className="mt-4 rounded-3xl border border-[#E5E7EB] bg-white">
          <Link
            to="/edit-profile"
            className="flex items-center gap-3 border-b border-[#F3F4F6] p-4 transition last:border-b-0 hover:bg-[#F9FAFB]"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Camera className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[#111827]">
                Edit Profile
              </div>
              <div className="text-xs text-[#9CA3AF]">
                Update your name, bio, and avatar
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#D1D5DB]" />
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 border-b border-[#F3F4F6] p-4 transition last:border-b-0 hover:bg-[#F9FAFB]"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Settings className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[#111827]">Settings</div>
              <div className="text-xs text-[#9CA3AF]">
                Notifications, privacy, and security
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#D1D5DB]" />
          </Link>
          <Link
            to="/wallet"
            className="flex items-center gap-3 p-4 transition hover:bg-[#F9FAFB]"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[#111827]">Wallet</div>
              <div className="text-xs text-[#9CA3AF]">
                Deposit, withdraw, and view balance
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#D1D5DB]" />
          </Link>
        </section>

        {/* ── Achievement Badges ── */}
        <section className="mt-4 rounded-3xl border border-[#E5E7EB] bg-white p-5">
          <div className="mb-4">
            <h2 className="text-lg font-bold">Achievements</h2>
            <p className="text-xs text-[#9CA3AF]">
              {earnedAchievements.length} of {ACHIEVEMENTS.length} unlocked
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {ACHIEVEMENTS.map((achievement) => {
              const earned = achievement.check(stats);
              const AIcon = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition ${
                    earned
                      ? "border-[#4F46E5]/20 bg-[#EEF2FF]"
                      : "border-[#E5E7EB] bg-[#F9FAFB] opacity-40"
                  }`}
                  title={achievement.description}
                >
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-xl ${
                      earned
                        ? "bg-[#4F46E5] text-white"
                        : "bg-[#E5E7EB] text-[#9CA3AF]"
                    }`}
                  >
                    <AIcon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight text-[#111827]">
                    {achievement.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Trader Progress ── */}
        <TraderProgress stats={stats} positions={positions} />

        {/* ── Recent Positions ── */}
        <section className="mt-4 rounded-3xl border border-[#E5E7EB] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Recent Positions</h2>
              <p className="text-xs text-[#9CA3AF]">
                {loading
                  ? "Loading..."
                  : "Your last 5 market positions"}
              </p>
            </div>
            <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-bold text-[#4F46E5]">
              {stats.activePredictions} active
            </span>
          </div>

          {positions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] py-14 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#EEF2FF]">
                <LineChart className="h-8 w-8 text-[#4F46E5]" />
              </div>
              <div className="font-bold text-[#111827]">No positions yet</div>
              <p className="mt-1 text-sm text-[#9CA3AF]">
                Browse markets to open your first position.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {positions.slice(0, 5).map((position) => (
                <li
                  key={position.id}
                  className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-sm font-bold text-[#111827]">
                        {position.marketQuestion}
                      </div>
                      <div className="mt-2 text-xs text-[#9CA3AF]">
                        {getCategoryLabel(position.category)} &middot;{" "}
                        {new Date(position.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        position.side === "YES"
                          ? "bg-[#12B886]/10 text-[#047857]"
                          : "bg-[#E85D5D]/10 text-[#B42318]"
                      }`}
                    >
                      {position.side}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <Mini
                      label="Stake"
                      value={formatNaira(position.stake)}
                    />
                    <Mini
                      label="Value"
                      value={formatNaira(
                        position.currentValue || position.stake
                      )}
                    />
                    <Mini
                      label="Status"
                      value={position.marketStatus}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Logout ── */}
        <AlertDialog
          open={showLogoutDialog}
          onOpenChange={setShowLogoutDialog}
        >
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#E85D5D]/20 bg-[#FEF2F2] text-sm font-bold text-[#E85D5D] transition hover:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log out of Flippi?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be signed out and redirected to the login page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Log out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
      <MobileNav />
    </div>
  );
}

const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-center">
    <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl bg-[#EEF2FF]">
      <Icon className="h-4 w-4 text-[#4F46E5]" />
    </div>
    <div className="text-xl font-black text-[#111827]">{value}</div>
    <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
      {label}
    </div>
  </div>
);

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-[#E5E7EB] bg-white p-2.5">
    <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
      {label}
    </div>
    <div className="mt-0.5 truncate text-xs font-bold text-[#111827]">
      {value}
    </div>
  </div>
);

const TraderProgress = ({ stats, positions }: { stats: ApiProfileStats; positions: ApiPosition[] }) => {
  const [expanded, setExpanded] = useState(false);

  const resolvedPositions = useMemo(() => positions.filter((p) => p.resolvedAt), [positions]);
  const wonPositions = useMemo(() => resolvedPositions.filter((p) => p.isWinner), [resolvedPositions]);
  const activePositions = useMemo(
    () => positions.filter((p) => p.marketStatus === "active" && ["active", "open"].includes(String(p.status || "active").toLowerCase())),
    [positions]
  );

  const totalScore = getScore(stats.totalPredictions, wonPositions.length);
  const level = stats.level || getTraderLevel(stats.totalPredictions, wonPositions.length);
  const nextLevel = getNextLevel(level);
  const progress = getLevelProgress(stats.totalPredictions, wonPositions.length);
  const winRate = resolvedPositions.length ? Math.round((wonPositions.length / resolvedPositions.length) * 100) : 0;
  const bestStreak = getBestWinStreak(resolvedPositions);
  const currentStreak = getCurrentWinStreak(resolvedPositions);
  const lvlIdx = Math.max(0, LEVELS.findIndex((l) => l.name === level));
  const ptsToNext = level === nextLevel ? 0 : Math.max(0, (LEVELS[Math.min(lvlIdx + 1, LEVELS.length - 1)]?.score || 0) - totalScore);

  return (
    <section className="mt-4 rounded-3xl border border-[#E5E7EB] bg-white p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
            <Medal className="h-4 w-4" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-[#111827]">Trader Progress</div>
            <div className="text-[10px] font-bold text-[#9CA3AF]">
              {level === nextLevel ? "Max level reached" : `${ptsToNext} pts to ${nextLevel}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <AnimatedNumber value={totalScore} className="text-lg font-black text-[#4F46E5]" />
            <div className="text-[9px] font-bold text-[#9CA3AF]">points</div>
          </div>
          <ChevronDown className={`h-4 w-4 text-[#9CA3AF] transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-[#F3F4F6] pt-4">
          <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[#F8F7F4] p-2.5 text-center">
              <div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-lg bg-white text-[#4F46E5]">
                <BarChart3 className="h-3 w-3" />
              </div>
              <div className="text-sm font-bold text-[#111827]">{winRate}%</div>
              <div className="text-[9px] font-bold text-[#9CA3AF]">Win rate</div>
            </div>
            <div className="rounded-xl bg-[#F8F7F4] p-2.5 text-center">
              <div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-lg bg-white text-[#4F46E5]">
                <Target className="h-3 w-3" />
              </div>
              <div className="text-sm font-bold text-[#111827]">{activePositions.length}</div>
              <div className="text-[9px] font-bold text-[#9CA3AF]">Active</div>
            </div>
            <div className="rounded-xl bg-[#F8F7F4] p-2.5 text-center">
              <div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-lg bg-white text-[#4F46E5]">
                <Flame className="h-3 w-3" />
              </div>
              <div className="text-sm font-bold text-[#111827]">{bestStreak}</div>
              <div className="text-[9px] font-bold text-[#9CA3AF]">Best streak</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
