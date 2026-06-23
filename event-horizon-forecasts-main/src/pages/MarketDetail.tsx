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
import { ArrowLeft, BarChart3, CheckCircle, Clock, Loader2, Share2, TrendingUp, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiService, { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMarketState } from "@/lib/market-state";
import { formatCountdown, formatNaira, formatNairaPrice, getMarketCategoryLabel, getMarketMedia, isMarketPredictable, type Market } from "@/lib/markets";
import { categoryMatches } from "@/lib/categories";

type Timeframe = "1H" | "24H" | "7D" | "ALL";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, ChartTooltip, Legend);

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
  const [apiRelatedMarkets, setApiRelatedMarkets] = useState<Market[]>([]);
  const [now, setNow] = useState(Date.now());
  const marketsRef = useRef(markets);
  const marketRef = useRef<Market | null>(null);
  const latestLoadRef = useRef(0);

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
    const readCachedMarket = () => marketsRef.current.find((item) => item.id === id);
    setApiRelatedMarkets([]);

    const loadMarket = async () => {
      if (!marketRef.current || marketRef.current.id !== id) {
        setLoading(true);
      }
      try {
        const cached = readCachedMarket();
        if (cached && (!marketRef.current || marketRef.current.id !== id)) {
          setMarket(cached);
        }
        const [response, historyResponse, relatedResponse] = await Promise.all([
          apiService.getMarket(id),
          apiService.getMarketPriceHistory(id).catch(() => null),
          apiService.getRelatedMarkets(id).catch(() => null),
        ]);
        if (latestLoadRef.current !== loadId) return;
        const enrichedMarket = {
          ...response.market,
          priceHistory: historyResponse?.priceHistory?.length
            ? historyResponse.priceHistory
            : response.market.priceHistory,
        };
        setMarket(enrichedMarket);
        setApiRelatedMarkets(relatedResponse?.markets || []);
        upsertMarket(enrichedMarket);
      } catch (error: any) {
        if (latestLoadRef.current !== loadId) return;
        const cached = readCachedMarket();
        if (cached) {
          if (!marketRef.current || marketRef.current.id !== id) {
            setMarket(cached);
          }
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

  const marketCategoryLabel = market ? getMarketCategoryLabel(market) : "Other";
  const relatedMarkets = useMemo(
    () =>
      (apiRelatedMarkets.length ? apiRelatedMarkets : markets)
        .filter(
          (item) =>
            item.id !== market?.id &&
            categoryMatches(item.category, marketCategoryLabel) &&
            isMarketPredictable(item, now)
        )
        .slice(0, 3),
    [apiRelatedMarkets, marketCategoryLabel, market?.id, markets, now]
  );

  const handleShare = async () => {
    if (!market) return;
    const media = getMarketMedia(market);
    const url = `${window.location.origin}/market/${market.id}`;
    const timeLeft = formatCountdown(market.tradingCloseTime || market.closeTime, market.closesIn);
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

    setSubmitting(true);
    try {
      const result = await apiService.placePrediction(market.id, { side: sheetSide, amount: numericAmount, currency: "NGN" });
      const historyResponse = await apiService.getMarketPriceHistory(market.id).catch(() => null);
      const updatedMarket = {
        ...result.market,
        priceHistory: historyResponse?.priceHistory?.length ? historyResponse.priceHistory : result.market.priceHistory,
      };
      setMarket(updatedMarket);
      upsertMarket(updatedMarket);
      refreshUser().catch((error) => console.warn("User refresh after prediction failed", error));
      setJustPredicted(sheetSide);
      setAmount("");
      setSheetSide(null);
      toast.success(`Prediction saved: ${sheetSide} with ${formatNaira(numericAmount)}.`);
    } catch (error: any) {
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
  const oppositeStake = sheetSide === "YES" ? market.noVolume || market.noPool || 0 : market.yesVolume || market.yesPool || 0;
  const slipDataMissing = Boolean(sheetSide && !Number.isFinite(Number(selectedPrice)));
  const tradingCloseTime = market.tradingCloseTime || market.closeTime;
  const hasTradingClosed = tradingCloseTime ? new Date(tradingCloseTime).getTime() <= now : false;
  const marketIsActive = market.status === "active" && !hasTradingClosed;
  const totalShares = Number(market.totalYesShares || 0) + Number(market.totalNoShares || 0);
  const yesSideShare = totalShares > 0 ? (Number(market.totalYesShares || 0) / totalShares) * 100 : 50;
  const noSideShare = 100 - yesSideShare;
  const recentTrades = [...(market.priceHistory || [])]
    .filter((point) => point.side && Number(point.amount || 0) > 0)
    .slice(-5)
    .reverse();

  return (
    <div className="app-bg min-h-screen pb-[calc(150px+env(safe-area-inset-bottom))] text-[#111827] md:pb-24 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:py-6" data-now={now}>
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-black text-[#6B7280] transition hover:text-[#111827]">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <div className="flex gap-2">
            <IconButton onClick={handleShare} icon={Share2} label="Share" />
          </div>
        </div>

        <article className="overflow-hidden rounded-[1.1rem] bg-white shadow-[0_12px_34px_rgba(16,24,40,0.08)]">
          <div className="relative h-[210px] overflow-hidden rounded-t-[1.1rem] sm:h-[250px] lg:h-[280px]">
            {media.type === "video" ? (
              <video src={media.src} poster={media.poster} className="absolute inset-0 h-full w-full object-cover" muted playsInline loop autoPlay />
            ) : (
              <img src={media.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.15), transparent)",
              }}
            />
            <div className="absolute inset-x-0 top-0 flex flex-wrap items-center gap-2 p-4 sm:p-5">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#101828] shadow-sm">{marketCategoryLabel}</span>
              <span className={`rounded-full border px-3 py-1 text-xs font-black shadow-sm ${marketIsActive ? "border-[#12B886]/70 bg-[#047857] text-white" : "border-white/30 bg-black/50 text-white"}`}>{marketIsActive ? "Live" : "Ended"}</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <h1 className="max-w-4xl text-2xl font-black leading-tight tracking-tight text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.75)] sm:text-3xl lg:text-4xl">{market.question}</h1>
            </div>
          </div>
          <div className="rounded-b-[1.1rem] bg-[#050505] px-4 py-3 text-white sm:px-5 sm:py-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-black text-white sm:text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0 text-white/80" />
                <span>{market.participants} participants</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 shrink-0 text-white/80" />
                {market.tradeCount || 0} predictions
              </div>
              <div>
                {formatNaira(market.totalPool)} total predicted
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-white/80" />
                <span>{formatCountdown(tradingCloseTime, market.closesIn)} left</span>
              </div>
            </div>
          </div>
        </article>

        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Crowd View movement</h2>
              <p className="text-xs font-bold text-[#6B7280]">Crowd View moves as people back YES or NO.</p>
            </div>
            <div className="flex rounded-full border border-[#E5E7EB] bg-[#F8F7F4] p-1">
              {(["1H", "24H", "7D", "ALL"] as Timeframe[]).map((item) => (
                <button key={item} onClick={() => setTimeframe(item)} className={`rounded-full px-3 py-1 text-xs font-black ${timeframe === item ? "bg-[#4F46E5] text-white" : "text-[#6B7280]"}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <Chart market={market} timeframe={timeframe} />
        </section>

        <section className="mt-7 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-black">Crowd View</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              {market.yesPrice >= market.noPrice ? "The crowd currently favors YES." : "The crowd currently favors NO."} This changes as people back each side.
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#E85D5D]/20">
              <div className="h-full bg-[#12B886]" style={{ width: `${yesSideShare}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.12em] text-[#6B7280]">YES</div>
                <div className="mt-1 text-2xl font-black text-[#12B886]">{formatNairaPrice(market.yesPrice)}</div>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.12em] text-[#6B7280]">NO</div>
                <div className="mt-1 text-2xl font-black text-[#E85D5D]">{formatNairaPrice(market.noPrice)}</div>
              </div>
            </div>
            <p className="mt-3 text-xs font-bold leading-relaxed text-[#6B7280]">
              If your side is correct, you receive your stake plus a share of the losing side's pool.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-black">Recent predictions</h2>
            <div className="mt-3 divide-y divide-[#E5E7EB]">
              {recentTrades.length ? recentTrades.map((trade) => (
                <div key={`${trade.timestamp}-${trade.side}-${trade.amount}`} className="flex items-center justify-between py-3 text-xs">
                  <span className={`font-black ${trade.side === "YES" ? "text-[#12B886]" : "text-[#E85D5D]"}`}>Backed {trade.side}</span>
                  <span className="text-[#6B7280]">{formatNaira(Number(trade.amount || 0))}</span>
                </div>
              )) : (
                <p className="text-sm text-[#6B7280]">Recent predictions appear after people join.</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 border-t border-[#E5E7EB] pt-6">
          <h2 className="text-lg font-black">Rules</h2>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">{market.rules || market.description || "This market resolves based on the stated outcome and admin review."}</p>
        </section>

        {relatedMarkets.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-3 text-lg font-black">Related markets</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {relatedMarkets.map((item) => (
                <Link key={item.id} to={`/market/${item.id}`} className="rounded-xl border border-[#E5E7EB] bg-white p-4 transition hover:border-[#4F46E5]/35 hover:bg-[#F8F7F4]">
                  <div className="text-xs font-black text-[#4F46E5]">{getMarketCategoryLabel(item)}</div>
                  <div className="mt-1 line-clamp-2 text-sm font-black">{item.question}</div>
                  <div className="mt-3 text-xs font-black text-slate-500">YES {formatNairaPrice(item.yesPrice)} · NO {formatNairaPrice(item.noPrice)}</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-[#E5E7EB] bg-[#F8F7F4]/92 p-2.5 backdrop-blur-xl md:bottom-0 xl:left-64">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3">
          <button disabled={!marketIsActive} onClick={() => setSheetSide("YES")} className="h-11 rounded-xl bg-[#12B886] text-sm font-black text-[#06100d] shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">
            Back YES {formatNairaPrice(market.yesPrice)}
          </button>
          <button disabled={!marketIsActive} onClick={() => setSheetSide("NO")} className="h-11 rounded-xl bg-[#E85D5D] text-sm font-black text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">
            Back NO {formatNairaPrice(market.noPrice)}
          </button>
        </div>
      </div>

      {sheetSide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && setSheetSide(null)}>
          <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border border-[#E5E7EB] bg-white p-5 pb-[calc(90px+env(safe-area-inset-bottom))] text-[#111827] shadow-[0_-24px_80px_rgba(17,24,39,0.18)] md:left-auto md:right-6 md:top-24 md:h-fit md:w-[380px] md:rounded-2xl md:pb-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.16em] ${sheetSide === "YES" ? "text-[#12B886]" : "text-[#E85D5D]"}`}>
                  Prediction slip
                </p>
                <h2 className="mt-1 text-2xl font-black">You picked {sheetSide}</h2>
              </div>
              <button onClick={() => setSheetSide(null)} disabled={submitting} className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] disabled:cursor-not-allowed disabled:opacity-50">
                <X className="h-4 w-4" />
              </button>
            </div>
            {slipDataMissing ? (
              <div className="rounded-xl border border-[#E85D5D]/30 bg-[#E85D5D]/10 p-4 text-sm font-bold leading-relaxed text-[#B42318]">
                Unable to open prediction slip. Please try again.
              </div>
            ) : (
              <>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">Amount</label>
                <Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={submitting} placeholder="0" className="h-13 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] text-lg font-black text-[#111827] placeholder:text-[#6B7280]" />
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[100, 500, 1000, 5000].map((value) => (
                    <button key={value} onClick={() => setAmount(value.toString())} disabled={submitting} className="h-10 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-xs font-black text-[#6B7280] disabled:cursor-not-allowed disabled:opacity-50">
                      {formatNaira(value)}
                    </button>
                  ))}
                </div>
                <div className="mt-5 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
                  <Row label="Wallet balance" value={user ? formatNaira(user.balance || 0) : "Login required"} />
                  <Row label="Crowd View" value={formatNairaPrice(selectedPrice)} />
                  <Row label="Total Pool" value={formatNaira(market.totalPool || market.totalVolume || 0)} />
                  <Row label="Opposing Pool" value={formatNaira(oppositeStake)} highlight />
                  <Row label="Market participants" value={`${market.participants || 0}`} />
                  <p className="mt-3 text-xs font-bold leading-relaxed text-[#6B7280]">
                    Final payout depends on the result and the final pool when the market closes.
                  </p>
                </div>
                <Button onClick={confirmPrediction} disabled={submitting || numericAmount <= 0} className={`mt-5 h-12 w-full rounded-xl text-base font-black ${sheetSide === "YES" ? "bg-[#12B886] text-[#06100d] hover:bg-[#2dd4a0]" : "bg-[#E85D5D] text-[#111827] hover:bg-[#f07575]"}`}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                  {user ? `Back ${sheetSide}` : "Login to predict"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {justPredicted && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]">
          <div className="animate-fade-up w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-[0_24px_90px_rgba(17,24,39,0.22)]">
            <div className={`mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full text-white shadow-[0_18px_44px_rgba(16,24,40,0.16)] ${justPredicted === "YES" ? "bg-[#12B886]" : "bg-[#E85D5D]"}`}>
              <CheckCircle className="h-11 w-11" />
            </div>
            <h3 className="text-3xl font-black text-[#101828]">Prediction Locked</h3>
            <p className="mt-3 text-base font-black text-[#101828]">You backed {justPredicted}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#475467]">Track this prediction in My Predictions.</p>
            <div className="mt-7 grid gap-3">
              <Link to="/portfolio" onClick={() => setJustPredicted(null)} className="flex h-12 items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-black text-white transition hover:bg-[#4338CA]">
                View Prediction
              </Link>
              <button onClick={() => setJustPredicted(null)} className="h-12 rounded-xl border border-[#E5E7EB] bg-white text-sm font-black text-[#344054] transition hover:bg-[#F3F4F6]">
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
}

const Chart = ({ market, timeframe }: { market: Market; timeframe: Timeframe }) => {
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
    const previous = savedHistory
      .slice()
      .reverse()
      .find((point) => point.time < latest.time);
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
          backgroundColor: "rgba(18,184,134,0.12)",
          borderWidth: 3,
          pointRadius: filteredHistory.length === 1 ? 4 : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: "#12B886",
          pointBorderColor: "#08111f",
          pointBorderWidth: 2,
          tension: 0.38,
          fill: false,
        },
        {
          label: "NO",
          data: filteredHistory.map((point) => point.noPrice),
          borderColor: "#E85D5D",
          backgroundColor: "rgba(232,93,93,0.10)",
          borderWidth: 2.4,
          pointRadius: filteredHistory.length === 1 ? 4 : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: "#E85D5D",
          pointBorderColor: "#08111f",
          pointBorderWidth: 2,
          tension: 0.38,
          fill: false,
        },
      ],
    };
  }, [filteredHistory, timeframe]);

  const chartOptions = useMemo<ChartOptions<"line">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 550,
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
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          title: (items) => {
            const point = filteredHistory[items[0]?.dataIndex ?? 0];
            return point ? formatChartTime(point.timestamp) : "";
          },
          label: (item) => `${item.dataset.label}: ${formatNairaPrice(Number(item.raw || 0))}`,
          afterBody: (items) => {
            const point = filteredHistory[items[0]?.dataIndex ?? 0];
            if (!point) return [];
            const rows = [
              `Total pool: ${formatNaira(point.volume || 0)}`,
              `Predictions: ${point.tradeCount || 0}`,
            ];
            if (point.side && Number(point.amount || 0) > 0) {
              rows.push(`Last: ${point.side} ${formatNaira(point.amount || 0)}`);
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
          color: "rgba(148,163,184,0.12)",
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
  }), [filteredHistory]);

  const emptyHistory = savedHistory.length === 0;
  const hasOnePoint = savedHistory.length === 1;
  const hasMovement = savedHistory.length > 1;
  const currentYes = clampCrowdValue(Number(market.yesPrice || 50));
  const currentNo = clampCrowdValue(100 - currentYes);

  if (emptyHistory) {
    return (
      <div className="bg-transparent">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#12B886]"><span className="h-2 w-2 rounded-full bg-[#12B886]" />YES {formatNairaPrice(currentYes)}</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#E85D5D]"><span className="h-2 w-2 rounded-full bg-[#E85D5D]" />NO {formatNairaPrice(currentNo)}</span>
          </div>
          <span className="text-xs font-bold text-[#6B7280]">{market.tradeCount || 0} predictions</span>
        </div>
        <div className="grid h-[260px] place-items-center rounded-2xl border border-dashed border-[#D1D5DB] bg-white/70 p-6 text-center sm:h-[320px]">
          <div>
            <p className="text-sm font-black text-[#111827]">No movement yet.</p>
            <p className="mt-2 max-w-sm text-sm font-bold leading-relaxed text-[#6B7280]">
              Crowd View updates when people back YES or NO.
            </p>
          </div>
        </div>
      </div>
    );
    }

  return (
    <div className="bg-transparent">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#12B886]"><span className="h-2 w-2 rounded-full bg-[#12B886]" />YES {formatNairaPrice(market.yesPrice)}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#E85D5D]"><span className="h-2 w-2 rounded-full bg-[#E85D5D]" />NO {formatNairaPrice(market.noPrice)}</span>
        </div>
        <span className="text-xs font-bold text-[#6B7280]">{market.tradeCount || 0} predictions</span>
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-white p-3 shadow-[0_12px_34px_rgba(16,24,40,0.06)] sm:p-4">
        <div className="h-[290px] w-full sm:h-[380px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#6B7280]">
        <span>{hasMovement ? "Crowd View history from saved predictions." : hasOnePoint ? "One saved prediction so far." : "Crowd View updates when people back YES or NO."}</span>
        <span>YES {formatNairaPrice(market.yesPrice)} / NO {formatNairaPrice(market.noPrice)}</span>
      </div>
    </div>
  );
};

const getTimeframeCutoff = (timeframe: Timeframe) => {
  const now = Date.now();
  if (timeframe === "1H") return now - 60 * 60 * 1000;
  if (timeframe === "24H") return now - 24 * 60 * 60 * 1000;
  if (timeframe === "7D") return now - 7 * 24 * 60 * 60 * 1000;
  return null;
};

const clampCrowdValue = (value: number) => Math.max(0, Math.min(100, Math.round((Number(value) || 0) * 10) / 10));

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

const Row = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between border-b border-[#E5E7EB] py-2 last:border-0">
    <span className="text-sm font-bold text-[#6B7280]">{label}</span>
    <span className={`text-sm font-black ${highlight ? "text-[#4F46E5]" : "text-[#111827]"}`}>{value}</span>
  </div>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-3">
    <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6B7280]">{label}</div>
    <div className="mt-1 text-sm font-black text-[#111827]">{value}</div>
  </div>
);

const IconButton = ({ icon: Icon, onClick, active = false, label }: { icon: any; onClick: () => void; active?: boolean; label: string }) => (
  <button onClick={onClick} aria-label={label} title={label} className={`grid h-10 w-10 place-items-center rounded-xl border transition ${active ? "border-[#4F46E5]/40 bg-[#EEF2FF] text-[#4F46E5]" : "border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F8F7F4]"}`}>
    <Icon className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
  </button>
);
