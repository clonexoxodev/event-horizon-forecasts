import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import apiService, { type ApiPosition } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatStake, formatLabel, formatKickoff } from "@/lib/football";
import { cn } from "@/lib/utils";

const statusPill = (position: ApiPosition) => {
  const status = String(position.status || "active").toLowerCase();
  if (["won", "settled"].includes(status) || position.isWinner)
    return "bg-flippe-accent/15 text-flippe-accent";
  if (["lost"].includes(status))
    return "bg-coral/10 text-coral";
  if (["refunded", "cancelled"].includes(status))
    return "bg-flippe-surface-2 text-flippe-muted";
  return "bg-flippe-accent/10 text-flippe-accent";
};

const positionStatusLabel = (position: ApiPosition): string => {
  const status = String(position.status || "active").toLowerCase();
  if (["won"].includes(status) || position.isWinner) return "Won";
  if (["lost"].includes(status)) return "Lost";
  if (["refunded", "cancelled"].includes(status)) return "Refunded";
  if (["pending_resolution", "settling", "pending"].includes(status)) return "Settling";
  return "Active";
};

const MyArguments = () => {
  const { user } = useAuth();
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getPositions();
      setPositions((res.positions || []).filter((p) => p.isFixedArgument));
    } catch (err: any) {
      setError(err?.message || "Could not load your arguments.");
    } finally {
      setLoading(false);
    }
  }, []);

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    load();
  }, [load]);

  const active = positions.filter((p) => ["active", "pending"].includes(String(p.status).toLowerCase()));
  const settled = positions.filter((p) => !active.includes(p));

  return (
    <div className="app-bg min-h-screen pb-[calc(72px+env(safe-area-inset-bottom))] text-flippe-text md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-[860px] px-4 py-5 sm:px-6 lg:py-7">
        <section className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-flippe-accent">FLIPPE</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">My Arguments</h1>
          <p className="mt-1 text-sm text-flippe-muted">
            Every argument you've backed, in one place.
          </p>
        </section>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-2xl border border-flippe-border bg-flippe-surface soft-shimmer" />
            ))}
          </div>
        ) : error ? (
          <div className="surface rounded-2xl p-10 text-center">
            <h3 className="text-base font-bold">Could not load your arguments</h3>
            <p className="mt-1.5 text-sm text-flippe-muted">{error}</p>
            <button
              onClick={load}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-flippe-border px-6 py-2.5 text-sm font-bold text-flippe-text transition hover:bg-flippe-surface-2"
            >
              Retry
            </button>
          </div>
        ) : positions.length === 0 ? (
          <div className="surface rounded-2xl border border-dashed p-12 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-flippe-surface-2">
              <ShieldCheck className="h-6 w-6 text-flippe-accent" />
            </div>
            <h3 className="text-base font-bold">No arguments yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-flippe-muted">
              {user
                ? "Back a claim on a football match to see it here."
                : "Sign in and back a claim on a football match to see it here."}
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-flippe-accent px-6 py-2.5 text-sm font-bold text-flippe-onaccent transition hover:bg-flippe-accent-strong"
            >
              Find a match
            </Link>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="mb-6">
                <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-flippe-muted">
                  Active · {active.length}
                </h2>
                <div className="space-y-3">
                  {active.map((p) => (
                    <ArgumentPositionCard key={p.id} position={p} />
                  ))}
                </div>
              </section>
            )}
            {settled.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-flippe-muted">
                  Settled · {settled.length}
                </h2>
                <div className="space-y-3">
                  {settled.map((p) => (
                    <ArgumentPositionCard key={p.id} position={p} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <MobileNav />
    </div>
  );
};

const ArgumentPositionCard = ({ position }: { position: ApiPosition }) => {
  const snapshot = position.matchSnapshot;
  const teams = snapshot?.home?.name && snapshot?.away?.name
    ? `${snapshot.home.name} vs ${snapshot.away.name}`
    : position.category || "Football";
  const sideClass = position.side === "YES"
    ? "border-flippe-accent/40 bg-flippe-accent/10 text-flippe-accent"
    : "border-coral/40 bg-coral/10 text-coral";

  return (
    <Link
      to={`/argument/${position.marketId}`}
      className="surface group block rounded-2xl p-4 transition-all duration-200 hover:border-flippe-accent/40 hover:shadow-card active:scale-[0.99]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-flippe-muted">
          <span className="truncate">{teams}</span>
          <span className="text-flippe-border">·</span>
          <span>{formatLabel(position.participationFormat)}</span>
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", statusPill(position))}>
            {positionStatusLabel(position)}
          </span>
          <span className={cn("rounded-lg border px-2 py-0.5 text-[11px] font-bold", sideClass)}>
            {position.side}
          </span>
        </div>
      </div>

      <h3 className="line-clamp-2 text-[15px] font-bold leading-snug">{position.marketQuestion}</h3>

      {position.opinion && (
        <p className="mt-2 line-clamp-2 rounded-xl bg-flippe-surface-2 px-3 py-2 text-xs italic leading-relaxed text-flippe-muted">
          "{position.opinion}"
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-flippe-border pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-flippe-muted">
          <span className="font-bold text-flippe-text">{formatStake(position.stakeSmallestUnit ?? 0)}</span>
          {position.participants != null && position.participants > 0 && (
            <span>{position.participants} participant{position.participants === 1 ? "" : "s"}</span>
          )}
          {position.fixtureId != null && snapshot?.kickoff && (
            <span>Kicks off {formatKickoff(snapshot.kickoff)}</span>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-flippe-accent transition-transform group-hover:translate-x-0.5">
          View <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
};

export default MyArguments;