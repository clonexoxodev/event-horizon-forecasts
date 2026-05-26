import { useEffect, useState } from "react";
import { Award, Crown, Flame, Lock, LogOut, ShieldCheck, Star, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import apiService, { type ApiPosition, type ApiProfileStats } from "@/lib/api";
import { toast } from "sonner";

const emptyStats: ApiProfileStats = {
  totalPredictions: 0,
  activePredictions: 0,
  wonPredictions: 0,
  winRate: 0,
  totalStaked: 0,
  totalEarnings: 0,
};

export default function Profile() {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<ApiProfileStats>(emptyStats);
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const [statsResponse, positionsResponse] = await Promise.all([
          apiService.getProfileStats(),
          apiService.getPositions(),
        ]);
        setStats(statsResponse.stats);
        setPositions(positionsResponse.positions.slice(0, 6));
      } catch (error: any) {
        toast("Could not load profile", {
          description: error.message || "Please refresh and try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050711] text-white xl:pl-64">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-2xl font-black">Log in to see your profile</h2>
          <p className="mt-2 text-sm text-slate-400">Your stats and badges will show here.</p>
        </main>
        <MobileNav />
      </div>
    );
  }

  const initials = user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || "U";
  const adminPath = isSuperAdmin() ? "/super-admin" : "/admin";
  const earnedBadges = [
    { icon: Trophy, label: "First Pick", active: stats.totalPredictions > 0 },
    { icon: Flame, label: "Streak", active: stats.activePredictions >= 3 },
    { icon: Crown, label: "Winner", active: stats.wonPredictions > 0 },
    { icon: ShieldCheck, label: "Elite", active: stats.winRate >= 70 && stats.totalPredictions >= 5 },
  ];
  const nextBadgeProgress = stats.totalPredictions > 0 ? Math.min(100, Math.round((stats.wonPredictions / 1) * 100)) : 0;
  const nextBadgeText = stats.totalPredictions > 0
    ? "Win one market to unlock Winner."
    : "Make your first prediction to unlock First Pick.";

  return (
    <div className="min-h-screen bg-[#050711] pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-8">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-violet-400/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.38),rgba(10,13,25,0.96)_48%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-3xl font-black shadow-[0_0_34px_rgba(139,92,246,0.42)]">
                {initials}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black">{user.name || user.username}</h1>
                <p className="truncate text-sm text-slate-400">{user.email}</p>
                <div className="mt-2 inline-flex rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-black text-violet-200">
                  Elite Predictor
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <MiniStat value={stats.totalPredictions.toString()} label="Markets" />
              <MiniStat value="0" label="Followers" />
              <MiniStat value="0" label="Following" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                <div className="text-xs font-bold text-slate-400">Win rate</div>
                <div className="mt-1 text-3xl font-black text-emerald-300">{Math.round(stats.winRate)}%</div>
              </div>
              <div className="rounded-2xl border border-violet-300/20 bg-white/[0.055] p-4">
                <div className="text-xs font-bold text-slate-400">Total earnings</div>
                <div className="mt-1 text-2xl font-black text-white">{formatNaira(stats.totalEarnings)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">Badges</h2>
              <Award className="h-5 w-5 text-violet-300" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {earnedBadges.map((badge) => (
                <BadgeTile key={badge.label} icon={badge.icon} label={badge.label} active={badge.active} />
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1020]/80 p-4">
              <div className="flex items-center justify-between gap-3 text-xs font-black">
                <span className="text-slate-400">Next badge</span>
                <span className="text-violet-200">{nextBadgeProgress}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ width: `${nextBadgeProgress}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{nextBadgeText}</p>
            </div>
          </div>

          {(isAdmin() || isSuperAdmin()) && (
            <Link
              to={adminPath}
              className="flex h-12 w-full items-center justify-center rounded-2xl border border-violet-300/25 bg-violet-500/15 text-sm font-black text-violet-100 shadow-[0_0_28px_rgba(139,92,246,0.18)] transition hover:bg-violet-500/25"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin dashboard
            </Link>
          )}

          <Button
            onClick={logout}
            variant="outline"
            className="h-12 w-full rounded-2xl border-red-400/30 bg-red-400/10 font-black text-red-200 hover:bg-red-400/20"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </section>

        <section className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <ScoreCard label="Active" value={stats.activePredictions.toString()} />
            <ScoreCard label="Won" value={stats.wonPredictions.toString()} />
            <ScoreCard label="Staked" value={formatNaira(stats.totalStaked)} />
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Recent predictions</h2>
                <p className="text-sm text-slate-500">{loading ? "Loading..." : "Your latest market moves"}</p>
              </div>
              <Star className="h-5 w-5 text-violet-300" />
            </div>

            {positions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 py-14 text-center">
                <Users className="mx-auto mb-4 h-8 w-8 text-violet-300" />
                <div className="font-black">No predictions yet</div>
                <p className="mt-1 text-sm text-slate-500">Pick a market to build your record.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {positions.map((position) => (
                  <li key={position.id} className="rounded-2xl border border-white/10 bg-[#0b1020]/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-sm font-black">{position.marketQuestion}</div>
                        <div className="mt-2 text-xs text-slate-500">{new Date(position.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${position.side === "YES" ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
                        {position.side}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Stake</span>
                      <span className="font-black">{formatNaira(position.stake)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const MiniStat = ({ value, label }: { value: string; label: string }) => (
  <div>
    <div className="text-xl font-black">{value}</div>
    <div className="text-xs text-slate-500">{label}</div>
  </div>
);

const BadgeTile = ({ icon: Icon, label, active }: { icon: any; label: string; active: boolean }) => (
  <div className={`relative overflow-hidden rounded-2xl border p-3 text-center ${
    active
      ? "border-violet-300/35 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.36),rgba(255,255,255,0.06)_60%)] shadow-[0_0_28px_rgba(139,92,246,0.18)]"
      : "border-white/10 bg-white/[0.035]"
  }`}>
    <div className={`mx-auto grid h-11 w-11 place-items-center rounded-2xl ${
      active ? "bg-violet-400/20 text-violet-100" : "bg-slate-800/70 text-slate-600"
    }`}>
      {active ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
    </div>
    <div className={`mt-2 truncate text-xs font-black ${active ? "text-white" : "text-slate-500"}`}>{label}</div>
    <div className={`mt-1 text-[10px] font-bold ${active ? "text-violet-200" : "text-slate-600"}`}>
      {active ? "Earned" : "Locked"}
    </div>
  </div>
);

const ScoreCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
    <div className="text-xs font-bold text-slate-500">{label}</div>
    <div className="mt-2 text-xl font-black text-white">{value}</div>
  </div>
);
