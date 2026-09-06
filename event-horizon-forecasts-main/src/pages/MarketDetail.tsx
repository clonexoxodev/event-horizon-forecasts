import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle,
  ChevronDown,
  Clock,
  FileText,
  Info,
  Loader2,
  Share2,
  Shield,
  TrendingUp,
  Users,
  X,
  AlertCircle,
  Calendar,
  CircleDollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { ForecastSlip } from "@/components/ForecastSlip";
import { ProtectedMarketInfo, ProtectedMarketTooltip } from "@/components/ProtectedMarketInfo";
import apiService, { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMarketState } from "@/lib/market-state";
import {
  formatCountdown,
  formatNaira,
  formatNairaPrice,
  getMarketActivation,
  getMarketCategoryLabel,
  getMarketMedia,
  type Market,
} from "@/lib/markets";

type Timeframe = "1H" | "24H" | "7D" | "ALL";

export default function MarketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("code") || undefined;
  const { markets, upsertMarket } = useMarketState();
  const { user, refreshUser, setAuthOpen } = useAuth();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetSide, setSheetSide] = useState<"YES" | "NO" | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("24H");
  const [now, setNow] = useState(Date.now());
  const [justPredicted, setJustPredicted] = useState<"YES" | "NO" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showProtectedInfo, setShowProtectedInfo] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const marketsRef = useRef(markets);
  const marketRef = useRef<Market | null>(null);
  const latestLoadRef = useRef(0);

  useEffect(() => { marketsRef.current = markets; }, [markets]);
  useEffect(() => { marketRef.current = market; }, [market]);

  useEffect(() => {
    if (!id) return;
    const loadId = latestLoadRef.current + 1;
    latestLoadRef.current = loadId;
    const readCachedMarket = () => marketsRef.current.find((item) => item.id === id);
    const loadMarket = async () => {
      if (!marketRef.current || marketRef.current.id !== id) setLoading(true);
      try {
        const cached = readCachedMarket();
        if (cached && (!marketRef.current || marketRef.current.id !== id)) setMarket(cached);
        const [response, historyResponse] = await Promise.all([
          apiService.getMarket(id, inviteCode),
          apiService.getMarketPriceHistory(id).catch(() => null),
        ]);
        if (latestLoadRef.current !== loadId) return;
        const enrichedMarket = {
          ...response.market,
          priceHistory: historyResponse?.priceHistory?.length
            ? historyResponse.priceHistory
            : response.market.priceHistory,
        };
        setMarket(enrichedMarket);
        upsertMarket(enrichedMarket);
      } catch (error: any) {
        if (latestLoadRef.current !== loadId) return;
        const cached = readCachedMarket();
        if (cached) {
          if (!marketRef.current || marketRef.current.id !== id) setMarket(cached);
          console.warn("Market detail refresh failed; keeping saved market data", error);
        } else if (error instanceof ApiRequestError && error.status === 404) {
          toast.error("Market not found.");
          navigate("/");
        } else {
          toast.error(error.message || "Could not load market. Please retry.");
        }
      } finally {
        if (latestLoadRef.current === loadId) setLoading(false);
      }
    };
    loadMarket();
  }, [id, inviteCode, navigate, upsertMarket]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (sheetSide) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {});
      });
    }
  }, [sheetSide]);

  const closeSheet = () => {
    setSheetSide(null);
  };

  useEffect(() => {
    if (sheetSide) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") closeSheet();
      };
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [sheetSide]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const marketCategoryLabel = market ? getMarketCategoryLabel(market) : "Other";

  const handleShare = async () => {
    if (!market) return;
    const media = getMarketMedia(market);
    const url = `${window.location.origin}/market/${market.id}${market.inviteCode ? `?code=${market.inviteCode}` : ""}`;
    const timeLeft = formatCountdown(market.tradingCloseTime || market.closeTime, market.closesIn);
    const shareText = [
      "FLIPPE · prediction market",
      market.question,
      `YES ${Math.round(market.yesPrice)}% probability`,
      `NO ${Math.round(market.noPrice)}% probability`,
      `Closes ${timeLeft}`, "Predict the outcome.", url,
    ].join("\n");
    try {
      if (navigator.share) {
        await navigator.share({
          title: `FLIPPE: ${market.question}`,
          text: `${shareText}${media.imageUrl ? `\nImage: ${media.imageUrl}` : ""}`.trim(),
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      toast.success("Market link copied.");
    } catch (error: any) {
      if (error?.name !== "AbortError") toast.error("Could not share market.");
    }
  };

  const handlePredictionConfirm = async (
    selection: { marketId: string; marketQuestion: string; side: "YES" | "NO"; marketIcon?: string },
    amount: number
  ) => {
    if (!user) { setAuthOpen(true); return; }
    const currentActivation = getMarketActivation(market!);
    if (currentActivation.isProtected && amount > currentActivation.requirements.protectedMaxStake) {
      throw new Error(`Protected markets are limited to ${formatNaira(currentActivation.requirements.protectedMaxStake)} per user until they go live.`);
    }
    const result = await apiService.placePrediction(selection.marketId, {
      side: selection.side,
      amount,
      currency: "NGN",
    });
    const historyResponse = await apiService.getMarketPriceHistory(selection.marketId).catch(() => null);
    const updatedMarket = {
      ...result.market,
      priceHistory: historyResponse?.priceHistory?.length
        ? historyResponse.priceHistory
        : result.market.priceHistory,
    };
    setMarket(updatedMarket);
    upsertMarket(updatedMarket);
    refreshUser().catch((error) => console.warn("User refresh after trade failed", error));
    setJustPredicted(selection.side);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  if (loading && !market) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:py-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="h-9 w-20 animate-pulse rounded-xl bg-[#E5E7EB]" />
            <div className="h-9 w-9 animate-pulse rounded-xl bg-[#E5E7EB]" />
          </div>
          <div className="space-y-4">
            <div className="h-48 w-full animate-pulse rounded-2xl bg-[#E5E7EB]" />
            <div className="h-8 w-3/4 animate-pulse rounded-lg bg-[#E5E7EB]" />
            <div className="h-8 w-1/2 animate-pulse rounded-lg bg-[#E5E7EB]" />
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!market) return null;

  const media = getMarketMedia(market);
  const tradingCloseTime = market.tradingCloseTime || market.closeTime;
  const hasTradingClosed = tradingCloseTime ? new Date(tradingCloseTime).getTime() <= now : false;
  const marketIsActive = market.status === "active" && !hasTradingClosed;
  const activation = getMarketActivation(market);

  return (
    <div className="app-bg min-h-screen pb-[calc(140px+env(safe-area-inset-bottom))] text-[#111827] md:pb-24 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:py-6">
        {/* Top Bar */}
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 text-xs font-bold text-[#6B7280] transition hover:text-[#111827]">
            <ArrowLeft className="h-3.5 w-3.5" />
            Markets
          </Link>
          <IconButton onClick={handleShare} icon={Share2} label="Share" />
        </div>

        {/* Market Header */}
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-4">
            {media.src && (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F3F4F6] sm:h-20 sm:w-20">
                {media.type === "video" ? (
                  <video src={media.src} poster={media.poster} className="h-full w-full object-cover" muted playsInline loop preload="metadata" />
                ) : (
                  <img src={media.src} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                  {marketCategoryLabel}
                </span>
                {market.visibility === "private" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#6B7280]/10 px-2 py-0.5 text-[10px] font-bold text-[#6B7280]">
                    <Shield className="h-3 w-3" />
                    Private pool
                  </span>
                )}
                {market.isPendingReview ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-bold text-[#D97706]">
                    <Clock className="h-3 w-3" />
                    Under review
                  </span>
                ) : market.isRejected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E85D5D]/10 px-2 py-0.5 text-[10px] font-bold text-[#B42318]">
                    Not approved
                  </span>
                ) : market.status === "resolved" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#4F46E5]/10 px-2 py-0.5 text-[10px] font-bold text-[#4F46E5]">
                    <CheckCircle className="h-3 w-3" />
                    Resolved — {market.winningOutcome || market.winning_outcome || market.outcome} Wins
                  </span>
                ) : market.status === "refunded" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-bold text-[#D97706]">
                    Refunded
                  </span>
                ) : market.status === "cancelled" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E85D5D]/10 px-2 py-0.5 text-[10px] font-bold text-[#B42318]">
                    Cancelled
                  </span>
                ) : market.settlement_status === "settling" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-bold text-[#D97706]">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Settling...
                  </span>
                ) : marketIsActive && activation.isProtected ? (
                  <ProtectedMarketTooltip onClick={() => setShowProtectedInfo(true)} />
                ) : marketIsActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#12B886]/10 px-2 py-0.5 text-[10px] font-bold text-[#047857]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#12B886] opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#12B886]" />
                    </span>
                    Live
                  </span>
                ) : (
                  <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-bold text-[#9CA3AF]">
                    Closed
                  </span>
                )}
              </div>
              <h1 className="text-xl font-black leading-tight tracking-tight text-[#101828] sm:text-2xl">
                {market.question}
              </h1>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {!activation.isProtected && (
              <>
                <StatChip icon={Users} value={market.participants || 0} label="predicting" />
                <StatChip icon={BarChart3} value={market.tradeCount || 0} label="predictions" />
              </>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-bold text-[#9CA3AF]">
              <Clock className="h-3 w-3" />
              {formatCountdown(tradingCloseTime, market.closesIn)}
            </span>
          </div>

          {/* Resolved Market Banner */}
          {market.status === "resolved" && (market.winningOutcome || market.winning_outcome || market.outcome) && (
            <div className="mt-3 rounded-xl border border-[#4F46E5]/20 bg-[#EEF2FF]/60 p-4">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white ${(market.winningOutcome || market.winning_outcome || market.outcome) === "YES" ? "bg-[#12B886]" : "bg-[#E85D5D]"}`}>
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#101828]">
                    {(market.winningOutcome || market.winning_outcome || market.outcome) === "YES" ? "YES" : "NO"} Wins
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    This market has been resolved. Settlement is {market.settlement_status === "completed" ? "complete" : "in progress"}.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Refunded Market Banner */}
          {market.status === "refunded" && (
            <div className="mt-3 rounded-xl border border-[#F59E0B]/20 bg-[#FEF3C7]/60 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F59E0B] text-white">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#101828]">Market Refunded</div>
                  <div className="text-xs text-[#6B7280]">All positions have been refunded to their original wallets.</div>
                </div>
              </div>
            </div>
          )}

          {/* Cancelled Market Banner */}
          {market.status === "cancelled" && (
            <div className="mt-3 rounded-xl border border-[#E85D5D]/20 bg-[#FEF2F2]/60 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E85D5D] text-white">
                  <X className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#101828]">Market Cancelled</div>
                  <div className="text-xs text-[#6B7280]">This market has been cancelled. All positions have been refunded.</div>
                </div>
              </div>
            </div>
          )}

          {/* Protected market progress */}
          {activation.isProtected && (
            <div className="mt-3 rounded-xl border border-[#C7D2FE] bg-[#EEF2FF]/60 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[#4F46E5]" />
                  <span className="text-xs font-bold text-[#4F46E5]">Refund Protected</span>
                </div>
                <span className="text-[10px] font-bold text-[#4F46E5]">{Math.round(activation.progress)}%</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[#4F46E5] transition-all duration-500" style={{ width: `${activation.progress}%` }} />
              </div>
              <p className="mt-1.5 text-[10px] font-bold text-[#475467]">
                {formatNaira(activation.totalVolume)} / {formatNaira(activation.requirements.totalVolume)}
              </p>
            </div>
          )}

          {/* Under Review Banner */}
          {market.isPendingReview && (
            <div className="mt-3 rounded-xl border border-[#EDC48E] bg-[#FFF7ED] p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F59E0B] text-white">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#101828]">Pool in review</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
                    Your pool has been submitted and is being checked before it goes live. No predictions can be placed yet.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rejected Banner */}
          {market.isRejected && (
            <div className="mt-3 rounded-xl border border-[#E85D5D]/20 bg-[#FEF2F2] p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#E85D5D] text-white">
                  <X className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#101828]">Pool not approved</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
                    {market.rejectionReason || "This pool did not pass admin review. Stakes were not taken and refunds were not needed."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Private Pool Join Card */}
          {market.visibility === "private" && market.inviteCode && (
            <div className="mt-3 rounded-xl border border-[#C7D2FE] bg-[#EEF2FF]/50 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#4F46E5] text-white">
                  <Share2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#101828]">Private pool</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
                    Only people with the invite code can join. Share the invite link with your pool members.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/market/${market.id}?code=${market.inviteCode}`)
                          .then(() => toast.success("Invite link copied"))
                          .catch(() => toast.error("Could not copy invite link"));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F46E5] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#4338CA]"
                    >
                      <Share2 className="h-3 w-3" />
                      Copy invite link
                    </button>
                    <div className="rounded-lg border border-dashed border-[#A5B4FC] bg-white px-3 py-2 text-sm font-black tracking-[0.25em] text-[#4F46E5] select-all">
                      {market.inviteCode}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Private Pool Join Prompt (invitees) */}
          {market.visibility === "private" && !market.inviteCode && (
            <JoinPrivatePoolCard
              marketId={market.id}
              inviteCode={inviteCode || ""}
              onJoined={(joinedMarket) => {
                setMarket((prev) => (prev ? { ...prev, ...joinedMarket } : prev));
                upsertMarket(joinedMarket);
                toast.success("You joined this private pool");
              }}
            />
          )}
        </section>

        {/* Price Chart */}
        <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#101828]">Probability History</h2>
              <p className="mt-0.5 text-[10px] font-bold text-[#9CA3AF]">How the market's YES and NO probability has changed over time</p>
            </div>
            <div className="flex w-fit rounded-lg bg-[#F3F4F6] p-0.5">
              {(["1H", "24H", "7D", "ALL"] as Timeframe[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setTimeframe(item)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all duration-150 ${
                    timeframe === item
                      ? "bg-white text-[#111827] shadow-sm"
                      : "text-[#9CA3AF] hover:text-[#6B7280]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <Chart market={market} timeframe={timeframe} />
        </section>

        {/* Market Information */}
        <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="px-4 py-3 sm:px-5">
            <h2 className="text-base font-bold text-[#101828]">Market Information</h2>
          </div>

          {/* Resolution Rules */}
          <ExpandableSection
            icon={FileText}
            title="Resolution Rules"
            expanded={!!expandedSections["rules"]}
            onToggle={() => toggleSection("rules")}
          >
            <p className="text-sm leading-relaxed text-[#475467]">
              {market.rules || market.description || "This market resolves based on the stated outcome and admin review."}
            </p>
            {(market as any).resolutionSource && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#F8F7F4] p-3">
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6B7280]" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Resolution Source</span>
                  <p className="mt-0.5 text-xs font-bold text-[#111827]">{(market as any).resolutionSource}</p>
                </div>
              </div>
            )}
          </ExpandableSection>

          {/* Trading Timeline */}
          <ExpandableSection
            icon={Calendar}
            title="Prediction Timeline"
            expanded={!!expandedSections["timeline"]}
            onToggle={() => toggleSection("timeline")}
            border
          >
            <div className="space-y-3">
              <TimelineRow label="Pool Created" value={market.createdAt || market.created_at || "—"} active={false} />
              <TimelineRow label="Predictions Close" value={tradingCloseTime || "—"} active={marketIsActive} highlight />
              <TimelineRow label="Resolution Date" value={market.resolutionDate || market.closeTime || "—"} active={false} />
              {market.resolvedAt && <TimelineRow label="Resolved" value={market.resolvedAt} active={false} />}
            </div>
          </ExpandableSection>

          {/* Settlement Process */}
          <ExpandableSection
            icon={CircleDollarSign}
            title="Settlement Process"
            expanded={!!expandedSections["settlement"]}
            onToggle={() => toggleSection("settlement")}
            border
          >
            <p className="text-sm leading-relaxed text-[#475467]">
              After resolution, winning positions are settled at the pool payout rate. Losing positions are worth nothing.
              Settlement is processed automatically once the market resolves.
            </p>
            {market.settlement_status && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#F8F7F4] p-3">
                <div className={`h-2 w-2 rounded-full ${market.settlement_status === "completed" ? "bg-[#12B886]" : market.settlement_status === "settling" ? "bg-[#F59E0B] animate-pulse" : "bg-[#9CA3AF]"}`} />
                <span className="text-xs font-bold capitalize text-[#111827]">
                  {market.settlement_status === "completed" ? "Settlement Complete" : `Status: ${market.settlement_status}`}
                </span>
              </div>
            )}
            {market.total_settled_positions != null && (
              <div className="mt-2 flex items-center gap-4">
                <span className="text-[10px] font-bold text-[#9CA3AF]">Settled: {market.total_settled_positions} positions</span>
                {market.total_settled_payout_smallest_unit != null && (
                  <span className="text-[10px] font-bold text-[#9CA3AF]">Payout: {formatNaira(market.total_settled_payout_smallest_unit / 100)}</span>
                )}
              </div>
            )}
          </ExpandableSection>

          {/* Protected Market Policy */}
          {activation.isProtected && (
            <ExpandableSection
              icon={Shield}
              title="Protected Market Policy"
              expanded={!!expandedSections["protected"]}
              onToggle={() => toggleSection("protected")}
              border
            >
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-[#475467]">
                  This market is currently in protection mode. Until the market reaches its activation thresholds,
                  all positions are eligible for a full refund if the market does not go live.
                </p>
                <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF]/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F46E5]">Activation Progress</span>
                    <span className="text-xs font-bold text-[#4F46E5]">{Math.round(activation.progress)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-[#4F46E5] transition-all duration-500" style={{ width: `${activation.progress}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MiniStat label="Total Volume" value={`${formatNaira(activation.totalVolume)} / ${formatNaira(activation.requirements.totalVolume)}`} />
                  <MiniStat label="Participants" value={`${activation.participants} / ${activation.requirements.participants}`} />
                  <MiniStat label="YES Volume" value={`${formatNaira(activation.yesVolume)} / ${formatNaira(activation.requirements.yesVolume)}`} />
                  <MiniStat label="NO Volume" value={`${formatNaira(activation.noVolume)} / ${formatNaira(activation.requirements.noVolume)}`} />
                </div>
                <p className="text-xs font-bold text-[#6B7280]">
                  Max stake per user: {formatNaira(activation.requirements.protectedMaxStake)}
                </p>
              </div>
            </ExpandableSection>
          )}

          {/* How Pool Predictions Work */}
          <ExpandableSection
            icon={BarChart3}
            title="How Pool Predictions Work"
            expanded={!!expandedSections["pool"]}
            onToggle={() => toggleSection("pool")}
            border
            last
          >
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-[#475467]">
                Predictions are placed directly into the pool. Your stake immediately affects the probability.
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#12B886]" />
                  <span className="text-xs text-[#475467]">Place a stake on YES or NO to enter the pool</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4F46E5]" />
                  <span className="text-xs text-[#475467]">Larger stakes shift the probability further</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E85D5D]" />
                  <span className="text-xs text-[#475467]">When the market resolves, the winning side splits the pool</span>
                </div>
              </div>
            </div>
          </ExpandableSection>
        </section>
      </main>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-[calc(68px+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-[#E5E7EB]/60 bg-white/90 p-2.5 backdrop-blur-xl md:bottom-0 md:border-t md:bg-white/95 xl:left-64">
        <div className="mx-auto flex max-w-5xl gap-2">
          <div className="hidden flex-1 items-center justify-center gap-6 sm:flex">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">YES</span>
              <span className="text-sm font-bold tabular-nums text-[#047857]">{Math.round(market.yesPrice)}%</span>
            </div>
            <div className="h-4 w-px bg-[#E5E7EB]" />
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">NO</span>
              <span className="text-sm font-bold tabular-nums text-[#B42318]">{Math.round(market.noPrice)}%</span>
            </div>
          </div>
          <div className="flex flex-1 gap-2 sm:flex-none sm:w-[320px]">
            <button
              disabled={!marketIsActive}
              aria-label={`Predict YES at ${Math.round(market.yesPrice)}% probability`}
              onClick={() => setSheetSide("YES")}
              className="group flex-1 h-12 rounded-xl bg-[#12B886] text-sm font-bold text-white transition-all duration-150 hover:bg-[#0ea371] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#D1D5DB] disabled:text-[#9CA3AF]"
            >
              <span className="flex items-center justify-center gap-1.5">
                <span className="hidden sm:inline">Predict</span> YES {Math.round(market.yesPrice)}%
              </span>
            </button>
            <button
              disabled={!marketIsActive}
              aria-label={`Predict NO at ${Math.round(market.noPrice)}% probability`}
              onClick={() => setSheetSide("NO")}
              className="group flex-1 h-12 rounded-xl bg-[#E85D5D] text-sm font-bold text-white transition-all duration-150 hover:bg-[#d94c4c] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#D1D5DB] disabled:text-[#9CA3AF]"
            >
              <span className="flex items-center justify-center gap-1.5">
                <span className="hidden sm:inline">Predict</span> NO {Math.round(market.noPrice)}%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Prediction Slip */}
      <ForecastSlip
        selection={sheetSide ? {
          marketId: market.id,
          marketQuestion: market.question,
          side: sheetSide,
          marketIcon: getMarketMedia(market).imageUrl,
          currentPrice: sheetSide === "YES" ? market.yesPrice : market.noPrice,
        } : null}
        onClose={closeSheet}
        onConfirm={handlePredictionConfirm}
      />

      {/* Prediction Placed Success Modal */}
      {justPredicted && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]">
          {showConfetti && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="confetti-particle absolute"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: "-10%",
                    width: `${6 + Math.random() * 8}px`,
                    height: `${6 + Math.random() * 8}px`,
                    backgroundColor: ["#12B886", "#4F46E5", "#E85D5D", "#F59E0B"][Math.floor(Math.random() * 4)],
                    borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                    animation: `confetti-fall ${2 + Math.random() * 2}s ease-in forwards`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                />
              ))}
            </div>
          )}
          <div role="alert" aria-live="assertive" className="animate-fade-up relative w-full max-w-sm overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-7 text-center shadow-[0_24px_90px_rgba(17,24,39,0.22)]">
            <div className={`absolute inset-x-0 top-0 h-1 ${justPredicted === "YES" ? "bg-[#12B886]" : "bg-[#E85D5D]"}`} />
            <div className="relative mx-auto mb-5">
              <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-white shadow-lg ${justPredicted === "YES" ? "bg-[#12B886] shadow-[#12B886]/25" : "bg-[#E85D5D] shadow-[#E85D5D]/25"}`}>
                <CheckCircle className="h-8 w-8" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-[#101828]">Prediction Placed!</h3>
            <div className="mt-3 space-y-2">
              <p className="text-sm font-bold text-[#6B7280]">
                You predicted <span className={justPredicted === "YES" ? "text-[#047857]" : "text-[#B42318]"}>{justPredicted}</span>
              </p>
              <div className="rounded-lg bg-[#4F46E5]/[0.05] p-2.5">
                <p className="text-[11px] font-bold leading-relaxed text-[#6B7280]">
                  Your prediction is active. When the market resolves, the winning side splits the pool. Track it in &ldquo;My Predictions&rdquo;.
                </p>
              </div>
            </div>
            <p className="mt-1 text-xs text-[#9CA3AF]">Track in My Predictions</p>
            <div className="mt-6 grid gap-2">
              <Link
                to="/portfolio"
                onClick={() => { setJustPredicted(null); setShowConfetti(false); }}
                className="flex h-11 items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-bold text-white shadow-lg shadow-[#4F46E5]/20 transition hover:bg-[#4338CA]"
              >
                View Predictions
              </Link>
              <button
                onClick={() => { setJustPredicted(null); setShowConfetti(false); }}
                className="h-11 rounded-xl border border-[#E5E7EB] bg-white text-sm font-bold text-[#344054] transition hover:bg-[#F3F4F6]"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Protected Market Info Sheet */}
      {showProtectedInfo && (
        <ProtectedMarketInfo
          isOpen={showProtectedInfo}
          onClose={() => setShowProtectedInfo(false)}
          activation={{
            progress: activation.progress,
            totalVolume: activation.totalVolume,
            requirements: activation.requirements,
          }}
        />
      )}

      <MobileNav />

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Chart Component (Recharts)
   ═══════════════════════════════════════════════════════════════ */

const Chart = ({
  market,
  timeframe,
}: {
  market: Market;
  timeframe: Timeframe;
}) => {
  const savedHistory = useMemo(() => {
    const stored = (market.priceHistory || [])
      .filter((point) => point?.timestamp)
      .map((point) => ({
        timestamp: point.timestamp,
        time: new Date(point.timestamp).getTime(),
        yesPrice: clampCrowdValue(Number(point.yesPrice || market.yesPrice || 50)),
        noPrice: clampCrowdValue(Number(point.noPrice || market.noPrice || 50)),
        volume: Number(point.volume || 0),
        tradeCount: Number(point.tradeCount || 0),
        side: point.side || null,
        amount: Number(point.amount || 0),
      }));

    return stored
      .filter((point) => Number.isFinite(point.time))
      .map((point) => {
        const yesPrice = clampCrowdValue(point.yesPrice);
        return { ...point, yesPrice, noPrice: clampCrowdValue(100 - yesPrice) };
      })
      .sort((a, b) => a.time - b.time);
  }, [market.noPrice, market.priceHistory, market.yesPrice]);

  const filteredHistory = useMemo(() => {
    const cutoff = getTimeframeCutoff(timeframe);
    if (!cutoff) return savedHistory;
    const ranged = savedHistory.filter((point) => point.time >= cutoff);
    if (ranged.length >= 2) return ranged;
    if (savedHistory.length <= 1) return savedHistory;
    const latest = ranged[0] || savedHistory[savedHistory.length - 1];
    const previous = savedHistory.slice().reverse().find((point) => point.time < latest.time);
    return previous ? [previous, latest] : savedHistory.slice(-2);
  }, [savedHistory, timeframe]);

  const chartData = useMemo(() => {
    return filteredHistory.map((point) => ({
      time: formatAxisTime(point.time, timeframe),
      YES: point.yesPrice,
      NO: point.noPrice,
      _raw: point,
    }));
  }, [filteredHistory, timeframe]);

  const emptyHistory = savedHistory.length === 0;

  if (emptyHistory) {
    return (
      <div>
        <div className="grid h-[220px] place-items-center rounded-xl border border-dashed border-[#D1D5DB] bg-[#F8F7F4]/60 p-4 text-center sm:h-[280px]">
          <div>
            <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-[#F3F4F6]">
              <TrendingUp className="h-4 w-4 text-[#9CA3AF]" />
            </div>
            <p className="text-sm font-bold text-[#111827]">No movement yet</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">Updates when people predict YES or NO</p>
          </div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const raw = payload[0]?.payload?._raw;
    return (
      <div className="grid min-w-[10rem] gap-1.5 rounded-lg border border-[#E5E7EB] bg-[#111827] px-2.5 py-2 text-[11px] shadow-xl">
        {raw && (
          <div className="font-semibold text-[#F9FAFB]">{formatChartTime(raw.timestamp)}</div>
        )}
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-semibold text-[#D1D5DB]">{entry.dataKey}</span>
            </span>
            <span className="font-bold text-[#F9FAFB]">{formatNairaPrice(Number(entry.value || 0))}</span>
          </div>
        ))}
        {raw && (
          <div className="mt-1 space-y-0.5 border-t border-[#374151] pt-1.5 text-[10px] text-[#9CA3AF]">
            <div>Pool change: {formatNaira(raw.volume || 0)}</div>
            <div>Predictions: {raw.tradeCount || 0}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-3">
        <div className="h-[220px] w-full sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.08)" />
              <XAxis
                dataKey="time"
                tick={{ fill: "rgba(139,152,168,0.82)", fontSize: 10, fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "rgba(139,152,168,0.82)", fontSize: 10, fontWeight: 800 }}
                tickLine={false}
                axisLine={false}
                tickCount={5}
                width={30}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="YES"
                stroke="#12B886"
                strokeWidth={2.5}
                dot={filteredHistory.length === 1 ? { r: 4, fill: "#12B886", stroke: "#fff", strokeWidth: 2 } : false}
                activeDot={{ r: 5, fill: "#12B886", stroke: "#fff", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="NO"
                stroke="#E85D5D"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={filteredHistory.length === 1 ? { r: 4, fill: "#E85D5D", stroke: "#fff", strokeWidth: 2 } : false}
                activeDot={{ r: 5, fill: "#E85D5D", stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Small Components
   ═══════════════════════════════════════════════════════════════ */

const StatChip = ({
  icon: Icon,
  value,
  label,
}: {
  icon: any;
  value: number;
  label: string;
}) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-bold text-[#9CA3AF]">
    <Icon className="h-3 w-3" />
    <span className="font-bold text-[#111827]">{value.toLocaleString()}</span>
    {label}
  </span>
);

const IconButton = ({
  icon: Icon,
  onClick,
  label,
}: {
  icon: any;
  onClick: () => void;
  label: string;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className="grid h-9 w-9 place-items-center rounded-xl border border-[#E5E7EB] bg-white text-[#111827] transition hover:bg-[#F8F7F4]"
  >
    <Icon className="h-4 w-4" />
  </button>
);

const JoinPrivatePoolCard = ({
  marketId,
  inviteCode,
  onJoined,
}: {
  marketId: string;
  inviteCode: string;
  onJoined: (market: Market) => void;
}) => {
  const { user, setAuthOpen } = useAuth();
  const [code, setCode] = useState(inviteCode);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Enter the pool invite code from the person who invited you.");
      return;
    }
    setJoining(true);
    setError(null);
    try {
      const result = await apiService.joinMarket(marketId, trimmed);
      onJoined(result.market);
    } catch (joinError: any) {
      setError(joinError?.message || "Could not join this pool.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-[#C7D2FE] bg-[#EEF2FF]/50 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#4F46E5] text-white">
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-[#101828]">Private pool</div>
          <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
            This pool is invite-only. Enter the invite code to join and start predicting.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="INVITE CODE"
              maxLength={16}
              aria-label="Invite code"
              className="h-11 flex-1 rounded-xl border border-[#E5E7EB] bg-white px-4 text-center text-sm font-black tracking-[0.3em] outline-none placeholder:tracking-normal placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
            />
            <button
              onClick={handleJoin}
              disabled={joining}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-5 text-sm font-bold text-white transition hover:bg-[#4338CA] disabled:opacity-50"
            >
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Join pool
            </button>
          </div>
          {error && <p className="mt-2 text-xs font-bold text-[#B42318]">{error}</p>}
        </div>
      </div>
    </div>
  );
};

const ExpandableSection = ({
  icon: Icon,
  title,
  expanded,
  onToggle,
  border,
  last,
  children,
}: {
  icon: any;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  border?: boolean;
  last?: boolean;
  children: React.ReactNode;
}) => (
  <div className={`${border ? "border-t border-[#E5E7EB]" : ""} ${last ? "rounded-b-2xl" : ""}`}>
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-[#F8F7F4]/60 sm:px-5"
    >
      <div className="flex items-center gap-2.5">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#F3F4F6]">
          <Icon className="h-3.5 w-3.5 text-[#6B7280]" />
        </div>
        <span className="text-sm font-bold text-[#111827]">{title}</span>
      </div>
      <div className={`grid h-7 w-7 place-items-center rounded-lg bg-[#F3F4F6] text-[#667085] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
        <ChevronDown className="h-3.5 w-3.5" />
      </div>
    </button>
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
      <div className="px-4 pb-4 sm:px-5">
        {children}
      </div>
    </div>
  </div>
);

const TimelineRow = ({
  label,
  value,
  active,
  highlight,
}: {
  label: string;
  value: string;
  active: boolean;
  highlight?: boolean;
}) => {
  let displayValue = value;
  try {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      displayValue = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
  } catch { /* keep original */ }

  return (
    <div className="flex items-center gap-3">
      <div className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-[#12B886] animate-pulse" : "bg-[#D1D5DB]"}`} />
      <div className="flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">{label}</div>
        <div className={`mt-0.5 text-xs font-bold ${highlight ? "text-[#047857]" : "text-[#111827]"}`}>{displayValue}</div>
      </div>
    </div>
  );
};

const MiniStat = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-lg bg-[#F8F7F4] p-2.5">
    <div className="text-[10px] font-bold text-[#9CA3AF]">{label}</div>
    <div className="mt-0.5 text-xs font-bold text-[#111827]">{value}</div>
  </div>
);

const ExternalLink = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

const getTimeframeCutoff = (timeframe: Timeframe) => {
  const now = Date.now();
  if (timeframe === "1H") return now - 60 * 60 * 1000;
  if (timeframe === "24H") return now - 24 * 60 * 60 * 1000;
  if (timeframe === "7D") return now - 7 * 24 * 60 * 60 * 1000;
  return null;
};

const clampCrowdValue = (value: number) =>
  Math.max(0, Math.min(100, Math.round((Number(value) || 0) * 10) / 10));

const formatChartTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const formatAxisTime = (timestamp: number, timeframe: Timeframe) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  if (timeframe === "1H") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  if (timeframe === "7D" || timeframe === "ALL") {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
