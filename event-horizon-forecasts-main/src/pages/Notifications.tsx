import { useEffect, useMemo, useState } from "react";
import { Activity as ActivityIcon, Clock, Trophy, Wallet, XCircle, Zap } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import apiService, { type ApiActivity, type ApiPosition } from "@/lib/api";
import { toast } from "sonner";

export default function Notifications() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [activity, setActivity] = useState<ApiActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadActivity = async () => {
      setLoading(true);
      try {
        const [positionsResponse, activityResponse] = await Promise.all([
          apiService.getPositions(),
          apiService.getActivity(),
        ]);
        setPositions(positionsResponse.positions);
        setActivity(activityResponse.activity);
      } catch (error: any) {
        toast("Could not load activity", {
          description: error.message || "Please refresh and try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [user]);

  const groups = useMemo(() => {
    const active = positions.filter((position) => position.marketStatus === "active");
    const won = positions.filter((position) => position.marketStatus === "resolved" && position.currentValue > position.stake);
    const lost = positions.filter((position) => position.marketStatus === "resolved" && position.currentValue <= position.stake);

    return { active, won, lost };
  }, [positions]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050711] text-white xl:pl-64">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-2xl font-black">Log in to see activity</h2>
          <p className="mt-2 text-sm text-slate-400">Your predictions and wallet moves will show here.</p>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050711] pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-violet-300">Activity</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Your moves</h1>
          <p className="mt-2 text-sm text-slate-400">{loading ? "Loading..." : "Active predictions, results, and money history."}</p>
        </div>

        <section className="grid gap-3 sm:grid-cols-3">
          <SummaryCard icon={Zap} label="Active" value={groups.active.length.toString()} tone="violet" />
          <SummaryCard icon={Trophy} label="Won" value={groups.won.length.toString()} tone="green" />
          <SummaryCard icon={XCircle} label="Lost" value={groups.lost.length.toString()} tone="red" />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Predictions</h2>
                <p className="text-sm text-slate-500">Your active, won, and lost picks.</p>
              </div>
              <ActivityIcon className="h-5 w-5 text-violet-300" />
            </div>

            {positions.length === 0 ? (
              <EmptyState title="No predictions yet" body="Pick a market to see it here." />
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
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <Info label="Stake" value={formatNaira(position.stake)} />
                      <Info label="Price" value={`${Math.round(position.currentPrice)}%`} />
                      <Info label="Status" value={position.marketStatus} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Money history</h2>
                <p className="text-sm text-slate-500">Deposits, withdrawals, predictions, winnings, and refunds.</p>
              </div>
              <Wallet className="h-5 w-5 text-violet-300" />
            </div>

            {activity.length === 0 ? (
              <EmptyState title="No history yet" body="Your wallet history will show here." />
            ) : (
              <ul className="space-y-3">
                {activity.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1020]/80 p-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black">{item.label}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-black ${item.direction === "IN" ? "text-emerald-300" : "text-red-300"}`}>
                        {item.direction === "IN" ? "+" : "-"}
                        {formatNaira(item.amount)}
                      </div>
                      <div className="mt-1 text-xs capitalize text-slate-500">{item.status}</div>
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

const SummaryCard = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "violet" | "green" | "red" }) => {
  const tones = {
    violet: "border-violet-300/20 bg-violet-400/10 text-violet-300",
    green: "border-emerald-300/20 bg-emerald-400/10 text-emerald-300",
    red: "border-red-300/20 bg-red-400/10 text-red-300",
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
      <div className={`mb-4 grid h-10 w-10 place-items-center rounded-2xl border ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-3xl font-black">{value}</div>
      <div className="mt-1 text-sm font-bold text-slate-500">{label}</div>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-white/[0.045] p-3">
    <div className="text-slate-500">{label}</div>
    <div className="mt-1 truncate font-black text-white">{value}</div>
  </div>
);

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="rounded-3xl border border-dashed border-white/10 py-14 text-center">
    <ActivityIcon className="mx-auto mb-4 h-8 w-8 text-violet-300" />
    <div className="font-black">{title}</div>
    <p className="mt-1 text-sm text-slate-500">{body}</p>
  </div>
);
