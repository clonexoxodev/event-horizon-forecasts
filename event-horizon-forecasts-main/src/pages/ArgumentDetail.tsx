import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Loader2, ShieldCheck, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import apiService, { type ApiArgument, type NormalizedFixture } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  argumentStatusLabel,
  formatKickoffFull,
  formatLabel,
  formatStake,
  isMatchLive,
  matchClock,
} from "@/lib/football";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Avatar = ({ name }: { name: string }) => (
  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-flippe-surface-2 text-xs font-bold text-flippe-accent">
    {name.charAt(0).toUpperCase()}
  </div>
);

const ArgumentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();

  const [argument, setArgument] = useState<ApiArgument | null>(null);
  const [liveFixture, setLiveFixture] = useState<NormalizedFixture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [joinSide, setJoinSide] = useState<"YES" | "NO">("YES");
  const [opinion, setOpinion] = useState("");
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getArgument(id);
      setArgument(res.argument);
      setLiveFixture(res.liveFixture);
    } catch (err: any) {
      setError(err?.message || "Could not load this argument.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const participants = argument?.participants || [];
  const viewerParticipant = participants.find((p) => p.isViewer);
  const isActive = argument?.status === "active";
  const isCreator = argument ? user && String(argument.createdBy) === String(user.id) : false;

  const joinDeadlinePassed = argument?.joinDeadlineAt
    ? new Date(argument.joinDeadlineAt).getTime() <= Date.now()
    : false;

  const full = argument?.participationFormat === "1v1"
    ? participants.length >= 2
    : argument?.participationFormat === "group" && argument.participantLimit != null && participants.length >= argument.participantLimit;

  const occupyingSide = participants.find((p) => p.side === joinSide && !p.isViewer);
  const joinBlocked = !isActive || !!viewerParticipant || joinDeadlinePassed || full || (joinSide === "NO" ? false : Boolean(argument?.participationFormat === "1v1" && occupyingSide));

  const canJoin1v1Opposite = argument?.participationFormat === "1v1";
  const sideDisabled = (side: "YES" | "NO") => {
    if (!canJoin1v1Opposite) return false;
    const taken = participants.some((p) => p.side === side);
    return taken && !viewerParticipant;
  };

  const stakeAmount = Number((argument?.stakeSmallestUnit ?? 0) / 100);

  const handleJoin = async () => {
    if (!user || !id) return;
    setJoining(true);
    try {
      const res = await apiService.placePrediction(id, {
        side: joinSide,
        amount: stakeAmount,
        currency: "NGN",
        ...(opinion.trim() ? { opinion: opinion.trim() } : {}),
      });
      toast.success(`You joined ${joinSide} with ${formatStake(argument?.stakeSmallestUnit ?? 0)}.`);
      await refreshUser().catch(() => {});
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Could not join the argument.");
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setCancelling(true);
    try {
      const res = await apiService.cancelArgument(id, "Creator cancelled");
      toast.success(res?.message || "Argument cancelled and stake refunded.");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Could not cancel the argument.");
    } finally {
      setCancelling(false);
    }
  };

  const yesCount = participants.filter((p) => p.side === "YES").length;
  const noCount = participants.filter((p) => p.side === "NO").length;
  const need = argument?.minParticipants ?? 2;
  const minMet = yesCount >= 1 && noCount >= 1 && (yesCount + noCount) >= need;

  const governanceNote =
    argument?.participationFormat === "1v1"
      ? `Both sides wager ${formatStake(argument?.stakeSmallestUnit ?? 0)} — the winning side takes the pot when the match settles.`
      : `Everyone backs ${formatStake(argument?.stakeSmallestUnit ?? 0)} on a side. Winning sides split the pot when the match settles.`;

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
            <div className="h-52 rounded-2xl border border-flippe-border bg-flippe-surface soft-shimmer" />
            <div className="h-40 rounded-2xl border border-flippe-border bg-flippe-surface soft-shimmer" />
          </div>
        ) : error || !argument ? (
          <div className="surface rounded-2xl p-12 text-center">
            <h3 className="text-base font-bold">Could not load this argument</h3>
            <p className="mt-1.5 text-sm text-flippe-muted">{error || "This argument is not available."}</p>
            <Button onClick={load} variant="outline" className="mt-6 border-flippe-border text-flippe-text">
              Retry
            </Button>
          </div>
        ) : (
          <>
            <section className="surface rounded-2xl p-5 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-flippe-surface-2 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-flippe-muted">
                  {argument.participationFormat === "1v1" ? "Football" : "Football"}
                </span>
                <span className="rounded-full bg-flippe-surface-2 px-2.5 py-0.5 text-[10px] font-bold text-flippe-muted">
                  {formatLabel(argument.participationFormat)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                    argument.status === "resolved" ? "bg-flippe-accent/15 text-flippe-accent" : "bg-flippe-accent/10 text-flippe-accent"
                  )}
                >
                  {argumentStatusLabel(argument)}
                </span>
              </div>

              <h1 className="text-xl font-black leading-snug tracking-tight sm:text-2xl">{argument.question}</h1>

              {argument.matchSnapshot?.home && argument.matchSnapshot.away && (
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-flippe-surface-2 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{argument.matchSnapshot.home.name}</span>
                  <span className="shrink-0 text-base font-black tabular-nums">
                    {argument.matchSnapshot.score?.home != null ? argument.matchSnapshot.score.home : "–"}
                    <span className="mx-1 text-flippe-muted">:</span>
                    {argument.matchSnapshot.score?.away != null ? argument.matchSnapshot.score.away : "–"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-right text-sm font-bold">{argument.matchSnapshot.away.name}</span>
                </div>
              )}

              {(liveFixture || argument.matchSnapshot?.kickoff) && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-flippe-muted">
                  {liveFixture ? (
                    <span className={cn("font-bold", isMatchLive(liveFixture) && "text-flippe-accent")}>
                      {liveFixture.league?.name ? `${liveFixture.league.name} · ` : ""}
                      {matchClock(liveFixture)}
                    </span>
                  ) : (
                    <span>Kicks off {formatKickoffFull(argument.matchSnapshot?.kickoff)}</span>
                  )}
                  <span>
                    Stake {formatStake(argument.stakeSmallestUnit)} per side
                  </span>
                </div>
              )}

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl bg-flippe-surface-2 px-3 py-2.5 text-xs leading-relaxed text-flippe-muted">
                  <span className="block font-black text-flippe-text">YES wins when…</span>
                  {String(argument.verificationSource || "the claim is true")}
                </div>
                <div className="rounded-xl bg-flippe-surface-2 px-3 py-2.5 text-xs leading-relaxed text-flippe-muted">
                  <span className="block font-black text-flippe-text">NO wins when…</span>
                  {String(argument.verificationSource || "the claim is false")}
                </div>
              </div>

              <p className="mt-4 flex items-start gap-2 rounded-xl border border-flippe-accent/20 bg-flippe-accent/5 px-3 py-2.5 text-xs leading-relaxed text-flippe-muted">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-flippe-accent" />
                <span>
                  {governanceNote} Auto-settled against the live result — no one in the middle.
                </span>
              </p>
            </section>

            {/* Participants */}
            <section className="surface mt-4 rounded-2xl p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-flippe-muted">
                  <Users className="h-4 w-4 text-flippe-accent" />
                  Participants · {yesCount} YES / {noCount} NO
                </h2>
              </div>

              {participants.length === 0 ? (
                <p className="rounded-xl bg-flippe-surface-2 px-4 py-5 text-center text-sm text-flippe-muted">
                  No one has joined yet — be the first to pick a side.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {participants.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-xl bg-flippe-surface-2 px-3.5 py-3">
                      <Avatar name={p.username} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold">
                            {p.username}
                            {p.isViewer && <span className="ml-1.5 text-[10px] font-bold text-flippe-accent">(you)</span>}
                          </span>
                          <span
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[10px] font-bold",
                              p.side === "YES"
                                ? "border-flippe-accent/40 bg-flippe-accent/10 text-flippe-accent"
                                : "border-coral/40 bg-coral/10 text-coral"
                            )}
                          >
                            {p.side}
                          </span>
                        </div>
                        {p.opinion && (
                          <p className="mt-1 line-clamp-2 text-xs italic leading-relaxed text-flippe-muted">"{p.opinion}"</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-flippe-muted">
                        {formatStake(p.stakeSmallestUnit)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Join panel */}
              {!viewerParticipant && isActive && !full && !joinDeadlinePassed && (
                <div className="mt-5 rounded-xl border border-flippe-border bg-flippe-surface-2 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold">Join this argument</span>
                    <span className="text-[11px] text-flippe-muted">
                      Back {formatStake(argument.stakeSmallestUnit)}
                    </span>
                  </div>
                  {canJoin1v1Opposite && participants.length === 1 && (
                    <p className="mb-3 rounded-lg bg-flippe-accent/10 px-3 py-2 text-xs text-flippe-accent">
                      This is a 1v1 — you must take the opposing side. The earlier participant holds{" "}
                      <span className="font-bold">{participants[0].side}</span>.
                    </p>
                  )}
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={sideDisabled("YES")}
                      onClick={() => setJoinSide("YES")}
                      className={cn(
                        "h-11 rounded-xl border text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
                        joinSide === "YES" && !sideDisabled("YES")
                          ? "border-flippe-accent/50 bg-flippe-accent/10 text-flippe-accent"
                          : "border-flippe-border bg-flippe-surface text-flippe-muted"
                      )}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      disabled={sideDisabled("NO")}
                      onClick={() => setJoinSide("NO")}
                      className={cn(
                        "h-11 rounded-xl border text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
                        joinSide === "NO" && !sideDisabled("NO")
                          ? "border-coral/50 bg-coral/10 text-coral"
                          : "border-flippe-border bg-flippe-surface text-flippe-muted"
                      )}
                    >
                      NO
                    </button>
                  </div>
                  <Textarea
                    value={opinion}
                    onChange={(e) => setOpinion(e.target.value)}
                    placeholder="Why are you backing this side? (optional)"
                    rows={2}
                    maxLength={500}
                    className="mb-3"
                  />
                  {user ? (
                    <Button
                      onClick={handleJoin}
                      disabled={joining}
                      className="w-full bg-flippe-accent text-flippe-onaccent hover:bg-flippe-accent-strong"
                    >
                      {joining ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Placing your stake…
                        </>
                      ) : (
                        <>Back {joinSide} with {formatStake(argument.stakeSmallestUnit)}</>
                      )}
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="w-full bg-flippe-accent text-flippe-onaccent hover:bg-flippe-accent-strong"
                    >
                      <Link to="/login" state={{ from: { pathname: `/argument/${id}` } }}>
                        Sign in to join
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              {viewerParticipant && (
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-flippe-accent/10 px-4 py-3 text-sm font-bold text-flippe-accent">
                  <Check className="h-4 w-4" />
                  You're on {viewerParticipant.side} — your stake is locked until this match settles.
                </div>
              )}

              {isActive && !viewerParticipant && full && (
                <p className="mt-5 rounded-xl bg-flippe-surface-2 px-4 py-3 text-center text-sm text-flippe-muted">
                  This argument is full.
                </p>
              )}

              {joinDeadlinePassed && isActive && !viewerParticipant && !full && (
                <p className="mt-5 rounded-xl bg-flippe-surface-2 px-4 py-3 text-center text-sm text-flippe-muted">
                  Joining has closed for this argument — it settles when the match finishes.
                </p>
              )}

              {isCreator && canCancel(participants, argument) && (
                <Button
                  onClick={handleCancel}
                  disabled={cancelling}
                  variant="danger"
                  className="mt-4 w-full"
                >
                  {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Cancel argument & refund
                </Button>
              )}
            </section>
          </>
        )}
      </main>
      <MobileNav />
    </div>
  );
};

const canCancel = (participants: ApiArgument["participants"], argument: ApiArgument) => {
  if (!argument || argument.status !== "active") return false;
  const joined = (participants || []).filter((p) => !["refunded", "cancelled"].includes(String(p.status).toLowerCase()));
  return joined.length <= 1;
};

export default ArgumentDetail;