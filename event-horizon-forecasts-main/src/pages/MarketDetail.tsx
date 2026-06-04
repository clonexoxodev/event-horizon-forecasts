import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  const sideShares = sheetSide === "YES" ? market.totalYesShares || 0 : market.totalNoShares || 0;
  const sharesReceived = numericAmount > 0 && selectedPrice > 0 ? numericAmount / selectedPrice : 0;
  const ownershipAfterPurchase = sideShares + sharesReceived > 0 ? (sharesReceived / (sideShares + sharesReceived)) * 100 : 0;
  const positionValue = sharesReceived * selectedPrice;
  const hasMarketEnded = market.closeTime ? new Date(market.closeTime).getTime() <= now : false;
  const marketIsActive = market.status === "active" && !hasMarketEnded;
  const totalShares = Number(market.totalYesShares || 0) + Number(market.totalNoShares || 0);
  const yesOwnershipShare = totalShares > 0 ? (Number(market.totalYesShares || 0) / totalShares) * 100 : 50;
  const noOwnershipShare = 100 - yesOwnershipShare;
  const recentTrades = [...(market.priceHistory || [])]
    .filter((point) => point.side && Number(point.amount || 0) > 0)
    .slice(-5)
    .reverse();

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

        <section className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-4">
            <h2 className="text-lg font-black">Ownership</h2>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-emerald-400" style={{ width: `${yesOwnershipShare}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric label="YES shares" value={`${Number(market.totalYesShares || 0).toFixed(2)} (${yesOwnershipShare.toFixed(1)}%)`} />
              <Metric label="NO shares" value={`${Number(market.totalNoShares || 0).toFixed(2)} (${noOwnershipShare.toFixed(1)}%)`} />
              <Metric label="YES volume" value={formatNaira(Number(market.yesVolume || market.yesPool || 0))} />
              <Metric label="NO volume" value={formatNaira(Number(market.noVolume || market.noPool || 0))} />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-4">
            <h2 className="text-lg font-black">Recent trades</h2>
            <div className="mt-3 space-y-2">
              {recentTrades.length ? recentTrades.map((trade) => (
                <div key={`${trade.timestamp}-${trade.side}-${trade.amount}`} className="flex items-center justify-between rounded-2xl bg-white/[0.045] px-3 py-2 text-xs">
                  <span className={`font-black ${trade.side === "YES" ? "text-emerald-300" : "text-red-300"}`}>Bought {trade.side}</span>
                  <span className="text-slate-400">{formatNaira(Number(trade.amount || 0))}</span>
                </div>
              )) : (
                <p className="text-sm text-slate-500">Recent trades appear after predictions.</p>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-4">
            <h2 className="text-lg font-black">Market sentiment</h2>
            <div className="mt-4 grid gap-2">
              <Metric label="YES price" value={formatNairaPrice(market.yesPrice)} />
              <Metric label="NO price" value={formatNairaPrice(market.noPrice)} />
              <Metric label="Largest holders" value="Available after holder ranking" />
            </div>
          </div>
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
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map((value) => (
                <button key={value} onClick={() => setAmount(value.toString())} disabled={submitting} className="h-10 rounded-xl border border-white/10 bg-white/[0.055] text-xs font-black text-slate-300 disabled:cursor-not-allowed disabled:opacity-50">
                  {formatNaira(value)}
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
              <Row label="Wallet balance" value={user ? formatNaira(user.balance || 0) : "Login required"} />
              <Row label="Current price" value={formatNairaPrice(selectedPrice)} />
              <Row label="Shares received" value={sharesReceived.toFixed(2)} highlight />
              <Row label="Ownership after purchase" value={`${ownershipAfterPurchase.toFixed(2)}%`} />
              <Row label="Position value" value={formatNaira(positionValue)} />
              <Row label="Market participants" value={`${market.participants || 0}`} />
              <p className="mt-3 text-xs font-bold leading-relaxed text-slate-400">
                This position may rise or fall as market sentiment changes.
              </p>
            </div>
            <Button onClick={confirmPrediction} disabled={submitting || numericAmount <= 0} className={`mt-5 h-12 w-full rounded-2xl text-base font-black text-white ${sheetSide === "YES" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-red-500 hover:bg-red-400"}`}>
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
  const rawHistory = useMemo(() => {
    const stored = (market.priceHistory || [])
      .filter((point) => point?.timestamp)
      .map((point) => ({
        timestamp: point.timestamp,
        time: new Date(point.timestamp).getTime(),
        yesPrice: Number(point.yesPrice || market.yesPrice || 50),
        noPrice: Number(point.noPrice || market.noPrice || 50),
        volume: Number(point.volume || 0),
        tradeCount: Number(point.tradeCount || 0),
        side: point.side || null,
        amount: Number(point.amount || 0),
      }));

    if (stored.length > 0) return stored;

    const timestamp = new Date().toISOString();
    return [{
      timestamp,
      time: new Date(timestamp).getTime(),
      yesPrice: Number(market.yesPrice || 50),
      noPrice: Number(market.noPrice || 50),
      volume: Number(market.totalVolume || 0),
      tradeCount: Number(market.tradeCount || 0),
      side: null,
      amount: 0,
    }];
  }, [market.noPrice, market.priceHistory, market.totalVolume, market.tradeCount, market.yesPrice]);

  const chartData = useMemo(() => {
    const sortedHistory = rawHistory
      .filter((point) => Number.isFinite(point.time))
      .sort((a, b) => a.time - b.time);
    const cutoff = getTimeframeCutoff(timeframe);
    const filtered = cutoff
      ? sortedHistory.filter((point) => point.time >= cutoff)
      : sortedHistory;
    let source = filtered.length ? filtered : sortedHistory.slice(-1);

    if (source.length < 2 && sortedHistory.length > 1) {
      const latest = source[source.length - 1] || sortedHistory[sortedHistory.length - 1];
      const previous = sortedHistory
        .slice()
        .reverse()
        .find((point) => point.time < latest.time) || sortedHistory[0];
      source = [previous, latest].sort((a, b) => a.time - b.time);
    }

    if (source.length === 1) {
      const point = source[0];
      const startTimestamp = point.time - 5 * 60_000;
      return [
        { ...point, timestamp: new Date(startTimestamp).toISOString(), time: startTimestamp },
        point,
      ];
    }

    return source;
  }, [rawHistory, timeframe]);

  const timeDomain = useMemo(() => {
    const times = chartData.map((point) => point.time).filter(Number.isFinite);
    const min = times.length ? Math.min(...times) : Date.now() - 5 * 60_000;
    const max = times.length ? Math.max(...times) : Date.now();
    if (min === max) return { min: min - 5 * 60_000, max: max + 5 * 60_000 };
    const padding = Math.max(1000, (max - min) * 0.06);
    return { min: min - padding, max: max + padding };
  }, [chartData]);

  const hasSavedHistory = Boolean(market.priceHistory?.length);
  const hasStoredMovement = Boolean(
    (market.priceHistory?.length || 0) > 1 ||
    Number(market.tradeCount || 0) > 0 ||
    rawHistory.some((point) => point.side || point.tradeCount > 0)
  );
  const axisTickFormatter = useMemo(
    () => (timestamp: number) => formatAxisTime(timestamp, timeDomain.max - timeDomain.min),
    [timeDomain.max, timeDomain.min]
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-[#080d19]/90 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-300" />YES {formatNairaPrice(market.yesPrice)}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-violet-300"><span className="h-2 w-2 rounded-full bg-violet-300" />NO {formatNairaPrice(market.noPrice)}</span>
        </div>
        <span className="text-xs font-bold text-slate-500">{market.tradeCount || 0} trades</span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),rgba(8,13,25,0.96)_54%)] px-1 pb-2 pt-3 sm:px-3">
        <div className="h-[230px] w-full sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 8, bottom: 6, left: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 6" vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={[timeDomain.min, timeDomain.max]}
                tickFormatter={axisTickFormatter}
                stroke="rgba(148,163,184,0.52)"
                tick={{ fill: "rgba(148,163,184,0.75)", fontSize: 10, fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                orientation="right"
                width={28}
                stroke="rgba(148,163,184,0.52)"
                tick={{ fill: "rgba(148,163,184,0.75)", fontSize: 10, fontWeight: 800 }}
                tickFormatter={(value) => `${value}`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.28)", strokeWidth: 1 }}
                content={<PriceTooltip />}
                isAnimationActive={false}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ outline: "none", maxWidth: "min(220px, calc(100vw - 48px))" }}
              />
              <Line
                type="monotone"
                dataKey="yesPrice"
                stroke="#22d3ee"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#08111f", fill: "#67e8f9" }}
                isAnimationActive
                animationDuration={450}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="noPrice"
                stroke="#8b5cf6"
                strokeWidth={2.4}
                dot={false}
                activeDot={{ r: 3.5, strokeWidth: 2, stroke: "#08111f", fill: "#a78bfa" }}
                isAnimationActive
                animationDuration={450}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {!hasSavedHistory && (
          <div className="pointer-events-none absolute inset-x-4 top-5 rounded-2xl border border-white/10 bg-[#050711]/72 px-3 py-2 text-center text-xs font-bold text-slate-400 backdrop-blur-xl">
            Price movement starts after predictions.
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500">
        <span>{hasStoredMovement ? "Live price history from saved trades" : "Flat starting line until the first prediction."}</span>
        <span>YES {formatNairaPrice(market.yesPrice)} / NO {formatNairaPrice(market.noPrice)}</span>
      </div>
    </div>
  );
};

const PriceTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="max-w-[210px] rounded-2xl border border-white/10 bg-[#050711]/95 p-3 text-xs shadow-2xl backdrop-blur-xl">
      <div className="font-black text-white">{formatChartTime(point.timestamp)}</div>
      <div className="mt-2 grid gap-1.5 font-bold">
        <div className="flex items-center justify-between gap-5 text-cyan-200">
          <span>YES</span>
          <span>{formatNairaPrice(point.yesPrice)}</span>
        </div>
        <div className="flex items-center justify-between gap-5 text-violet-200">
          <span>NO</span>
          <span>{formatNairaPrice(point.noPrice)}</span>
        </div>
        <div className="flex items-center justify-between gap-5 text-slate-400">
          <span>Volume</span>
          <span>{formatNaira(point.volume || 0)}</span>
        </div>
        <div className="flex items-center justify-between gap-5 text-slate-500">
          <span>Trades</span>
          <span>{point.tradeCount || 0}</span>
        </div>
        {point.side && (
          <div className="mt-1 rounded-xl bg-white/[0.055] px-2 py-1 text-center text-[11px] font-black text-white">
            Last trade: {point.side} {formatNaira(point.amount || 0)}
          </div>
        )}
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

const formatAxisTime = (timestamp: number, spanMs = 0) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  if (spanMs <= 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  if (spanMs > 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const Row = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between border-b border-white/10 py-2 last:border-0">
    <span className="text-sm font-bold text-slate-400">{label}</span>
    <span className={`text-sm font-black ${highlight ? "text-emerald-300" : "text-white"}`}>{value}</span>
  </div>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-[#0b1020]/70 p-3">
    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</div>
    <div className="mt-1 text-sm font-black text-white">{value}</div>
  </div>
);

const IconButton = ({ icon: Icon, onClick, active = false, label }: { icon: any; onClick: () => void; active?: boolean; label: string }) => (
  <button onClick={onClick} aria-label={label} title={label} className={`grid h-10 w-10 place-items-center rounded-2xl border backdrop-blur-xl transition ${active ? "border-violet-300/40 bg-violet-400/20 text-violet-200" : "border-white/15 bg-white/[0.055] text-white hover:bg-white/10"}`}>
    <Icon className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
  </button>
);
