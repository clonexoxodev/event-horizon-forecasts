import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Radio, RefreshCw, Trophy } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { FootballMatchCard } from "@/components/FootballMatchCard";
import { ArgumentCard } from "@/components/ArgumentCard";
import apiService, { type ApiMarket, type NormalizedFixture } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type MatchTab = "live" | "upcoming";

const Index = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<MatchTab>("upcoming");
  const [live, setLive] = useState<NormalizedFixture[]>([]);
  const [upcoming, setUpcoming] = useState<NormalizedFixture[]>([]);
  const [publicArguments, setPublicArguments] = useState<ApiMarket[]>([]);
  const [footballConfigured, setFootballConfigured] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingArguments, setLoadingArguments] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    setLoadingMatches(true);
    setMatchesError(null);
    try {
      const [liveRes, upcomingRes] = await Promise.allSettled([
        apiService.getFootballMatches({ live: true }),
        apiService.getFootballMatches({ upcoming: true, days: 3 }),
      ]);
      const liveOk = liveRes.status === "fulfilled";
      const upOk = upcomingRes.status === "fulfilled";
      if (liveOk) {
        setLive(liveRes.value.fixtures || []);
        if (liveRes.value.configured !== undefined) setFootballConfigured(liveRes.value.configured);
      }
      if (upOk) {
        setUpcoming(upcomingRes.value.fixtures || []);
        if (upcomingRes.value.configured !== undefined) setFootballConfigured(upcomingRes.value.configured);
      }
      if (!liveOk && !upOk) {
        setMatchesError("Could not load football matches.");
      }
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  const loadArguments = useCallback(async () => {
    setLoadingArguments(true);
    try {
      const res = await apiService.getArguments({ status: "active", limit: 12 });
      setPublicArguments(res.arguments || []);
    } catch {
      setPublicArguments([]);
    } finally {
      setLoadingArguments(false);
    }
  }, []);

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    loadMatches();
    loadArguments();
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMatches();
        loadArguments();
      }
    }, 30000);
    return () => window.clearInterval(refresh);
  }, [loadMatches, loadArguments]);

  const visibleMatches = tab === "live" ? live : upcoming;

  const greeting = user
    ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, @${user.username}`
    : "Settle arguments with football";

  return (
    <div className="app-bg min-h-screen pb-[calc(72px+env(safe-area-inset-bottom))] text-flippe-text md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:py-7">
        <section className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-flippe-accent">FLIPPE</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-[28px]">{greeting}</h1>
            <p className="mt-1 text-sm text-flippe-muted">
              Pick a match, make a claim, back it with a stake. The score settles it.
            </p>
          </div>
          {!user && (
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 rounded-xl border border-flippe-accent/30 bg-flippe-surface-2 px-4 py-2 text-xs font-bold text-flippe-accent transition hover:bg-flippe-accent/10 active:scale-[0.98]"
            >
              Create an account
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </section>

        {/* Match tabs */}
        <section className="mb-4">
          <div className="flex items-center justify-between gap-2">
            <div
              className="flex gap-2 rounded-2xl border border-flippe-border bg-flippe-surface p-1"
              role="tablist"
              aria-label="Football matches"
            >
              {(["upcoming", "live"] as MatchTab[]).map((key) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "relative shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-200",
                    tab === key
                      ? "bg-flippe-accent text-flippe-onaccent shadow-[0_2px_12px_rgba(18,184,134,0.35)]"
                      : "text-flippe-muted hover:text-flippe-text"
                  )}
                >
                  {key === "live" ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      Live
                    </span>
                  ) : (
                    "Upcoming"
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                loadMatches();
                loadArguments();
              }}
              disabled={loadingMatches}
              aria-label="Refresh matches"
              className="grid h-9 w-9 place-items-center rounded-xl border border-flippe-border bg-flippe-surface text-flippe-muted transition hover:text-flippe-text disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", loadingMatches && "animate-spin")} />
            </button>
          </div>
        </section>

        {/* Matches */}
        <section className="mb-8">
          {loadingMatches ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 rounded-2xl border border-flippe-border bg-flippe-surface soft-shimmer" />
              ))}
            </div>
          ) : matchesError ? (
            <div className="surface rounded-2xl p-10 text-center">
              <h3 className="text-base font-bold">Could not load matches</h3>
              <p className="mt-1.5 text-sm text-flippe-muted">{matchesError}</p>
              <button
                onClick={loadMatches}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-flippe-border px-6 py-2.5 text-sm font-bold text-flippe-text transition hover:bg-flippe-surface-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          ) : visibleMatches.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" role="list">
              {visibleMatches.map((m) => (
                <FootballMatchCard key={m.id} fixture={m} />
              ))}
            </div>
          ) : (
            <div className="surface rounded-2xl border border-dashed p-12 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-flippe-surface-2">
                {footballConfigured ? <Radio className="h-6 w-6 text-flippe-accent" /> : <Trophy className="h-6 w-6 text-flippe-muted" />}
              </div>
              <h3 className="text-base font-bold">
                {tab === "live" ? "No matches live right now" : "No upcoming matches yet"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-flippe-muted">
                {footballConfigured
                  ? "Live match data will appear here as soon as fixtures kick off. Check back soon."
                  : "We're wiring up live football results. Once connected, matches will appear here and you can start arguments on real games."}
              </p>
            </div>
          )}
        </section>

        {/* Public arguments */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-flippe-accent/10 text-flippe-accent">
              <Trophy className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-lg font-black tracking-tight">Public Arguments</h2>
            {publicArguments.length > 0 && (
              <span className="rounded-full bg-flippe-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-flippe-accent">
                {publicArguments.length}
              </span>
            )}
          </div>

          {loadingArguments ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-2xl border border-flippe-border bg-flippe-surface soft-shimmer" />
              ))}
            </div>
          ) : publicArguments.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" role="list">
              {publicArguments.map((a) => (
                <ArgumentCard key={a.id} argument={a} />
              ))}
            </div>
          ) : (
            <div className="surface rounded-2xl border border-dashed p-12 text-center">
              <h3 className="text-base font-bold">No public arguments yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-flippe-muted">
                Be the first — open a match above and start an argument with a stake.
              </p>
              {tab === "live" && live.length === 0 && upcoming.length > 0 && (
                <Link
                  to="/"
                  onClick={() => setTab("upcoming")}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-flippe-accent px-6 py-2.5 text-sm font-bold text-flippe-onaccent transition hover:bg-flippe-accent-strong"
                >
                  See upcoming matches
                </Link>
              )}
            </div>
          )}
        </section>
      </main>
      <MobileNav />
    </div>
  );
};

export default Index;