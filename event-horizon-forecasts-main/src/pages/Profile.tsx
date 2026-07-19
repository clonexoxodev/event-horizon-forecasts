import { useEffect, useState } from "react";
import { Camera, ChevronRight, LineChart, LogOut, Settings, Trophy, Wallet } from "lucide-react";
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
        setPositions(positionsResponse.positions.slice(0, 8));
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
          <p className="mt-2 text-sm text-[#6B7280]">Your prediction history and stats will show here.</p>
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

  const initials = user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || "U";
  const activeValue = positions
    .filter((position) => position.marketStatus === "active")
    .reduce((sum, position) => sum + Number(position.currentValue || position.stake || 0), 0);

  const level = stats.level || "Beginner";
  const score = stats.score || 0;
  const currentLevelIndex = LEVELS.findIndex((l) => l.name === level);
  const nextThreshold =
    currentLevelIndex >= 0 && currentLevelIndex < LEVELS.length - 1
      ? LEVELS[currentLevelIndex + 1].score
      : LEVELS[LEVELS.length - 1].score;
  const progress = Math.min((score / nextThreshold) * 100, 100);

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        {/* Avatar + User Info */}
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-start sm:gap-6">
            <div className="relative">
              <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[#E5E7EB] bg-[#F3F4F6]">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name || 'Profile picture'} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-4xl font-black text-[#4F46E5]">
                    {initials}
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-[#E5E7EB] bg-white text-[#4F46E5] shadow-md transition hover:bg-[#F3F4F6]">
                <Camera className={`h-4 w-4 ${uploading ? "animate-pulse" : ""}`} />
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(event) => handleImage(event.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-4 text-center sm:mt-0 sm:text-left">
              <h1 className="text-2xl font-black">{user.name || user.username}</h1>
              <p className="mt-1 text-sm text-[#6B7280]">@{user.username}</p>
              <p className="mt-0.5 text-sm text-[#6B7280]">{user.email}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3 py-1">
                <Trophy className="h-3.5 w-3.5 text-[#4F46E5]" />
                <span className="text-xs font-bold text-[#4F46E5]">{level}</span>
              </div>
            </div>
          </div>

          {/* Level Progress */}
          <div className="mt-6">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-[#6B7280]">Level progress</span>
              <span className="font-bold text-[#111827]">{score} / {nextThreshold} pts</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#F3F4F6]">
              <div
                className="h-full rounded-full bg-[#4F46E5] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </section>

        {/* Stats Summary */}
        <section className="mt-5 grid grid-cols-3 gap-3" aria-label="User statistics">
          <StatCard icon={LineChart} label="Predictions" value={String(stats.totalPredictions)} />
          <StatCard icon={Trophy} label="Win rate" value={stats.totalPredictions ? `${Math.round(stats.winRate)}%` : "-"} />
          <StatCard icon={Wallet} label="Active value" value={formatNaira(activeValue)} />
        </section>

        {/* Quick Links */}
        <section className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white">
          <Link to="/edit-profile" className="flex items-center gap-3 border-b border-[#E5E7EB] p-4 transition last:border-b-0 hover:bg-[#F9FAFB]">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Camera className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[#111827]">Edit Profile</div>
              <div className="text-xs text-[#6B7280]">Update your name, bio, and avatar</div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
          </Link>
          <Link to="/settings" className="flex items-center gap-3 border-b border-[#E5E7EB] p-4 transition last:border-b-0 hover:bg-[#F9FAFB]">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Settings className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[#111827]">Settings</div>
              <div className="text-xs text-[#6B7280]">Notifications, privacy, and security</div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
          </Link>
          <Link to="/wallet" className="flex items-center gap-3 p-4 transition hover:bg-[#F9FAFB]">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[#111827]">Wallet</div>
              <div className="text-xs text-[#6B7280]">Deposit, withdraw, and view balance</div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
          </Link>
        </section>

        {/* Prediction History */}
        <section className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">Recent predictions</h2>
              <p className="text-xs text-[#6B7280]">{loading ? "Loading..." : "Your latest market positions"}</p>
            </div>
            <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-bold text-[#4F46E5]">
              {stats.activePredictions} active
            </span>
          </div>

          {positions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] py-14 text-center">
              <LineChart className="mx-auto mb-4 h-8 w-8 text-[#4F46E5]" />
              <div className="font-bold text-[#111827]">No predictions yet</div>
              <p className="mt-1 text-sm text-[#6B7280]">Pick a market to start building your record.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {positions.map((position) => (
                <li key={position.id} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-sm font-bold text-[#111827]">{position.marketQuestion}</div>
                      <div className="mt-2 text-xs text-[#6B7280]">
                        {getCategoryLabel(position.category)} · {new Date(position.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        position.side === "YES"
                          ? "bg-emerald-50 text-[#047857]"
                          : "bg-red-50 text-[#B42318]"
                      }`}
                    >
                      {position.side}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <Mini label="Stake" value={formatNaira(position.stake)} />
                    <Mini label="Value" value={formatNaira(position.currentValue || position.stake)} />
                    <Mini label="Status" value={position.marketStatus} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Logout */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 text-sm font-bold text-red-600 transition hover:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log out of Flippe?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be signed out and redirected to the login page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout} className="bg-red-600 text-white hover:bg-red-700">
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

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-center">
    <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl bg-[#EEF2FF]">
      <Icon className="h-4 w-4 text-[#4F46E5]" />
    </div>
    <div className="text-xl font-black text-[#111827]">{value}</div>
    <div className="mt-0.5 text-xs font-semibold text-[#6B7280]">{label}</div>
  </div>
);

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-[#E5E7EB] bg-white p-2.5">
    <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">{label}</div>
    <div className="mt-0.5 truncate text-xs font-bold text-[#111827]">{value}</div>
  </div>
);
