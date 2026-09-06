import { useEffect, useState } from "react";
import { ArrowLeft, Lock, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import { apiService, type ApiPosition, type ApiProfileStats } from "@/lib/api";
import { toast } from "sonner";
import { ACHIEVEMENTS, getAchievementCounts } from "@/lib/achievements";

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

export default function Achievements() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<ApiProfileStats>(emptyStats);
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    const load = async () => {
      setLoading(true);
      try {
        const [statsResponse, positionsResponse] = await Promise.all([
          apiService.getProfileStats(),
          apiService.getPositions(),
        ]);
        setStats(statsResponse.stats);
        setPositions(positionsResponse.positions || []);
      } catch (error: any) {
        toast("Could not load achievements", {
          description: error.message || "Please refresh and try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4">
          <DelayedFlippeLoader active label="Loading achievements" />
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
          <h2 className="text-2xl font-black">Log in to track achievements</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Your unlocked badges and progress will show here.
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

  const input = { stats, positions };
  const { earned, total, earnedList } = getAchievementCounts(input);

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#6B7280] transition hover:text-[#111827]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        <section className="mt-4 overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Achievements</h1>
              <p className="mt-0.5 text-sm text-[#6B7280]">
                {loading
                  ? "Loading your progress..."
                  : `${earned} of ${total} unlocked`}
              </p>
            </div>
          </div>
          {!loading && total > 0 && (
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#F3F4F6]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] transition-all duration-700"
                style={{ width: `${(earned / total) * 100}%` }}
              />
            </div>
          )}
        </section>

        {!loading && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = earnedList.some((a) => a.id === achievement.id);
              const AIcon = achievement.icon;
              const progress = achievement.progress?.(input);
              const pct = progress
                ? Math.min(100, Math.round((progress.current / progress.target) * 100))
                : unlocked
                  ? 100
                  : 0;
              return (
                <div
                  key={achievement.id}
                  className={`flex flex-col rounded-2xl border p-4 transition ${
                    unlocked
                      ? "border-[#4F46E5]/20 bg-[#EEF2FF]"
                      : "border-[#E5E7EB] bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                        unlocked
                          ? "bg-[#4F46E5] text-white"
                          : "bg-[#F3F4F6] text-[#9CA3AF]"
                      }`}
                    >
                      <AIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-bold ${
                          unlocked ? "text-[#4F46E5]" : "text-[#111827]"
                        }`}
                      >
                        {achievement.label}
                      </div>
                      <div className="mt-0.5 text-xs text-[#6B7280]">
                        {achievement.description}
                      </div>
                    </div>
                    {unlocked ? (
                      <Trophy className="h-4 w-4 shrink-0 text-[#4F46E5]" />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0 text-[#D1D5DB]" />
                    )}
                  </div>
                  {progress && !unlocked && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-[#9CA3AF]">
                        <span>
                          {Math.min(progress.current, progress.target).toLocaleString()} /{" "}
                          {progress.target.toLocaleString()}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}