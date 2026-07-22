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
  FileText,
  Info,
  Layers,
  Loader2,
  Share2,
  Shield,
  TrendingUp,
  Users,
  X,
  AlertCircle,
  Calendar,
  CircleDollarSign,
  Zap,
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
  const [sheetVisible, setSheetVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showProtectedInfo, setShowProtectedInfo] = useState(false);
  const [orderBook, setOrderBook] = useState<ApiOrderBook | null>(null);
  const [recentTrades, setRecentTrades] = useState<ApiTrade[]>([]);
  const [userOrders, setUserOrders] = useState<ApiOrder[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const marketsRef = useRef(markets);
  const marketRef = useRef<Market | null>(null);
  const latestLoadRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const isOrderBook = market?.pricing_model === "orderbook";

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
        requestAnimationFrame(() => setSheetVisible(true));
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
        if (e.key === "Escape" && !submitting) closeSheet();
      };
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [sheetSide, submitting]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const marketCategoryLabel = market ? getMarketCategoryLabel(market) : "Other";
  const handleShare = async () => {
    if (!market) return;
    const media = getMarketMedia(market);
    const url = `${window.location.origin}/market/${market.id}`;
    const timeLeft = formatCountdown(market.tradingCloseTime || market.closeTime, market.closesIn);
    const shareText = [
      "FLIPPE market", market.question,
      `YES Price: ${formatNairaPrice(market.yesPrice)}`,
      `NO Price: ${formatNairaPrice(market.noPrice)}`,
      `Time left: ${timeLeft}`, "Trade on FLIPPE.", url,
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

  const confirmPrediction = async () => {
    if (submitting) return;
    if (!market || !sheetSide) return;
    if (!user) { setAuthOpen(true); return; }
    const numericAmount = Number.parseFloat(amount) || 0;
    const numericPrice = Number.parseFloat(price) || 0;
    if (numericAmount <= 0) return toast.error("Enter an amount.");
    if (isOrderBook && (numericPrice <= 0 || numericPrice >= 100)) {
      return toast.error("Price must be between 1 and 99.");
    }
    const currentActivation = getMarketActivation(market);
    if (currentActivation.isProtected && numericAmount > currentActivation.requirements.protectedMaxStake) {
      return toast.error(`Protected markets are limited to ${formatNaira(currentActivation.requirements.protectedMaxStake)} per user until they go live.`);
    }
    setSubmitting(true);
    try {
      if (isOrderBook) {
        const result = await apiService.createOrder(market.id, {
          side: sheetSide, order_type: orderType, price: numericPrice, quantity: numericAmount,
        });
        setOrderJustPlaced(result);
        setJustPredicted(sheetSide);
        setShowConfetti(true);
        toast.success(`Order placed: ${result.order.status === "filled" ? "Fully filled" : result.order.status === "partial" ? "Partially matched" : "Waiting for match"}`);
        await refreshUser().catch(() => {});
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        const result = await apiService.placePrediction(market.id, {
          side: sheetSide, amount: numericAmount, currency: "NGN",
        });
        const historyResponse = await apiService.getMarketPriceHistory(market.id).catch(() => null);
        const updatedMarket = {
          ...result.market,
          priceHistory: historyResponse?.priceHistory?.length
            ? historyResponse.priceHistory
            : result.market.priceHistory,
        };
        setMarket(updatedMarket);
        upsertMarket(updatedMarket);
        refreshUser().catch((error) => console.warn("User refresh after trade failed", error));
        setJustPredicted(sheetSide);
        setShowConfetti(true);
        setAmount("");
        closeSheet();
        toast.success(`Trade placed: ${formatNaira(numericAmount)} on ${sheetSide}.`);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (error: any) {
      console.error("Order submit failed", error);
      toast.error(error.message || "Could not place order.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrderHandler = async (orderId: string) => {
    if (!market) return;
    try {
      await apiService.cancelOrder(market.id, orderId);
      setUserOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" as const } : o)));
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
  const numericPrice = Number.parseFloat(price) || 0;
  const slipDataMissing = Boolean(sheetSide && !Number.isFinite(Number(selectedPrice)));
  const tradingCloseTime = market.tradingCloseTime || market.closeTime;
  const hasTradingClosed = tradingCloseTime ? new Date(tradingCloseTime).getTime() <= now : false;
  const marketIsActive = market.status === "active" && !hasTradingClosed;
  const activation = getMarketActivation(market);
  const exceedsProtectedLimit = activation.isProtected && numericAmount > activation.requirements.protectedMaxStake;
  const estimatedReturn = numericAmount > 0 && selectedPrice ? (numericAmount / selectedPrice) * 100 : 0;
  const estimatedProfit = estimatedReturn - numericAmount;
  const estimatedShares = numericPrice > 0 ? numericAmount / numericPrice : 0;
  const openOrders = userOrders.filter((o) => ["waiting", "partial", "pending"].includes(o.status));

  return (
    <div className="app-bg min-h-screen pb-[calc(140px+env(safe-area-inset-bottom))] text-[#111827] md:pb-24 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:py-6">
        {/* ── Top Bar ── */}
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 text-xs font-bold text-[#6B7280] transition hover:text-[#111827]">
            <ArrowLeft className="h-3.5 w-3.5" />
            Markets
          </Link>
          <IconButton onClick={handleShare} icon={Share2} label="Share" />
        </div>
        {/* ── Market Header ── */}
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
                {market.status === "resolved" ? (
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
                <StatChip icon={Users} value={market.participants || 0} label="trading" />
                {isOrderBook ? (
                  <>
                    <StatChip icon={Layers} value={market.matched_volume || market.tradeCount || 0} label="matched" />
                    <StatChip icon={BarChart3} value={market.open_interest || 0} label="open orders" />
                  </>
                ) : (
                  <StatChip icon={BarChart3} value={market.tradeCount || 0} label="trades" />
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
                Peer-to-Peer
              </span>
            )}
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
        </section>
        {/* ── Price Chart ── */}
        <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#101828]">Price History</h2>
              <p className="mt-0.5 text-[10px] font-bold text-[#9CA3AF]">How YES and NO prices have moved over time</p>
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

        {/* ── Order Book ── */}
        {isOrderBook && orderBook && (
          <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#101828]">Order Book</h2>
                <p className="mt-0.5 text-[10px] font-bold text-[#9CA3AF]">Live buy and sell orders from other traders</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#12B886]" />
                  <span className="text-[10px] font-bold text-[#9CA3AF]">Bids</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#E85D5D]" />
                  <span className="text-[10px] font-bold text-[#9CA3AF]">Asks</span>
                </div>
              </div>
            </div>
            <div className="mb-2 grid grid-cols-3 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              <span>Price</span>
              <span className="text-center">Size</span>
              <span className="text-right">Orders</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#047857]">Bids (BUY)</div>
                {orderBook.bids.length === 0 ? (
                  <div className="py-3 text-center text-xs font-bold text-[#9CA3AF]">No bids</div>
                ) : (
                  <div className="space-y-0.5">
                    {orderBook.bids.slice(0, 6).map((level) => {
                      const maxQty = Math.max(...orderBook.bids.map((b) => b.total_quantity));
                      const depth = maxQty > 0 ? (level.total_quantity / maxQty) * 100 : 0;
                      return (
                        <div key={level.price} className="relative overflow-hidden rounded-lg bg-[#12B886]/[0.04] px-2.5 py-1.5 transition-all duration-300">
                          <div className="absolute inset-y-0 left-0 bg-[#12B886]/[0.08] transition-all duration-500" style={{ width: `${depth}%` }} />
                          <div className="relative flex items-center justify-between">
                            <span className="text-xs font-bold tabular-nums text-[#047857]">{formatNaira(level.price)}</span>
                            <span className="text-[10px] font-bold tabular-nums text-[#6B7280]">{level.total_quantity}</span>
                            <span className="text-[10px] font-bold tabular-nums text-[#9CA3AF]">{level.order_count}</span>
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
                  <div className="space-y-0.5">
                    {orderBook.asks.slice(0, 6).map((level) => {
                      const maxQty = Math.max(...orderBook.asks.map((a) => a.total_quantity));
                      const depth = maxQty > 0 ? (level.total_quantity / maxQty) * 100 : 0;
                      return (
                        <div key={level.price} className="relative overflow-hidden rounded-lg bg-[#E85D5D]/[0.04] px-2.5 py-1.5 transition-all duration-300">
                          <div className="absolute inset-y-0 right-0 bg-[#E85D5D]/[0.08] transition-all duration-500" style={{ width: `${depth}%` }} />
                          <div className="relative flex items-center justify-between">
                            <span className="text-xs font-bold tabular-nums text-[#B42318]">{formatNaira(level.price)}</span>
                            <span className="text-[10px] font-bold tabular-nums text-[#6B7280]">{level.total_quantity}</span>
                            <span className="text-[10px] font-bold tabular-nums text-[#9CA3AF]">{level.order_count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 items-center rounded-xl bg-[#F8F7F4] px-3 py-2.5 border border-[#E5E7EB]/60">
              <div className="text-center">
                <div className="text-[10px] font-bold text-[#9CA3AF]">Best Bid</div>
                <div className="mt-0.5 text-xs font-bold tabular-nums text-[#047857] transition-all duration-300">
                  {orderBook.best_bid ? formatNaira(orderBook.best_bid) : "—"}
                </div>
              </div>
              <div className="text-center border-x border-[#E5E7EB]/60 px-3">
                <div className="text-[10px] font-bold text-[#9CA3AF]">Spread</div>
                <div className="mt-0.5 text-xs font-bold tabular-nums text-[#4F46E5] transition-all duration-300">
                  {orderBook.spread != null ? formatNaira(orderBook.spread) : "—"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold text-[#9CA3AF]">Best Ask</div>
                <div className="mt-0.5 text-xs font-bold tabular-nums text-[#B42318] transition-all duration-300">
                  {orderBook.best_ask ? formatNaira(orderBook.best_ask) : "—"}
                </div>
              </div>
            </div>
          </section>
        )}
        {/* ── Recent Trades ── */}
        {isOrderBook && recentTrades.length > 0 && (
          <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#101828]">Recent Trades</h2>
              <span className="text-[10px] font-bold text-[#9CA3AF]">{recentTrades.length} trades</span>
            </div>
            <div className="mb-2 grid grid-cols-[auto_1fr_1fr_auto] items-center gap-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              <span>Side</span>
              <span>Price</span>
              <span>Qty</span>
              <span>Time</span>
            </div>
            <div className="space-y-0.5">
              {recentTrades.slice(0, 10).map((trade) => (
                <div key={trade.id} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-3 rounded-lg bg-[#F8F7F4]/80 px-3 py-2 transition-colors hover:bg-[#F3F4F6]">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${trade.side === "YES" ? "bg-[#12B886]/[0.1] text-[#047857]" : "bg-[#E85D5D]/[0.1] text-[#B42318]"}`}>
                    {trade.side}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-[#111827]">{formatNaira(trade.trade_price)}</span>
                  <span className="text-xs font-bold tabular-nums text-[#6B7280]">{trade.trade_quantity}</span>
                  <span className="text-[10px] tabular-nums text-[#9CA3AF]">{new Date(trade.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── User Open Orders ── */}
        {isOrderBook && openOrders.length > 0 && (
          <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#101828]">Open Orders</h2>
              <span className="text-[10px] font-bold text-[#9CA3AF]">{openOrders.length} active</span>
            </div>
            <div className="space-y-1.5">
              {openOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-xl bg-[#F8F7F4] px-3 py-2.5 border border-[#E5E7EB]/40">
                  <div className="flex items-center gap-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${order.side === "YES" ? "bg-[#12B886]/[0.1] text-[#047857]" : "bg-[#E85D5D]/[0.1] text-[#B42318]"}`}>
                      {order.side}
                    </span>
                    <span className="rounded-full bg-[#4F46E5]/10 px-2 py-0.5 text-[10px] font-bold text-[#4F46E5]">{order.order_type}</span>
                    <span className="text-xs font-bold tabular-nums text-[#111827]">{formatNaira(order.price)}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold tabular-nums text-[#9CA3AF]">
                      {order.filled_quantity}/{order.quantity}
                    </span>
                    {["waiting", "partial"].includes(order.status) && (
                      <button onClick={() => cancelOrderHandler(order.id)} className="rounded-lg bg-[#E85D5D]/[0.08] px-2.5 py-1 text-[10px] font-bold text-[#B42318] transition hover:bg-[#E85D5D]/[0.16]">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {/* ── Market Information ── */}
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
            title="Trading Timeline"
            expanded={!!expandedSections["timeline"]}
            onToggle={() => toggleSection("timeline")}
            border
          >
            <div className="space-y-3">
              <TimelineRow label="Market Created" value={market.createdAt || market.created_at || "—"} active={false} />
              <TimelineRow label="Trading Closes" value={tradingCloseTime || "—"} active={marketIsActive} highlight />
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
              After resolution, winning positions are settled at ₦100 per share. Losing positions are worth ₦0.
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

          {/* Order Matching Rules */}
          {isOrderBook && (
            <ExpandableSection
              icon={Layers}
              title="Order Matching Rules"
              expanded={!!expandedSections["matching"]}
              onToggle={() => toggleSection("matching")}
              border
              last
            >
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-[#475467]">
                  Orders are matched using price-time priority. The best-priced orders are filled first.
                  Orders at the same price are filled in the order they were received.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#12B886]" />
                    <span className="text-xs text-[#475467]">BUY orders are matched from highest bid to lowest</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E85D5D]" />
                    <span className="text-xs text-[#475467]">SELL orders are matched from lowest ask to highest</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4F46E5]" />
                    <span className="text-xs text-[#475467]">Partial fills are possible when order sizes differ</span>
                  </div>
                </div>
              </div>
            </ExpandableSection>
          )}

        </section>
      </main>
      {/* ── Sticky Action Bar ── */}
      <div className="fixed bottom-[calc(68px+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-[#E5E7EB]/60 bg-white/90 p-2.5 backdrop-blur-xl md:bottom-0 md:border-t md:bg-white/95 xl:left-64">
        <div className="mx-auto flex max-w-5xl gap-2">
          <div className="hidden flex-1 items-center justify-center gap-6 sm:flex">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">YES</span>
              <span className="text-sm font-bold tabular-nums text-[#047857]">{formatNairaPrice(market.yesPrice)}</span>
            </div>
            <div className="h-4 w-px bg-[#E5E7EB]" />
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">NO</span>
              <span className="text-sm font-bold tabular-nums text-[#B42318]">{formatNairaPrice(market.noPrice)}</span>
            </div>
          </div>
          <div className="flex flex-1 gap-2 sm:flex-none sm:w-[320px]">
            <button
              disabled={!marketIsActive}
              aria-label={`Trade YES at ${formatNairaPrice(market.yesPrice)}`}
              onClick={() => setSheetSide("YES")}
              className="group flex-1 h-12 rounded-xl bg-[#12B886] text-sm font-bold text-white transition-all duration-150 hover:bg-[#0ea371] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#D1D5DB] disabled:text-[#9CA3AF]"
            >
              <span className="flex items-center justify-center gap-1.5">
                <span className="hidden sm:inline">Trade</span> YES {formatNairaPrice(market.yesPrice)}
              </span>
            </button>
            <button
              disabled={!marketIsActive}
              aria-label={`Trade NO at ${formatNairaPrice(market.noPrice)}`}
              onClick={() => setSheetSide("NO")}
              className="group flex-1 h-12 rounded-xl bg-[#E85D5D] text-sm font-bold text-white transition-all duration-150 hover:bg-[#d94c4c] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#D1D5DB] disabled:text-[#9CA3AF]"
            >
              <span className="flex items-center justify-center gap-1.5">
                <span className="hidden sm:inline">Trade</span> NO {formatNairaPrice(market.noPrice)}
              </span>
            </button>
          </div>
        </div>
      </div>
      {/* ── Order Entry Sheet ── */}
      {sheetSide && (
        <div
          className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${sheetVisible ? "opacity-100" : "opacity-0"}`}
          onClick={() => !submitting && closeSheet()}
        >
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Place your order"
            className={`absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-3xl border border-[#E5E7EB] bg-white p-5 pb-[calc(90px+env(safe-area-inset-bottom))] text-[#111827] shadow-[0_-24px_80px_rgba(17,24,39,0.18)] transition-transform duration-300 ease-out md:left-auto md:right-6 md:top-24 md:h-fit md:w-[400px] md:rounded-2xl md:pb-5 ${sheetVisible ? "translate-y-0" : "translate-y-full"}`}
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header with accent bar */}
            <div className="mb-4">
              <div className={`mb-3 h-1 w-12 rounded-full ${sheetSide === "YES" ? "bg-[#12B886]" : "bg-[#E85D5D]"}`} />
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${sheetSide === "YES" ? "text-[#12B886]" : "text-[#E85D5D]"}`}>
                    Order Entry
                  </p>
                  <h2 className="mt-0.5 text-xl font-bold">
                    {isOrderBook ? "Place your order" : `Trading ${sheetSide}`}
                  </h2>
                </div>
                <button
                  onClick={closeSheet}
                  aria-label="Close order entry"
                  disabled={submitting}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {slipDataMissing ? (
              <div className="rounded-xl border border-[#E85D5D]/30 bg-[#E85D5D]/10 p-4 text-sm font-bold leading-relaxed text-[#B42318]">
                Unable to open order entry. Please try again.
              </div>
            ) : (
              <>
                {/* Order Type (Order Book Markets) */}
                {isOrderBook && (
                  <div className="mb-4">
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">What do you want to do?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setOrderType("BUY")} disabled={submitting} className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 text-xs font-bold transition ${orderType === "BUY" ? "border-[#12B886] bg-[#12B886]/[0.06] text-[#047857]" : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] hover:border-[#D1D5DB]"}`}>
                        Bet on Outcome
                      </button>
                      <button onClick={() => setOrderType("SELL")} disabled={submitting} className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 text-xs font-bold transition ${orderType === "SELL" ? "border-[#E85D5D] bg-[#E85D5D]/[0.06] text-[#B42318]" : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] hover:border-[#D1D5DB]"}`}>
                        Sell Shares
                      </button>
                    </div>
                    <p className="mt-1.5 text-[10px] font-bold text-[#9CA3AF]">
                      {orderType === "BUY" ? "Buy shares hoping the outcome wins. Each share pays ₦100 if correct." : "Sell shares you already own from a previous buy order."}
                    </p>
                  </div>
                )}

                {/* Side Indicator */}
                <div className={`mb-4 flex items-center gap-2 rounded-xl p-3 ${sheetSide === "YES" ? "bg-[#12B886]/[0.06] border border-[#12B886]/20" : "bg-[#E85D5D]/[0.06] border border-[#E85D5D]/20"}`}>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${sheetSide === "YES" ? "bg-[#12B886] text-white" : "bg-[#E85D5D] text-white"}`}>
                    {sheetSide}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-[#111827]">
                      {isOrderBook
                        ? `${orderType === "BUY" ? "Betting on" : "Selling"} ${sheetSide}`
                        : `Backing ${sheetSide}`
                      }
                    </div>
                    <div className="text-[10px] text-[#6B7280]">
                      {isOrderBook
                        ? `at up to ${formatNairaPrice(selectedPrice)} per share`
                        : <>If <strong>{sheetSide}</strong> wins, each share pays <strong>₦100</strong></>
                      }
                    </div>
                  </div>
                </div>

                {/* Price (Order Book Markets) */}
                {isOrderBook && (
                  <div className="mb-4">
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">Price per Share</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#6B7280]">NGN</span>
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
                    <p className="mt-1 text-[10px] font-bold text-[#9CA3AF]">
                      What you pay per share (1–99). Lower price = cheaper but may take longer to match.
                    </p>
                  </div>
                )}

                {/* Amount */}
                <div className="mb-3">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                    {isOrderBook ? "Number of Shares" : "Amount to Stake"}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#6B7280]">{isOrderBook ? "×" : "NGN"}</span>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      disabled={submitting}
                      placeholder="0"
                      className={`h-12 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] text-lg font-bold text-[#111827] placeholder:text-[#D1D5DB] focus:border-[#4F46E5] focus:ring-[#4F46E5]/20 ${isOrderBook ? "pl-9" : "pl-11"}`}
                    />
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="mb-4 grid grid-cols-4 gap-1.5">
                  {[100, 500, 1000, 2000].map((value) => (
                    <button
                      key={value}
                      onClick={() => setAmount(value.toString())}
                      disabled={submitting}
                      className={`rounded-xl border py-2.5 text-[11px] font-bold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${amount === value.toString() ? "border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5]" : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] hover:border-[#D1D5DB] hover:bg-white"}`}
                    >
                      {formatNaira(value)}
                    </button>
                  ))}
                </div>
                {/* Order Summary - Order Book */}
                {isOrderBook && numericAmount > 0 && numericPrice > 0 && (
                  <div className="mb-4 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6B7280]">Est. Shares</span>
                      <span className="text-sm font-bold tabular-nums text-[#101828]">{estimatedShares.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6B7280]">Price/Share</span>
                      <span className="text-sm font-bold tabular-nums text-[#101828]">{formatNaira(numericPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6B7280]">Total Cost</span>
                      <span className="text-sm font-bold tabular-nums text-[#101828]">{formatNaira(numericAmount)}</span>
                    </div>
                    <div className="border-t border-[#E5E7EB] pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#6B7280]">If {sheetSide} wins</span>
                        <span className="text-sm font-bold tabular-nums text-[#12B886]">
                          {orderType === "BUY" ? `Pays ${formatNaira(estimatedShares * 100)}` : `Sell for ${formatNaira(numericAmount)}`}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] font-bold text-[#9CA3AF]">
                        {orderType === "BUY" ? "Depends on order matching. Unmatched shares are refunded." : "You'll receive this amount from the buyer."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Order Summary - Market */}
                {!isOrderBook && numericAmount > 0 && selectedPrice && (
                  <div className="mb-4 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6B7280]">Shares You Get</span>
                      <span className="text-sm font-bold tabular-nums text-[#101828]">{(numericAmount / selectedPrice * 100).toFixed(1)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6B7280]">If {sheetSide} wins, pays</span>
                      <span className="text-sm font-bold tabular-nums text-[#12B886]">{formatNaira(numericAmount / selectedPrice * 100)}</span>
                    </div>
                    <p className="mt-2 text-[10px] font-bold leading-relaxed text-[#9CA3AF]">
                      This is an estimate. Actual payout depends on market resolution. If {sheetSide} loses, the stake is not returned.
                    </p>
                  </div>
                )}

                {/* Account Info */}
                <div className="mb-4 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-3.5">
                  <Row label="Balance" value={user ? formatNaira(user.balance || 0) : "Login required"} />
                  <Row label="Market Price" value={`YES ${formatNairaPrice(market.yesPrice)} / NO ${formatNairaPrice(market.noPrice)}`} />
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
                        Order is protected if market doesn&apos;t reach enough activity.
                      </p>
                    </button>
                  )}
                  {exceedsProtectedLimit && (
                    <p className="mt-2 text-[10px] font-bold text-[#B42318]">
                      Max {formatNaira(activation.requirements.protectedMaxStake)} per user.
                    </p>
                  )}
                </div>

                {/* What Happens Next */}
                <div className="mb-4 rounded-xl border border-[#4F46E5]/15 bg-[#4F46E5]/[0.03] p-3.5">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-[#4F46E5]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F46E5]">What happens next</span>
                  </div>
                  <ol className="space-y-1.5 text-[11px] leading-relaxed text-[#6B7280]">
                    {isOrderBook ? (
                      <>
                        <li className="flex items-start gap-1.5">
                          <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[#4F46E5]" />
                          Your funds are locked while the order is active
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[#4F46E5]" />
                          We search for matching orders from other traders
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[#4F46E5]" />
                          Once matched, your position is confirmed — track it in &ldquo;My Positions&rdquo;
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[#4F46E5]" />
                          If the market closes before matching, your funds are refunded
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-start gap-1.5">
                          <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[#4F46E5]" />
                          Your stake is placed immediately on the {sheetSide} side
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[#4F46E5]" />
                          Track your position in &ldquo;My Positions&rdquo;
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[#4F46E5]" />
                          When the market resolves, winners receive ₦100 per share
                        </li>
                      </>
                    )}
                  </ol>
                </div>

                {/* Submit */}
                <Button
                  onClick={confirmPrediction}
                  disabled={submitting || numericAmount <= 0 || exceedsProtectedLimit || (isOrderBook && (numericPrice <= 0 || numericPrice >= 100))}
                  className={`h-12 w-full rounded-xl text-sm font-bold shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98] disabled:shadow-none ${sheetSide === "YES" ? "bg-[#12B886] text-white shadow-[#12B886]/20 hover:bg-[#0ea371]" : "bg-[#E85D5D] text-white shadow-[#E85D5D]/20 hover:bg-[#d94c4c]"}`}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUp className="mr-2 h-4 w-4" />
                  )}
                  {user
                    ? isOrderBook
                      ? orderType === "BUY" ? "Place Bet" : "Place Sell Order"
                      : "Place Trade"
                    : "Login to Trade"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      {/* ── Order Placed Success Modal ── */}
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
                {orderJustPlaced?.order.status === "filled" ? (
                  <CheckCircle className="h-8 w-8" />
                ) : orderJustPlaced?.order.status === "partial" ? (
                  <Zap className="h-8 w-8" />
                ) : orderJustPlaced?.order.status === "waiting" ? (
                  <Clock className="h-8 w-8" />
                ) : (
                  <CheckCircle className="h-8 w-8" />
                )}
              </div>
            </div>

            <h3 className="text-2xl font-black text-[#101828]">
              {orderJustPlaced
                ? orderJustPlaced.order.status === "filled"
                  ? "Order Fully Matched"
                  : orderJustPlaced.order.status === "partial"
                    ? "Partially Matched"
                    : "Order Placed"
                : `Trade Placed on ${justPredicted}`}
            </h3>

            {orderJustPlaced ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-bold text-[#6B7280]">
                  <span className={justPredicted === "YES" ? "text-[#047857]" : "text-[#B42318]"}>{orderJustPlaced.order.side}</span>
                  {" "}
                  {orderJustPlaced.order.order_type === "BUY" ? "Bet on" : "Sell"} at {formatNaira(orderJustPlaced.order.price)}
                </p>
                <div className="mx-auto w-fit rounded-lg bg-[#F8F7F4] px-3 py-2">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-[10px] font-bold uppercase text-[#9CA3AF]">Shares</div>
                      <div className="text-sm font-bold tabular-nums text-[#111827]">{orderJustPlaced.order.quantity}</div>
                    </div>
                    <div className="h-6 w-px bg-[#E5E7EB]" />
                    <div className="text-center">
                      <div className="text-[10px] font-bold uppercase text-[#9CA3AF]">Matched</div>
                      <div className="text-sm font-bold tabular-nums text-[#111827]">{orderJustPlaced.order.filled_quantity}</div>
                    </div>
                    <div className="h-6 w-px bg-[#E5E7EB]" />
                    <div className="text-center">
                      <div className="text-[10px] font-bold uppercase text-[#9CA3AF]">Status</div>
                      <div className={`text-sm font-bold ${orderJustPlaced.order.status === "filled" ? "text-[#12B886]" : orderJustPlaced.order.status === "partial" ? "text-[#F59E0B]" : "text-[#4F46E5]"}`}>
                        {orderJustPlaced.order.status === "filled" ? "Matched" : orderJustPlaced.order.status === "partial" ? "Partial" : "Waiting"}
                      </div>
                    </div>
                  </div>
                </div>
                {orderJustPlaced.order.status === "waiting" && (
                  <div className="rounded-lg bg-[#4F46E5]/[0.05] p-2.5">
                    <p className="text-[11px] font-bold leading-relaxed text-[#6B7280]">
                      Your order is waiting for a matching trader. Funds are locked until matched or the market closes. You can cancel anytime.
                    </p>
                  </div>
                )}
                {orderJustPlaced.order.status === "partial" && (
                  <div className="rounded-lg bg-[#F59E0B]/[0.05] p-2.5">
                    <p className="text-[11px] font-bold leading-relaxed text-[#6B7280]">
                      {orderJustPlaced.order.filled_quantity} of {orderJustPlaced.order.quantity} shares matched. Remaining shares will be matched as orders arrive.
                    </p>
                  </div>
                )}
                {orderJustPlaced.order.status === "filled" && (
                  <div className="rounded-lg bg-[#12B886]/[0.05] p-2.5">
                    <p className="text-[11px] font-bold leading-relaxed text-[#6B7280]">
                      All shares matched! Your position is confirmed. Track it in &ldquo;My Positions&rdquo;.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-bold text-[#6B7280]">
                  You backed <span className={justPredicted === "YES" ? "text-[#047857]" : "text-[#B42318]"}>{justPredicted}</span> with {formatNaira(Number.parseFloat(amount) || 0)}
                </p>
                <div className="rounded-lg bg-[#4F46E5]/[0.05] p-2.5">
                  <p className="text-[11px] font-bold leading-relaxed text-[#6B7280]">
                    Your position is active. When the market resolves, {justPredicted} side wins get ₦100 per share. Track it in &ldquo;My Positions&rdquo;.
                  </p>
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-[#9CA3AF]">
              {orderJustPlaced ? "Track your order status below" : "Track in My Positions"}
            </p>

            <div className="mt-6 grid gap-2">
              <Link
                to={orderJustPlaced ? "/orders" : "/positions"}
                onClick={() => { setJustPredicted(null); setShowConfetti(false); }}
                className="flex h-11 items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-bold text-white shadow-lg shadow-[#4F46E5]/20 transition hover:bg-[#4338CA]"
              >
                {orderJustPlaced ? "View Orders" : "View Position"}
              </Link>
              <button
                onClick={() => { setJustPredicted(null); setShowConfetti(false); }}
                className="h-11 rounded-xl border border-[#E5E7EB] bg-white text-sm font-bold text-[#344054] transition hover:bg-[#F3F4F6]"
              >
                Continue Trading
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

  const chartData = useMemo<ChartData<"line">>(() => {
    const labels = filteredHistory.map((point) => formatAxisTime(point.time, timeframe));
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
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
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
            label: (item) => `${item.dataset.label}: ${formatNairaPrice(Number(item.raw || 0))}`,
            afterBody: (items) => {
              const point = filteredHistory[items[0]?.dataIndex ?? 0];
              if (!point) return [];
              return [
                `Volume: ${formatNaira(point.volume || 0)}`,
                `Trades: ${point.tradeCount || 0}`,
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
        <div className="grid h-[220px] place-items-center rounded-xl border border-dashed border-[#D1D5DB] bg-[#F8F7F4]/60 p-4 text-center sm:h-[280px]">
          <div>
            <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-[#F3F4F6]">
              <TrendingUp className="h-4 w-4 text-[#9CA3AF]" />
            </div>
            <p className="text-sm font-bold text-[#111827]">No movement yet</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">Updates when people trade YES or NO</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-3">
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
    <span className={`text-xs font-bold ${highlight ? "text-[#4F46E5]" : "text-[#111827]"}`}>{value}</span>
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

const MetaRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between border-b border-[#F3F4F6] py-2 last:border-0">
    <span className="text-xs text-[#9CA3AF]">{label}</span>
    <span className="text-xs font-bold text-[#111827]">{value}</span>
  </div>
);

const ExternalLink = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const AlertTriangle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
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
