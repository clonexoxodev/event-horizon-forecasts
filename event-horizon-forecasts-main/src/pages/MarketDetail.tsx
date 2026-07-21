import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip as ChartTooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  Layers,
  Loader2,
  Share2,
  Shield,
  TrendingUp,
  Users,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProtectedMarketInfo, ProtectedMarketTooltip } from "@/components/ProtectedMarketInfo";
import apiService, { ApiRequestError, type ApiOrderBook, type ApiTrade, type ApiOrder } from "@/lib/api";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartTooltip,
  Legend
);

export default function MarketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { markets, upsertMarket } = useMarketState();
  const { user, refreshUser, setAuthOpen } = useAuth();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetSide, setSheetSide] = useState<"YES" | "NO" | null>(null);
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [submitting, setSubmitting] = useState(false);
  const [justPredicted, setJustPredicted] = useState<"YES" | "NO" | null>(null);
  const [orderJustPlaced, setOrderJustPlaced] = useState<{ order: ApiOrder; matched: number } | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("24H");
  const [now, setNow] = useState(Date.now());
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showProtectedInfo, setShowProtectedInfo] = useState(false);
  const [orderBook, setOrderBook] = useState<ApiOrderBook | null>(null);
  const [recentTrades, setRecentTrades] = useState<ApiTrade[]>([]);
  const [userOrders, setUserOrders] = useState<ApiOrder[]>([]);
  const marketsRef = useRef(markets);
  const marketRef = useRef<Market | null>(null);
  const latestLoadRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const isOrderBook = market?.pricing_model === "orderbook";

  useEffect(() => {
    marketsRef.current = markets;
  }, [markets]);

  useEffect(() => {
    marketRef.current = market;
  }, [market]);

  useEffect(() => {
    if (!id) return;

    const loadId = latestLoadRef.current + 1;
    latestLoadRef.current = loadId;
    const readCachedMarket = () =>
      marketsRef.current.find((item) => item.id === id);
    const loadMarket = async () => {
      if (!marketRef.current || marketRef.current.id !== id) {
        setLoading(true);
      }
      try {
        const cached = readCachedMarket();
        if (cached && (!marketRef.current || marketRef.current.id !== id)) {
          setMarket(cached);
        }
        const [response, historyResponse] = await Promise.all([
          apiService.getMarket(id),
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

        if (enrichedMarket.pricing_model === "orderbook") {
          const [bookRes, tradesRes] = await Promise.all([
            apiService.getOrderBook(id).catch(() => null),
            apiService.getMarketTrades(id).catch(() => null),
          ]);
          if (latestLoadRef.current !== loadId) return;
          if (bookRes) setOrderBook(bookRes);
          if (tradesRes) setRecentTrades(tradesRes.trades || []);
        }
      } catch (error: any) {
        if (latestLoadRef.current !== loadId) return;
        const cached = readCachedMarket();
        if (cached) {
          if (!marketRef.current || marketRef.current.id !== id) {
            setMarket(cached);
          }
          console.warn(
            "Market detail refresh failed; keeping saved market data",
            error
          );
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
  }, [id, navigate, upsertMarket]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!id || !isOrderBook) return;
    const interval = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const [bookRes, tradesRes, mktRes] = await Promise.all([
          apiService.getOrderBook(id),
          apiService.getMarketTrades(id),
          apiService.getMarket(id),
        ]);
        setOrderBook(bookRes);
        setRecentTrades(tradesRes.trades || []);
        if (mktRes?.market) {
          const updated = { ...mktRes.market, priceHistory: market?.priceHistory };
          setMarket(updated);
          upsertMarket(updated);
        }
      } catch { /* polling is best-effort */ }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [id, isOrderBook, upsertMarket]);

  useEffect(() => {
    if (!id || !isOrderBook || !user) return;
    const interval = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await apiService.getUserOrders(id);
        setUserOrders(res.orders || []);
      } catch { /* polling is best-effort */ }
    }, 10000);
    return () => window.clearInterval(interval);
  }, [id, isOrderBook, user]);

  useEffect(() => {
    if (sheetSide) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSheetVisible(true);
        });
      });
    } else {
      setSheetVisible(false);
    }
  }, [sheetSide]);

  useEffect(() => {
    if (isOrderBook && sheetSide && !price) {
      const currentPrice = sheetSide === "YES" ? (market?.yesPrice || 50) : (market?.noPrice || 50);
      setPrice(String(Math.round(currentPrice)));
    }
  }, [sheetSide, isOrderBook, market?.yesPrice, market?.noPrice]);

  const closeSheet = () => {
    setSheetVisible(false);
    setTimeout(() => {
      setSheetSide(null);
      setAmount("");
      setPrice("");
      setOrderType("BUY");
      setOrderJustPlaced(null);
    }, 300);
  };

  useEffect(() => {
    if (sheetSide) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !submitting) {
          closeSheet();
        }
      };
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [sheetSide, submitting]);

  const marketCategoryLabel = market ? getMarketCategoryLabel(market) : "Other";

  const handleShare = async () => {
    if (!market) return;
    const media = getMarketMedia(market);
    const url = `${window.location.origin}/market/${market.id}`;
    const timeLeft = formatCountdown(
      market.tradingCloseTime || market.closeTime,
      market.closesIn
    );
    const shareText = [
      "FLIPPE market",
      market.question,
      `YES Crowd View: ${formatNairaPrice(market.yesPrice)}`,
      `NO Crowd View: ${formatNairaPrice(market.noPrice)}`,
      `Time left: ${timeLeft}`,
      "Back your opinion on FLIPPE.",
      url,
    ].join("\n");
    try {
      if (navigator.share) {
        await navigator.share({
          title: `FLIPPE: ${market.question}`,
          text: `${shareText}\n${media.imageUrl ? `Image: ${media.imageUrl}` : ""}`.trim(),
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

  const confirmPrediction = async () => {
    if (submitting) return;
    if (!market || !sheetSide) return;
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const numericAmount = Number.parseFloat(amount) || 0;
    const numericPrice = Number.parseFloat(price) || 0;
    if (numericAmount <= 0) return toast.error("Enter an amount.");
    if (isOrderBook && (numericPrice <= 0 || numericPrice >= 100)) {
      return toast.error("Price must be between 1 and 99.");
    }
    const currentActivation = getMarketActivation(market);
    if (
      currentActivation.isProtected &&
      numericAmount > currentActivation.requirements.protectedMaxStake
    ) {
      return toast.error(
        `Protected markets are limited to ${formatNaira(currentActivation.requirements.protectedMaxStake)} per user until they go live.`
      );
    }

    setSubmitting(true);
    try {
      if (isOrderBook) {
        const result = await apiService.createOrder(market.id, {
          side: sheetSide,
          order_type: orderType,
          price: numericPrice,
          quantity: numericAmount,
        });
        setOrderJustPlaced(result);
        setJustPredicted(sheetSide);
        setShowConfetti(true);
        toast.success(
          `Order placed: ${result.order.status === "filled" ? "Fully filled" : result.order.status === "partial" ? "Partially matched" : "Waiting for match"}`
        );
        await refreshUser().catch(() => {});
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        const result = await apiService.placePrediction(market.id, {
          side: sheetSide,
          amount: numericAmount,
          currency: "NGN",
        });
        const historyResponse = await apiService
          .getMarketPriceHistory(market.id)
          .catch(() => null);
        const updatedMarket = {
          ...result.market,
          priceHistory: historyResponse?.priceHistory?.length
            ? historyResponse.priceHistory
            : result.market.priceHistory,
        };
        setMarket(updatedMarket);
        upsertMarket(updatedMarket);
        refreshUser().catch((error) =>
          console.warn("User refresh after prediction failed", error)
        );
        setJustPredicted(sheetSide);
        setShowConfetti(true);
        setAmount("");
        closeSheet();
        toast.success(
          `Prediction saved: ${sheetSide} with ${formatNaira(numericAmount)}.`
        );
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (error: any) {
      console.error("Order submit failed", error);
      toast.error(error.message || "Could not save order.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrderHandler = async (orderId: string) => {
    if (!market) return;
    try {
      await apiService.cancelOrder(market.id, orderId);
      setUserOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" as const } : o))
      );
      toast.success("Order cancelled.");
      await refreshUser().catch(() => {});
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel order.");
    }
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
  const selectedPrice = sheetSide === "YES" ? market.yesPrice : market.noPrice;
  const numericAmount = Number.parseFloat(amount) || 0;
  const slipDataMissing = Boolean(
    sheetSide && !Number.isFinite(Number(selectedPrice))
  );
  const tradingCloseTime = market.tradingCloseTime || market.closeTime;
  const hasTradingClosed = tradingCloseTime
    ? new Date(tradingCloseTime).getTime() <= now
    : false;
  const marketIsActive = market.status === "active" && !hasTradingClosed;
  const activation = getMarketActivation(market);
  const exceedsProtectedLimit =
    activation.isProtected &&
    numericAmount > activation.requirements.protectedMaxStake;

  const estimatedReturn =
    numericAmount > 0 && selectedPrice
      ? (numericAmount / selectedPrice) * 100
      : 0;
  const estimatedProfit = estimatedReturn - numericAmount;

  return (
    <div className="app-bg min-h-screen pb-[calc(140px+env(safe-area-inset-bottom))] text-[#111827] md:pb-24 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:py-6">
        {/* ── Back + Share ── */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 text-xs font-bold text-[#6B7280] transition hover:text-[#111827]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
          <IconButton onClick={handleShare} icon={Share2} label="Share" />
        </div>

        {/* ── Market Header ── */}
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-4">
            {media.src && (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F3F4F6] sm:h-20 sm:w-20">
                {media.type === "video" ? (
                  <video
                    src={media.src}
                    poster={media.poster}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    loop
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={media.src}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                  {marketCategoryLabel}
                </span>
                {market.status === 'resolved' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#4F46E5]/10 px-2 py-0.5 text-[10px] font-bold text-[#4F46E5]">
                    <CheckCircle className="h-3 w-3" />
                    Resolved — {market.winningOutcome || market.winning_outcome || market.outcome} Wins
                  </span>
                ) : market.status === 'refunded' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-bold text-[#D97706]">
                    Refunded
                  </span>
                ) : market.status === 'cancelled' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E85D5D]/10 px-2 py-0.5 text-[10px] font-bold text-[#B42318]">
                    Cancelled
                  </span>
                ) : market.settlement_status === 'settling' ? (
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
                <StatChip icon={Users} value={market.participants || 0} label="traders" />
                {isOrderBook ? (
                  <>
                    <StatChip icon={Layers} value={market.matched_volume || market.tradeCount || 0} label="matched" />
                    <StatChip icon={BarChart3} value={market.open_interest || 0} label="open" />
                  </>
                ) : (
                  <StatChip icon={BarChart3} value={market.tradeCount || 0} label="predictions" />
                )}
              </>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-bold text-[#9CA3AF]">
              <Clock className="h-3 w-3" />
              {formatCountdown(tradingCloseTime, market.closesIn)}
            </span>
            {isOrderBook && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#4F46E5]/10 px-2.5 py-1 text-[10px] font-bold text-[#4F46E5]">
                <Layers className="h-3 w-3" />
                Order Book
              </span>
            )}
          </div>

          {/* Resolved Market Banner */}
          {market.status === 'resolved' && (market.winningOutcome || market.winning_outcome || market.outcome) && (
            <div className="mt-3 rounded-xl border border-[#4F46E5]/20 bg-[#EEF2FF]/60 p-4">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white ${
                  (market.winningOutcome || market.winning_outcome || market.outcome) === 'YES' ? 'bg-[#12B886]' : 'bg-[#E85D5D]'
                }`}>
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#101828]">
                    {(market.winningOutcome || market.winning_outcome || market.outcome) === 'YES' ? 'YES' : 'NO'} Wins
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    This market has been resolved. Settlement is {market.settlement_status === 'completed' ? 'complete' : 'in progress'}.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Refunded Market Banner */}
          {market.status === 'refunded' && (
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
          {market.status === 'cancelled' && (
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
                <span className="text-[10px] font-bold text-[#4F46E5]">
                  {Math.round(activation.progress)}%
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[#4F46E5] transition-all duration-500"
                  style={{ width: `${activation.progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] font-bold text-[#475467]">
                {formatNaira(activation.totalPool)} / {formatNaira(activation.requirements.totalPool)}
              </p>
            </div>
          )}
        </section>

        {/* ── Price History / Crowd View ── */}
        <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-bold text-[#101828]">Crowd View</h2>
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

        {/* ── Rules & Resolution ── */}
        <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <button
            onClick={() => setRulesExpanded(!rulesExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-base font-bold text-[#101828]">Rules & Resolution</h2>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#F3F4F6] text-[#667085]">
              {rulesExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </div>
          </button>
          {!rulesExpanded && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#667085]">
              {market.rules ||
                market.description ||
                "This market resolves based on the stated outcome and admin review."}
            </p>
          )}
          <div
            className={`overflow-hidden transition-all duration-300 ${
              rulesExpanded ? "mt-2.5 max-h-[600px]" : "max-h-0"
            }`}
          >
            <p className="text-sm leading-6 text-[#667085]">
              {market.rules ||
                market.description ||
                "This market resolves based on the stated outcome and admin review."}
            </p>
            {(market as any).resolutionSource && (
              <p className="mt-3 text-xs font-bold text-[#9CA3AF]">
                Resolution source: {(market as any).resolutionSource}
              </p>
            )}
          </div>
        </section>

        {/* ── Order Book Summary (Order Book Markets) ── */}
        {isOrderBook && orderBook && (
          <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-base font-bold text-[#101828]">Order Book</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#047857]">Bids (BUY)</div>
                {orderBook.bids.length === 0 ? (
                  <div className="py-3 text-center text-xs font-bold text-[#9CA3AF]">No bids</div>
                ) : (
                  <div className="space-y-1">
                    {orderBook.bids.slice(0, 5).map((level) => {
                      const maxQty = Math.max(...orderBook.bids.map((b) => b.total_quantity));
                      const depth = maxQty > 0 ? (level.total_quantity / maxQty) * 100 : 0;
                      return (
                        <div key={level.price} className="relative overflow-hidden rounded-lg bg-[#12B886]/8 px-2.5 py-1.5 transition-all duration-300">
                          <div
                            className="absolute inset-y-0 left-0 bg-[#12B886]/12 transition-all duration-500"
                            style={{ width: `${depth}%` }}
                          />
                          <div className="relative flex items-center justify-between">
                            <span className="text-xs font-bold text-[#047857]">{formatNaira(level.price)}</span>
                            <span className="text-[10px] font-bold text-[#6B7280]">{level.total_quantity} ({level.order_count})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#B42318]">Asks (SELL)</div>
                {orderBook.asks.length === 0 ? (
                  <div className="py-3 text-center text-xs font-bold text-[#9CA3AF]">No asks</div>
                ) : (
                  <div className="space-y-1">
                    {orderBook.asks.slice(0, 5).map((level) => {
                      const maxQty = Math.max(...orderBook.asks.map((a) => a.total_quantity));
                      const depth = maxQty > 0 ? (level.total_quantity / maxQty) * 100 : 0;
                      return (
                        <div key={level.price} className="relative overflow-hidden rounded-lg bg-[#E85D5D]/8 px-2.5 py-1.5 transition-all duration-300">
                          <div
                            className="absolute inset-y-0 right-0 bg-[#E85D5D]/12 transition-all duration-500"
                            style={{ width: `${depth}%` }}
                          />
                          <div className="relative flex items-center justify-between">
                            <span className="text-xs font-bold text-[#B42318]">{formatNaira(level.price)}</span>
                            <span className="text-[10px] font-bold text-[#6B7280]">{level.total_quantity} ({level.order_count})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#F8F7F4] px-3 py-2">
              <div className="text-[10px] font-bold text-[#6B7280]">
                Best Bid: <span className="text-[#047857] transition-all duration-300">{orderBook.best_bid ? formatNaira(orderBook.best_bid) : "—"}</span>
              </div>
              <div className="text-[10px] font-bold text-[#6B7280]">
                Spread: <span className="text-[#4F46E5] transition-all duration-300">{orderBook.spread != null ? formatNaira(orderBook.spread) : "—"}</span>
              </div>
              <div className="text-[10px] font-bold text-[#6B7280]">
                Best Ask: <span className="text-[#B42318] transition-all duration-300">{orderBook.best_ask ? formatNaira(orderBook.best_ask) : "—"}</span>
              </div>
            </div>
          </section>
        )}

        {/* ── Recent Trades (Order Book Markets) ── */}
        {isOrderBook && recentTrades.length > 0 && (
          <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-base font-bold text-[#101828]">Recent Trades</h2>
            <div className="space-y-1.5">
              {recentTrades.slice(0, 8).map((trade) => (
                <div key={trade.id} className="flex items-center justify-between rounded-xl bg-[#F8F7F4] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${trade.side === "YES" ? "bg-[#12B886]/12 text-[#047857]" : "bg-[#E85D5D]/12 text-[#B42318]"}`}>
                      {trade.side}
                    </span>
                    <span className="text-xs font-bold text-[#111827]">{formatNaira(trade.trade_price)}/share</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#111827]">{trade.trade_quantity} shares</div>
                    <div className="text-[10px] text-[#9CA3AF]">{new Date(trade.created_at).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── User Open Orders (Order Book Markets) ── */}
        {isOrderBook && userOrders.filter((o) => ["waiting", "partial", "pending"].includes(o.status)).length > 0 && (
          <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-base font-bold text-[#101828]">Your Open Orders</h2>
            <div className="space-y-1.5">
              {userOrders.filter((o) => ["waiting", "partial", "pending"].includes(o.status)).slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-xl bg-[#F8F7F4] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${order.side === "YES" ? "bg-[#12B886]/12 text-[#047857]" : "bg-[#E85D5D]/12 text-[#B42318]"}`}>
                      {order.side}
                    </span>
                    <span className="text-[10px] font-bold text-[#6B7280]">{order.order_type}</span>
                    <span className="text-xs font-bold text-[#111827]">{formatNaira(order.price)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#9CA3AF]">
                      {order.filled_quantity}/{order.quantity}
                    </span>
                    {["waiting", "partial"].includes(order.status) && (
                      <button
                        onClick={() => cancelOrderHandler(order.id)}
                        className="rounded-lg bg-[#E85D5D]/10 px-2 py-1 text-[10px] font-bold text-[#B42318] transition hover:bg-[#E85D5D]/20"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── Sticky Action Bar ── */}
      <div className="fixed bottom-[calc(68px+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-[#E5E7EB]/60 bg-white/90 p-2.5 backdrop-blur-xl md:bottom-0 md:border-t md:bg-white/95 xl:left-64">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2">
          <button
            disabled={!marketIsActive}
            aria-label={`Back YES at ${formatNairaPrice(market.yesPrice)}`}
            onClick={() => setSheetSide("YES")}
            className="group h-11 rounded-xl bg-[#12B886] text-sm font-bold text-white transition-all duration-150 hover:bg-[#0ea371] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#D1D5DB] disabled:text-[#9CA3AF]"
          >
            <span className="flex items-center justify-center gap-1.5">
              YES {formatNairaPrice(market.yesPrice)}
            </span>
          </button>
          <button
            disabled={!marketIsActive}
            aria-label={`Back NO at ${formatNairaPrice(market.noPrice)}`}
            onClick={() => setSheetSide("NO")}
            className="group h-11 rounded-xl bg-[#E85D5D] text-sm font-bold text-white transition-all duration-150 hover:bg-[#d94c4c] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#D1D5DB] disabled:text-[#9CA3AF]"
          >
            <span className="flex items-center justify-center gap-1.5">
              NO {formatNairaPrice(market.noPrice)}
            </span>
          </button>
        </div>
      </div>

      {/* ── Prediction Sheet ── */}
      {sheetSide && (
        <div
          className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            sheetVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => !submitting && closeSheet()}
        >
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Place your prediction"
            className={`absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-3xl border border-[#E5E7EB] bg-white p-5 pb-[calc(90px+env(safe-area-inset-bottom))] text-[#111827] shadow-[0_-24px_80px_rgba(17,24,39,0.18)] transition-transform duration-300 ease-out md:left-auto md:right-6 md:top-24 md:h-fit md:w-[380px] md:rounded-2xl md:pb-5 ${
              sheetVisible ? "translate-y-0" : "translate-y-full"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                    sheetSide === "YES" ? "text-[#12B886]" : "text-[#E85D5D]"
                  }`}
                >
                  {isOrderBook ? "Order slip" : "Prediction slip"}
                </p>
                <h2 className="mt-0.5 text-xl font-bold">
                  {isOrderBook ? "Place your order" : `You picked ${sheetSide}`}
                </h2>
              </div>
              <button
                onClick={closeSheet}
                aria-label="Close prediction sheet"
                disabled={submitting}
                className="grid h-9 w-9 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {slipDataMissing ? (
              <div className="rounded-xl border border-[#E85D5D]/30 bg-[#E85D5D]/10 p-4 text-sm font-bold leading-relaxed text-[#B42318]">
                Unable to open prediction slip. Please try again.
              </div>
            ) : (
              <>
                {isOrderBook && (
                  <div className="mb-3">
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                      Order Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setOrderType("BUY")}
                        disabled={submitting}
                        className={`h-10 rounded-lg border text-xs font-bold transition ${
                          orderType === "BUY"
                            ? "border-[#12B886]/45 bg-[#12B886]/18 text-[#047857]"
                            : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280]"
                        }`}
                      >
                        BUY
                      </button>
                      <button
                        onClick={() => setOrderType("SELL")}
                        disabled={submitting}
                        className={`h-10 rounded-lg border text-xs font-bold transition ${
                          orderType === "SELL"
                            ? "border-[#E85D5D]/45 bg-[#E85D5D]/18 text-[#B42318]"
                            : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280]"
                        }`}
                      >
                        SELL
                      </button>
                    </div>
                  </div>
                )}

                {isOrderBook && (
                  <div className="mb-3">
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                      Price per share
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#6B7280]">
                        NGN
                      </span>
                      <Input
                        type="number"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        disabled={submitting}
                        placeholder="0"
                        min="1"
                        max="99"
                        className="h-12 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-11 text-lg font-bold text-[#111827] placeholder:text-[#D1D5DB] focus:border-[#4F46E5] focus:ring-[#4F46E5]/20"
                      />
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-[#9CA3AF]">Price between 1 and 99</p>
                  </div>
                )}

                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                  {isOrderBook ? "Amount (NGN)" : "Amount"}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#6B7280]">
                    NGN
                  </span>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    disabled={submitting}
                    placeholder="0"
                    className="h-12 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-11 text-lg font-bold text-[#111827] placeholder:text-[#D1D5DB] focus:border-[#4F46E5] focus:ring-[#4F46E5]/20"
                  />
                </div>
                <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                  {[100, 500, 1000, 2000].map((value) => (
                    <button
                      key={value}
                      onClick={() => setAmount(value.toString())}
                      disabled={submitting}
                      className={`rounded-lg border py-2 text-[11px] font-bold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                        amount === value.toString()
                          ? "border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5]"
                          : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] hover:border-[#D1D5DB] hover:bg-white"
                      }`}
                    >
                      {formatNaira(value)}
                    </button>
                  ))}
                </div>

                {isOrderBook && numericAmount > 0 && numericPrice > 0 && (
                  <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6B7280]">Est. Shares</span>
                      <span className="text-sm font-bold text-[#101828]">{estimatedShares}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6B7280]">Price/Share</span>
                      <span className="text-sm font-bold text-[#101828]">{formatNaira(numericPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6B7280]">Order Value</span>
                      <span className="text-sm font-bold text-[#101828]">{formatNaira(numericAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-1.5">
                      <span className="text-xs font-bold text-[#6B7280]">Possible Outcome</span>
                      <span className="text-sm font-bold text-[#12B886]">
                        {orderType === "BUY"
                          ? `Win ${formatNaira(estimatedShares * 100)}`
                          : `Sell ${estimatedShares} shares`}
                      </span>
                    </div>
                  </div>
                )}

                {!isOrderBook && numericAmount > 0 && selectedPrice && (
                  <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6B7280]">Est. return</span>
                      <span className="text-sm font-bold text-[#101828]">
                        {formatNaira(estimatedReturn)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6B7280]">Est. profit</span>
                      <span className="text-sm font-bold text-[#12B886]">
                        +{formatNaira(estimatedProfit)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-3">
                  <Row
                    label="Balance"
                    value={user ? formatNaira(user.balance || 0) : "Login required"}
                  />
                  <Row
                    label="Crowd View"
                    value={`YES ${formatNairaPrice(market.yesPrice)} / NO ${formatNairaPrice(market.noPrice)}`}
                  />
                  {activation.isProtected && (
                    <button
                      type="button"
                      onClick={() => setShowProtectedInfo(true)}
                      className="mt-2.5 w-full rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] p-3 text-left transition hover:bg-[#E0E7FF]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5 text-[#4F46E5]" />
                          <span className="text-xs font-bold text-[#4F46E5]">Refund Protected</span>
                        </div>
                        <Info className="h-3.5 w-3.5 text-[#4F46E5]/60" />
                      </div>
                      <p className="mt-1.5 text-[10px] font-bold leading-relaxed text-[#344054]">
                        Stake is protected if market doesn&apos;t reach enough activity.
                      </p>
                    </button>
                  )}
                  {exceedsProtectedLimit && (
                    <p className="mt-2 text-[10px] font-bold text-[#B42318]">
                      Max {formatNaira(activation.requirements.protectedMaxStake)} per user.
                    </p>
                  )}
                </div>
                <Button
                  onClick={confirmPrediction}
                  disabled={submitting || numericAmount <= 0 || exceedsProtectedLimit || (isOrderBook && (numericPrice <= 0 || numericPrice >= 100))}
                  className={`mt-4 h-11 w-full rounded-xl text-sm font-bold shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98] disabled:shadow-none ${
                    sheetSide === "YES"
                      ? "bg-[#12B886] text-white shadow-[#12B886]/20 hover:bg-[#0ea371]"
                      : "bg-[#E85D5D] text-white shadow-[#E85D5D]/20 hover:bg-[#d94c4c]"
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUp className="mr-2 h-4 w-4" />
                  )}
                  {user
                    ? isOrderBook
                      ? `Place ${orderType} Order`
                      : `Confirm ${sheetSide}`
                    : "Login to trade"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Prediction Success ── */}
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
                    backgroundColor:
                      ["#12B886", "#4F46E5", "#E85D5D", "#F59E0B"][
                        Math.floor(Math.random() * 4)
                      ],
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
            <div
              className={`absolute inset-x-0 top-0 h-1 ${
                justPredicted === "YES"
                  ? "bg-[#12B886]"
                  : "bg-[#E85D5D]"
              }`}
            />
            <div
              className={`mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full text-white shadow-lg ${
                justPredicted === "YES"
                  ? "bg-[#12B886] shadow-[#12B886]/25"
                  : "bg-[#E85D5D] shadow-[#E85D5D]/25"
              }`}
            >
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-black text-[#101828]">
              Prediction Locked
            </h3>
            <p className="mt-2 text-sm font-bold text-[#101828]">
              You backed {justPredicted}
            </p>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              Track in My Predictions
            </p>
            <div className="mt-5 grid gap-2">
              <Link
                to="/portfolio"
                onClick={() => {
                  setJustPredicted(null);
                  setShowConfetti(false);
                }}
                className="flex h-11 items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-bold text-white shadow-lg shadow-[#4F46E5]/20 transition hover:bg-[#4338CA]"
              >
                View Prediction
              </Link>
              <button
                onClick={() => {
                  setJustPredicted(null);
                  setShowConfetti(false);
                }}
                className="h-11 rounded-xl border border-[#E5E7EB] bg-white text-sm font-bold text-[#344054] transition hover:bg-[#F3F4F6]"
              >
                Continue Browsing
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
            totalPool: activation.totalPool,
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
   Chart Component
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
        yesPrice: clampCrowdValue(
          Number(point.yesPrice || market.yesPrice || 50)
        ),
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
    const previous = savedHistory
      .slice()
      .reverse()
      .find((point) => point.time < latest.time);
    return previous ? [previous, latest] : savedHistory.slice(-2);
  }, [savedHistory, timeframe]);

  const chartData = useMemo<ChartData<"line">>(() => {
    const labels = filteredHistory.map((point) =>
      formatAxisTime(point.time, timeframe)
    );
    return {
      labels,
      datasets: [
        {
          label: "YES",
          data: filteredHistory.map((point) => point.yesPrice),
          borderColor: "#12B886",
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return "rgba(18,184,134,0.08)";
            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom
            );
            gradient.addColorStop(0, "rgba(18,184,134,0.18)");
            gradient.addColorStop(0.5, "rgba(18,184,134,0.06)");
            gradient.addColorStop(1, "rgba(18,184,134,0.0)");
            return gradient;
          },
          borderWidth: 2.5,
          pointRadius: filteredHistory.length === 1 ? 4 : 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#12B886",
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 2,
          pointBackgroundColor: "#12B886",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          tension: 0.38,
          fill: true,
        },
        {
          label: "NO",
          data: filteredHistory.map((point) => point.noPrice),
          borderColor: "#E85D5D",
          backgroundColor: "rgba(232,93,93,0.04)",
          borderWidth: 2,
          pointRadius: filteredHistory.length === 1 ? 4 : 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#E85D5D",
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 2,
          pointBackgroundColor: "#E85D5D",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          tension: 0.38,
          fill: false,
          borderDash: [5, 3],
        },
      ],
    };
  }, [filteredHistory, timeframe]);

  const chartOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: "easeOutQuart" },
      interaction: { mode: "nearest", intersect: false },
      onHover: (_event, elements) => {
        const canvas = _event.native?.target as HTMLCanvasElement | null;
        if (canvas) {
          canvas.style.cursor = elements.length > 0 ? "pointer" : "default";
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          displayColors: true,
          backgroundColor: "rgba(17, 24, 39, 0.9)",
          cornerRadius: 8,
          padding: 8,
          titleFont: { weight: "600", size: 11 },
          titleColor: "#F9FAFB",
          bodyColor: "#D1D5DB",
          bodyFont: { size: 11, weight: 600 },
          boxPadding: 4,
          callbacks: {
            title: (items) => {
              const point = filteredHistory[items[0]?.dataIndex ?? 0];
              return point ? formatChartTime(point.timestamp) : "";
            },
            label: (item) =>
              `${item.dataset.label}: ${formatNairaPrice(Number(item.raw || 0))}`,
            afterBody: (items) => {
              const point = filteredHistory[items[0]?.dataIndex ?? 0];
              if (!point) return [];
              return [
                `Pool: ${formatNaira(point.volume || 0)}`,
                `Predictions: ${point.tradeCount || 0}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: "rgba(139,152,168,0.82)",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 5,
            font: { size: 10, weight: 700 },
          },
        },
        y: {
          min: 0,
          max: 100,
          position: "right",
          grid: { color: "rgba(148,163,184,0.08)" },
          border: { display: false },
          ticks: {
            stepSize: 25,
            color: "rgba(139,152,168,0.82)",
            callback: (value) => `${value}`,
            font: { size: 10, weight: 800 },
          },
        },
      },
    }),
    [filteredHistory]
  );

  const emptyHistory = savedHistory.length === 0;
  const currentYes = clampCrowdValue(Number(market.yesPrice || 50));
  const currentNo = clampCrowdValue(100 - currentYes);

  if (emptyHistory) {
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#12B886]/10 px-2.5 py-1 text-[10px] font-bold text-[#12B886]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#12B886]" />
              YES {formatNairaPrice(currentYes)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E85D5D]/10 px-2.5 py-1 text-[10px] font-bold text-[#E85D5D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E85D5D]" />
              NO {formatNairaPrice(currentNo)}
            </span>
          </div>
          <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-bold text-[#6B7280]">
            {market.tradeCount || 0} predictions
          </span>
        </div>
        <div className="grid h-[220px] place-items-center rounded-xl border border-dashed border-[#D1D5DB] bg-[#F8F7F4]/60 p-4 text-center sm:h-[280px]">
          <div>
            <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-[#F3F4F6]">
              <TrendingUp className="h-4 w-4 text-[#9CA3AF]" />
            </div>
            <p className="text-sm font-bold text-[#111827]">No movement yet</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              Updates when people back YES or NO
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#12B886]/10 px-2.5 py-1 text-[10px] font-bold text-[#12B886]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#12B886]" />
            YES {formatNairaPrice(market.yesPrice)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E85D5D]/10 px-2.5 py-1 text-[10px] font-bold text-[#E85D5D]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E85D5D]" />
            NO {formatNairaPrice(market.noPrice)}
          </span>
        </div>
        <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-bold text-[#6B7280]">
          {market.tradeCount || 0} predictions
        </span>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#667085]">YES price</p>
            <p className="text-lg font-bold text-[#101828]">
              {formatNairaPrice(market.yesPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-[#667085]">NO price</p>
            <p className="text-lg font-bold text-[#101828]">
              {formatNairaPrice(market.noPrice)}
            </p>
          </div>
        </div>
        <div className="h-[220px] w-full sm:h-[300px]">
          <Line data={chartData} options={chartOptions} />
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

const Row = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div className="flex items-center justify-between border-b border-[#E5E7EB] py-2 last:border-0">
    <span className="text-xs font-bold text-[#6B7280]">{label}</span>
    <span
      className={`text-xs font-bold ${highlight ? "text-[#4F46E5]" : "text-[#111827]"}`}
    >
      {value}
    </span>
  </div>
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
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  if (timeframe === "7D" || timeframe === "ALL") {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
