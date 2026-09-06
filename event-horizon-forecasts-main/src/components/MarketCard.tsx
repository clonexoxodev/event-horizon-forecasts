import { Clock, Lock, Shield, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Market,
  formatCountdown,
  formatNaira,
  getMarketActivation,
  getMarketCategoryLabel,
  getMarketMedia,
} from "@/lib/markets";
import { useForecastSlip } from "@/lib/forecast-slip";
import { ProtectedMarketInfo } from "@/components/ProtectedMarketInfo";

const clampPercent = (value: number | undefined) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(99, n));
};

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

  const yesPercent = clampPercent(m.yesPrice);
  const noPercent = 100 - yesPercent;

  const openSide = (event: React.MouseEvent, side: "YES" | "NO") => {
    event.preventDefault();
    event.stopPropagation();
    if (!isLive) return;
    openForecastSlip({
      marketId: m.id,
      marketQuestion: m.question,
      marketIcon: m.icon,
      side,
      currentPrice: side === "YES" ? yesPercent : noPercent,
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

  const poolAmount = Number(m.totalVolume ?? 0) || 0;

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={openMarket}
        onKeyDown={handleKeyDown}
        aria-label={`${m.question}. Market probability ${yesPercent}% YES, ${noPercent}% NO. ${isLive ? (activation.isProtected ? "Refund protected." : "Open for predictions.") : "Predictions closed."} ${formatNaira(poolAmount)} in the pool from ${m.participants || 0} participants.`}
        className="group block overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4F46E5]/15 hover:shadow-[0_6px_24px_rgba(17,24,39,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5] active:translate-y-0 active:shadow-sm"
      >
        {media.src && (
          <div className={`relative ${compact ? "h-24" : "h-32"} w-full overflow-hidden bg-[#F3F4F6]`}>
            {media.type === "video" ? (
              <video
                src={media.src}
                poster={media.poster}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
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
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
                aria-hidden="true"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/5 to-transparent" />

            <div className="absolute left-2.5 top-2.5 flex flex-wrap items-center gap-1.5">
              {m.visibility === "private" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#4F46E5] shadow-sm backdrop-blur-md">
                  <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                  Private
                </span>
              )}
              {isLive && activation.isProtected ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowProtectedInfo(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#4F46E5] shadow-sm backdrop-blur-md"
                  aria-label="Learn about Refund Protected markets"
                >
                  <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                  Protected
                </button>
              ) : isLive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#12B886]/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-md">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-[#6B7280]/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                  Closed
                </span>
              )}
            </div>

            <div className="absolute bottom-0 right-2.5 pb-2.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                {formatCountdown(tradingCloseTime, m.closesIn)}
              </span>
            </div>
          </div>
        )}

        <div className="p-4">
          {!media.src && (
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                  {categoryLabel}
                </span>
                {m.visibility === "private" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold text-[#4F46E5]">
                    <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                    Private
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#9CA3AF]">
                <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                {formatCountdown(tradingCloseTime, m.closesIn)}
              </span>
            </div>
          )}

          <h3 className="line-clamp-2 text-[14px] font-bold leading-snug text-[#101828]">
            {m.question}
          </h3>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-black tabular-nums">
              <span className="text-[#047857]">YES {yesPercent}%</span>
              <span className="text-[#B42318]">NO {noPercent}%</span>
            </div>
            <div
              className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-[#F3F4F6]"
              role="img"
              aria-label={`Market probability: ${yesPercent}% YES, ${noPercent}% NO`}
            >
              <div
                className="h-full rounded-l-full bg-[#12B886] transition-all duration-500"
                style={{ width: `${yesPercent}%` }}
              />
              <div
                className="h-full rounded-r-full bg-[#E85D5D] transition-all duration-500"
                style={{ width: `${noPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Prediction options">
            <button
              type="button"
              onClick={(event) => openSide(event, "YES")}
              disabled={!isLive}
              aria-label={`Predict YES at ${yesPercent}%`}
              className={`relative rounded-xl border-2 px-3 py-2 text-left transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
                "border-[#12B886]/25 bg-[#12B886]/[0.06] text-[#047857] hover:border-[#12B886]/40 hover:bg-[#12B886]/12 hover:shadow-[0_2px_8px_rgba(18,184,134,0.12)]"
              }`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Predict YES</span>
              <span className="mt-0.5 block text-[15px] font-black tabular-nums">{yesPercent}%</span>
            </button>
            <button
              type="button"
              onClick={(event) => openSide(event, "NO")}
              disabled={!isLive}
              aria-label={`Predict NO at ${noPercent}%`}
              className={`relative rounded-xl border-2 px-3 py-2 text-left transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
                "border-[#E85D5D]/25 bg-[#E85D5D]/[0.06] text-[#B42318] hover:border-[#E85D5D]/40 hover:bg-[#E85D5D]/12 hover:shadow-[0_2px_8px_rgba(232,93,93,0.12)]"
              }`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Predict NO</span>
              <span className="mt-0.5 block text-[15px] font-black tabular-nums">{noPercent}%</span>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-bold text-[#6B7280]">
                <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" />
                {formatNaira(poolAmount)} pool
              </span>
              {activation.isProtected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#4F46E5]/8 px-2 py-0.5 text-[10px] font-bold text-[#4F46E5]">
                  <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                  {Math.round(activation.progress)}% protected
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9CA3AF]">
              <Users className="h-2.5 w-2.5" aria-hidden="true" />
              {m.participants ? `${m.participants} predicting` : "No one yet"}
            </span>
          </div>
        </div>
      </article>

      {showProtectedInfo && (
        <ProtectedMarketInfo
          isOpen={showProtectedInfo}
          onClose={() => setShowProtectedInfo(false)}
          activation={{
            progress: activation.progress,
            totalVolume: activation.totalVolume,
            requirements: activation.requirements,
          }}
        />
      )}
    </>
  );
};