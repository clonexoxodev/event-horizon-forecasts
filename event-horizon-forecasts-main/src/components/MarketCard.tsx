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
      className="group block rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4F46E5]/20 hover:shadow-[0_8px_24px_rgba(17,24,39,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5] active:translate-y-0 active:shadow-sm overflow-hidden"
    >
      {/* Media */}
      {media.src && (
        <div className={`relative ${compact ? "h-36" : "h-44"} w-full overflow-hidden bg-[#F3F4F6]`}>
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
          {media.type === "video" && (
            <div className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm">
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            </div>
          )}
          {/* Status badge overlay */}
          <div className="absolute left-3 top-3">
            {isLive && activation.isProtected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#4F46E5] backdrop-blur-sm">
                <Shield className="h-3 w-3" aria-hidden="true" />
                Protected
              </span>
            ) : isLive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#047857] backdrop-blur-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#12B886] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#12B886]" />
                </span>
                Live
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#6B7280] backdrop-blur-sm">
                Closed
              </span>
            )}
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Category */}
        <div className="mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            {categoryLabel}
          </span>
        </div>

        {/* Question */}
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-[#101828]">
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
        <div className="mt-3 flex items-center gap-3 text-[11px] font-bold text-[#9CA3AF]">
          {!activation.isProtected && (
            <span className="truncate">{formatNaira(m.totalPool || m.totalVolume || 0)} pool</span>
          )}
          {activation.isProtected && (
            <span className="truncate text-[#4F46E5]">{activation.progress}% protected</span>
          )}
          <span className="flex shrink-0 items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formatCountdown(tradingCloseTime, m.closesIn)}
          </span>
        </div>
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
    aria-label={`${label} at ${Math.round(value)}%`}
    className={`rounded-xl border px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
      tone === "green"
        ? "border-[#12B886]/20 bg-[#12B886]/[0.06] text-[#047857] hover:border-[#12B886]/35 hover:bg-[#12B886]/15"
        : "border-[#E85D5D]/20 bg-[#E85D5D]/[0.06] text-[#B42318] hover:border-[#E85D5D]/35 hover:bg-[#E85D5D]/15"
    }`}
  >
    <span className="block text-[10px] font-bold uppercase text-[#6B7280]">{label}</span>
    <span className="mt-0.5 block text-[15px] font-bold">
      <AnimatedNumber value={value} prefix={nairaSymbol} />
    </span>
  </button>
);
