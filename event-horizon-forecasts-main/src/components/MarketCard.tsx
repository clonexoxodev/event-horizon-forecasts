import { Clock, Play } from "lucide-react";
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
  const tradingCloseTime = m.tradingCloseTime || m.closeTime;
  const hasEnded = tradingCloseTime ? new Date(tradingCloseTime).getTime() <= Date.now() : false;
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
      className="group block rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-[0_8px_24px_rgba(17,24,39,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[#4F46E5]/30 hover:shadow-[0_14px_34px_rgba(17,24,39,0.1)]"
    >
      <div className="flex items-start gap-3">
        <div className={`relative ${compact ? "h-16 w-16" : "h-20 w-20"} shrink-0 overflow-hidden rounded-2xl bg-[#F3F4F6] sm:h-24 sm:w-24`}>
            {media.type === "video" ? (
              <video src={media.src} poster={media.poster} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" muted playsInline loop preload="metadata" />
            ) : (
              <img src={media.src} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
            )}
            {media.type === "video" && (
              <div className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white backdrop-blur-xl">
                <Play className="h-3 w-3 fill-current" />
              </div>
            )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-black text-[#667085]">
              {categoryLabel}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black ${isLive ? "bg-[#12B886]/10 text-[#047857]" : "bg-[#F3F4F6] text-[#667085]"}`}>
              {isLive && <span className="h-1.5 w-1.5 rounded-full bg-[#12B886]" />}
              {isLive ? "Live" : "Closed"}
            </span>
          </div>
          <h3 className="line-clamp-2 text-[15px] font-black leading-snug text-[#101828] sm:text-[17px]">
            {m.question}
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <PriceButton label="YES" value={m.yesPrice} tone="green" disabled={!isLive} onClick={(event) => openSide(event, "YES")} />
            <PriceButton label="NO" value={m.noPrice} tone="red" disabled={!isLive} onClick={(event) => openSide(event, "NO")} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[#EEF2F6] pt-2.5 text-[11px] font-bold text-[#667085]">
        <span>{m.participants || 0} participants</span>
        <span>{m.tradeCount || 0} predictions</span>
        <span>{formatNaira(m.totalPool || m.totalVolume || 0)} backed</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatCountdown(tradingCloseTime, m.closesIn)}
        </span>
        <span className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-black ${isLive ? "bg-[#EEF2FF] text-[#4F46E5]" : "bg-[#F3F4F6] text-[#667085]"}`}>
          {isLive ? "Back opinion" : "Closed"}
        </span>
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
        ? "border-[#12B886]/25 bg-[#12B886]/10 text-[#047857] hover:bg-[#12B886]/16"
        : "border-[#E85D5D]/25 bg-[#E85D5D]/10 text-[#B42318] hover:bg-[#E85D5D]/16"
    }`}
  >
    <span className="block text-[10px] font-black uppercase text-[#6B7280]">{label}</span>
    <span className="mt-0.5 block text-[15px] font-black">
      <AnimatedNumber value={value} prefix={formatNairaPrice(0).replace("0", "")} />
    </span>
  </button>
);
