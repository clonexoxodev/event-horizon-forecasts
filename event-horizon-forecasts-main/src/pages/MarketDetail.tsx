import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, CheckCircle, Clock, Flame, Loader2, Share2, TrendingUp, Users, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiService, { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMarketState } from "@/lib/market-state";
import { formatCountdown, formatNaira, formatNairaPrice, getMarketMedia, type Market } from "@/lib/markets";

type Timeframe = "1H" | "24H" | "7D" | "ALL";

export default function MarketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { markets, upsertMarket } = useMarketState();
  const { user, refreshUser, setAuthOpen } = useAuth();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [sheetSide, setSheetSide] = useState<"YES" | "NO" | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justPredicted, setJustPredicted] = useState<"YES" | "NO" | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("24H");
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

  const relatedMarkets = useMemo(
    () => markets.filter((item) => item.id !== market?.id && item.category === market?.category).slice(0, 3),
    [market?.category, market?.id, markets]
  );

  const handleShare = async () => {
    if (!market) return;
    const media = getMarketMedia(market);
    const url = `${window.location.origin}/market/${market.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: market.question, text: `${market.question}\n${media.imageUrl}`, url });
        return;
      }
      await navigator.clipboard.writeText(`${market.question}\n${url}`);
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
    const oppositePool = sheetSide === "YES" ? market.noPool : market.yesPool;
    const maxLiquidityStake = Math.floor((oppositePool || 0) * 0.5);
    if (numericAmount > maxLiquidityStake) {
      return toast.error(`Maximum available for this side is ${formatNaira(maxLiquidityStake)} based on current liquidity.`);
    }

    setSubmitting(true);
    try {
      const result = await apiService.placePrediction(market.id, { side: sheetSide, amount: numericAmount, currency: "NGN" });
      setMarket(result.market);
      upsertMarket(result.market);
      refreshUser().catch((error) => console.warn("User refresh after prediction failed", error));
      setJustPredicted(sheetSide);
      setAmount("");
      setSheetSide(null);
      toast.success(`Prediction saved: ${sheetSide} with ${formatNaira(numericAmount)}.`);
      window.setTimeout(() => setJustPredicted(null), 1800);
    } catch (error: any) {
      toast.error(error.message || "Could not save prediction.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !market) {
    return (
      <div className="min-h-screen bg-[#050711] text-white xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
        </main>
      </div>
    );
  }

  if (!market) return null;

  const media = getMarketMedia(market);
  const selectedPrice = sheetSide === "YES" ? market.yesPrice : market.noPrice;
  const numericAmount = Number.parseFloat(amount) || 0;
  const oppositePool = sheetSide === "YES" ? market.noPool : market.yesPool;
  const maxLiquidityStake = Math.floor((oppositePool || 0) * 0.5);
  const sharesReceived = numericAmount > 0 && selectedPrice > 0 ? numericAmount / selectedPrice : 0;
  const estimatedReturn = numericAmount > 0 && sheetSide ? sharesReceived * 100 : 0;
  const estimatedProfit = Math.max(0, estimatedReturn - numericAmount);
  const exceedsLiquidity = Boolean(sheetSide && numericAmount > 0 && numericAmount > maxLiquidityStake);
  const hasMarketEnded = market.closeTime ? new Date(market.closeTime).getTime() <= now : false;
  const marketIsActive = market.status === "active" && !hasMarketEnded;

  return (
    <div className="min-h-screen bg-[#050711] pb-[calc(150px+env(safe-area-inset-bottom))] text-white md:pb-24 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-4 sm:px-6" data-now={now}>
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 text-sm font-black text-slate-300">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <div className="flex gap-2">
            <IconButton active={bookmarked} onClick={() => setBookmarked((value) => !value)} icon={Bookmark} label="Save" />
            <IconButton onClick={handleShare} icon={Share2} label="Share" />
          </div>
        </div>

        <article className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.055]">
          <div className="relative aspect-[4/5] max-h-[620px] overflow-hidden sm:aspect-[16/10]">
            {media.type === "video" ? (
              <video src={media.src} poster={media.poster} className="absolute inset-0 h-full w-full object-cover" muted playsInline loop autoPlay />
            ) : (
              <img src={media.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050711] via-[#050711]/40 to-black/10" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#050711]">{market.category}</span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">{marketIsActive ? "Live" : "Ended"}</span>
                <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-black text-white backdrop-blur-xl">
                  {formatCountdown(market.closeTime, market.closesIn)}
                </span>
              </div>
              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">{market.question}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-violet-300" />{market.participants} participants</span>
                <span className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-violet-300" />{formatNaira(market.totalPool)} volume</span>
                <span>{market.tradeCount || 0} trades</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-violet-300" />Ends {formatCountdown(market.closeTime, market.closesIn)}</span>
              </div>
            </div>
          </div>
        </article>

        <section className="mt-4 rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Price history</h2>
              <p className="text-xs font-bold text-slate-500">Updates only after real predictions</p>
            </div>
            <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["1H", "24H", "7D", "ALL"] as Timeframe[]).map((item) => (
                <button key={item} onClick={() => setTimeframe(item)} className={`rounded-full px-3 py-1 text-xs font-black ${timeframe === item ? "bg-white text-[#050711]" : "text-slate-400"}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <Chart market={market} timeframe={timeframe} />
        </section>

        <section className="mt-4 rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-4">
          <h2 className="text-lg font-black">Rules</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{market.rules || market.description || "This market resolves based on the stated outcome and admin review."}</p>
        </section>

        {relatedMarkets.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-3 text-lg font-black">Related markets</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {relatedMarkets.map((item) => (
                <Link key={item.id} to={`/market/${item.id}`} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.075]">
                  <div className="text-xs font-black text-violet-300">{item.category}</div>
                  <div className="mt-1 line-clamp-2 text-sm font-black">{item.question}</div>
                  <div className="mt-3 text-xs font-black text-slate-500">YES {formatNairaPrice(item.yesPrice)} · NO {formatNairaPrice(item.noPrice)}</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-white/10 bg-[#060914]/90 p-3 backdrop-blur-2xl md:bottom-0 xl:left-64">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3">
          <button disabled={!marketIsActive} onClick={() => setSheetSide("YES")} className="h-12 rounded-2xl bg-emerald-500 text-sm font-black text-white shadow-[0_0_24px_rgba(16,185,129,0.25)] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
            Buy YES {formatNairaPrice(market.yesPrice)}
          </button>
          <button disabled={!marketIsActive} onClick={() => setSheetSide("NO")} className="h-12 rounded-2xl bg-red-500 text-sm font-black text-white shadow-[0_0_24px_rgba(239,68,68,0.22)] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
            Buy NO {formatNairaPrice(market.noPrice)}
          </button>
        </div>
      </div>

      {sheetSide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && setSheetSide(null)}>
          <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#080b16] p-5 pb-[calc(90px+env(safe-area-inset-bottom))] text-white shadow-[0_-24px_80px_rgba(0,0,0,0.55)] md:left-auto md:right-6 md:top-24 md:h-fit md:w-[380px] md:rounded-[2rem] md:pb-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] ${sheetSide === "YES" ? "text-emerald-300" : "text-red-300"}`}>
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  Fast call
                </p>
                <h2 className="mt-1 text-2xl font-black">Predict {sheetSide} {formatNairaPrice(selectedPrice)}</h2>
              </div>
              <button onClick={() => setSheetSide(null)} disabled={submitting} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] disabled:cursor-not-allowed disabled:opacity-50">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Amount</label>
            <Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={submitting} placeholder="0" className="h-13 rounded-2xl border-white/10 bg-white/[0.055] text-lg font-black text-white placeholder:text-slate-600" />
            {exceedsLiquidity && (
              <p className="mt-2 text-xs font-bold text-amber-200">Maximum available for this side is {formatNaira(maxLiquidityStake)} based on current liquidity.</p>
            )}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map((value) => (
                <button key={value} onClick={() => setAmount(value.toString())} disabled={submitting} className="h-10 rounded-xl border border-white/10 bg-white/[0.055] text-xs font-black text-slate-300 disabled:cursor-not-allowed disabled:opacity-50">
                  {formatNaira(value)}
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
              <Row label="Wallet balance" value={user ? formatNaira(user.balance || 0) : "Login required"} />
              <Row label="Shares" value={sharesReceived.toFixed(2)} />
              <Row label="Payout if correct" value={formatNaira(estimatedReturn)} highlight />
              <Row label="Profit if correct" value={formatNaira(estimatedProfit)} highlight />
              <Row label="Max available" value={formatNaira(maxLiquidityStake)} />
            </div>
            <Button onClick={confirmPrediction} disabled={submitting || numericAmount <= 0 || exceedsLiquidity} className={`mt-5 h-12 w-full rounded-2xl text-base font-black text-white ${sheetSide === "YES" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-red-500 hover:bg-red-400"}`}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
              {user ? "Lock prediction" : "Login to predict"}
            </Button>
          </div>
        </div>
      )}

      {justPredicted && (
        <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-black/30 backdrop-blur-[2px]">
          <div className="animate-fade-up rounded-[2rem] border border-white/10 bg-[#080b16]/95 p-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.6)]">
            <div className={`mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full ${justPredicted === "YES" ? "bg-emerald-400/10 text-emerald-300 shadow-[0_0_70px_rgba(52,211,153,0.22)]" : "bg-red-400/10 text-red-300 shadow-[0_0_70px_rgba(248,113,113,0.22)]"}`}>
              <CheckCircle className="h-10 w-10" />
            </div>
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-100">
                <Flame className="h-3.5 w-3.5 text-violet-300" />
                Market updated
              </span>
            </div>
            <h3 className="mt-3 text-2xl font-black">You predicted {justPredicted}</h3>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
}

const Chart = ({ market, timeframe }: { market: Market; timeframe: Timeframe }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const rawHistory = useMemo(() => {
    const stored = (market.priceHistory || [])
      .filter((point) => point?.timestamp)
      .map((point) => ({
        timestamp: point.timestamp,
        yesPrice: Number(point.yesPrice || market.yesPrice || 50),
        noPrice: Number(point.noPrice || market.noPrice || 50),
        volume: Number(point.volume || 0),
        tradeCount: Number(point.tradeCount || 0),
        side: point.side || null,
        amount: Number(point.amount || 0),
      }));

    if (stored.length > 0) return stored;

    return [{
      timestamp: new Date().toISOString(),
      yesPrice: Number(market.yesPrice || 50),
      noPrice: Number(market.noPrice || 50),
      volume: Number(market.totalVolume || 0),
      tradeCount: Number(market.tradeCount || 0),
      side: null,
      amount: 0,
    }];
  }, [market.noPrice, market.priceHistory, market.totalVolume, market.tradeCount, market.yesPrice]);

  const history = useMemo(() => {
    const cutoff = getTimeframeCutoff(timeframe);
    const filtered = cutoff
      ? rawHistory.filter((point) => new Date(point.timestamp).getTime() >= cutoff)
      : rawHistory;
    let source = filtered.length ? filtered : rawHistory.slice(-1);

    if (source.length < 2 && rawHistory.length > 1) {
      const latest = source[source.length - 1] || rawHistory[rawHistory.length - 1];
      const previous = rawHistory
        .slice()
        .reverse()
        .find((point) => point.timestamp !== latest.timestamp) || rawHistory[0];
      source = [previous, latest].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    if (source.length === 1) {
      const point = source[0];
      const timestamp = new Date(point.timestamp).getTime();
      const startTimestamp = Number.isFinite(timestamp) ? timestamp - 5 * 60_000 : Date.now() - 5 * 60_000;
      return [
        { ...point, timestamp: new Date(startTimestamp).toISOString() },
        point,
      ];
    }

    return source;
  }, [rawHistory, timeframe]);

  const timeDomain = useMemo(() => {
    const times = history
      .map((point) => new Date(point.timestamp).getTime())
      .filter(Number.isFinite);
    const min = times.length ? Math.min(...times) : Date.now() - 5 * 60_000;
    const max = times.length ? Math.max(...times) : Date.now();
    if (min === max) return { min: min - 5 * 60_000, max: max + 5 * 60_000 };
    const padding = Math.max(1000, (max - min) * 0.06);
    return { min: min - padding, max: max + padding };
  }, [history]);

  const { domainMin, domainMax, yTicks } = useMemo(() => {
    const values = history.flatMap((point) => [point.yesPrice, point.noPrice]).filter(Number.isFinite);
    const min = values.length ? Math.min(...values) : 45;
    const max = values.length ? Math.max(...values) : 55;
    const center = (min + max) / 2;
    const paddedRange = Math.max(10, max - min + 6);
    const lower = Math.max(0, center - paddedRange / 2);
    const upper = Math.min(100, center + paddedRange / 2);
    return {
      domainMin: lower,
      domainMax: upper === lower ? lower + 10 : upper,
      yTicks: [upper, (upper + lower) / 2, lower],
    };
  }, [history]);

  const hasStoredMovement = Boolean((market.priceHistory?.length || 0) > 1 || Number(market.tradeCount || 0) > 0);
  const activePoint = activeIndex === null ? history[history.length - 1] : history[activeIndex];

  const xFor = (point: typeof history[number]) => {
    const timestamp = new Date(point.timestamp).getTime();
    const ratio = Number.isFinite(timestamp)
      ? (timestamp - timeDomain.min) / (timeDomain.max - timeDomain.min)
      : 0.5;
    return 4 + Math.max(0, Math.min(1, ratio)) * 92;
  };

  const pointFor = (point: typeof history[number]) => {
    const x = xFor(point);
    const y = 8 + ((domainMax - Number(point.yesPrice || 0)) / (domainMax - domainMin)) * 84;
    return { x, y: Math.max(5, Math.min(95, y)) };
  };

  const noPointFor = (point: typeof history[number]) => {
    const x = xFor(point);
    const y = 8 + ((domainMax - Number(point.noPrice || 0)) / (domainMax - domainMin)) * 84;
    return { x, y: Math.max(5, Math.min(95, y)) };
  };

  const toPolyline = (key: "yesPrice" | "noPrice") => history.map((point, index) => {
    const current = key === "yesPrice" ? pointFor(point) : noPointFor(point);
    return `${current.x},${current.y}`;
  }).join(" ");

  const activeX = activeIndex === null
    ? pointFor(history[history.length - 1]).x
    : pointFor(history[activeIndex]).x;

  const updateActivePoint = (clientX: number, currentTarget: SVGSVGElement) => {
    const rect = currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetX = 4 + ratio * 92;
    const nearestIndex = history.reduce((bestIndex, point, index) => {
      const bestDistance = Math.abs(pointFor(history[bestIndex]).x - targetX);
      const currentDistance = Math.abs(pointFor(point).x - targetX);
      return currentDistance < bestDistance ? index : bestIndex;
    }, 0);
    setActiveIndex(nearestIndex);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#080d19]/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-300" />YES {formatNairaPrice(market.yesPrice)}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-red-300"><span className="h-2 w-2 rounded-full bg-red-300" />NO {formatNairaPrice(market.noPrice)}</span>
        </div>
        <span className="text-xs font-bold text-slate-500">{market.tradeCount || 0} trades</span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.14),rgba(8,13,25,0.94)_52%)] p-3">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-64 w-full touch-none overflow-visible"
        onMouseMove={(event) => updateActivePoint(event.clientX, event.currentTarget)}
        onMouseLeave={() => setActiveIndex(null)}
        onTouchMove={(event) => updateActivePoint(event.touches[0].clientX, event.currentTarget)}
        onTouchEnd={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id="yesDetailLine" x1="0" x2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="noDetailLine" x1="0" x2="1">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>
        {[8, 29, 50, 71, 92].map((line) => <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />)}
        <polyline points={toPolyline("noPrice")} fill="none" stroke="url(#noDetailLine)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" vectorEffect="non-scaling-stroke" className="drop-shadow-[0_0_12px_rgba(244,63,94,0.36)]" />
        <polyline points={toPolyline("yesPrice")} fill="none" stroke="url(#yesDetailLine)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.4" vectorEffect="non-scaling-stroke" className="drop-shadow-[0_0_18px_rgba(52,211,153,0.48)]" />
        {history.map((point, index) => {
          const yesPoint = pointFor(point);
          return <circle key={`${point.timestamp}-${index}`} cx={yesPoint.x} cy={yesPoint.y} r="1.35" fill="#d1fae5" stroke="#34d399" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />;
        })}
        {activeX !== null && (
          <line x1={activeX} x2={activeX} y1="5" y2="95" stroke="rgba(255,255,255,0.35)" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <div className="pointer-events-none absolute inset-y-3 right-3 flex flex-col justify-between text-[10px] font-black text-slate-500">
        {yTicks.map((tick) => <span key={tick}>{Math.round(tick)}</span>)}
      </div>
      {activePoint && activeX !== null && (
        <div
          className="pointer-events-none absolute top-3 min-w-[170px] rounded-2xl border border-white/10 bg-[#050711]/95 p-3 text-xs shadow-2xl backdrop-blur-xl"
          style={{ left: `${Math.min(78, Math.max(0, activeX))}%` }}
        >
          <div className="font-black text-white">{formatChartTime(activePoint.timestamp)}</div>
          <div className="mt-2 grid gap-1 font-bold">
            <span className="text-emerald-300">YES {formatNairaPrice(activePoint.yesPrice)}</span>
            <span className="text-red-300">NO {formatNairaPrice(activePoint.noPrice)}</span>
            <span className="text-slate-400">Volume {formatNaira(activePoint.volume || 0)}</span>
            <span className="text-slate-500">Trades {activePoint.tradeCount || 0}</span>
            {activePoint.side && <span className="text-violet-200">{activePoint.side} trade {formatNaira(activePoint.amount || 0)}</span>}
          </div>
        </div>
      )}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
        <span>{hasStoredMovement ? "Live price history from saved trades" : "Flat starting line until the first prediction."}</span>
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

const formatChartTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const Row = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between border-b border-white/10 py-2 last:border-0">
    <span className="text-sm font-bold text-slate-400">{label}</span>
    <span className={`text-sm font-black ${highlight ? "text-emerald-300" : "text-white"}`}>{value}</span>
  </div>
);

const IconButton = ({ icon: Icon, onClick, active = false, label }: { icon: any; onClick: () => void; active?: boolean; label: string }) => (
  <button onClick={onClick} aria-label={label} title={label} className={`grid h-10 w-10 place-items-center rounded-2xl border backdrop-blur-xl transition ${active ? "border-violet-300/40 bg-violet-400/20 text-violet-200" : "border-white/15 bg-white/[0.055] text-white hover:bg-white/10"}`}>
    <Icon className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
  </button>
);
