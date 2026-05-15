import { TrendingUp, Users, Activity, Clock } from "lucide-react";
import { Market } from "@/lib/markets";
import { getMarketHealth } from "@/lib/market-pricing";
import { formatNaira } from "@/lib/markets";

interface MarketHealthIndicatorsProps {
  market: Market;
  variant?: "compact" | "detailed";
}

export const MarketHealthIndicators = ({ market, variant = "compact" }: MarketHealthIndicatorsProps) => {
  const health = getMarketHealth({
    yesPool: market.yesPool,
    noPool: market.noPool,
    totalPool: market.totalPool,
    yesPrice: market.yesPrice,
    noPrice: market.noPrice,
    liquidity: market.liquidity || market.totalPool,
    confidence: market.confidence || 50,
    volatility: market.volatility || 50,
  });

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-4 text-xs">
        {/* Pool Size */}
        <div className="flex items-center gap-1.5 text-graphite">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="font-semibold text-charcoal">{formatNaira(market.totalPool)}</span>
        </div>

        {/* Participants */}
        <div className="flex items-center gap-1.5 text-graphite">
          <Users className="w-3.5 h-3.5" />
          <span className="font-semibold text-charcoal">{market.participants}</span>
        </div>

        {/* Confidence */}
        {market.confidence !== undefined && (
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-graphite" />
            <span
              className={`font-semibold ${
                market.confidence >= 75
                  ? "text-emerald"
                  : market.confidence >= 50
                  ? "text-purple"
                  : market.confidence >= 25
                  ? "text-orange-500"
                  : "text-coral"
              }`}
            >
              {market.confidence}%
            </span>
          </div>
        )}

        {/* Time Remaining */}
        {market.closesIn && (
          <div className="flex items-center gap-1.5 text-graphite">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-medium">{market.closesIn}</span>
          </div>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className="space-y-3">
      {/* Market Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pool Size */}
        <div className="bg-graphite/5 rounded-xl p-3 border border-graphite/10">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple" />
            <span className="text-xs text-graphite font-medium">Pool Size</span>
          </div>
          <div className="font-bold text-lg text-charcoal">{formatNaira(market.totalPool)}</div>
          <div className="text-xs text-graphite mt-0.5">
            Liquidity: {health.liquidityLevel}
          </div>
        </div>

        {/* Participants */}
        <div className="bg-graphite/5 rounded-xl p-3 border border-graphite/10">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple" />
            <span className="text-xs text-graphite font-medium">Traders</span>
          </div>
          <div className="font-bold text-lg text-charcoal">{market.participants}</div>
          <div className="text-xs text-graphite mt-0.5">
            Active forecasters
          </div>
        </div>
      </div>

      {/* Market Health Indicators */}
      <div className="grid grid-cols-2 gap-3">
        {/* Confidence */}
        {market.confidence !== undefined && (
          <div className="bg-graphite/5 rounded-xl p-3 border border-graphite/10">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple" />
              <span className="text-xs text-graphite font-medium">Confidence</span>
            </div>
            <div className="flex items-baseline gap-2">
              <div
                className={`font-bold text-lg ${
                  market.confidence >= 75
                    ? "text-emerald"
                    : market.confidence >= 50
                    ? "text-purple"
                    : market.confidence >= 25
                    ? "text-orange-500"
                    : "text-coral"
                }`}
              >
                {market.confidence}%
              </div>
              <span className="text-xs text-graphite capitalize">{health.health}</span>
            </div>
            <div className="mt-2 h-1.5 bg-graphite/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  market.confidence >= 75
                    ? "bg-emerald"
                    : market.confidence >= 50
                    ? "bg-purple"
                    : market.confidence >= 25
                    ? "bg-orange-500"
                    : "bg-coral"
                }`}
                style={{ width: `${market.confidence}%` }}
              />
            </div>
          </div>
        )}

        {/* Volatility */}
        {market.volatility !== undefined && (
          <div className="bg-graphite/5 rounded-xl p-3 border border-graphite/10">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple" />
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
              <span className="text-xs text-graphite capitalize">{health.stabilityLevel}</span>
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

      {/* Time Remaining */}
      {market.closesIn && (
        <div className="bg-purple/5 rounded-xl p-3 border border-purple/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple" />
              <span className="text-xs text-graphite font-medium">Closes in</span>
            </div>
            <span className="font-bold text-sm text-purple">{market.closesIn}</span>
          </div>
        </div>
      )}
    </div>
  );
};
