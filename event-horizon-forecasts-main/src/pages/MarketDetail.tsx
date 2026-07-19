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
  HelpCircle,
  Loader2,
  Share2,
  Shield,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [submitting, setSubmitting] = useState(false);
  const [justPredicted, setJustPredicted] = useState<"YES" | "NO" | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("24H");
  const [now, setNow] = useState(Date.now());
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [protectedInfoExpanded, setProtectedInfoExpanded] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const marketsRef = useRef(markets);
  const marketRef = useRef<Market | null>(null);
  const latestLoadRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

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

  const closeSheet = () => {
    setSheetVisible(false);
    setTimeout(() => setSheetSide(null), 300);
  };

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
    if (numericAmount <= 0) return toast.error("Enter an amount.");
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
    } catch (error: any) {
      console.error("Prediction submit failed", error);
      toast.error(error.message || "Could not save prediction.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !market) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4">
          <DelayedFlippeLoader active label="Loading market" />
        </main>
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
    <div className="app-bg min-h-screen pb-[calc(150px+env(safe-area-inset-bottom))] text-[#111827] md:pb-24 xl:pl-64">
      <Header />
      <main
        className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:py-6"
        data-now={now}
      >
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-black text-[#6B7280] transition hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <div className="flex gap-2">
            <IconButton onClick={handleShare} icon={Share2} label="Share" />
          </div>
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="min-w-0">
            <section className="border-b border-[#E5E7EB] pb-6">
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="relative shrink-0">
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-[#12B886] via-[#4F46E5] to-[#E85D5D] opacity-60" />
                  <div className="relative h-20 w-20 overflow-hidden rounded-[14px] bg-[#F3F4F6] sm:h-24 sm:w-24">
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
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-black text-[#667085]">
                      {marketCategoryLabel}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${marketIsActive
                        ? activation.isProtected
                          ? "bg-[#EEF2FF] text-[#4F46E5]"
                          : "bg-[#12B886]/10 text-[#047857]"
                        : "bg-[#F3F4F6] text-[#667085]"
                      }`}
                    >
                      {marketIsActive
                        ? activation.isProtected
                          ? "Refund Protected"
                          : "Live"
                        : "Closed"}
                    </span>
                  </div>
                  <h1 className="text-3xl font-black leading-tight tracking-tight text-[#101828] sm:text-4xl">
                    {market.question}
                  </h1>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {!activation.isProtected && (
                  <>
                    <StatChip icon={Users} value={market.participants || 0} label="participants" />
                    <StatChip icon={BarChart3} value={market.tradeCount || 0} label="predictions" />
                  </>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs font-bold text-[#667085]">
                  <Clock className="h-3.5 w-3.5" />
                  {formatCountdown(tradingCloseTime, market.closesIn)} left
                </span>
              </div>

              {activation.isProtected && (
                <div className="mt-5 overflow-hidden rounded-2xl border border-[#C7D2FE] bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF]">
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#4F46E5] text-white">
                          <Shield className="h-4.5 w-4.5" />
                        </div>
                        <div className="text-sm font-black text-[#101828]">
                          Protected Market
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#4F46E5] shadow-sm">
                        Refund Protected
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs font-bold text-[#475467]">
                        <span>Progress</span>
                        <span className="font-black text-[#4F46E5]">
                          {Math.round(activation.progress)}%
                        </span>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] transition-all duration-500"
                          style={{ width: `${activation.progress}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs font-bold text-[#475467]">
                        {formatNaira(activation.totalPool)} /{" "}
                        {formatNaira(activation.requirements.totalPool)} activity
                      </p>
                    </div>

                    <p className="mt-3 text-sm font-bold leading-6 text-[#344054]">
                      You can predict now. If this market does not reach enough
                      activity before closing, your stake is refunded.
                    </p>
                  </div>

                  <button
                    onClick={() => setProtectedInfoExpanded(!protectedInfoExpanded)}
                    className="flex w-full items-center justify-between border-t border-[#C7D2FE] bg-white/60 px-4 py-3 text-xs font-bold text-[#4F46E5] transition hover:bg-white/80"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5" />
                      What does this mean?
                    </span>
                    {protectedInfoExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {protectedInfoExpanded && (
                    <div className="border-t border-[#C7D2FE] bg-white/40 px-4 py-3 text-xs font-bold leading-relaxed text-[#475467]">
                      <p className="mb-2">
                        A <strong>Protected Market</strong> means your stake is
                        safe even if the market doesn&apos;t get enough
                        participation.
                      </p>
                      <p className="mb-2">
                        When a market is protected, FLIPPE guarantees a refund
                        of your stake if the total activity remains below the
                        required threshold before the market closes.
                      </p>
                      <p>
                        This gives you confidence to participate early in new or
                        emerging markets without worrying about low-liquidity
                        risk.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="mt-8">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-[#101828]">
                    Crowd View movement
                  </h2>
                  <p className="mt-0.5 text-sm font-semibold text-[#667085]">
                    Crowd View moves as people back YES or NO.
                  </p>
                </div>
                <div className="flex w-fit rounded-full bg-[#F3F4F6] p-1">
                  {(["1H", "24H", "7D", "ALL"] as Timeframe[]).map((item) => (
                    <button
                      key={item}
                      onClick={() => setTimeframe(item)}
                      className={`rounded-full px-4 py-1.5 text-xs font-black transition-all duration-200 ${timeframe === item
                        ? "bg-white text-[#111827] shadow-sm"
                        : "text-[#667085] hover:text-[#101828]"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <Chart market={market} timeframe={timeframe} />
            </section>

            <section className="mt-8 border-t border-[#E5E7EB] pt-6">
              <button
                onClick={() => setRulesExpanded(!rulesExpanded)}
                className="flex w-full items-center justify-between text-left"
              >
                <h2 className="text-lg font-black text-[#101828]">
                  Rules & timeline
                </h2>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#F3F4F6] text-[#667085]">
                  {rulesExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${rulesExpanded ? "mt-3 max-h-[500px]" : "max-h-0"
                }`}
              >
                <p className="text-sm leading-7 text-[#667085]">
                  {market.rules ||
                    market.description ||
                    "This market resolves based on the stated outcome and admin review."}
                </p>
              </div>
              {!rulesExpanded && (
                <p className="mt-2 line-clamp-2 text-sm leading-7 text-[#667085]">
                  {market.rules ||
                    market.description ||
                    "This market resolves based on the stated outcome and admin review."}
                </p>
              )}
            </section>
          </div>
        </div>
      </main>

      <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-[#E5E7EB]/80 bg-[#F8F7F4]/80 p-2.5 backdrop-blur-xl md:bottom-0 md:border-t md:bg-[#F8F7F4]/90 xl:left-64">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3">
          <button
            disabled={!marketIsActive}
            onClick={() => setSheetSide("YES")}
            className="group relative h-12 overflow-hidden rounded-xl bg-gradient-to-r from-[#12B886] to-[#10B981] text-sm font-black text-white shadow-lg shadow-[#12B886]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#12B886]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Back YES {formatNairaPrice(market.yesPrice)}
            </span>
          </button>
          <button
            disabled={!marketIsActive}
            onClick={() => setSheetSide("NO")}
            className="group relative h-12 overflow-hidden rounded-xl bg-gradient-to-r from-[#E85D5D] to-[#DC4444] text-sm font-black text-white shadow-lg shadow-[#E85D5D]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#E85D5D]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Back NO {formatNairaPrice(market.noPrice)}
            </span>
          </button>
        </div>
      </div>

      {sheetSide && (
        <div
          className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${sheetVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => !submitting && closeSheet()}
        >
          <div
            ref={sheetRef}
            className={`absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-3xl border border-[#E5E7EB] bg-white p-5 pb-[calc(90px+env(safe-area-inset-bottom))] text-[#111827] shadow-[0_-24px_80px_rgba(17,24,39,0.18)] transition-transform duration-300 ease-out md:left-auto md:right-6 md:top-24 md:h-fit md:w-[380px] md:rounded-2xl md:pb-5 ${sheetVisible
              ? "translate-y-0"
              : "translate-y-full"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p
                  className={`text-xs font-black uppercase tracking-[0.16em] ${sheetSide === "YES"
                    ? "text-[#12B886]"
                    : "text-[#E85D5D]"
                  }`}
                >
                  Prediction slip
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  You picked {sheetSide}
                </h2>
              </div>
              <button
                onClick={closeSheet}
                disabled={submitting}
                className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-50"
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
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">
                  Amount
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#6B7280]">
                    NGN
                  </span>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    disabled={submitting}
                    placeholder="0"
                    className="h-14 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-12 text-lg font-black text-[#111827] placeholder:text-[#D1D5DB] focus:border-[#4F46E5] focus:ring-[#4F46E5]/20"
                  />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[100, 500, 1000, 2000].map((value) => (
                    <button
                      key={value}
                      onClick={() => setAmount(value.toString())}
                      disabled={submitting}
                      className={`rounded-xl border py-2.5 text-xs font-black transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${amount === value.toString()
                        ? "border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5]"
                        : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] hover:border-[#D1D5DB] hover:bg-white"
                      }`}
                    >
                      {formatNaira(value)}
                    </button>
                  ))}
                </div>

                {numericAmount > 0 && selectedPrice && (
                  <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-gradient-to-br from-[#F8F7F4] to-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6B7280]">
                        Estimated return
                      </span>
                      <span className="text-sm font-black text-[#101828]">
                        {formatNaira(estimatedReturn)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6B7280]">
                        Estimated profit
                      </span>
                      <span className="text-sm font-black text-[#12B886]">
                        +{formatNaira(estimatedProfit)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
                  <Row
                    label="Wallet balance"
                    value={
                      user ? formatNaira(user.balance || 0) : "Login required"
                    }
                  />
                  <Row
                    label="Crowd View"
                    value={`YES ${formatNairaPrice(market.yesPrice)} / NO ${formatNairaPrice(market.noPrice)}`}
                  />
                  {activation.isProtected && (
                    <div className="mt-4 rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-[#4F46E5]" />
                        <div className="text-sm font-black text-[#101828]">
                          Refund Protected
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-[#4F46E5]"
                          style={{ width: `${activation.progress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-bold text-[#475467]">
                        {formatNaira(activation.totalPool)} /{" "}
                        {formatNaira(activation.requirements.totalPool)}{" "}
                        activity
                      </p>
                      <p className="mt-2 text-xs font-bold leading-relaxed text-[#344054]">
                        Your stake is protected if this market does not reach
                        enough activity before closing.
                      </p>
                    </div>
                  )}
                  {activation.isProtected === false && (
                    <p className="mt-3 text-xs font-bold leading-relaxed text-[#6B7280]">
                      Returns may change as market activity changes.
                    </p>
                  )}
                  {exceedsProtectedLimit && (
                    <p className="mt-3 text-xs font-bold text-[#B42318]">
                      Protected markets are limited to{" "}
                      {formatNaira(activation.requirements.protectedMaxStake)}{" "}
                      per user until they go live.
                    </p>
                  )}
                </div>
                <Button
                  onClick={confirmPrediction}
                  disabled={
                    submitting || numericAmount <= 0 || exceedsProtectedLimit
                  }
                  className={`mt-5 h-12 w-full rounded-xl text-base font-black shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98] disabled:shadow-none ${sheetSide === "YES"
                    ? "bg-gradient-to-r from-[#12B886] to-[#10B981] text-white shadow-[#12B886]/25 hover:shadow-[#12B886]/35"
                    : "bg-gradient-to-r from-[#E85D5D] to-[#DC4444] text-white shadow-[#E85D5D]/25 hover:shadow-[#E85D5D]/35"
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUp className="mr-2 h-4 w-4" />
                  )}
                  {user ? `Confirm ${sheetSide}` : "Login to predict"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

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
          <div className="animate-fade-up relative w-full max-w-sm overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-[0_24px_90px_rgba(17,24,39,0.22)]">
            <div
              className={`absolute inset-x-0 top-0 h-1 ${justPredicted === "YES"
                ? "bg-gradient-to-r from-[#12B886] to-[#10B981]"
                : "bg-gradient-to-r from-[#E85D5D] to-[#DC4444]"
              }`}
            />
            <div
              className={`mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full text-white shadow-lg ${justPredicted === "YES"
                ? "bg-gradient-to-br from-[#12B886] to-[#10B981] shadow-[#12B886]/30"
                : "bg-gradient-to-br from-[#E85D5D] to-[#DC4444] shadow-[#E85D5D]/30"
              }`}
            >
              <CheckCircle className="h-11 w-11" />
            </div>
            <h3 className="text-3xl font-black text-[#101828]">
              Prediction Locked
            </h3>
            <p className="mt-3 text-base font-black text-[#101828]">
              You backed {justPredicted}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#475467]">
              Track this prediction in My Predictions.
            </p>
            <div className="mt-7 grid gap-3">
              <Link
                to="/portfolio"
                onClick={() => {
                  setJustPredicted(null);
                  setShowConfetti(false);
                }}
                className="flex h-12 items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-black text-white shadow-lg shadow-[#4F46E5]/25 transition hover:bg-[#4338CA] hover:shadow-xl"
              >
                View Prediction
              </Link>
              <button
                onClick={() => {
                  setJustPredicted(null);
                  setShowConfetti(false);
                }}
                className="h-12 rounded-xl border border-[#E5E7EB] bg-white text-sm font-black text-[#344054] transition hover:bg-[#F3F4F6]"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

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
          borderWidth: 3,
          pointRadius: filteredHistory.length === 1 ? 4 : 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#12B886",
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 3,
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
          borderWidth: 2.4,
          pointRadius: filteredHistory.length === 1 ? 4 : 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#E85D5D",
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 3,
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
      animation: {
        duration: 600,
        easing: "easeOutQuart",
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          displayColors: true,
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          borderColor: "#E5E7EB",
          borderWidth: 1,
          titleColor: "#101828",
          bodyColor: "#344054",
          footerColor: "#6B7280",
          padding: { top: 12, bottom: 12, left: 14, right: 14 },
          cornerRadius: 14,
          boxPadding: 6,
          titleFont: { size: 12, weight: 800 },
          bodyFont: { size: 11, weight: 600 },
          footerFont: { size: 10, weight: 600 },
          callbacks: {
            title: (items) => {
              const point =
                filteredHistory[items[0]?.dataIndex ?? 0];
              return point ? formatChartTime(point.timestamp) : "";
            },
            label: (item) =>
              `${item.dataset.label}: ${formatNairaPrice(Number(item.raw || 0))}`,
            afterBody: (items) => {
              const point =
                filteredHistory[items[0]?.dataIndex ?? 0];
              if (!point) return [];
              const rows = [
                `Total pool: ${formatNaira(point.volume || 0)}`,
                `Predictions: ${point.tradeCount || 0}`,
              ];
              if (point.side && Number(point.amount || 0) > 0) {
                rows.push(
                  `Last: ${point.side} ${formatNaira(point.amount || 0)}`
                );
              }
              return rows;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
          ticks: {
            color: "rgba(139,152,168,0.82)",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 5,
            font: {
              size: 10,
              weight: 700,
            },
          },
        },
        y: {
          min: 0,
          max: 100,
          position: "right",
          grid: {
            color: "rgba(148,163,184,0.08)",
          },
          border: {
            display: false,
          },
          ticks: {
            stepSize: 25,
            color: "rgba(139,152,168,0.82)",
            callback: (value) => `${value}`,
            font: {
              size: 10,
              weight: 800,
            },
          },
        },
      },
    }),
    [filteredHistory]
  );

  const emptyHistory = savedHistory.length === 0;
  const hasOnePoint = savedHistory.length === 1;
  const hasMovement = savedHistory.length > 1;
  const currentYes = clampCrowdValue(Number(market.yesPrice || 50));
  const currentNo = clampCrowdValue(100 - currentYes);

  if (emptyHistory) {
    return (
      <div className="bg-transparent">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#12B886]/10 px-3 py-1.5 text-xs font-black text-[#12B886]">
              <span className="h-2 w-2 rounded-full bg-[#12B886]" />
              YES {formatNairaPrice(currentYes)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E85D5D]/10 px-3 py-1.5 text-xs font-black text-[#E85D5D]">
              <span className="h-2 w-2 rounded-full bg-[#E85D5D]" />
              NO {formatNairaPrice(currentNo)}
            </span>
          </div>
          <span className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs font-bold text-[#6B7280]">
            {market.tradeCount || 0} predictions
          </span>
        </div>
        <div className="grid h-[260px] place-items-center rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-6 text-center sm:h-[320px]">
          <div>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#F3F4F6]">
              <TrendingUp className="h-5 w-5 text-[#9CA3AF]" />
            </div>
            <p className="text-sm font-black text-[#111827]">
              No movement yet.
            </p>
            <p className="mt-1.5 max-w-sm text-sm font-bold leading-relaxed text-[#6B7280]">
              Crowd View updates when people back YES or NO.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-transparent">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#12B886]/10 px-3 py-1.5 text-xs font-black text-[#12B886]">
            <span className="h-2 w-2 rounded-full bg-[#12B886]" />
            YES {formatNairaPrice(market.yesPrice)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E85D5D]/10 px-3 py-1.5 text-xs font-black text-[#E85D5D]">
            <span className="h-2 w-2 rounded-full bg-[#E85D5D]" />
            NO {formatNairaPrice(market.noPrice)}
          </span>
        </div>
        <span className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs font-bold text-[#6B7280]">
          {market.tradeCount || 0} predictions
        </span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#667085]">Current YES price</p>
            <p className="text-2xl font-black text-[#101828]">
              {formatNairaPrice(market.yesPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-[#667085]">Current NO price</p>
            <p className="text-2xl font-black text-[#101828]">
              {formatNairaPrice(market.noPrice)}
            </p>
          </div>
        </div>
        <div className="h-[290px] w-full sm:h-[380px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#6B7280]">
        <span>
          {hasMovement
            ? "Crowd View history from saved predictions."
            : hasOnePoint
              ? "One saved prediction so far."
              : "Crowd View updates when people back YES or NO."}
        </span>
        <span>
          YES {formatNairaPrice(market.yesPrice)} / NO{" "}
          {formatNairaPrice(market.noPrice)}
        </span>
      </div>
    </div>
  );
};

const StatChip = ({
  icon: Icon,
  value,
  label,
}: {
  icon: any;
  value: number;
  label: string;
}) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#667085] shadow-sm border border-[#E5E7EB]">
    <Icon className="h-3.5 w-3.5" />
    <span className="font-black text-[#111827]">{value.toLocaleString()}</span>
    {label}
  </span>
);

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

const Row = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div className="flex items-center justify-between border-b border-[#E5E7EB] py-2.5 last:border-0">
    <span className="text-sm font-bold text-[#6B7280]">{label}</span>
    <span
      className={`text-sm font-black ${highlight ? "text-[#4F46E5]" : "text-[#111827]"}`}
    >
      {value}
    </span>
  </div>
);

const IconButton = ({
  icon: Icon,
  onClick,
  active = false,
  label,
}: {
  icon: any;
  onClick: () => void;
  active?: boolean;
  label: string;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`grid h-10 w-10 place-items-center rounded-xl border transition ${active
      ? "border-[#4F46E5]/40 bg-[#EEF2FF] text-[#4F46E5]"
      : "border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F8F7F4]"
    }`}
  >
    <Icon className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
  </button>
);
