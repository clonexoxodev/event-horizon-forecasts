import { useEffect, useMemo, useState } from "react";
import { Activity as ActivityIcon, Clock, Target, Trophy, Wallet, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import apiService, { type ApiActivity, type ApiPosition } from "@/lib/api";
import { toast } from "sonner";

export default function Notifications() {
  const { user, isLoading: authLoading } = useAuth();
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [activity, setActivity] = useState<ApiActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

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
  }, [authLoading, user]);

  const groups = useMemo(() => {
    const active = positions.filter((position) => position.marketStatus === "active");
    const won = positions.filter((position) => position.marketStatus === "resolved" && position.currentValue > position.stake);
    const lost = positions.filter((position) => position.marketStatus === "resolved" && position.currentValue <= position.stake);

    return { active, won, lost };
  }, [positions]);

  if (authLoading) {
    return (
      <div className="app-bg min-h-screen text-white xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4">
          <DelayedFlippeLoader active label="Restoring your activity" />
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
          <h2 className="text-2xl font-black">Log in to see activity</h2>
          <p className="mt-2 text-sm text-[#8B98A8]">Your predictions and wallet moves will show here.</p>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8B98A8]">Activity</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Your moves</h1>
          <p className="mt-2 text-sm text-[#8B98A8]">{loading ? "Loading..." : "Active predictions, results, and money history."}</p>
        </div>

        <section className="grid gap-3 sm:grid-cols-3">
          <SummaryCard icon={Target} label="Active" value={groups.active.length.toString()} tone="neutral" />
          <SummaryCard icon={Trophy} label="Won" value={groups.won.length.toString()} tone="green" />
          <SummaryCard icon={XCircle} label="Lost" value={groups.lost.length.toString()} tone="red" />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Predictions</h2>
                <p className="text-sm text-[#8B98A8]">Your active, won, and lost picks.</p>
              </div>
              <ActivityIcon className="h-5 w-5 text-[#12B886]" />
            </div>

            {positions.length === 0 ? (
              <EmptyState title="No predictions yet" body="Pick a market to see it here." />
            ) : (
              <ul className="space-y-3">
                {positions.map((position) => (
                  <li key={position.id} className="rounded-xl border border-[#263241] bg-[#151E28] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-sm font-black">{position.marketQuestion}</div>
                        <div className="mt-2 text-xs text-[#8B98A8]">{new Date(position.createdAt).toLocaleDateString()}</div>
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

          <div className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Money history</h2>
                <p className="text-sm text-[#8B98A8]">Deposits, withdrawals, predictions, winnings, and refunds.</p>
              </div>
              <Wallet className="h-5 w-5 text-[#12B886]" />
            </div>

            {activity.length === 0 ? (
              <EmptyState title="No history yet" body="Your wallet history will show here." />
            ) : (
              <ul className="space-y-3">
                {activity.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#263241] bg-[#151E28] p-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black">{item.label}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-[#8B98A8]">
                        <Clock className="h-3 w-3" />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-black ${item.direction === "IN" ? "text-[#12B886]" : "text-[#E85D5D]"}`}>
                        {item.direction === "IN" ? "+" : "-"}
                        {formatNaira(item.amount)}
                      </div>
                      <div className="mt-1 text-xs capitalize text-[#8B98A8]">{item.status}</div>
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

const SummaryCard = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "neutral" | "green" | "red" }) => {
  const tones = {
    neutral: "border-[#263241] bg-[#151E28] text-[#8B98A8]",
    green: "border-[#12B886]/25 bg-[#12B886]/10 text-[#12B886]",
    red: "border-[#E85D5D]/25 bg-[#E85D5D]/10 text-[#E85D5D]",
  };

  return (
    <div className="rounded-2xl border border-[#263241] bg-[#101720] p-4">
      <div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl border ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-3xl font-black">{value}</div>
      <div className="mt-1 text-sm font-bold text-[#8B98A8]">{label}</div>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-[#263241] bg-[#101720] p-3">
    <div className="text-[#8B98A8]">{label}</div>
    <div className="mt-1 truncate font-black text-white">{value}</div>
  </div>
);

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="rounded-2xl border border-dashed border-[#263241] py-14 text-center">
    <ActivityIcon className="mx-auto mb-4 h-8 w-8 text-[#12B886]" />
    <div className="font-black">{title}</div>
    <p className="mt-1 text-sm text-[#8B98A8]">{body}</p>
  </div>
);
