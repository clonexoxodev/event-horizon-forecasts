import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowRight, Award, BarChart3, CheckCircle, Clock, Flame, LineChart, Loader2, Medal, Target, Trophy, X } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import apiService, { type ApiPosition, type ApiProfileStats } from "@/lib/api";
import { formatCountdown, formatNaira, formatNairaPrice, MARKET_ACTIVATION_REQUIREMENTS } from "@/lib/markets";
import { getCategoryLabel } from "@/lib/categories";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";

type PortfolioTab = "positions" | "activity" | "performance";
const tabLabels: Record<PortfolioTab, string> = {
  positions: "Open Predictions",
  activity: "Prediction History",
  performance: "My Score",
};

const emptyStats: ApiProfileStats = {
  totalPredictions: 0,
  activePredictions: 0,
  wonPredictions: 0,
  winRate: 0,
  totalStaked: 0,
  totalEarnings: 0,
  rank: null,
  score: 0,
  level: "Rookie",
  totalRankedUsers: 0,
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [stats, setStats] = useState<ApiProfileStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<PortfolioTab>("positions");
  const [selectedPosition, setSelectedPosition] = useState<ApiPosition | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const loadPortfolio = async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }
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
        console.warn("My Predictions request failed", error);
      } finally {
        if (mounted) {
          if (!silent) {
            setLoading(false);
          }
        }
      }
    };

    loadPortfolio();
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") loadPortfolio({ silent: true });
    }, 30000);
    return () => {
      mounted = false;
      window.clearInterval(refresh);
    };
  }, [authLoading, userId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activePositions = useMemo(
    () => positions.filter((position) => getPredictionDisplayStatus(position, now).isOpen),
    [positions, now]
  );

  const settledPositions = useMemo(
    () => positions.filter((position) => !getPredictionDisplayStatus(position, now).isOpen),
    [positions, now]
  );

  const openStake = activePositions.reduce((sum, position) => sum + Number(position.stake || 0), 0);
  const resolvedWinnings = settledPositions.reduce((sum, position) => sum + Number(position.payout || 0), 0);

  if (authLoading) {
    return <SessionLoading label="Restoring your predictions..." />;
  }

  if (!user) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 text-center">
          <div>
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-[#E5E7EB] bg-white text-[#4F46E5]">
              <LineChart className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Track your predictions</h1>
            <p className="mt-3 text-sm text-[#6B7280]">Log in to see open predictions, resolved results, and wallet-linked history.</p>
            <Link to="/login" className="mt-6 inline-flex h-12 items-center rounded-xl bg-[#4F46E5] px-6 text-sm font-black text-white hover:bg-[#4338CA]">
              Log in
            </Link>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen overflow-x-hidden pb-24 text-[#111827] md:pb-0 xl:pl-64" data-now={now}>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_52px_rgba(17,24,39,0.08)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">My Predictions</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{formatNaira(openStake)}</h1>
              <p className="mt-2 max-w-xl text-sm text-[#6B7280]">
                Money you have backed in open predictions. Final payouts are calculated only after market resolution.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
              <HeroStat icon={Target} label="Open predictions" value={`${activePositions.length}`} />
              <HeroStat icon={BarChart3} label="Amount backed" value={formatNaira(openStake)} />
              <HeroStat icon={LineChart} label="Resolved results" value={`${settledPositions.length}`} />
              <HeroStat icon={Trophy} label="Resolved winnings" value={formatNaira(resolvedWinnings)} />
            </div>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-[#E5E7EB] bg-white p-1">
          {(["positions", "activity", "performance"] as PortfolioTab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`h-11 rounded-lg text-sm font-black capitalize transition ${
                tab === item ? "bg-[#4F46E5] text-white" : "text-[#6B7280] hover:bg-[#F8F7F4] hover:text-[#111827]"
              }`}
            >
              {tabLabels[item]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid min-h-[360px] place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" />
          </div>
        ) : (
          <div className="mt-5">
            {tab === "positions" && <PositionsView positions={activePositions} onSelect={setSelectedPosition} now={now} />}
            {tab === "activity" && <ActivityView positions={positions} settledCount={settledPositions.length} />}
            {tab === "performance" && <PerformanceView positions={positions} stats={stats} />}
          </div>
        )}
      </main>
      {selectedPosition && (
        <PredictionDetailModal
          position={selectedPosition}
          now={now}
          onClose={() => setSelectedPosition(null)}
          onViewMarket={() => {
            const marketId = selectedPosition?.marketId;
            setSelectedPosition(null);
            if (marketId) navigate(`/market/${marketId}`);
          }}
        />
      )}
      <MobileNav />
    </div>
  );
};

const HeroStat = ({ icon: Icon, label, value, tone = "neutral" }: { icon: any; label: string; value: string; tone?: "neutral" | "green" | "red" }) => (
  <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-3">
    <Icon className={`mb-3 h-4 w-4 ${tone === "green" ? "text-[#12B886]" : tone === "red" ? "text-[#E85D5D]" : "text-[#6B7280]"}`} />
    <div className="text-[11px] font-bold text-[#6B7280]">{label}</div>
    <div className="mt-1 text-lg font-black">{value}</div>
  </div>
);

const getPredictionCloseTime = (position: ApiPosition) => position.tradingCloseTime || position.marketCloseTime || "";

const getPredictionDisplayStatus = (position: ApiPosition, now = Date.now()) => {
  const status = String(position.status || position.marketStatus || "active").toLowerCase();
  const closeTime = getPredictionCloseTime(position);
  const closeMs = closeTime ? new Date(closeTime).getTime() : NaN;
  const hasEnded = Number.isFinite(closeMs) && closeMs <= now;
  const unresolvedClosed = hasEnded && ["active", "open", "closed"].includes(status);
  const isOpen = !hasEnded && position.marketStatus === "active" && ["active", "open"].includes(status);

  return {
    isOpen,
    hasEnded,
    label: unresolvedClosed ? "pending resolution" : status.replace(/_/g, " "),
  };
};

const formatPositionCountdown = (position: ApiPosition) => formatCountdown(getPredictionCloseTime(position));

type PredictionInsight = {
  entryCrowdView: number;
  currentCrowdView: number;
  movement: number;
  direction: "toward" | "against" | "unchanged";
  directionLabel: string;
  strength: "Excellent" | "Strong" | "Balanced" | "Weak" | "At Risk";
  strengthDetail: string;
  strengthTone: "green" | "neutral" | "red" | "yellow";
  multiplier: number | null;
  multiplierLabel: string;
  multiplierDetail: string;
  totalPool: number;
  sidePool: number;
  opposingPool: number;
  isProtected: boolean;
  currentValue: number;
  profitLoss: number;
};

const getPredictionInsight = (position: ApiPosition): PredictionInsight => {
  const entryCrowdView = Number(position.entryPrice || 0);
  const currentCrowdView = Number(position.currentPrice || position.entryPrice || 0);
  const movement = currentCrowdView - entryCrowdView;
  const direction = movement > 0.4 ? "toward" : movement < -0.4 ? "against" : "unchanged";
  const totalPool = Number(position.totalPool || 0);
  const sidePool = Number(position.sidePool || 0);
  const opposingPool = Number(position.opposingPool || 0);
  const stake = Number(position.stake || 0);
  const currentValue = Number(position.currentValue || position.positionValue || position.projectedPayout || 0);
  const profitLoss = currentValue > 0 ? currentValue - stake : Number(position.projectedProfit || position.estimatedProfit || 0);
  const isProtected =
    totalPool < MARKET_ACTIVATION_REQUIREMENTS.totalPool ||
    sidePool < MARKET_ACTIVATION_REQUIREMENTS.yesPool ||
    opposingPool < MARKET_ACTIVATION_REQUIREMENTS.noPool;
  const projectedPayout = Number(position.projectedPayout || position.estimatedPayout || 0);
  const fallbackPayout = opposingPool > 0 && sidePool > 0 && stake > 0 ? stake + (stake / sidePool) * opposingPool : 0;
  const currentPayoutEstimate = projectedPayout > 0 ? projectedPayout : fallbackPayout;
  const multiplier = !isProtected && opposingPool > 0 && stake > 0 && currentPayoutEstimate > 0 ? currentPayoutEstimate / stake : null;

  let strength: PredictionInsight["strength"] = "Balanced";
  let strengthTone: PredictionInsight["strengthTone"] = "neutral";
  let strengthDetail = "The crowd view is close to where you entered.";
  if (movement >= 15) {
    strength = "Excellent";
    strengthTone = "green";
    strengthDetail = "The crowd has moved sharply toward your side.";
  } else if (movement >= 5) {
    strength = "Strong";
    strengthTone = "green";
    strengthDetail = "The crowd is moving toward your opinion.";
  } else if (movement <= -15) {
    strength = "At Risk";
    strengthTone = "red";
    strengthDetail = "The crowd has moved sharply away from your side.";
  } else if (movement <= -5) {
    strength = "Weak";
    strengthTone = "yellow";
    strengthDetail = "The crowd is moving against your opinion.";
  }

  return {
    entryCrowdView,
    currentCrowdView,
    movement,
    direction,
    directionLabel:
      direction === "toward"
        ? "Crowd moved toward you"
        : direction === "against"
          ? "Crowd moved against you"
          : "Crowd unchanged",
    strength,
    strengthDetail,
    strengthTone,
    multiplier,
    multiplierLabel: multiplier ? `${multiplier.toFixed(2)}x stake` : "Refund Protected",
    multiplierDetail: multiplier
      ? "This changes as people join either side. Final payout is calculated after resolution."
      : "Value appears once the market goes live.",
    totalPool,
    sidePool,
    opposingPool,
    isProtected,
    currentValue,
    profitLoss,
  };
};

const PositionsView = ({ positions, onSelect, now }: { positions: ApiPosition[]; onSelect: (position: ApiPosition) => void; now: number }) => {
  if (positions.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="No open predictions"
        body="Pick a market, choose YES or NO, and your open predictions will appear here."
        action={<Link to="/" className="rounded-xl bg-[#4F46E5] px-5 py-3 text-sm font-black text-white hover:bg-[#4338CA]">Explore markets</Link>}
      />
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {positions.map((position) => {
        const insight = getPredictionInsight(position);
        const profitPositive = insight.profitLoss >= 0;
        return (
          <button
            key={position.id}
            onClick={() => onSelect(position)}
            data-now={now}
            className="group rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left shadow-[0_16px_48px_rgba(17,24,39,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-[#4F46E5]/35 hover:bg-[#F8F7F4] active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">Open prediction</div>
                <h2 className="mt-2 line-clamp-2 text-lg font-black leading-tight">{position.marketQuestion}</h2>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${position.side === "YES" ? "bg-[#12B886]/10 text-[#047857]" : "bg-[#E85D5D]/10 text-[#B42318]"}`}>
                {position.side}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-black text-[#111827]">{formatNaira(position.stake)} backed</span>
                <span className="text-xs font-bold text-[#6B7280]">{formatPositionCountdown(position)} left</span>
              </div>
              {insight.isProtected ? (
                <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-3">
                  <div className="text-sm font-black text-[#101828]">Refund Protected</div>
                  <p className="mt-1 text-xs font-bold text-[#475467]">Value appears once this market goes live.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 border-t border-[#E5E7EB] pt-3">
                  <div>
                    <div className="text-[11px] font-bold text-[#6B7280]">Current Value</div>
                    <div className="mt-1 text-base font-black text-[#111827]">{formatNaira(insight.currentValue)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#6B7280]">Profit/Loss</div>
                    <div className={`mt-1 text-base font-black ${profitPositive ? "text-[#047857]" : "text-[#B42318]"}`}>
                      {profitPositive ? "+" : ""}{formatNaira(insight.profitLoss)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-4 inline-flex items-center gap-1 text-xs font-black text-[#6B7280] transition group-hover:text-[#4F46E5]">
              Tap to view details <ArrowRight className="h-3.5 w-3.5" />
            </p>
          </button>
        );
      })}
    </div>
  );
};

const PredictionDetailModal = ({
  position,
  now,
  onClose,
  onViewMarket,
}: {
  position: ApiPosition;
  now: number;
  onClose: () => void;
  onViewMarket: () => void;
}) => {
  const shares = Number(position.sharesOwned ?? position.sharesReceived ?? 0);
  const rules = (position as ApiPosition & { rules?: string }).rules;
  const resolutionSource = (position as ApiPosition & { resolutionSource?: string }).resolutionSource;
  const timeLeft = formatPositionCountdown(position);
  const displayStatus = getPredictionDisplayStatus(position, now).label;
  const marketQuestion = position.marketQuestion || "Prediction details unavailable";
  const insight = getPredictionInsight(position);
  const optionalPoolMetrics = [
    insight.totalPool > 0 ? { label: "Total Pool", value: formatNaira(insight.totalPool) } : null,
    insight.sidePool > 0 ? { label: "Your Side Pool", value: formatNaira(insight.sidePool) } : null,
    insight.opposingPool > 0 ? { label: "Opposing Pool", value: formatNaira(insight.opposingPool) } : null,
    shares > 0 ? { label: "Units", value: shares.toFixed(2) } : null,
    { label: "Status", value: displayStatus },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="fixed inset-0 z-[70] flex animate-in fade-in duration-200 items-end justify-center bg-black/70 px-3 pb-[calc(84px+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-6">
      <section className="max-h-[88vh] w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_90px_rgba(17,24,39,0.18)] sm:zoom-in-95">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white/95 p-4 backdrop-blur">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">Prediction detail</p>
            <h2 className="mt-1 text-lg font-black text-[#111827]">Your {position.side || "selected"} prediction</h2>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] transition hover:text-[#111827]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div>
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-xl font-black leading-tight">{marketQuestion}</h3>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${position.side === "YES" ? "bg-[#12B886]/10 text-[#047857]" : "bg-[#E85D5D]/10 text-[#B42318]"}`}>
                {position.side || "N/A"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#E5E7EB] pt-4 sm:grid-cols-4">
              <Metric label="Amount backed" value={formatNaira(position.stake)} />
              <Metric label="Your pick" value={position.side || "N/A"} />
              <Metric label="Time left" value={timeLeft} />
              <Metric label="Status" value={displayStatus} />
            </div>
          </div>

          {insight.isProtected ? (
            <section className="rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] p-4">
              <h4 className="text-base font-black text-[#101828]">Refund Protected</h4>
              <p className="mt-2 text-sm font-bold leading-6 text-[#344054]">
                Your stake is protected if this market does not reach enough activity before closing. Value appears once this market goes live.
              </p>
            </section>
          ) : (
            <section className="grid grid-cols-2 gap-4 border-t border-[#E5E7EB] pt-4">
              <Metric label="Current Value" value={formatNaira(insight.currentValue)} large />
              <Metric
                label="Profit/Loss"
                value={`${insight.profitLoss >= 0 ? "+" : ""}${formatNaira(insight.profitLoss)}`}
                tone={insight.profitLoss >= 0 ? "green" : "red"}
                large
              />
            </section>
          )}

          <details className="group border-t border-[#E5E7EB] pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-[#111827]">
              More Details
              <span className="text-xs font-bold text-[#6B7280] group-open:hidden">Show</span>
              <span className="hidden text-xs font-bold text-[#6B7280] group-open:inline">Hide</span>
            </summary>
            <div className="mt-4 space-y-5">
              <section>
                <h4 className="text-sm font-black">Market View</h4>
                <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-3">
                  <Metric label="Entry market view" value={insight.entryCrowdView ? formatNairaPrice(insight.entryCrowdView) : "-"} />
                  <Metric label="Current market view" value={insight.currentCrowdView ? formatNairaPrice(insight.currentCrowdView) : "-"} movement={insight.movement} />
                  <Metric label="Movement" value={formatMovement(insight.movement)} tone={insight.direction === "toward" ? "green" : insight.direction === "against" ? "red" : "neutral"} />
                </div>
              </section>

              {optionalPoolMetrics.length > 0 && (
                <section>
                  <h4 className="text-sm font-black">Pool Snapshot</h4>
                  <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2">
                    {optionalPoolMetrics.map((metric) => (
                      <Metric key={metric.label} label={metric.label} value={metric.value} />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h4 className="text-sm font-black">Prediction history</h4>
                <div className="mt-2 text-sm font-bold text-[#6B7280]">
                  You predicted {position.side} with {formatNaira(position.stake)} on {new Date(position.createdAt).toLocaleString()}.
                </div>
              </section>

              <section>
                <h4 className="text-sm font-black">Rules and resolution</h4>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                  {rules || "Open the market to review the full rules and resolution criteria."}
                </p>
                <p className="mt-3 text-xs font-bold text-[#6B7280]">
                  Resolution source: {resolutionSource || "Shown on the market page when available."}
                </p>
                {getPredictionCloseTime(position) && (
                  <p className="mt-2 text-xs font-bold text-[#6B7280]">
                    Trading close time: {new Date(getPredictionCloseTime(position)).toLocaleString()}
                  </p>
                )}
              </section>
            </div>
          </details>

          <button
            onClick={onViewMarket}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#4F46E5] text-sm font-black text-white transition hover:bg-[#4338CA]"
          >
            View Market <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
};

const formatMovement = (movement: number) => {
  if (Math.abs(movement) < 0.5) return "0";
  return `${movement > 0 ? "+" : ""}${movement.toFixed(0)}`;
};

const MovementPill = ({ movement }: { movement?: number }) => {
  if (!movement || Math.abs(movement) < 0.5) return null;
  const positive = movement > 0;
  return (
    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-black ${positive ? "bg-[#12B886]/10 text-[#047857]" : "bg-[#E85D5D]/10 text-[#B42318]"}`}>
      {formatMovement(movement)}
    </span>
  );
};

const ActivityView = ({ positions, settledCount }: { positions: ApiPosition[]; settledCount: number }) => {
  const sorted = positions
    .filter((position) => position.marketStatus !== "active" || Boolean(position.resolvedAt))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (sorted.length === 0) {
    return <EmptyState icon={Activity} title="No resolved predictions yet" body="Won, lost, refunded, and cancelled predictions will appear here after markets resolve." />;
  }

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black">Prediction History</h2>
        <span className="rounded-full border border-[#E5E7EB] bg-[#F8F7F4] px-3 py-1 text-xs font-bold text-[#6B7280]">{settledCount} settled</span>
      </div>
      <div className="space-y-2">
        {sorted.map((position) => (
          <Link key={position.id} to={`/market/${position.marketId}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-4 transition hover:border-[#4F46E5]/35">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#4F46E5]">
                {position.marketStatus === "active" ? <Clock className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black">{position.marketQuestion}</div>
                <div className="mt-1 text-xs text-[#6B7280]">{getCategoryLabel(position.category)} Â· {position.side} prediction Â· {new Date(position.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-black">
                {position.resolvedAt ? formatNaira(position.payout || 0) : formatNaira(position.stake)}
              </div>
              <div className={`mt-1 text-xs capitalize ${position.status === "refunded" || position.marketStatus === "refunded" ? "text-[#4F46E5]" : position.resolvedAt ? (position.isWinner ? "text-[#12B886]" : "text-[#E85D5D]") : "text-[#6B7280]"}`}>
                {position.status === "refunded" || position.marketStatus === "refunded" ? "refunded" : position.resolvedAt ? (position.isWinner ? "won" : "lost") : position.marketStatus}
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
  const currentStreak = getCurrentWinStreak(resolved);
  const bestStreak = getBestWinStreak(resolved);
  const accuracy = resolved.length ? Math.round((won.length / resolved.length) * 100) : 0;
  const level = stats.level || getForecasterLevel(stats.totalPredictions, won.length);
  const progress = getLevelProgress(stats.totalPredictions, won.length);
  const nextLevel = getNextLevel(level);
  const rankLabel = stats.rank ? `#${stats.rank}` : "Unranked";
  const achievements = getAchievements({
    totalPredictions: stats.totalPredictions,
    wins: won.length,
    currentStreak,
    bestStreak,
    accuracy,
    level,
    rank: stats.rank || null,
  });

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">My Score</p>
                <h2 className="mt-2 text-3xl font-black">{level}</h2>
                <p className="mt-2 max-w-xl text-sm text-[#6B7280]">
                  Build your forecasting record through resolved predictions. Streaks and accuracy use real results only.
                </p>
              </div>
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
                <Award className="h-7 w-7" />
              </div>
            </div>
            <div className="mt-6 h-4 overflow-hidden rounded-full bg-[#E5E7EB]">
              <div className="h-full rounded-full bg-[#4F46E5] transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-bold text-[#6B7280]">
              <span>{progress}% progress</span>
              <span>{nextLevel === level ? "Top level reached" : `Next: ${nextLevel}`}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-[#6B7280]">Rank</div>
            <div className="mt-2 text-2xl font-black">{rankLabel}</div>
            <p className="mt-2 text-xs font-bold text-[#6B7280]">
              {stats.rank
                ? `${stats.totalRankedUsers || 0} forecasters are ranked from real prediction results.`
                : "Make a prediction to enter the leaderboard."}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Accuracy score" value={resolved.length ? `${accuracy}%` : "-"} large />
          <Metric label="Current streak" value={String(currentStreak)} large />
          <Metric label="Best streak" value={String(bestStreak)} large />
          <Metric label="Total predictions" value={String(stats.totalPredictions)} large />
          <Metric label="Wins" value={String(won.length)} large />
          <Metric label="Losses" value={String(lost.length)} large />
          <Metric label="Rank" value={rankLabel} large />
          <Metric label="Level" value={level} large />
        </div>
      </section>
      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Medal className="h-5 w-5 text-[#4F46E5]" />
          <h2 className="text-xl font-black">Achievements</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {achievements.map((achievement) => (
            <AchievementCard key={achievement.title} {...achievement} />
          ))}
        </div>
      </section>
    </div>
  );
};

const getCurrentWinStreak = (resolved: ApiPosition[]) => {
  const recent = [...resolved].sort((a, b) => new Date(b.resolvedAt || b.createdAt).getTime() - new Date(a.resolvedAt || a.createdAt).getTime());
  let streak = 0;
  for (const position of recent) {
    if (!position.isWinner) break;
    streak += 1;
  }
  return streak;
};

const getBestWinStreak = (resolved: ApiPosition[]) => {
  const ordered = [...resolved].sort((a, b) => new Date(a.resolvedAt || a.createdAt).getTime() - new Date(b.resolvedAt || b.createdAt).getTime());
  let best = 0;
  let current = 0;
  for (const position of ordered) {
    current = position.isWinner ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
};

const LEVELS = [
  { name: "Rookie", score: 0 },
  { name: "Sharp Thinker", score: 5 },
  { name: "Analyst", score: 18 },
  { name: "Expert", score: 40 },
  { name: "Elite Forecaster", score: 70 },
  { name: "Market Master", score: 120 },
];

const getScore = (totalPredictions: number, wins: number) => totalPredictions + wins * 2;

const getForecasterLevel = (totalPredictions: number, wins: number) => {
  const score = getScore(totalPredictions, wins);
  return [...LEVELS].reverse().find((level) => score >= level.score)?.name || "Rookie";
};

const getNextLevel = (levelName: string) => {
  const index = LEVELS.findIndex((level) => level.name === levelName);
  return LEVELS[Math.min(index + 1, LEVELS.length - 1)]?.name || levelName;
};

const getLevelProgress = (totalPredictions: number, wins: number) => {
  const score = totalPredictions + wins * 2;
  const currentIndex = Math.max(0, LEVELS.findIndex((level) => level.name === getForecasterLevel(totalPredictions, wins)));
  const current = LEVELS[currentIndex] || LEVELS[0];
  const next = LEVELS[Math.min(currentIndex + 1, LEVELS.length - 1)] || current;
  if (current.name === next.name) return 100;
  return Math.max(0, Math.min(100, Math.round(((score - current.score) / (next.score - current.score)) * 100)));
};

type Achievement = {
  icon: any;
  title: string;
  description: string;
  unlocked: boolean;
};

const getAchievements = ({
  totalPredictions,
  wins,
  currentStreak,
  bestStreak,
  accuracy,
  level,
  rank,
}: {
  totalPredictions: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  accuracy: number;
  level: string;
  rank: number | null;
}): Achievement[] => [
  { icon: Target, title: "First Prediction", description: "Lock your first prediction.", unlocked: totalPredictions >= 1 },
  { icon: Trophy, title: "First Win", description: "Resolve a market correctly.", unlocked: wins >= 1 },
  { icon: Flame, title: "3 Win Streak", description: "Win three resolved markets in a row.", unlocked: currentStreak >= 3 || bestStreak >= 3 },
  { icon: Flame, title: "5 Win Streak", description: "Build a five-win streak.", unlocked: currentStreak >= 5 || bestStreak >= 5 },
  { icon: CheckCircle, title: "10 Predictions", description: "Join ten markets.", unlocked: totalPredictions >= 10 },
  { icon: CheckCircle, title: "50 Predictions", description: "Join fifty markets.", unlocked: totalPredictions >= 50 },
  { icon: Award, title: "60% Accuracy", description: "Reach 60% accuracy from resolved predictions.", unlocked: accuracy >= 60 },
  { icon: Award, title: "70% Accuracy", description: "Reach 70% accuracy from resolved predictions.", unlocked: accuracy >= 70 },
  { icon: Medal, title: "Top 100 Forecaster", description: "Reach the top 100 on the real leaderboard.", unlocked: Boolean(rank && rank <= 100) },
  { icon: Trophy, title: "Top 10 Forecaster", description: "Reach the top 10 on the real leaderboard.", unlocked: Boolean(rank && rank <= 10) },
  { icon: Medal, title: "Elite Forecaster", description: "Reach the Elite Forecaster level.", unlocked: ["Elite Forecaster", "Market Master"].includes(level) },
];

const AchievementCard = ({ icon: Icon, title, description, unlocked }: Achievement) => (
  <div className={`rounded-xl border p-3 transition ${unlocked ? "border-[#4F46E5]/30 bg-[#EEF2FF]" : "border-[#E5E7EB] bg-[#F8F7F4]"}`}>
    <div className={`mb-2 grid h-8 w-8 place-items-center rounded-lg ${unlocked ? "bg-[#4F46E5] text-white" : "bg-white text-[#6B7280]"}`}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="text-xs font-black leading-tight">{title}</div>
    <div className={`mt-1 text-[11px] font-black ${unlocked ? "text-[#4F46E5]" : "text-[#6B7280]"}`}>
      {unlocked ? "Unlocked" : "Locked"}
    </div>
    <p className="mt-1 hidden text-[11px] font-bold leading-relaxed text-[#6B7280] sm:block">{description}</p>
  </div>
);

const Metric = ({ label, value, large = false, tone = "neutral", movement }: { label: string; value: string; large?: boolean; tone?: "neutral" | "green" | "red"; movement?: number }) => (
  <div className="min-w-0 transition-colors duration-300">
    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">{label}</div>
    <div className={`mt-2 flex items-center font-black transition-all duration-300 ${large ? "text-2xl" : "text-sm"} ${tone === "green" ? "text-[#12B886]" : tone === "red" ? "text-[#E85D5D]" : "text-[#111827]"}`}>
      {value}
      <MovementPill movement={movement} />
    </div>
  </div>
);

const EmptyState = ({ icon: Icon, title, body, action }: { icon: any; title: string; body: string; action?: React.ReactNode }) => (
  <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white/70 p-6 text-center">
    <div>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-[#E5E7EB] bg-[#EEF2FF] text-[#4F46E5]">
        <Icon className="h-8 w-8" />
      </div>
      <div className="text-xl font-black">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[#6B7280]">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  </div>
);

export default Dashboard;

const SessionLoading = ({ label }: { label: string }) => (
  <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
    <Header />
    <main className="grid min-h-[70vh] place-items-center px-4">
      <DelayedFlippeLoader active label={label} />
    </main>
    <MobileNav />
  </div>
);
