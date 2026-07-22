import { TrendingUp, Users, Activity, Clock } from "lucide-react";
import { Market } from "@/lib/markets";
import { formatNaira } from "@/lib/markets";

interface MarketHealthIndicatorsProps {
  market: Market;
  variant?: "compact" | "detailed";
}

export const MarketHealthIndicators = ({ market, variant = "compact" }: MarketHealthIndicatorsProps) => {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-graphite">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="font-semibold text-charcoal">{formatNaira(market.totalVolume || 0)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-graphite">
          <Users className="w-3.5 h-3.5" />
          <span className="font-semibold text-charcoal">{market.participants}</span>
        </div>

        {market.confidence !== undefined && (
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-graphite" />
            <span
              className={`font-semibold ${
                market.confidence >= 75
                  ? "text-emerald"
                  : market.confidence >= 50
                  ? "text-emerald"
                  : market.confidence >= 25
                  ? "text-orange-500"
                  : "text-coral"
              }`}
            >
              {market.confidence}%
            </span>
          </div>
        )}

        {market.closesIn && (
          <div className="flex items-center gap-1.5 text-graphite">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-medium">{market.closesIn}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-graphite/5 rounded-xl p-3 border border-graphite/10">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald" />
            <span className="text-xs text-graphite font-medium">Market volume</span>
          </div>
          <div className="font-bold text-lg text-charcoal">{formatNaira(market.totalVolume || 0)}</div>
        </div>

        <div className="bg-graphite/5 rounded-xl p-3 border border-graphite/10">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-emerald" />
            <span className="text-xs text-graphite font-medium">Participants</span>
          </div>
          <div className="font-bold text-lg text-charcoal">{market.participants}</div>
          <div className="text-xs text-graphite mt-0.5">Active traders</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {market.confidence !== undefined && (
          <div className="bg-graphite/5 rounded-xl p-3 border border-graphite/10">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-emerald" />
              <span className="text-xs text-graphite font-medium">Market sentiment</span>
            </div>
            <div className="flex items-baseline gap-2">
              <div
                className={`font-bold text-lg ${
                  market.confidence >= 75
                    ? "text-emerald"
                    : market.confidence >= 50
                    ? "text-emerald"
                    : market.confidence >= 25
                    ? "text-orange-500"
                    : "text-coral"
                }`}
              >
                {market.confidence}%
              </div>
            </div>
            <div className="mt-2 h-1.5 bg-graphite/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  market.confidence >= 75
                    ? "bg-emerald"
                    : market.confidence >= 50
                    ? "bg-emerald"
                    : market.confidence >= 25
                    ? "bg-orange-500"
                    : "bg-coral"
                }`}
                style={{ width: `${market.confidence}%` }}
              />
            </div>
          </div>
        )}

        {market.volatility !== undefined && (
          <div className="bg-graphite/5 rounded-xl p-3 border border-graphite/10">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-emerald" />
              <span className="text-xs text-graphite font-medium">Volatility</span>
            </div>
            <div className="flex items-baseline gap-2">
              <div
                className={`font-bold text-lg ${
                  market.volatility <= 30
                    ? "text-emerald"
                    : market.volatility <= 60
                    ? "text-orange-500"
                    : "text-coral"
                }`}
              >
                {market.volatility}%
              </div>
            </div>
            <div className="mt-2 h-1.5 bg-graphite/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  market.volatility <= 30
                    ? "bg-emerald"
                    : market.volatility <= 60
                    ? "bg-orange-500"
                    : "bg-coral"
                }`}
                style={{ width: `${market.volatility}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {market.closesIn && (
        <div className="bg-emerald/5 rounded-xl p-3 border border-emerald/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald" />
              <span className="text-xs text-graphite font-medium">Closes in</span>
            </div>
            <span className="font-bold text-sm text-emerald">{market.closesIn}</span>
          </div>
        </div>
      )}
    </div>
  );
};
