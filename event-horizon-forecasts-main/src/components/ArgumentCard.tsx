import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { ApiMarket } from "@/lib/api";
import { argumentStatusLabel, formatStake, formatLabel } from "@/lib/football";
import { cn } from "@/lib/utils";

const statusColor = (status: ApiMarket["status"]) => {
  switch (status) {
    case "resolved":
      return "bg-flippe-accent/10 text-flippe-accent";
    case "pending_resolution":
      return "bg-[#F59E0B]/10 text-[#F59E0B]";
    case "refunded":
    case "cancelled":
      return "bg-flippe-surface-2 text-flippe-muted";
    default:
      return "bg-flippe-accent/10 text-flippe-accent";
  }
};

const YES_NO_STYLE = {
  YES: "bg-flippe-accent/10 text-flippe-accent border-flippe-accent/30",
  NO: "bg-coral/10 text-coral border-coral/30",
} as const;

export const ArgumentCard = ({ argument }: { argument: ApiMarket }) => {
  const argLink = `/argument/${argument.id}`;
  const snapshot = argument.matchSnapshot;
  const label =
    snapshot?.home && snapshot.away
      ? `${snapshot.home.name} vs ${snapshot.away.name}`
      : argument.category === "Football" ? "Football" : argument.category;

  return (
    <Link
      to={argLink}
      className="surface group block rounded-2xl p-4 transition-all duration-200 hover:border-flippe-accent/40 hover:shadow-card active:scale-[0.99]"
      aria-label={`${argument.question} — ${formatStake(argument.stakeSmallestUnit)}`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="inline-flex max-w-[60%] items-center gap-1.5 rounded-full bg-flippe-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-flippe-muted">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", statusColor(argument.status))}>
            {argumentStatusLabel(argument)}
          </span>
          <span className="rounded-full border border-flippe-border px-2 py-0.5 text-[10px] font-bold text-flippe-muted">
            {formatLabel(argument.participationFormat)}
          </span>
        </div>
      </div>

      <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-flippe-text">{argument.question}</h3>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-flippe-border pt-3">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-lg border px-2.5 py-1 text-[11px] font-bold", YES_NO_STYLE.YES)}>YES</span>
          <span className={cn("rounded-lg border px-2.5 py-1 text-[11px] font-bold", YES_NO_STYLE.NO)}>NO</span>
          <span className="text-[11px] font-medium text-flippe-muted">
            Stake {formatStake(argument.stakeSmallestUnit)}
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-flippe-accent transition-transform group-hover:translate-x-0.5">
          Join <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
};