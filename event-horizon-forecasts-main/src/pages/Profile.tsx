import { useEffect, useState } from "react";
import { Camera, LineChart, Loader2, Trophy, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import apiService, { type ApiPosition, type ApiProfileStats } from "@/lib/api";
import { toast } from "sonner";
import { getCategoryLabel } from "@/lib/categories";

const emptyStats: ApiProfileStats = {
  totalPredictions: 0,
  activePredictions: 0,
  wonPredictions: 0,
  winRate: 0,
  totalStaked: 0,
  totalEarnings: 0,
};

export default function Profile() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<ApiProfileStats>(emptyStats);
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  if (authLoading) {
    return (
      <div className="app-bg min-h-screen text-white xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#12B886]" />
            <p className="text-sm font-bold text-[#8B98A8]">Restoring your profile...</p>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-bg min-h-screen text-white xl:pl-64">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-2xl font-black">Log in to see your profile</h2>
          <p className="mt-2 text-sm text-[#8B98A8]">Your prediction history and stats will show here.</p>
        </main>
        <MobileNav />
      </div>
    );
  }

  const initials = user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || "U";
  const activeValue = positions
    .filter((position) => position.marketStatus === "active")
    .reduce((sum, position) => sum + Number(position.currentValue || position.stake || 0), 0);

  return (
    <div className="app-bg min-h-screen pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5 shadow-[0_18px_52px_rgba(0,0,0,0.28)]">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-[#263241] bg-[#151E28]">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-3xl font-black">{initials}</div>}
              <label className="absolute bottom-0 right-0 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white text-[#050711] shadow-lg">
                <Camera className={`h-4 w-4 ${uploading ? "animate-pulse" : ""}`} />
                <input type="file" accept="image/*" disabled={uploading} onChange={(event) => handleImage(event.target.files?.[0])} className="hidden" />
              </label>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black">{user.name || user.username}</h1>
              <p className="truncate text-sm text-[#8B98A8]">@{user.username}</p>
              <Link to="/edit-profile" className="mt-3 inline-flex rounded-full border border-[#263241] bg-[#151E28] px-3 py-1.5 text-xs font-black text-white">
                Edit profile
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat icon={LineChart} label="Predictions" value={String(stats.totalPredictions)} />
            <Stat icon={Trophy} label="Win rate" value={stats.totalPredictions ? `${Math.round(stats.winRate)}%` : "-"} />
            <Stat icon={Wallet} label="Active value" value={formatNaira(activeValue)} />
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-[#263241] bg-[#101720] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Prediction history</h2>
              <p className="text-sm text-[#8B98A8]">{loading ? "Loading..." : "Your latest market positions"}</p>
            </div>
            <span className="rounded-full border border-[#263241] bg-[#151E28] px-3 py-1 text-xs font-black text-[#8B98A8]">
              {stats.activePredictions} active
            </span>
          </div>

          {positions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#263241] py-14 text-center">
              <LineChart className="mx-auto mb-4 h-8 w-8 text-[#12B886]" />
              <div className="font-black">No predictions yet</div>
              <p className="mt-1 text-sm text-[#8B98A8]">Pick a market to start building your record.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {positions.map((position) => (
                <li key={position.id} className="rounded-xl border border-[#263241] bg-[#151E28] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-sm font-black">{position.marketQuestion}</div>
                      <div className="mt-2 text-xs text-slate-500">{getCategoryLabel(position.category)} · {new Date(position.createdAt).toLocaleDateString()}</div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${position.side === "YES" ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
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
      </main>
      <MobileNav />
    </div>
  );
}

const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
    <Icon className="mb-3 h-4 w-4 text-[#12B886]" />
    <div className="text-[11px] font-bold text-[#8B98A8]">{label}</div>
    <div className="mt-1 text-lg font-black">{value}</div>
  </div>
);

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-[#263241] bg-[#101720] p-3">
    <div className="text-[#8B98A8]">{label}</div>
    <div className="mt-1 truncate font-black text-white">{value}</div>
  </div>
);
