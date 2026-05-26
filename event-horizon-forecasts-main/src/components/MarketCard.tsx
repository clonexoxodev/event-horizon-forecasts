import { Clock, Play, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Market,
  formatCountdown,
  formatNairaPrice,
  getMarketMedia,
} from "@/lib/markets";
import { useForecastSlip } from "@/lib/forecast-slip";

export const MarketCard = ({ m, compact = false }: { m: Market; compact?: boolean }) => {
  const { openForecastSlip } = useForecastSlip();
  const media = getMarketMedia(m);
  const history = m.priceHistory || [];
  const trend = history.length > 1 ? m.yesPrice - history[0].yesPrice : 0;

  const handlePredict = (event: React.MouseEvent) => {
    event.preventDefault();
    openForecastSlip({
      marketId: m.id,
      marketQuestion: m.question,
      marketIcon: m.icon,
      side: m.yesPrice >= m.noPrice ? "YES" : "NO",
      currentPrice: m.yesPrice >= m.noPrice ? m.yesPrice : m.noPrice,
    });
  };

  return (
    <Link
      to={`/market/${m.id}`}
      className="group block overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.052] shadow-[0_16px_46px_rgba(0,0,0,0.26)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-white/[0.07]"
    >
      <div className="p-3.5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[11px] font-black text-slate-300">
            {m.category || "Market"}
          </span>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-black text-emerald-200">
            Live
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
          <div className={`relative ${compact ? "h-24" : "h-28"} overflow-hidden rounded-2xl bg-white/5 sm:h-full`}>
            {media.type === "video" ? (
              <video src={media.src} poster={media.poster} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" muted playsInline loop preload="metadata" />
            ) : (
              <img src={media.src} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            {media.type === "video" && (
              <div className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white backdrop-blur-xl">
                <Play className="h-3 w-3 fill-current" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-black leading-snug text-white">
              {m.question}
            </h3>

            <div className="mt-3">
              <MiniSparkline market={m} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <PricePill label="YES" value={m.yesPrice} tone="green" />
              <PricePill label="NO" value={m.noPrice} tone="red" />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div className="flex min-w-0 items-center gap-3 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-violet-300" />
              {m.participants}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatCountdown(m.closeTime, m.closesIn)}
            </span>
          </div>
          <button
            onClick={handlePredict}
            className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-black text-[#050711] shadow-[0_10px_24px_rgba(255,255,255,0.12)] transition hover:scale-[1.02]"
          >
            Predict
          </button>
        </div>
      </div>
    </Link>
  );
};

const PricePill = ({ label, value, tone }: { label: string; value: number; tone: "green" | "red" }) => (
  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${tone === "green" ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
    {label} {formatNairaPrice(value)}
  </span>
);

const MiniSparkline = ({ market }: { market: Market }) => {
  const values = market.priceHistory && market.priceHistory.length > 1
    ? market.priceHistory.map((point) => point.yesPrice)
    : [market.yesPrice, market.yesPrice, market.yesPrice];
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
    const y = 100 - Math.max(10, Math.min(90, value));
    return `${x},${y}`;
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-[#080d19]/80 px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-[11px] font-black">
        <span className="flex items-center gap-1 text-slate-500">
          <Sparkles className="h-3 w-3 text-violet-300" />
          Sentiment
        </span>
        <span className="text-white">{Math.round(market.yesPrice)}% YES</span>
      </div>
      <svg viewBox="0 0 100 42" preserveAspectRatio="none" className="h-10 w-full overflow-visible">
        <polyline points={points.join(" ")} fill="none" stroke="#a78bfa" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
};
