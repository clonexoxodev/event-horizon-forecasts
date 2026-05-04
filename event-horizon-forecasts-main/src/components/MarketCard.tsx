import { Clock, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Market, formatNaira } from "@/lib/markets";
import { useAuth } from "@/lib/auth";

const categoryColors: Record<string, string> = {
  Finance:       "bg-blue-50 text-blue-600",
  Politics:      "bg-amber-50 text-amber-600",
  Trending:      "bg-rose-50 text-rose-600",
  Entertainment: "bg-purple-50 text-purple-600",
  Economy:       "bg-emerald-50 text-emerald-600",
  Technology:    "bg-sky-50 text-sky-600",
  Others:        "bg-secondary text-muted-foreground",
};

export const MarketCard = ({ m }: { m: Market }) => {
  const no = 100 - m.yesPercent;
  const { user, setAuthOpen } = useAuth();

  const handleSide = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) setAuthOpen(true);
  };

  const colorClass = categoryColors[m.category] ?? categoryColors.Others;

  return (
    <Link
      to={`/market/${m.id}`}
      className="group bg-card rounded-2xl p-5 shadow-card hover:shadow-elevated transition-smooth border border-border/50 flex flex-col gap-4 hover:-translate-y-1 bg-gradient-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 rounded-xl bg-secondary/70 grid place-items-center text-2xl leading-none shrink-0">
          {m.icon}
        </div>
        <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${colorClass}`}>
          {m.category}
        </span>
      </div>

      {/* Question */}
      <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 min-h-[44px] group-hover:text-primary transition-smooth">
        {m.question}
      </h3>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs font-bold mb-2">
          <span className="text-success flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
            YES {m.yesPercent}%
          </span>
          <span className="text-danger flex items-center gap-1">
            NO {no}%
            <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" />
          </span>
        </div>
        <div className="h-2 rounded-full bg-danger-soft overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-700"
            style={{ width: `${m.yesPercent}%` }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleSide}
          className="rounded-xl bg-success-soft hover:bg-success hover:text-white transition-smooth py-2.5 text-sm font-bold text-success border border-success/20 hover:border-success"
        >
          YES · {m.yesPercent}%
        </button>
        <button
          onClick={handleSide}
          className="rounded-xl bg-danger-soft hover:bg-danger hover:text-white transition-smooth py-2.5 text-sm font-bold text-danger border border-danger/20 hover:border-danger"
        >
          NO · {no}%
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-3">
        <span className="flex items-center gap-1.5 font-semibold">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          {formatNaira(m.pool)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          {Math.floor(m.pool / 4200).toLocaleString()} traders
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {m.closesIn}
        </span>
      </div>
    </Link>
  );
};
