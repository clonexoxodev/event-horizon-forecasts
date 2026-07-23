import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  Search,
  Target,
  Trophy,
  X,
  AlertCircle,
  RefreshCw,
  Layers,
} from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import apiService, { type ApiPosition } from "@/lib/api";
import { formatCountdown, formatNaira, formatNairaPrice } from "@/lib/markets";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";

type PredictionTab = "all" | "active" | "won" | "lost" | "refunded" | "cancelled";

type PredictionItem = {
  id: string;
  marketId: string;
  marketQuestion: string;
  side: "YES" | "NO";
  normalizedStatus: PredictionTab;
  displayStatus: string;
  statusColor: string;
  entryPrice: number;
  stake: number;
  sharesReceived: number;
  currentValue: number;
  pnl: number;
  isWinner: boolean | null;
  createdAt: string;
  resolvedAt: string | null;
  marketStatus: string;
  marketCloseTime?: string;
  tradingCloseTime?: string;
};

const TABS: { key: PredictionTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "refunded", label: "Refunded" },
  { key: "cancelled", label: "Cancelled" },
];

const normalizePositionStatus = (pos: ApiPosition, now: number): { normalized: PredictionTab; display: string; color: string } => {
  if (pos.status === "refunded") {
    return { normalized: "refunded", display: "Refunded", color: "text-[#B45309] bg-[#FEF3C7]" };
  }
  if (pos.marketStatus === "cancelled") {
    return { normalized: "cancelled", display: "Cancelled", color: "text-[#6B7280] bg-[#F3F4F6]" };
  }
  if (pos.resolvedAt) {
    return pos.isWinner
      ? { normalized: "won", display: "Won", color: "text-[#047857] bg-[#D1FAE5]" }
      : { normalized: "lost", display: "Lost", color: "text-[#E85D5D] bg-[#FEF2F2]" };
  }
  const closeTime = pos.tradingCloseTime || pos.marketCloseTime || "";
  const closeMs = closeTime ? new Date(closeTime).getTime() : NaN;
  const hasEnded = Number.isFinite(closeMs) && closeMs <= now;
  if (hasEnded) return { normalized: "active", display: "Pending Resolution", color: "text-[#D97706] bg-[#FEF3C7]" };
  return { normalized: "active", display: "Active", color: "text-[#4F46E5] bg-[#EEF2FF]" };
};

const positionToItem = (pos: ApiPosition, now: number): PredictionItem => {
  const ns = normalizePositionStatus(pos, now);
  const entry = Number(pos.entryPrice || 0);
  const stake = Number(pos.stake || 0);
  const currentValue = Number(pos.currentValue || pos.positionValue || 0);
  const pnl = currentValue > 0 ? currentValue - stake : 0;
  return {
    id: pos.id,
    marketId: pos.marketId,
    marketQuestion: pos.marketQuestion,
    side: pos.side,
    normalizedStatus: ns.normalized,
    displayStatus: ns.display,
    statusColor: ns.color,
    entryPrice: entry,
    stake,
    sharesReceived: Number(pos.sharesReceived || pos.sharesOwned || 0),
    currentValue,
    pnl,
    isWinner: pos.isWinner ?? null,
    createdAt: pos.createdAt,
    resolvedAt: pos.resolvedAt ?? null,
    marketStatus: pos.marketStatus,
    marketCloseTime: pos.marketCloseTime,
    tradingCloseTime: pos.tradingCloseTime,
  };
};

export default function Portfolio() {
  const { user, isLoading: authLoading } = useAuth();
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PredictionTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    let mounted = true;
    const load = async ({ silent = false } = {}) => {
      if (!silent) { setLoading(true); setError(null); }
      try {
        const res = await apiService.getPositions();
        if (!mounted) return;
        setPositions(res.positions || []);
      } catch {
        if (mounted) setError("Could not load your predictions. Please try again.");
      } finally {
        if (mounted && !silent) setLoading(false);
      }
    };
    load();
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") load({ silent: true });
    }, 30000);
    return () => { mounted = false; window.clearInterval(refresh); };
  }, [authLoading, user]);

  const items = useMemo(() => {
    return positions
      .map((p) => positionToItem(p, now))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [positions, now]);

  const tabCounts = useMemo(() => {
    const counts: Record<PredictionTab, number> = { all: items.length, active: 0, won: 0, lost: 0, refunded: 0, cancelled: 0 };
    items.forEach((item) => { counts[item.normalizedStatus]++; });
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (activeTab !== "all") result = result.filter((i) => i.normalizedStatus === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.marketQuestion.toLowerCase().includes(q) || i.side.toLowerCase().includes(q));
    }
    return result;
  }, [items, activeTab, searchQuery]);

  if (authLoading) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4">
          <DelayedFlippeLoader active label="Loading your predictions..." />
        </main>
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
              <Layers className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-black tracking-tight">My Predictions</h1>
            <p className="mt-1.5 text-sm text-[#9CA3AF]">Track every prediction from submission to settlement.</p>
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
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">My Predictions</h1>
            <p className="mt-0.5 text-xs text-[#9CA3AF]">
              {items.length === 0 ? "No predictions yet" : `${items.length} prediction${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        {/* Search */}
        {items.length > 0 && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search markets..."
                className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white pl-9 pr-4 text-sm font-bold text-[#111827] placeholder:text-[#D1D5DB] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20"
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        {items.length > 0 && (
          <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-[#F3F4F6] p-1">
            {TABS.map(({ key, label }) => {
              const count = tabCounts[key];
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                    isActive ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className={`ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] ${
                      isActive ? "bg-[#4F46E5] text-white" : "bg-[#D1D5DB] text-[#6B7280]"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid min-h-[200px] place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
          </div>
        ) : error ? (
          <div className="grid min-h-[250px] place-items-center rounded-2xl border border-[#E85D5D]/20 bg-[#FEF2F2]/40 p-6 text-center">
            <div>
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#E85D5D]/10 text-[#E85D5D]">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-[#111827]">{error}</h3>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  apiService.getPositions().then((res) => {
                    setPositions(res.positions || []);
                    setLoading(false);
                  }).catch(() => { setLoading(false); setError("Still having trouble. Please try again."); });
                }}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#4F46E5] px-4 text-xs font-bold text-white hover:bg-[#4338CA]"
              >
                <RefreshCw className="h-3 w-3" /> Try Again
              </button>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState tab={activeTab} hasItems={items.length > 0} />
        ) : (
          <div className="grid gap-2.5">
            {filteredItems.map((item) => (
              <PredictionCard key={item.id} item={item} now={now} />
            ))}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Prediction Card
   ═══════════════════════════════════════════════════════════════ */

const PredictionCard = ({ item, now }: { item: PredictionItem; now: number }) => {
  const timeLeft = item.normalizedStatus === "active" ? formatCountdown(getCloseTime(item)) : null;

  return (
    <Link
      to={`/market/${item.marketId}`}
      className="group block rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-[#4F46E5]/20 hover:shadow-[0_4px_20px_rgba(17,24,39,0.06)] active:scale-[0.99]"
    >
      {/* Top: Status + Side */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${item.statusColor}`}>
            {item.normalizedStatus === "active" && <span className="h-1.5 w-1.5 rounded-full bg-[#4F46E5]" />}
            {item.normalizedStatus === "won" && <Trophy className="h-2.5 w-2.5" />}
            {item.normalizedStatus === "lost" && <X className="h-2.5 w-2.5" />}
            {item.normalizedStatus === "refunded" && <AlertCircle className="h-2.5 w-2.5" />}
            {item.normalizedStatus === "cancelled" && <X className="h-2.5 w-2.5" />}
            {item.displayStatus}
          </span>
          <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-bold ${
            item.side === "YES" ? "bg-[#12B886]/10 text-[#047857]" : "bg-[#E85D5D]/10 text-[#B42318]"
          }`}>{item.side}</span>
        </div>
        {item.isWinner != null && (
          <span className={`text-xs font-bold ${item.isWinner ? "text-[#12B886]" : "text-[#E85D5D]"}`}>
            {item.isWinner ? "Won" : "Lost"}
          </span>
        )}
      </div>

      {/* Market Question */}
      <h3 className="mt-2.5 line-clamp-2 text-[14px] font-bold leading-snug text-[#111827]">
        {item.marketQuestion}
      </h3>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-[#F3F4F6] pt-3">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Entry</div>
          <div className="mt-0.5 text-xs font-bold text-[#111827]">{item.entryPrice ? formatNairaPrice(item.entryPrice) : "-"}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Stake</div>
          <div className="mt-0.5 text-xs font-bold text-[#111827]">{formatNaira(item.stake)}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">P&L</div>
          <div className={`mt-0.5 text-xs font-bold ${item.pnl >= 0 ? "text-[#12B886]" : "text-[#E85D5D]"}`}>
            {item.pnl >= 0 ? "+" : ""}{formatNaira(item.pnl)}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Value</div>
          <div className="mt-0.5 text-xs font-bold text-[#111827]">{item.currentValue > 0 ? formatNaira(item.currentValue) : "-"}</div>
        </div>
      </div>

      {/* Refund info */}
      {item.normalizedStatus === "refunded" && item.stake > 0 && (
        <div className="mt-2.5 rounded-lg bg-[#FEF3C7]/60 px-3 py-2">
          <div className="text-[10px] font-bold text-[#D97706]">
            Refund: {formatNaira(item.stake)} returned to wallet
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#9CA3AF]">
          {item.resolvedAt
            ? `Resolved ${new Date(item.resolvedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`
            : timeLeft || `Placed ${new Date(item.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`
          }
        </span>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#6B7280] transition group-hover:text-[#4F46E5]">
          View <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Empty States
   ═══════════════════════════════════════════════════════════════ */

const EmptyState = ({ tab, hasItems }: { tab: PredictionTab; hasItems: boolean }) => {
  if (hasItems) {
    return (
      <div className="grid min-h-[200px] place-items-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white/60 p-6 text-center">
        <div>
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-[#F3F4F6]">
            <Filter className="h-5 w-5 text-[#9CA3AF]" />
          </div>
          <h3 className="text-sm font-bold text-[#111827]">No {tab} predictions</h3>
          <p className="mt-1 text-xs text-[#9CA3AF]">Try selecting a different tab.</p>
        </div>
      </div>
    );
  }

  const config: Record<PredictionTab, { icon: React.ReactNode; title: string; body: string }> = {
    all: {
      icon: <Layers className="h-5 w-5 text-[#4F46E5]" />,
      title: "No predictions yet",
      body: "Place your first prediction to start tracking here.",
    },
    active: {
      icon: <Target className="h-5 w-5 text-[#047857]" />,
      title: "No active predictions",
      body: "Your active predictions will appear here.",
    },
    won: {
      icon: <Trophy className="h-5 w-5 text-[#D97706]" />,
      title: "No won predictions",
      body: "When markets resolve in your favor, they appear here.",
    },
    lost: {
      icon: <X className="h-5 w-5 text-[#E85D5D]" />,
      title: "No lost predictions",
      body: "When markets resolve against you, they appear here.",
    },
    refunded: {
      icon: <RefreshCw className="h-5 w-5 text-[#B45309]" />,
      title: "No refunds",
      body: "Refunded predictions will appear here.",
    },
    cancelled: {
      icon: <X className="h-5 w-5 text-[#6B7280]" />,
      title: "No cancelled markets",
      body: "Predictions in cancelled markets will appear here.",
    },
  };

  const { icon, title, body } = config[tab];

  return (
    <div className="grid min-h-[250px] place-items-center text-center">
      <div>
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#F3F4F6]">{icon}</div>
        <h3 className="text-sm font-bold text-[#111827]">{title}</h3>
        <p className="mt-1 max-w-xs mx-auto text-xs text-[#9CA3AF]">{body}</p>
        {tab === "all" && (
          <Link to="/" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#4F46E5] px-4 text-xs font-bold text-white hover:bg-[#4338CA]">
            Discover markets <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
};

const getCloseTime = (item: PredictionItem) => item.tradingCloseTime || item.marketCloseTime || "";
