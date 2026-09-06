import { ChevronRight, Clock, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Market,
  formatCountdown,
  formatNaira,
} from "@/lib/markets";
import { useForecastSlip } from "@/lib/forecast-slip";

const clampPercent = (value: number | undefined) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(99, n));
};

const timeLeft = (m: Market) => {
  const closeTime = m.tradingCloseTime || m.closeTime;
  return formatCountdown(closeTime, m.closesIn);
};

export const MarketCard = ({ m, featured = false }: { m: Market; featured?: boolean }) => {
  const { openForecastSlip } = useForecastSlip();
  const navigate = useNavigate();
  const tradingCloseTime = m.tradingCloseTime || m.closeTime;
  const hasEnded = tradingCloseTime ? new Date(tradingCloseTime).getTime() <= Date.now() : false;
  const isLive = m.status === "active" && !hasEnded;

  const yesPercent = clampPercent(m.yesPrice);
  const noPercent = 100 - yesPercent;
  const pool = Number(m.totalVolume ?? m.totalPool ?? 0) || 0;
  const participants = Number(m.participants || 0);

  const marketUrl = `${window.location.origin}/market/${m.id}`;

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
      participants,
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

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={openMarket}
        onKeyDown={handleKeyDown}
        aria-label={`${m.question}. The crowd says ${yesPercent}% YES, ${noPercent}% NO. ${isLive ? "Open for predictions." : "Predictions closed."} ${formatNaira(pool)} in the pool from ${participants} participants.`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4F46E5]/20 hover:shadow-[0_8px_28px_rgba(17,24,39,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5] active:translate-y-0 active:shadow-sm"
      >
        {/* Status row: confidentiality + distribution status */}
        <div className="flex items-center justify-between gap-2 px-4 pt-3.5">
          <div className="flex items-center gap-1.5">
            {m.visibility === "private" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#6B7280]/10 px-2.5 py-1 text-[10px] font-bold text-[#6B7280]">
                <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                Private
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#12B886]/10 px-2.5 py-1 text-[10px] font-bold text-[#047857]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#12B886] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#12B886]" />
                </span>
                {featured ? "Featured" : "Public"}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#9CA3AF] tabular-nums">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {isLive ? timeLeft(m) : "Closed"}
          </span>
        </div>

        {/* Question — the hero of the card */}
        <div className="px-4 pt-2.5">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-[#101828]">
            {m.question}
          </h3>
        </div>

        {/* Crowd view */}
        <div className="mt-3.5 px-4">
          <div className="flex items-end justify-between text-sm">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">YES</div>
              <div
                className="mt-0.5 text-[22px] font-black leading-none tabular-nums text-[#047857]"
                style={{ textShadow: "0 0 24px rgba(18,184,134,0.25)" }}
              >
                {yesPercent}%
              </div>
            </div>
            <div className="min-w-0 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">NO</div>
              <div
                className="mt-0.5 text-[22px] font-black leading-none tabular-nums text-[#B42318]"
                style={{ textShadow: "0 0 24px rgba(232,93,93,0.22)" }}
              >
                {noPercent}%
              </div>
            </div>
          </div>
          <div
            className="mt-2 flex h-2 overflow-hidden rounded-full bg-[#F3F4F6]"
            role="img"
            aria-label={`Market probability: ${yesPercent}% YES, ${noPercent}% NO`}
          >
            <div className="h-full rounded-l-full bg-[#12B886] transition-all duration-500" style={{ width: `${yesPercent}%` }} />
            <div className="h-full rounded-r-full bg-[#E85D5D] transition-all duration-500" style={{ width: `${noPercent}%` }} />
          </div>
        </div>

        {/* Quick predict */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 px-4" role="group" aria-label="Prediction options">
          <button
            type="button"
            onClick={(event) => openSide(event, "YES")}
            disabled={!isLive}
            aria-label={`Predict YES at ${yesPercent}%`}
            className={`relative rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
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
            className={`relative rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
              "border-[#E85D5D]/25 bg-[#E85D5D]/[0.06] text-[#B42318] hover:border-[#E85D5D]/40 hover:bg-[#E85D5D]/12 hover:shadow-[0_2px_8px_rgba(232,93,93,0.12)]"
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Predict NO</span>
            <span className="mt-0.5 block text-[15px] font-black tabular-nums">{noPercent}%</span>
          </button>
        </div>

        {/* Footer: pool + participants, single information line */}
        <div className="mt-auto flex items-center justify-between border-t border-[#F3F4F6] px-4 py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B7280]">
            <span className="tabular-nums">{formatNaira(pool)}</span>
            <span className="text-[#9CA3AF]">pool · {participants ? `${participants} predicting` : "no one yet"}</span>
          </div>
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#4F46E5] transition-transform group-hover:translate-x-0.5">
            Details
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>

        {/* PUBLIC markets always shareable without a code — expose direct URL hint subtly */}
        {!isLive && m.visibility !== "private" && (
          <div className="hidden">
            {marketUrl}
          </div>
        )}
      </article>
    </>
  );
};