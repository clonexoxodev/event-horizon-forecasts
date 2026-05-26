import { useEffect, useState } from "react";
import { Camera, LineChart, Trophy, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
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
  const { user } = useAuth();
  const [stats, setStats] = useState<ApiProfileStats>(emptyStats);
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [avatar, setAvatar] = useState<string>(() => localStorage.getItem("flippe_profile_image") || "");
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
  }, [user]);

  const handleImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      setAvatar(value);
      localStorage.setItem("flippe_profile_image", value);
    };
    reader.readAsDataURL(file);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050711] text-white xl:pl-64">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-2xl font-black">Log in to see your profile</h2>
          <p className="mt-2 text-sm text-slate-400">Your prediction history and stats will show here.</p>
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
    <div className="min-h-screen bg-[#050711] pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="rounded-[2rem] border border-violet-400/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.36),rgba(10,13,25,0.96)_48%)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500">
              {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-3xl font-black">{initials}</div>}
              <label className="absolute bottom-0 right-0 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white text-[#050711] shadow-lg">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0])} className="hidden" />
              </label>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black">{user.name || user.username}</h1>
              <p className="truncate text-sm text-slate-400">@{user.username}</p>
              <Link to="/edit-profile" className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-black text-white">
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

        <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Prediction history</h2>
              <p className="text-sm text-slate-500">{loading ? "Loading..." : "Your latest market positions"}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-slate-300">
              {stats.activePredictions} active
            </span>
          </div>

          {positions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 py-14 text-center">
              <LineChart className="mx-auto mb-4 h-8 w-8 text-violet-300" />
              <div className="font-black">No predictions yet</div>
              <p className="mt-1 text-sm text-slate-500">Pick a market to start building your record.</p>
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
    <Icon className="mb-3 h-4 w-4 text-violet-200" />
    <div className="text-[11px] font-bold text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-black">{value}</div>
  </div>
);

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-white/[0.045] p-3">
    <div className="text-slate-500">{label}</div>
    <div className="mt-1 truncate font-black text-white">{value}</div>
  </div>
);
