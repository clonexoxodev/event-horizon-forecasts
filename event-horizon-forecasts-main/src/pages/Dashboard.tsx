import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, BarChart3, Clock, LineChart, Loader2, Target, Trophy } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import apiService, { type ApiPosition, type ApiProfileStats } from "@/lib/api";
import { formatNaira } from "@/lib/markets";
import { getCategoryLabel } from "@/lib/categories";

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
    return <SessionLoading label="Restoring your portfolio..." />;
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
            <p className="mt-3 text-sm text-[#8B98A8]">Log in to see active positions, resolved markets, and wallet-linked activity.</p>
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
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">Portfolio</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{formatNaira(projectedValue)}</h1>
              <p className="mt-2 max-w-xl text-sm text-[#8B98A8]">
                Projected portfolio value. Projected values move with market activity and are finalized only after resolution.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
              <HeroStat icon={Target} label="Active positions" value={`${activePositions.length}`} />
              <HeroStat icon={BarChart3} label="Total staked" value={formatNaira(openStake)} />
              <HeroStat icon={LineChart} label="Projected P/L" value={`${projectedPnl >= 0 ? "+" : ""}${formatNaira(projectedPnl)}`} tone={projectedPnl >= 0 ? "green" : "red"} />
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
              {item}
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
        title="No active positions"
        body="Make a prediction and your live positions will appear here."
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
                <div className="text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">Active position</div>
                <h2 className="mt-2 line-clamp-2 text-lg font-black leading-tight">{position.marketQuestion}</h2>
                <div className="mt-2 text-xs font-bold text-[#8B98A8]">
                  {getCategoryLabel(position.category)} · {new Date(position.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${position.side === "YES" ? "bg-[#12B886]/10 text-[#7AE4BD]" : "bg-[#E85D5D]/10 text-[#FF9C9C]"}`}>
                {position.side}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Metric label="Stake" value={formatNaira(position.stake)} />
              <Metric label="Entry price" value={`NGN ${Math.round(position.entryPrice || 0)}`} />
              <Metric label="Current price" value={`NGN ${Math.round(position.currentPrice || position.entryPrice || 0)}`} />
              <Metric label="Shares" value={String(Number(position.sharesOwned ?? position.sharesReceived ?? 0).toFixed(2))} />
              <Metric label="Projected payout" value={formatNaira(position.projectedPayout ?? position.currentValue ?? position.positionValue ?? position.stake)} />
              <Metric label="Projected P/L" value={`${projectedProfit >= 0 ? "+" : ""}${formatNaira(projectedProfit)}`} tone={projectedProfit >= 0 ? "green" : "red"} />
              <Metric label="Status" value={position.marketStatus.replace(/_/g, " ")} />
              <Metric label="Updated" value={new Date(position.createdAt).toLocaleDateString()} />
            </div>
            <p className="mt-3 text-xs font-bold text-[#8B98A8]">
              Projected values are estimates based on the current pool and are only finalized when the market resolves.
            </p>
          </Link>
        );
      })}
    </div>
  );
};

const ActivityView = ({ positions, settledCount }: { positions: ApiPosition[]; settledCount: number }) => {
  const sorted = [...positions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (sorted.length === 0) {
    return <EmptyState icon={Activity} title="No activity yet" body="Your prediction history will show here after your first move." />;
  }

  return (
    <section className="rounded-2xl border border-[#263241] bg-[#101720] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black">Recent activity</h2>
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

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
        <h2 className="text-xl font-black">Performance</h2>
        <p className="mt-1 text-sm text-[#8B98A8]">Only resolved outcomes are counted here. Open projected values stay in Positions.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Markets joined" value={String(stats.totalPredictions)} large />
          <Metric label="Resolved wins" value={String(won.length)} large />
          <Metric label="Resolved losses" value={String(lost.length)} large />
          <Metric label="Win rate" value={resolved.length ? `${Math.round((won.length / resolved.length) * 100)}%` : "-"} large />
          <Metric label="Total staked" value={formatNaira(stats.totalStaked)} large />
          <Metric label="Resolved winnings" value={formatNaira(stats.totalEarnings)} large />
          <Metric label="Open positions" value={String(positions.filter((position) => position.marketStatus === "active").length)} large />
          <Metric label="Resolved markets" value={String(resolved.length)} large />
        </div>
      </section>
    </div>
  );
};

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
      <div className="text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#12B886]" />
        <p className="text-sm font-bold text-[#8B98A8]">{label}</p>
      </div>
    </main>
    <MobileNav />
  </div>
);
