import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, BarChart3, Clock, Flame, LineChart, Loader2, Target, Trophy, Wallet } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import apiService, { type ApiPosition, type ApiProfileStats } from "@/lib/api";
import { formatNaira } from "@/lib/markets";

type PortfolioTab = "positions" | "activity" | "performance";

const emptyStats: ApiProfileStats = {
  totalPredictions: 0,
  activePredictions: 0,
  wonPredictions: 0,
  winRate: 0,
  totalStaked: 0,
  totalEarnings: 0,
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
        console.warn("Portfolio request failed", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPortfolio();
    return () => {
      mounted = false;
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

  const portfolioValue = activePositions.reduce((sum, position) => sum + Number(position.currentValue || position.stake || 0), 0);
  const roi = stats.totalStaked > 0 ? Math.round(((stats.totalEarnings - stats.totalStaked) / stats.totalStaked) * 100) : 0;
  const streak = Math.min(stats.wonPredictions, 7);

  if (authLoading) {
    return <SessionLoading label="Restoring your portfolio..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050711] text-white xl:pl-64">
        <Header />
        <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 text-center">
          <div>
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-violet-500/15 text-violet-200">
              <LineChart className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Your prediction identity starts here</h1>
            <p className="mt-3 text-sm text-slate-400">Log in to track positions, performance, and public forecasting progress.</p>
            <Link to="/login" className="mt-6 inline-flex h-12 items-center rounded-2xl bg-violet-500 px-6 text-sm font-black text-white shadow-[0_0_28px_rgba(139,92,246,0.35)]">
              Log in
            </Link>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050711] pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
        <section className="rounded-[2rem] border border-violet-400/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.42),rgba(8,11,22,0.96)_44%)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)] sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-200">Portfolio</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{formatNaira(portfolioValue)}</h1>
              <p className="mt-2 text-sm text-slate-400">Active prediction value</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[340px]">
              <HeroStat icon={Target} label="Win rate" value={stats.totalPredictions ? `${Math.round(stats.winRate)}%` : "-"} />
              <HeroStat icon={BarChart3} label="ROI" value={stats.totalStaked ? `${roi}%` : "-"} tone={roi >= 0 ? "green" : "red"} />
              <HeroStat icon={Flame} label="Streak" value={streak ? `${streak}` : "-"} />
            </div>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.055] p-1">
          {(["positions", "activity", "performance"] as PortfolioTab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`h-11 rounded-xl text-sm font-black capitalize transition ${
                tab === item ? "bg-violet-500 text-white shadow-[0_0_22px_rgba(139,92,246,0.28)]" : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid min-h-[360px] place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
          </div>
        ) : (
          <div className="mt-5">
            {tab === "positions" && <PositionsView positions={activePositions} />}
            {tab === "activity" && <ActivityView positions={positions} settledCount={settledPositions.length} />}
            {tab === "performance" && <PerformanceView stats={stats} roi={roi} />}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
};

const HeroStat = ({ icon: Icon, label, value, tone = "violet" }: { icon: any; label: string; value: string; tone?: "violet" | "green" | "red" }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3">
    <Icon className={`mb-3 h-4 w-4 ${tone === "green" ? "text-emerald-300" : tone === "red" ? "text-red-300" : "text-violet-200"}`} />
    <div className="text-[11px] font-bold text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-black">{value}</div>
  </div>
);

const PositionsView = ({ positions }: { positions: ApiPosition[] }) => {
  if (positions.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="No active positions"
        body="Make a prediction and your live positions will appear here."
        action={<Link to="/" className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-black text-white">Explore markets</Link>}
      />
    );
  }

  return (
    <div className="grid gap-3">
      {positions.map((position) => (
        <Link key={position.id} to={`/market/${position.marketId}`} className="rounded-3xl border border-white/10 bg-white/[0.055] p-4 transition hover:border-violet-300/30 hover:bg-white/[0.075]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Active position</div>
              <h2 className="mt-2 line-clamp-2 text-lg font-black leading-tight">{position.marketQuestion}</h2>
              <div className="mt-2 text-xs font-bold text-slate-500">
                {position.category || "General"} · {new Date(position.createdAt).toLocaleDateString()}
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${position.side === "YES" ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
              {position.side}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <Metric label="Stake" value={formatNaira(position.stake)} />
            <Metric label="Current" value={formatNaira(position.currentValue || position.stake)} />
            <Metric label="Price" value={`₦${Math.round(position.currentPrice || position.entryPrice || 0)}`} />
          </div>
        </Link>
      ))}
    </div>
  );
};

const ActivityView = ({ positions, settledCount }: { positions: ApiPosition[]; settledCount: number }) => {
  const sorted = [...positions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (sorted.length === 0) {
    return <EmptyState icon={Activity} title="No activity yet" body="Your prediction history will show here after your first move." />;
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black">Recent activity</h2>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">{settledCount} settled</span>
      </div>
      <div className="space-y-2">
        {sorted.map((position) => (
          <Link key={position.id} to={`/market/${position.marketId}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1020]/80 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/15 text-violet-200">
                {position.marketStatus === "active" ? <Clock className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black">{position.marketQuestion}</div>
                <div className="mt-1 text-xs text-slate-500">{position.category || "General"} · {position.side} prediction · {new Date(position.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-black">
                {position.resolvedAt ? formatNaira(position.payout || 0) : formatNaira(position.stake)}
              </div>
              <div className={`mt-1 text-xs capitalize ${position.resolvedAt ? (position.isWinner ? "text-emerald-300" : "text-red-300") : "text-slate-500"}`}>
                {position.resolvedAt ? (position.isWinner ? "won" : "lost") : position.marketStatus}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

const PerformanceView = ({ stats, roi }: { stats: ApiProfileStats; roi: number }) => {
  return (
    <div className="grid gap-4">
      <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
        <h2 className="text-xl font-black">Performance</h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label="Predictions" value={String(stats.totalPredictions)} large />
          <Metric label="Active" value={String(stats.activePredictions)} large />
          <Metric label="Won" value={String(stats.wonPredictions)} large />
          <Metric label="ROI" value={stats.totalStaked ? `${roi}%` : "-"} large />
          <Metric label="Staked" value={formatNaira(stats.totalStaked)} large />
          <Metric label="Earned" value={formatNaira(stats.totalEarnings)} large />
        </div>
      </section>
    </div>
  );
};

const Metric = ({ label, value, large = false }: { label: string; value: string; large?: boolean }) => (
  <div className="rounded-2xl border border-white/10 bg-[#0b1020]/75 p-3">
    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div>
    <div className={`mt-2 font-black ${large ? "text-2xl" : "text-sm"}`}>{value}</div>
  </div>
);

const EmptyState = ({ icon: Icon, title, body, action }: { icon: any; title: string; body: string; action?: React.ReactNode }) => (
  <div className="grid min-h-[360px] place-items-center rounded-3xl border border-dashed border-white/10 bg-white/[0.04] p-6 text-center">
    <div>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-violet-500/15 text-violet-200">
        <Icon className="h-8 w-8" />
      </div>
      <div className="text-xl font-black">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  </div>
);

export default Dashboard;

const SessionLoading = ({ label }: { label: string }) => (
  <div className="min-h-screen bg-[#050711] text-white xl:pl-64">
    <Header />
    <main className="grid min-h-[70vh] place-items-center px-4">
      <div className="text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-violet-300" />
        <p className="text-sm font-bold text-slate-400">{label}</p>
      </div>
    </main>
    <MobileNav />
  </div>
);
