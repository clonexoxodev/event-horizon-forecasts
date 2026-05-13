import { Clock, TrendingUp, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Market, formatNaira } from "@/lib/markets";
import { useAuth } from "@/lib/auth";
import { PredictionModal } from "@/components/PredictionModal";
import { useState } from "react";

const categoryColors: Record<string, string> = {
  Finance:       "bg-blue-50 text-blue-600 border-blue-200",
  Politics:      "bg-amber-50 text-amber-600 border-amber-200",
  Trending:      "bg-rose-50 text-rose-600 border-rose-200",
  Entertainment: "bg-purple-50 text-purple-600 border-purple-200",
  Economy:       "bg-emerald-50 text-emerald-600 border-emerald-200",
  Technology:    "bg-sky-50 text-sky-600 border-sky-200",
  Others:        "bg-gray-50 text-gray-600 border-gray-200",
};

export const MarketCard = ({ m }: { m: Market }) => {
  const no = 100 - m.yesPercent;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [predictionModalOpen, setPredictionModalOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState<"YES" | "NO">("YES");
  const [activeSide, setActiveSide] = useState<"YES" | "NO" | null>(null);

  const handleSide = (e: React.MouseEvent, side: "YES" | "NO") => {
    e.preventDefault();
    if (!user) {
      navigate("/signup");
      return;
    }
    
    // Visual feedback
    setActiveSide(side);
    setSelectedSide(side);
    
    // Small delay for visual feedback
    setTimeout(() => {
      setPredictionModalOpen(true);
    }, 150);
  };

  const handleModalClose = () => {
    setPredictionModalOpen(false);
    setTimeout(() => {
      setActiveSide(null);
    }, 300);
  };

  const colorClass = categoryColors[m.category] ?? categoryColors.Others;

  return (
    <Link
      to={`/market/${m.id}`}
      className="group bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-all duration-280 border border-border/40 hover:border-border/60 flex flex-col gap-3.5 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] relative overflow-hidden"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 gradient-overlay-purple pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="w-10 h-10 rounded-lg bg-graphite/8 grid place-items-center text-xl leading-none shrink-0 group-hover:scale-105 transition-transform duration-280">
          {m.icon}
        </div>
        <span className={`text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-md shrink-0 border ${colorClass}`}>
          {m.category}
        </span>
      </div>

      {/* Question */}
      <h3 className="font-semibold text-[15px] leading-[1.4] line-clamp-2 min-h-[42px] text-charcoal group-hover:text-purple transition-colors duration-280 tracking-tight relative z-10">
        {m.question}
      </h3>

      {/* Progress bar */}
      <div className="relative z-10">
        <div className="flex justify-between text-[11px] font-bold mb-2 tracking-wide">
          <span className="text-emerald flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald inline-block" />
            YES {m.yesPercent}%
          </span>
          <span className="text-coral flex items-center gap-1">
            NO {no}%
            <span className="w-1.5 h-1.5 rounded-full bg-coral inline-block" />
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-coral-soft/60 overflow-hidden border border-coral/10">
          <div
            className="h-full bg-emerald rounded-full transition-all duration-700 ease-smooth"
            style={{ width: `${m.yesPercent}%` }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2 relative z-10">
        <button
          onClick={(e) => handleSide(e, "YES")}
          disabled={activeSide === "YES"}
          className={`rounded-lg py-2 text-[13px] font-bold border transition-all duration-280 relative overflow-hidden group/btn ${
            activeSide === "YES"
              ? "bg-emerald text-white border-emerald scale-95 ring-2 ring-emerald/30"
              : "bg-emerald-soft/60 text-emerald border-emerald/20 hover:bg-emerald hover:text-white hover:border-emerald hover:scale-105 active:scale-95"
          }`}
        >
          <span className={`flex items-center justify-center gap-1 ${activeSide === "YES" ? "animate-pulse" : ""}`}>
            {activeSide === "YES" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping absolute" />}
            YES · {m.yesPercent}%
          </span>
        </button>
        <button
          onClick={(e) => handleSide(e, "NO")}
          disabled={activeSide === "NO"}
          className={`rounded-lg py-2 text-[13px] font-bold border transition-all duration-280 relative overflow-hidden group/btn ${
            activeSide === "NO"
              ? "bg-coral text-white border-coral scale-95 ring-2 ring-coral/30"
              : "bg-coral-soft/60 text-coral border-coral/20 hover:bg-coral hover:text-white hover:border-coral hover:scale-105 active:scale-95"
          }`}
        >
          <span className={`flex items-center justify-center gap-1 ${activeSide === "NO" ? "animate-pulse" : ""}`}>
            {activeSide === "NO" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping absolute" />}
            NO · {no}%
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-graphite border-t border-border/30 pt-3 relative z-10">
        <span className="flex items-center gap-1.5 font-semibold">
          <TrendingUp className="w-3.5 h-3.5 text-purple" />
          {formatNaira(m.pool)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          {Math.floor(m.pool / 4200).toLocaleString()}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {m.closesIn}
        </span>
      </div>

      {/* Prediction Modal */}
      <PredictionModal
        open={predictionModalOpen}
        onClose={handleModalClose}
        market={{
          id: m.id,
          question: m.question,
          icon: m.icon,
          yesPercent: m.yesPercent,
        }}
        side={selectedSide}
      />
    </Link>
  );
};
