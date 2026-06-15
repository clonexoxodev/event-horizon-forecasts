import { Clock, Play, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Market,
  formatCountdown,
  formatNaira,
  formatNairaPrice,
  getMarketCategoryLabel,
  getMarketMedia,
} from "@/lib/markets";
import { useForecastSlip } from "@/lib/forecast-slip";
import { AnimatedNumber } from "@/components/AnimatedNumber";

export const MarketCard = ({ m, compact = false }: { m: Market; compact?: boolean }) => {
  const { openForecastSlip } = useForecastSlip();
  const media = getMarketMedia(m);
  const categoryLabel = getMarketCategoryLabel(m);
  const hasEnded = m.closeTime ? new Date(m.closeTime).getTime() <= Date.now() : false;
  const isLive = m.status === "active" && !hasEnded;
  const openSide = (event: React.MouseEvent, side: "YES" | "NO") => {
    event.preventDefault();
    event.stopPropagation();
    if (!isLive) return;
    openForecastSlip({
      marketId: m.id,
      marketQuestion: m.question,
      marketIcon: m.icon,
      side,
      currentPrice: side === "YES" ? m.yesPrice : m.noPrice,
      yesPool: m.yesPool,
      noPool: m.noPool,
      totalYesShares: m.totalYesShares,
      totalNoShares: m.totalNoShares,
      participants: m.participants,
      minAmount: m.minAmount,
      maxAmount: m.maxAmount,
    });
  };

  return (
    <Link
      to={`/market/${m.id}`}
      className="group block overflow-hidden rounded-2xl border border-[#263241] bg-[#101720] shadow-[0_14px_38px_rgba(0,0,0,0.24)] transition duration-200 hover:-translate-y-0.5 hover:border-[#12B886]/45 hover:bg-[#151E28]"
    >
      <div className="p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-full border border-[#263241] bg-[#151E28] px-2.5 py-1 text-[11px] font-bold text-[#8B98A8]">
            {categoryLabel}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${isLive ? "border-[#12B886]/25 bg-[#12B886]/10 text-[#7AE4BD]" : "border-[#263241] bg-[#151E28] text-[#8B98A8]"}`}>
            {isLive && <span className="h-1.5 w-1.5 rounded-full bg-[#12B886]" />}
            {isLive ? "Live" : "Ended"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
          <div className={`relative ${compact ? "h-28" : "h-36"} overflow-hidden rounded-xl bg-[#151E28] sm:h-full`}>
            {media.type === "video" ? (
              <video src={media.src} poster={media.poster} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" muted playsInline loop preload="metadata" />
            ) : (
              <img src={media.src} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            {media.type === "video" && (
              <div className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white backdrop-blur-xl">
                <Play className="h-3 w-3 fill-current" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-black text-white backdrop-blur-xl">
              <TrendingUp className="h-3 w-3 text-[#12B886]" />
              {m.tradeCount || 0} trades
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-black leading-snug text-white">
              {m.question}
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <PriceButton label="YES" value={m.yesPrice} tone="green" disabled={!isLive} onClick={(event) => openSide(event, "YES")} />
              <PriceButton label="NO" value={m.noPrice} tone="red" disabled={!isLive} onClick={(event) => openSide(event, "NO")} />
            </div>
          </div>
        </div>

        <div className="mt-3 border-t border-[#263241] pt-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] font-bold text-[#8B98A8]">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-[#12B886]" />
              {m.participants}
            </span>
            <span>{formatNaira(m.totalVolume ?? m.totalPool)} vol.</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatCountdown(m.closeTime, m.closesIn)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const PriceButton = ({ label, value, tone, disabled = false, onClick }: { label: string; value: number; tone: "green" | "red"; disabled?: boolean; onClick: (event: React.MouseEvent) => void }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
      tone === "green"
        ? "border-[#12B886]/25 bg-[#12B886]/10 text-[#7AE4BD] hover:bg-[#12B886]/16"
        : "border-[#E85D5D]/25 bg-[#E85D5D]/10 text-[#FF9C9C] hover:bg-[#E85D5D]/16"
    }`}
  >
    <span className="block text-[10px] font-black uppercase text-white/45">{label}</span>
    <span className="mt-0.5 block text-base font-black">
      <AnimatedNumber value={value} prefix={formatNairaPrice(0).replace("0", "")} />
    </span>
  </button>
);
