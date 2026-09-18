import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, PlusCircle, Trophy } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { ArgumentCard } from "@/components/ArgumentCard";
import { CreateArgumentModal } from "@/components/CreateArgumentModal";
import apiService, { type ApiMarket, type ApiFootballMatchBundle } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatKickoffFull, isMatchLive, matchClock } from "@/lib/football";
import { Button } from "@/components/ui/button";

const bigLogo = (logo: string | null | undefined, name: string) =>
  logo
    ? <img src={logo} alt="" className="h-16 w-16 rounded-2xl object-contain" loading="lazy" />
    : <div className="grid h-16 w-16 place-items-center rounded-2xl bg-flippe-surface-2 text-lg font-bold text-flippe-muted">{name.slice(0, 2).toUpperCase()}</div>;

const FixtureDetail = () => {
  const { fixtureId } = useParams<{ fixtureId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [bundle, setBundle] = useState<ApiFootballMatchBundle | null>(null);
  const [argumentsList, setArgumentsList] = useState<ApiMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!fixtureId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getFootballMatch(Number(fixtureId));
      setBundle(res);
      setArgumentsList(res.publicArguments || []);
    } catch (err: any) {
      setError(err?.message || "Could not load this match.");
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => {
    load();
  }, [load]);

  const fixture = bundle?.fixture;
  const live = isMatchLive(fixture);

  const handleCreated = (marketId: string) => {
    navigate(`/argument/${marketId}`);
  };

  return (
    <div className="app-bg min-h-screen pb-[calc(72px+env(safe-area-inset-bottom))] text-flippe-text md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-[860px] px-4 py-5 sm:px-6 lg:py-7">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-flippe-muted transition hover:text-flippe-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>

        {loading ? (
          <div className="space-y-4">
            <div className="h-64 rounded-2xl border border-flippe-border bg-flippe-surface soft-shimmer" />
            <div className="h-40 rounded-2xl border border-flippe-border bg-flippe-surface soft-shimmer" />
          </div>
        ) : error || !fixture ? (
          <div className="surface rounded-2xl p-12 text-center">
            <h3 className="text-base font-bold">Could not load this match</h3>
            <p className="mt-1.5 text-sm text-flippe-muted">{error || "This match is not available."}</p>
            <Button
              onClick={load}
              variant="outline"
              className="mt-6 border-flippe-border text-flippe-text"
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Match hero */}
            <section className="surface rounded-2xl p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-flippe-muted">
                  {fixture.league?.logo && <img src={fixture.league.logo} alt="" className="h-4 w-4 rounded object-contain" />}
                  {fixture.league?.country || fixture.league?.name || "Football"}
                  {fixture.league?.name && fixture.league.country ? " / " : ""}
                  {fixture.league?.name && fixture.league.country ? fixture.league.name : ""}
                </span>
                <span
                  className={
                    live
                      ? "inline-flex items-center gap-1.5 rounded-full bg-flippe-accent/15 px-2.5 py-1 text-xs font-bold text-flippe-accent"
                      : "rounded-full bg-flippe-surface-2 px-2.5 py-1 text-xs font-bold text-flippe-muted"
                  }
                >
                  {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flippe-accent" />}
                  {matchClock(fixture)}
                </span>
              </div>

              <div className="flex items-center justify-center gap-4 sm:gap-6">
                <div className="flex flex-1 flex-col items-center gap-2">
                  {bigLogo(fixture.home?.logo, fixture.home?.name || "Home")}
                  <span className="text-center text-sm font-bold sm:text-base">{fixture.home?.name || "Home"}</span>
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <div className="text-3xl font-black tabular-nums sm:text-4xl">
                    {fixture.score?.home != null ? fixture.score.home : "–"}
                    <span className="mx-1 text-flippe-muted">:</span>
                    {fixture.score?.away != null ? fixture.score.away : "–"}
                  </div>
                  <div className="text-[11px] text-flippe-muted">{formatKickoffFull(fixture.kickoff)}</div>
                </div>
                <div className="flex flex-1 flex-col items-center gap-2">
                  {bigLogo(fixture.away?.logo, fixture.away?.name || "Away")}
                  <span className="text-center text-sm font-bold sm:text-base">{fixture.away?.name || "Away"}</span>
                </div>
              </div>

              {fixture.venue && (
                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-flippe-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  {fixture.venue}
                </div>
              )}

              <div className="mt-5 border-t border-flippe-border pt-4">
                {user ? (
                  <Button
                    onClick={() => setCreateOpen(true)}
                    className="w-full bg-flippe-accent text-flippe-onaccent hover:bg-flippe-accent-strong"
                  >
                    <PlusCircle className="h-4 w-4" strokeWidth={2.2} />
                    Start an Argument
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate("/login", { state: { from: { pathname: `/football/${fixtureId}` } } })}
                    className="w-full bg-flippe-accent text-flippe-onaccent hover:bg-flippe-accent-strong"
                  >
                    Sign in to start an argument
                  </Button>
                )}
              </div>
            </section>

            {/* Match stats */}
            {bundle?.stats && bundle.stats.length > 0 && (
              <section className="surface mt-4 rounded-2xl p-5">
                <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-flippe-muted">Match information</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {bundle.stats.slice(0, 8).map((stat: any) => (
                    <div key={stat?.type || "stat"} className="flex items-center justify-between rounded-xl bg-flippe-surface-2 px-3 py-2.5">
                      <span className="text-xs font-semibold text-flippe-muted">{stat?.type || "Stat"}</span>
                      <div className="flex items-center gap-3 text-sm font-bold tabular-nums">
                        <span className="w-8 text-right">{stat?.home ?? "–"}</span>
                        <span className="text-[10px] text-flippe-muted">/</span>
                        <span className="w-8">{stat?.away ?? "–"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Arguments on this match */}
            <section className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-flippe-accent/10 text-flippe-accent">
                  <Trophy className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-lg font-black tracking-tight">Public arguments</h2>
                {argumentsList.length > 0 && (
                  <span className="rounded-full bg-flippe-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-flippe-accent">
                    {argumentsList.length}
                  </span>
                )}
              </div>

              {argumentsList.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {argumentsList.map((a) => (
                    <ArgumentCard key={a.id} argument={a} />
                  ))}
                </div>
              ) : (
                <div className="surface rounded-2xl border border-dashed p-10 text-center">
                  <h3 className="text-base font-bold">No arguments on this match yet</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-flippe-muted">
                    Be the first to back a claim on this game before it settles.
                  </p>
                  {user && (
                    <Button
                      onClick={() => setCreateOpen(true)}
                      className="mt-5 bg-flippe-accent text-flippe-onaccent hover:bg-flippe-accent-strong"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Start an Argument
                    </Button>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {bundle?.fixture && (
        <CreateArgumentModal
          fixture={bundle.fixture}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={handleCreated}
        />
      )}

      <MobileNav />
    </div>
  );
};

export default FixtureDetail;