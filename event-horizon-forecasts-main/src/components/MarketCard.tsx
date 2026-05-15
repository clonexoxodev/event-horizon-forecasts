import { Clock, TrendingUp, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Market, formatNaira } from "@/lib/markets";
import { useAuth } from "@/lib/auth";
import { useForecastSlip } from "@/lib/forecast-slip";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useState } from "react";

const categoryColors: Record<string, string> = {
  Finance:       "bg-purple/10 text-purple border-purple/20",
  Politics:      "bg-purple/10 text-purple border-purple/20",
  Trending:      "bg-purple/10 text-purple border-purple/20",
  Entertainment: "bg-purple/10 text-purple border-purple/20",
  Economy:       "bg-purple/10 text-purple border-purple/20",
  Technology:    "bg-purple/10 text-purple border-purple/20",
  Others:        "bg-graphite/10 text-graphite border-graphite/20",
};

export const MarketCard = ({ m }: { m: Market }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openForecastSlip } = useForecastSlip();
  const [activeSide, setActiveSide] = useState<"YES" | "NO" | null>(null);

  const handleSide = (e: React.MouseEvent, side: "YES" | "NO") => {
    e.preventDefault();
    if (!user) {
      navigate("/signup");
      return;
    }
    
    // Visual feedback
    setActiveSide(side);
    
    // Small delay for visual feedback
    setTimeout(() => {
      openForecastSlip({
        marketId: m.id,
        marketQuestion: m.question,
        marketIcon: m.icon,
        side,
        currentPrice: side === "YES" ? m.yesPrice : m.noPrice,
      });
      setActiveSide(null);
    }, 150);
  };

  const colorClass = categoryColors[m.category] ?? categoryColors.Others;

  return (
    <Link
      to={`/market/${m.id}`}
      className="group bg-white rounded-xl p-5 shadow-card hover:shadow-elevated transition-normal border border-graphite/10 hover:border-graphite/20 flex flex-col gap-4 hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 gradient-overlay-purple pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="w-11 h-11 rounded-xl bg-graphite/5 grid place-items-center text-2xl leading-none shrink-0 group-hover:scale-105 transition-transform duration-280">
          {m.icon}
        </div>
        <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0 border ${colorClass}`}>
          {m.category}
        </span>
      </div>

      {/* Question */}
      <h3 className="font-semibold text-base leading-snug line-clamp-2 min-h-[44px] text-charcoal group-hover:text-purple transition-colors duration-280 tracking-tight relative z-10">
        {m.question}
      </h3>

      {/* Progress bar */}
      <div className="relative z-10">
        <div className="flex justify-between text-xs font-bold mb-2 tracking-wide">
          <span className="text-emerald flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald inline-block" />
            YES <AnimatedNumber value={m.yesPrice} suffix="%" />
          </span>
          <span className="text-coral flex items-center gap-1.5">
            NO <AnimatedNumber value={m.noPrice} suffix="%" />
            <span className="w-1.5 h-1.5 rounded-full bg-coral inline-block" />
          </span>
        </div>
        <div className="h-2 rounded-full bg-coral-soft overflow-hidden">
          <div
            className="h-full bg-emerald rounded-full transition-all duration-700"
            style={{ width: `${m.yesPrice}%` }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2.5 relative z-10">
        <button
          onClick={(e) => handleSide(e, "YES")}
          disabled={activeSide === "YES"}
          className={`rounded-xl py-2.5 text-sm font-bold border transition-all duration-280 relative overflow-hidden ${
            activeSide === "YES"
              ? "bg-emerald text-white border-emerald scale-95 ring-2 ring-emerald/30"
              : "bg-emerald-soft text-emerald border-emerald/20 hover:bg-emerald hover:text-white hover:border-emerald hover:shadow-sm active:scale-95"
          }`}
        >
          <span className={`flex items-center justify-center gap-1.5 ${activeSide === "YES" ? "animate-pulse" : ""}`}>
            {activeSide === "YES" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping absolute" />}
            YES · <AnimatedNumber value={m.yesPrice} suffix="%" />
          </span>
        </button>
        <button
          onClick={(e) => handleSide(e, "NO")}
          disabled={activeSide === "NO"}
          className={`rounded-xl py-2.5 text-sm font-bold border transition-all duration-280 relative overflow-hidden ${
            activeSide === "NO"
              ? "bg-coral text-white border-coral scale-95 ring-2 ring-coral/30"
              : "bg-coral-soft text-coral border-coral/20 hover:bg-coral hover:text-white hover:border-coral hover:shadow-sm active:scale-95"
          }`}
        >
          <span className={`flex items-center justify-center gap-1.5 ${activeSide === "NO" ? "animate-pulse" : ""}`}>
            {activeSide === "NO" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping absolute" />}
            NO · <AnimatedNumber value={m.noPrice} suffix="%" />
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-graphite border-t border-graphite/10 pt-3 relative z-10">
        <span className="flex items-center gap-1.5 font-semibold">
          <TrendingUp className="w-4 h-4 text-purple" />
          {formatNaira(m.totalPool)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          <AnimatedNumber value={m.participants} />
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {m.closesIn}
        </span>
      </div>
    </Link>
  );
};
