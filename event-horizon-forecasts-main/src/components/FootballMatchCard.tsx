import { Link } from "react-router-dom";
import { ChevronRight, MapPin } from "lucide-react";
import type { NormalizedFixture } from "@/lib/api";
import { formatKickoff, isMatchLive, matchClock } from "@/lib/football";
import { cn } from "@/lib/utils";

const teamLogo = (logo: string | null | undefined, name: string) =>
  logo
    ? <img src={logo} alt="" className="h-8 w-8 rounded-full object-contain" loading="lazy" />
    : <div className="grid h-8 w-8 place-items-center rounded-full bg-flippe-surface-2 text-xs font-bold text-flippe-muted">{name.slice(0, 2).toUpperCase()}</div>;

export const FootballMatchCard = ({ fixture }: { fixture: NormalizedFixture }) => {
  const live = isMatchLive(fixture);
  const clock = matchClock(fixture);
  const started = !!fixture.score?.home || !!fixture.score?.away;

  return (
    <Link
      to={`/football/${fixture.id}`}
      className="surface group block rounded-2xl p-4 transition-all duration-200 hover:border-flippe-accent/40 hover:shadow-card active:scale-[0.99]"
      aria-label={`${fixture.home?.name} vs ${fixture.away?.name} — see arguments`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-flippe-muted">
          <span className="truncate">{fixture.league?.country || fixture.league?.name || "Football"}</span>
          {fixture.league?.name && fixture.league.country && <span className="text-flippe-border">/</span>}
          {fixture.league?.name && (
            <span className="truncate text-flippe-muted/80">{fixture.league.name}</span>
          )}
        </div>
        <div className="shrink-0">
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-flippe-accent/15 px-2 py-0.5 text-[10px] font-bold text-flippe-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flippe-accent" />
              {clock}
            </span>
          ) : (
            <span className="rounded-full bg-flippe-surface-2 px-2 py-0.5 text-[10px] font-bold text-flippe-muted">
              {clock}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          {teamLogo(fixture.home?.logo, fixture.home?.name || "Home")}
          <span className="w-full truncate text-center text-[13px] font-bold text-flippe-text">{fixture.home?.name || "Home"}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          {started || live ? (
            <span className="text-lg font-black tabular-nums text-flippe-text">
              {fixture.score?.home ?? 0} <span className="mx-0.5 text-flippe-muted">:</span> {fixture.score?.away ?? 0}
            </span>
          ) : (
            <span className="rounded-lg px-1.5 py-1 text-[11px] font-bold text-flippe-muted">VS</span>
          )}
          <span className="text-[10px] font-semibold text-flippe-muted">{formatKickoff(fixture.kickoff)}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          {teamLogo(fixture.away?.logo, fixture.away?.name || "Away")}
          <span className="w-full truncate text-center text-[13px] font-bold text-flippe-text">{fixture.away?.name || "Away"}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-flippe-border pt-3">
        <span className={cn("flex min-w-0 items-center gap-1 text-[11px] text-flippe-muted", !fixture.venue && "opacity-0")}>
          {fixture.venue && <MapPin className="h-3 w-3 shrink-0" />}
          <span className="truncate">{fixture.venue}</span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-flippe-accent transition-transform group-hover:translate-x-0.5">
          Start an Argument <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
};