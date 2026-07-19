import { Clock, Play, Shield, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Market,
  formatCountdown,
  formatNaira,
  formatNairaPrice,
  getMarketActivation,
  getMarketCategoryLabel,
  getMarketMedia,
} from "@/lib/markets";
import { useForecastSlip } from "@/lib/forecast-slip";
import { AnimatedNumber } from "@/components/AnimatedNumber";

export const MarketCard = ({ m, compact = false }: { m: Market; compact?: boolean }) => {
  const { openForecastSlip } = useForecastSlip();
  const navigate = useNavigate();
  const media = getMarketMedia(m);
  const categoryLabel = getMarketCategoryLabel(m);
  const tradingCloseTime = m.tradingCloseTime || m.closeTime;
  const hasEnded = tradingCloseTime ? new Date(tradingCloseTime).getTime() <= Date.now() : false;
  const isLive = m.status === "active" && !hasEnded;
  const activation = getMarketActivation(m);

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

  const openMarket = () => navigate(`/market/${m.id}`);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMarket();
    }
  };

  const nairaSymbol = formatNairaPrice(0).replace("0", "");

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={openMarket}
      onKeyDown={handleKeyDown}
      aria-label={`${m.question}. ${isLive ? (activation.isProtected ? "Refund protected" : "Live trading") : "Trading closed"}. YES price ${nairaSymbol}${Math.round(m.yesPrice)}, NO price ${nairaSymbol}${Math.round(m.noPrice)}.`}
      className="group block rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-[0_8px_24px_rgba(17,24,39,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4F46E5]/30 hover:shadow-[0_14px_34px_rgba(17,24,39,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5] active:translate-y-0 active:shadow-[0_6px_16px_rgba(17,24,39,0.08)]"
    >
      <div className="flex items-start gap-3">
        <div
          className={`relative ${compact ? "h-18 w-18" : "h-20 w-20"} shrink-0 overflow-hidden rounded-2xl bg-[#F3F4F6] sm:h-28 sm:w-28`}
        >
          {media.type === "video" ? (
            <video
              src={media.src}
              poster={media.poster}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              muted
              playsInline
              loop
              preload="metadata"
              aria-hidden="true"
            />
          ) : (
            <img
              src={media.src}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              aria-hidden="true"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          {media.type === "video" && (
            <div className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-xl transition-transform duration-200 group-hover:scale-110">
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-black text-[#667085]">
              {categoryLabel}
            </span>
            {isLive && activation.isProtected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-black text-[#4F46E5]">
                <Shield className="h-3 w-3" aria-hidden="true" />
                <span>{activation.progress}% Protected</span>
              </span>
            ) : isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#12B886]/10 px-2 py-0.5 text-[10px] font-black text-[#047857]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#12B886] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#12B886]" />
                </span>
                <span>Live</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-black text-[#667085]">
                Closed
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-[15px] font-black leading-snug text-[#101828] sm:text-[17px]">
            {m.question}
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Trading options">
            <PriceButton
              label="YES"
              value={m.yesPrice}
              tone="green"
              disabled={!isLive}
              onClick={(event) => openSide(event, "YES")}
              nairaSymbol={nairaSymbol}
            />
            <PriceButton
              label="NO"
              value={m.noPrice}
              tone="red"
              disabled={!isLive}
              onClick={(event) => openSide(event, "NO")}
              nairaSymbol={nairaSymbol}
            />
          </div>
        </div>
      </div>

      {activation.isProtected ? (
        <div className="mt-3 rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-3">
          <div className="flex items-center justify-between gap-3 text-[11px] font-black text-[#4F46E5]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Refund Protected
            </span>
            <span>{activation.progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={activation.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Protection progress: ${activation.progress}%`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#6366F1] transition-all duration-500 ease-out"
              style={{ width: `${activation.progress}%` }}
            />
          </div>
          <div className="mt-1.5 text-[11px] font-bold text-[#475467]">
            {formatNaira(activation.totalPool)} / {formatNaira(activation.requirements.totalPool)} activity
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3 text-[11px] font-black">
          <span className="text-[#047857]">YES {formatNairaPrice(m.yesPrice)}</span>
          <span className="text-[#B42318]">NO {formatNairaPrice(m.noPrice)}</span>
        </div>
      )}

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[#EEF2F6] pt-2.5 text-[11px] font-bold text-[#667085]">
        {!activation.isProtected && (
          <span className="truncate">{formatNaira(m.totalPool || m.totalVolume || 0)} backed</span>
        )}
        <span className="flex shrink-0 items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {formatCountdown(tradingCloseTime, m.closesIn)}
        </span>
        <span
          className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
            isLive ? "bg-[#EEF2FF] text-[#4F46E5]" : "bg-[#F3F4F6] text-[#667085]"
          }`}
        >
          {isLive ? "Back opinion" : "Closed"}
        </span>
      </div>
    </article>
  );
};

const PriceButton = ({
  label,
  value,
  tone,
  disabled = false,
  onClick,
  nairaSymbol,
}: {
  label: string;
  value: number;
  tone: "green" | "red";
  disabled?: boolean;
  onClick: (event: React.MouseEvent) => void;
  nairaSymbol: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={`${label} at ${Math.round(value)} naira`}
    className={`rounded-xl border px-3 py-2.5 text-left transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
      tone === "green"
        ? "border-[#12B886]/25 bg-[#12B886]/10 text-[#047857] hover:border-[#12B886]/40 hover:bg-[#12B886]/20"
        : "border-[#E85D5D]/25 bg-[#E85D5D]/10 text-[#B42318] hover:border-[#E85D5D]/40 hover:bg-[#E85D5D]/20"
    }`}
  >
    <span className="block text-[10px] font-black uppercase text-[#6B7280]">{label}</span>
    <span className="mt-0.5 block text-[15px] font-black">
      <AnimatedNumber value={value} prefix={nairaSymbol} />
    </span>
  </button>
);
