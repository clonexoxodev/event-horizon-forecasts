import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle, ChevronRight, Loader2, Target, Trophy, X,
} from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { ProtectedMarketInfo } from "@/components/ProtectedMarketInfo";
import { useAuth } from "@/lib/auth";
import apiService, { type ApiPosition, type ApiProfileStats } from "@/lib/api";
import { formatCountdown, formatNairaPrice } from "@/lib/markets";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";

type PositionFilterTab = "active" | "resolved";

const emptyStats: ApiProfileStats = {
  totalPredictions: 0, activePredictions: 0, wonPredictions: 0, winRate: 0,
  totalStaked: 0, totalEarnings: 0, rank: null, score: 0, level: "Rookie", totalRankedUsers: 0,
};

const getCloseTime = (p: ApiPosition) => p.tradingCloseTime || p.marketCloseTime || "";

const getDisplayStatus = (p: ApiPosition, now = Date.now()) => {
  const status = String(p.status || p.marketStatus || "active").toLowerCase();
  const closeMs = getCloseTime(p) ? new Date(getCloseTime(p)).getTime() : NaN;
  const hasEnded = Number.isFinite(closeMs) && closeMs <= now;
  const unresolvedClosed = hasEnded && ["active", "open", "closed"].includes(status);
  const isOpen = !hasEnded && p.marketStatus === "active" && ["active", "open"].includes(status);
  return { isOpen, hasEnded, label: unresolvedClosed ? "pending resolution" : status.replace(/_/g, " ") };
};

const getStatusDisplay = (p: ApiPosition, now: number) => {
  const ds = getDisplayStatus(p, now);
  if (p.resolvedAt) {
    return p.isWinner
      ? { label: "Won", color: "text-[#12B886] bg-[#12B886]/10" }
      : { label: "Lost", color: "text-[#E85D5D] bg-[#E85D5D]/10" };
  }
  if (ds.isOpen) return { label: "Active", color: "text-[#4F46E5] bg-[#4F46E5]/10" };
  return { label: ds.label, color: "text-[#6B7280] bg-[#F3F4F6]" };
};

const getInsight = (p: ApiPosition) => {
  const entry = Number(p.entryPrice || 0);
  const current = Number(p.currentPrice || p.entryPrice || 0);
  const stake = Number(p.stake || 0);
  const currentValue = Number(p.currentValue || p.positionValue || p.projectedPayout || 0);
  const profitLoss = currentValue > 0 ? currentValue - stake : Number(p.projectedProfit || p.estimatedProfit || 0);
  const projected = Number(p.projectedPayout || p.estimatedPayout || 0);
  return { entry, current, currentValue, profitLoss, payout: projected > 0 ? projected : currentValue > 0 ? currentValue : 0 };
};

const Positions = () => {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [stats, setStats] = useState<ApiProfileStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<PositionFilterTab>("active");
  const [now, setNow] = useState(Date.now());
  const [showProtectedInfo, setShowProtectedInfo] = useState(false);

  useEffect(() => {
    if (authLoading || !userId) { if (!authLoading) setLoading(false); return; }
    let mounted = true;
    const load = async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const [posRes, statsRes] = await Promise.all([apiService.getPositions(), apiService.getProfileStats()]);
        if (!mounted) return;
        setPositions(posRes.positions || []);
        setStats(statsRes.stats || emptyStats);
      } catch (e) { if (mounted) console.warn("Positions load failed", e); }
      finally { if (mounted && !silent) setLoading(false); }
    };
    load();
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") load({ silent: true });
    }, 30000);
    return () => { mounted = false; window.clearInterval(refresh); };
  }, [authLoading, userId]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const activePositions = useMemo(() => positions.filter(p => getDisplayStatus(p, now).isOpen), [positions, now]);
  const settledPositions = useMemo(() => positions.filter(p => !getDisplayStatus(p, now).isOpen), [positions, now]);
  const filtered = tab === "active" ? activePositions : settledPositions;

  if (authLoading) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4"><DelayedFlippeLoader active label="Loading your positions..." /></main>
        <MobileNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 text-center">
          <div>
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5]">
              <LineChart className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-black tracking-tight">Track your positions</h1>
            <p className="mt-1.5 text-sm text-[#9CA3AF]">Log in to see your predictions, P&L, and results.</p>
            <Link to="/login" className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#4F46E5] px-5 text-sm font-bold text-white hover:bg-[#4338CA]">
              Log in
            </Link>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen overflow-x-hidden pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="mb-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">My Positions</h1>
              <p className="mt-0.5 text-xs text-[#9CA3AF]">{activePositions.length} active · {positions.length} total</p>
            </div>
            <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-[#4F46E5] px-2 text-xs font-bold text-white">
              {positions.length}
            </span>
          </div>
        </section>

        <section className="mb-4">
          <div className="flex gap-1 rounded-2xl border border-[#E5E7EB] bg-[#F8F7F4] p-1">
            {(["active", "resolved"] as PositionFilterTab[]).map(t => {
              const count = t === "active" ? activePositions.length : settledPositions.length;
              const active = tab === t;
              return (
                <button key={t} role="tab" aria-selected={active} onClick={() => setTab(t)}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-150 ${
                    active ? "bg-white text-[#111827] shadow-sm" : "text-[#9CA3AF] hover:text-[#6B7280]"
                  }`}>
                  {t === "active" ? "Active" : "Resolved"}
                  <span className={`ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    active ? "bg-[#4F46E5]/10 text-[#4F46E5]" : "bg-[#E5E7EB] text-[#9CA3AF]"
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          {loading ? (
            <div className="grid min-h-[300px] place-items-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#4F46E5]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white/60 p-6 text-center">
              <div>
                <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-[#4F46E5]/8 text-[#4F46E5]">
                  <Target className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="text-sm font-bold">No positions yet</div>
                <p className="mx-auto mt-1 max-w-xs text-xs text-[#9CA3AF]">
                  {tab === "active"
                    ? "When you place a prediction, your position appears here."
                    : "Resolved positions will appear here once the market settles."
                  }
                </p>
                <Link to="/" className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#4F46E5] px-4 text-sm font-bold text-white hover:bg-[#4338CA]">
                  Discover markets <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-2.5">
              {filtered.map(p => (
                <PositionCard key={p.id} position={p} now={now} onLearnProtected={() => setShowProtectedInfo(true)} />
              ))}
            </div>
          )}
        </section>
      </main>
      {showProtectedInfo && <ProtectedMarketInfo isOpen={showProtectedInfo} onClose={() => setShowProtectedInfo(false)} />}
      <MobileNav />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Position Card
   ═══════════════════════════════════════════════════════════════ */

const PositionCard = ({ position, now, onLearnProtected }: {
  position: ApiPosition; now: number; onLearnProtected?: () => void;
}) => {
  const insight = getInsight(position);
  const sd = getStatusDisplay(position, now);
  const positive = insight.profitLoss >= 0;
  const timeLeft = formatCountdown(getCloseTime(position));
  const key = position.resolvedAt ? (position.isWinner ? "won" : "lost") : getDisplayStatus(position, now).isOpen ? "active" : "other";

  return (
    <Link to={`/market/${position.marketId}`}
      className="group block rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-[#4F46E5]/20 hover:shadow-[0_4px_20px_rgba(17,24,39,0.06)] active:scale-[0.99]">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${sd.color}`}>
          {key === "won" && <Trophy className="h-2.5 w-2.5" />}
          {key === "lost" && <X className="h-2.5 w-2.5" />}
          {key === "active" && <span className="h-1.5 w-1.5 rounded-full bg-[#4F46E5]" />}
          {sd.label}
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
          position.side === "YES" ? "bg-[#12B886]/10 text-[#047857]" : "bg-[#E85D5D]/10 text-[#B42318]"
        }`}>{position.side}</span>
      </div>
      <h3 className="mt-2.5 line-clamp-2 text-[14px] font-bold leading-snug text-[#111827]">{position.marketQuestion}</h3>
      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-[#F3F4F6] pt-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Entry</div>
            <div className="mt-0.5 text-xs font-bold text-[#111827]">{insight.entry ? formatNairaPrice(insight.entry) : "-"}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Now</div>
            <div className="mt-0.5 text-xs font-bold text-[#111827]">{insight.current ? formatNairaPrice(insight.current) : "-"}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">P&L</div>
            <div className={`mt-0.5 text-xs font-bold ${positive ? "text-[#12B886]" : "text-[#E85D5D]"}`}>
              {positive ? "+" : ""}{formatNaira(insight.profitLoss)}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Payout</div>
            <div className="mt-0.5 text-xs font-bold text-[#111827]">{insight.payout > 0 ? formatNaira(insight.payout) : "-"}</div>
          </div>
        </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#9CA3AF]">{timeLeft}</span>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#6B7280] transition group-hover:text-[#4F46E5]">
          View <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
};

export default Positions;
