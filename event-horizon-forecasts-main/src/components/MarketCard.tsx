import { Clock, Play, Shield } from "lucide-react";
import { useState } from "react";
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
import { ProtectedMarketInfo, ProtectedMarketTooltip } from "@/components/ProtectedMarketInfo";

export const MarketCard = ({ m, compact = false }: { m: Market; compact?: boolean }) => {
  const { openForecastSlip } = useForecastSlip();
  const navigate = useNavigate();
  const media = getMarketMedia(m);
  const categoryLabel = getMarketCategoryLabel(m);
  const tradingCloseTime = m.tradingCloseTime || m.closeTime;
  const hasEnded = tradingCloseTime ? new Date(tradingCloseTime).getTime() <= Date.now() : false;
  const isLive = m.status === "active" && !hasEnded;
  const activation = getMarketActivation(m);
  const [showProtectedInfo, setShowProtectedInfo] = useState(false);

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
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={openMarket}
        onKeyDown={handleKeyDown}
        aria-label={`${m.question}. ${isLive ? (activation.isProtected ? "Refund protected" : "Live trading") : "Trading closed"}. YES price ${nairaSymbol}${Math.round(m.yesPrice)}, NO price ${nairaSymbol}${Math.round(m.noPrice)}.`}
        className="group block rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-[#4F46E5]/15 hover:shadow-[0_4px_16px_rgba(17,24,39,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5] active:translate-y-0 active:shadow-sm overflow-hidden"
      >
        {/* Media */}
        {media.src && (
          <div className={`relative ${compact ? "h-28" : "h-36"} w-full overflow-hidden bg-[#F3F4F6]`}>
            {media.type === "video" ? (
              <video
                src={media.src}
                poster={media.poster}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                aria-hidden="true"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
            {media.type === "video" && (
              <div className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm">
                <Play className="h-3 w-3 fill-current" aria-hidden="true" />
              </div>
            )}
            {/* Status badge */}
            <div className="absolute left-2.5 top-2.5">
              {isLive && activation.isProtected ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowProtectedInfo(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[#4F46E5] backdrop-blur-sm"
                >
                  <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                  Protected
                </button>
              ) : isLive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[#047857] backdrop-blur-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#12B886] opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#12B886]" />
                  </span>
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[#6B7280] backdrop-blur-sm">
                  Closed
                </span>
              )}
            </div>
          </div>
        )}

        <div className="p-3.5">
          {/* Category + Countdown row */}
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              {categoryLabel}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#9CA3AF]">
              <Clock className="h-2.5 w-2.5" aria-hidden="true" />
              {formatCountdown(tradingCloseTime, m.closesIn)}
            </span>
          </div>

          {/* Question */}
          <h3 className="line-clamp-2 text-[14px] font-bold leading-snug text-[#101828]">
            {m.question}
          </h3>

          {/* YES / NO buttons */}
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

          {/* Footer meta */}
          <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-[#9CA3AF]">
            {activation.isProtected ? (
              <span className="text-[#4F46E5]">{activation.progress}% protected</span>
            ) : (
              <span className="truncate">{formatNaira(m.totalPool || m.totalVolume || 0)} pool</span>
            )}
            <span>{(m.participants || 0).toLocaleString()} backers</span>
          </div>
        </div>
      </article>

      {showProtectedInfo && (
        <ProtectedMarketInfo
          isOpen={showProtectedInfo}
          onClose={() => setShowProtectedInfo(false)}
          activation={{
            progress: activation.progress,
            totalPool: activation.totalPool,
            requirements: activation.requirements,
          }}
        />
      )}
    </>
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
    aria-label={`${label} at ${Math.round(value)}%`}
    className={`rounded-xl border px-3 py-2 text-left transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
      tone === "green"
        ? "border-[#12B886]/20 bg-[#12B886]/[0.04] text-[#047857] hover:border-[#12B886]/30 hover:bg-[#12B886]/10"
        : "border-[#E85D5D]/20 bg-[#E85D5D]/[0.04] text-[#B42318] hover:border-[#E85D5D]/30 hover:bg-[#E85D5D]/10"
    }`}
  >
    <span className="block text-[10px] font-bold uppercase text-[#6B7280]">{label}</span>
    <span className="mt-0.5 block text-[14px] font-bold">
      <AnimatedNumber value={value} prefix={nairaSymbol} />
    </span>
  </button>
);
