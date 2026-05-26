import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, Clock, Loader2, Share2, TrendingUp, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiService from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMarketState } from "@/lib/market-state";
import { formatCountdown, formatNaira, formatNairaPrice, getMarketMedia, type Market } from "@/lib/markets";

type Timeframe = "1H" | "24H" | "7D" | "ALL";

export default function MarketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { markets, getMarket, setMarkets } = useMarketState();
  const { user, refreshUser } = useAuth();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [sheetSide, setSheetSide] = useState<"YES" | "NO" | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("24H");

  useEffect(() => {
    if (!id) return;

    const loadMarket = async () => {
      setLoading(true);
      try {
        const cached = getMarket(id);
        if (cached) setMarket(cached);
        const response = await apiService.getMarket(id);
        setMarket(response.market);
        setMarkets((prev) =>
          prev.some((item) => item.id === response.market.id)
            ? prev.map((item) => (item.id === response.market.id ? response.market : item))
            : [...prev, response.market]
        );
      } catch (error: any) {
        toast.error(error.message || "Could not load market.");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadMarket();
  }, [getMarket, id, navigate, setMarkets]);

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
    if (!market || !sheetSide) return;
    if (!user) return navigate("/login");
    const numericAmount = Number.parseFloat(amount) || 0;
    if (numericAmount <= 0) return toast.error("Enter an amount.");

    setSubmitting(true);
    try {
      const result = await apiService.placePrediction(market.id, { side: sheetSide, amount: numericAmount, currency: "NGN" });
      setMarket(result.market);
      setMarkets((prev) => prev.map((item) => (item.id === result.market.id ? result.market : item)));
      await refreshUser();
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
  const estimatedReturn = numericAmount > 0 && sheetSide ? numericAmount * (100 / Math.max(1, selectedPrice)) : 0;

  return (
    <div className="min-h-screen bg-[#050711] pb-28 text-white md:pb-24 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
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
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">Live</span>
                <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-black text-white backdrop-blur-xl">
                  {formatCountdown(market.closeTime, market.closesIn)}
                </span>
              </div>
              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">{market.question}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-violet-300" />{market.participants} participants</span>
                <span className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-violet-300" />{formatNaira(market.totalPool)} volume</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-violet-300" />Ends {formatCountdown(market.closeTime, market.closesIn)}</span>
              </div>
            </div>
          </div>
        </article>

        <section className="mt-4 rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Live sentiment</h2>
              <p className="text-xs font-bold text-slate-500">Updates from real predictions</p>
            </div>
            <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["1H", "24H", "7D", "ALL"] as Timeframe[]).map((item) => (
                <button key={item} onClick={() => setTimeframe(item)} className={`rounded-full px-3 py-1 text-xs font-black ${timeframe === item ? "bg-white text-[#050711]" : "text-slate-400"}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <Chart market={market} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <PriceStat label="YES" value={market.yesPrice} tone="green" />
            <PriceStat label="NO" value={market.noPrice} tone="red" />
          </div>
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

      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-white/10 bg-[#060914]/90 p-3 backdrop-blur-2xl md:bottom-0 xl:left-64">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3">
          <button onClick={() => setSheetSide("YES")} className="h-12 rounded-2xl bg-emerald-500 text-sm font-black text-white shadow-[0_0_24px_rgba(16,185,129,0.25)]">
            Buy YES {formatNairaPrice(market.yesPrice)}
          </button>
          <button onClick={() => setSheetSide("NO")} className="h-12 rounded-2xl bg-red-500 text-sm font-black text-white shadow-[0_0_24px_rgba(239,68,68,0.22)]">
            Buy NO {formatNairaPrice(market.noPrice)}
          </button>
        </div>
      </div>

      {sheetSide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setSheetSide(null)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-[2rem] border border-white/10 bg-[#080b16] p-5 text-white shadow-[0_-24px_80px_rgba(0,0,0,0.55)] md:left-auto md:right-6 md:top-24 md:h-fit md:w-[380px] md:rounded-[2rem]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.18em] ${sheetSide === "YES" ? "text-emerald-300" : "text-red-300"}`}>Selected side</p>
                <h2 className="mt-1 text-2xl font-black">{sheetSide} {formatNairaPrice(selectedPrice)}</h2>
              </div>
              <button onClick={() => setSheetSide(null)} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.055]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Amount</label>
            <Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" className="h-13 rounded-2xl border-white/10 bg-white/[0.055] text-lg font-black text-white placeholder:text-slate-600" />
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map((value) => (
                <button key={value} onClick={() => setAmount(value.toString())} className="h-10 rounded-xl border border-white/10 bg-white/[0.055] text-xs font-black text-slate-300">
                  {formatNaira(value)}
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
              <Row label="Wallet balance" value={user ? formatNaira(user.balance || 0) : "Login required"} />
              <Row label="Estimated payout" value={formatNaira(estimatedReturn)} highlight />
            </div>
            <Button onClick={confirmPrediction} disabled={submitting || numericAmount <= 0} className={`mt-5 h-12 w-full rounded-2xl text-base font-black text-white ${sheetSide === "YES" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-red-500 hover:bg-red-400"}`}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
              {user ? "Confirm prediction" : "Login to predict"}
            </Button>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
}

const Chart = ({ market }: { market: Market }) => {
  const values = market.priceHistory && market.priceHistory.length > 1
    ? market.priceHistory.map((point) => point.yesPrice)
    : [market.yesPrice, market.yesPrice, market.yesPrice, market.yesPrice];
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
    const y = 100 - Math.max(2, Math.min(98, value));
    return `${x},${y}`;
  });
  return (
    <div className="rounded-2xl border border-white/10 bg-[#080d19]/90 p-4">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-60 w-full overflow-visible">
        <defs>
          <linearGradient id="detailLine" x1="0" x2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((line) => <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />)}
        <polyline points={points.join(" ")} fill="none" stroke="url(#detailLine)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" className="drop-shadow-[0_0_12px_rgba(167,139,250,0.4)]" />
      </svg>
    </div>
  );
};

const PriceStat = ({ label, value, tone }: { label: string; value: number; tone: "green" | "red" }) => (
  <div className={`rounded-2xl border p-4 ${tone === "green" ? "border-emerald-300/20 bg-emerald-400/10" : "border-red-300/20 bg-red-400/10"}`}>
    <div className="text-xs font-black text-slate-500">{label}</div>
    <div className={`mt-1 text-2xl font-black ${tone === "green" ? "text-emerald-300" : "text-red-300"}`}>{formatNairaPrice(value)}</div>
  </div>
);

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
