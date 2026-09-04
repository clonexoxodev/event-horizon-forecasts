import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Info, Link2, Loader2, Plus, RefreshCw, Users, Eye, EyeOff } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { MARKET_CATEGORIES } from "@/lib/categories";
import apiService from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const ONE_HOUR_MS = 60 * 60 * 1000;

const generateInviteCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
};

const toLocalDateTime = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const defaultTimeout = () => {
  return toLocalDateTime(new Date(Date.now() + 24 * ONE_HOUR_MS));
};

type Duplicate = { id: string; question: string; status: string; participants: number; totalVolume?: number };

const CreateMarket = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [category, setCategory] = useState("Sports");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [resolvesAt, setResolvesAt] = useState(() => toLocalDateTime(new Date(Date.now() + 24 * ONE_HOUR_MS)));
  const [yesChance, setYesChance] = useState(50);
  const [minAmount, setMinAmount] = useState(100);
  const [participantLimit, setParticipantLimit] = useState(20);
  const [inviteCode, setInviteCode] = useState(() => generateInviteCode());
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ marketId: string; question: string; inviteCode: string | null; message: string } | null>(null);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const duplicateTimerRef = useRef<number | null>(null);

  const selectedCategory = MARKET_CATEGORIES.find((c) => c.value === category);

  const deadline = useMemo(() => {
    const time = new Date(resolvesAt).getTime();
    return Number.isFinite(time) ? time : Date.now() + 24 * ONE_HOUR_MS;
  }, [resolvesAt]);

  const isSignedIn = Boolean(user);

  const checkDuplicates = (raw: string) => {
    const q = raw.trim();
    setCheckingDuplicates(true);
    apiService
      .getMarketDuplicates(q)
      .then((res) => setDuplicates(res.markets))
      .catch(() => setDuplicates([]))
      .finally(() => setCheckingDuplicates(false));
  };

  const handleQuestionChange = (value: string) => {
    setQuestion(value);
    setCreated(null);
    if (duplicateTimerRef.current) window.clearTimeout(duplicateTimerRef.current);
    duplicateTimerRef.current = window.setTimeout(() => {
      if (value.trim().length >= 8) checkDuplicates(value);
      else setDuplicates([]);
    }, 500);
  };

  const buildShareUrl = (marketId: string) => {
    const base = `${window.location.origin}/market/${marketId}`;
    return created?.inviteCode ? `${base}?code=${created.inviteCode}` : base;
  };

  const copyInviteLink = async (marketId: string) => {
    try {
      await window.navigator.clipboard.writeText(buildShareUrl(marketId));
      toast.success("Invite link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleSubmit = async () => {
    if (!isSignedIn) {
      toast.error("Create an account to start a pool");
      return;
    }

    if (duplicates.length > 0) {
      toast.error("A very similar pool already exists. Review the suggestions below first.");
      return;
    }

    if (deadline <= Date.now()) {
      toast.error("Resolution time must be in the future");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiService.createMarket({
        question: question.trim(),
        description: description.trim() || undefined,
        rules: rules.trim(),
        category,
        visibility,
        close_date: new Date(deadline).toISOString(),
        closes_at: new Date(deadline).toISOString(),
        trading_close_at: new Date(deadline - ONE_HOUR_MS).toISOString(),
        resolution_date: new Date(deadline).toISOString(),
        resolution_source: "Official announcement or public record",
        resolution_instructions: rules.trim(),
        starting_yes_price: yesChance,
        currency: "NGN",
        min_position_smallest_unit: Math.max(100, Math.round(minAmount * 100)),
        participant_limit: visibility === "private" ? Math.max(2, Math.min(500, Math.round(participantLimit))) : undefined,
        invite_code: visibility === "private" ? inviteCode : undefined,
        activation: {
          totalPoolSmallestUnit: visibility === "private" ? 200000 : 500000,
          yesPoolSmallestUnit: visibility === "private" ? 50000 : 100000,
          noPoolSmallestUnit: visibility === "private" ? 50000 : 100000,
          minimumParticipants: visibility === "private" ? 2 : 5,
          protectedMaxStakeSmallestUnit: visibility === "private" ? 200000 : 500000,
        },
      });

      setCreated({ marketId: result.market.id, question: result.market.question, inviteCode: result.inviteCode || null, message: result.message || "Pool created." });
      toast.success(result.message || "Pool created");
    } catch (error: any) {
      toast.error(error?.message || "Could not create pool");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
              <Plus className="h-4 w-4" />
            </div>
            <span className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-bold text-[#6B7280]">
              Start a pool
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Create a Prediction Pool</h1>
          <p className="mt-2 max-w-xl text-sm text-[#6B7280]">
            Ask a real-world question, set the resolution rules, and invite friends or the public to predict the outcome.
          </p>
        </div>

        {created ? (
          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#F0FDF4] text-[#16A34A]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black">{created.question}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#6B7280]">{created.message}</p>

            {created.inviteCode ? (
              <div className="mx-auto mt-6 max-w-md rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">Invite code</span>
                  <button
                    onClick={() => copyInviteLink(created.marketId)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F46E5] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#4338CA]"
                  >
                    <Link2 className="h-3 w-3" />
                    Copy link
                  </button>
                </div>
                <div className="mt-3 rounded-xl border border-dashed border-[#C7D2FE] bg-white px-4 py-3 text-2xl font-black tracking-[0.3em] text-[#4F46E5] select-all">
                  {created.inviteCode}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[#9CA3AF]">
                  Share the invite code or this page with friends. Only invited members can join and predict.
                </p>
              </div>
            ) : (
              <p className="mx-auto mt-4 max-w-md text-xs text-[#9CA3AF]">
                This pool is now in review. An admin will approve it and it will go live shortly.
              </p>
            )}

            <button
              onClick={() => {
                setCreated(null);
                setQuestion("");
                setDescription("");
                setRules("");
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-6 py-2.5 text-sm font-bold text-[#111827] transition hover:bg-[#F3F4F6]"
            >
              <Plus className="h-4 w-4" />
              Create another pool
            </button>
            <button
              onClick={() => navigate(`/market/${created.marketId}`)}
              className="ml-3 inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#4338CA]"
            >
              View pool
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
              <label className="mt-0 block text-sm font-bold text-[#111827]">Your question</label>
              <input
                value={question}
                onChange={(e) => handleQuestionChange(e.target.value)}
                maxLength={160}
                placeholder="e.g. Will Ethereum hit $10,000 before the end of the year?"
                className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-[15px] font-medium text-[#111827] shadow-sm outline-none placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
              />
              <p className="mt-1.5 text-xs text-[#9CA3AF]">{question.length}/160</p>

              {checkingDuplicates && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-xs font-semibold text-[#6B7280]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4F46E5]" />
                  Checking for similar pools...
                </div>
              )}

              {!checkingDuplicates && duplicates.length > 0 && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Similar pools already exist</p>
                      <p className="mt-0.5 text-xs text-amber-700">Predictions on the same event are split across pools. Consider joining an existing one or reword your question.</p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {duplicates.slice(0, 5).map((dup) => (
                      <li key={dup.id}>
                        <a
                          href={`#/market/${dup.id}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-amber-200/70 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition hover:border-amber-300"
                        >
                          <span className="truncate">{dup.question}</span>
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tabular-nums">
                            {dup.participants} predicting
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
              <label className="block text-sm font-bold text-[#111827]">Category</label>
              <div className="mt-3 flex flex-wrap gap-2">
                {MARKET_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${
                      category === cat.value
                        ? "bg-[#4F46E5] text-white shadow-[0_2px_12px_rgba(79,70,229,0.3)]"
                        : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#C7D2FE] hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
                    }`}
                  >
                    {cat.value}
                  </button>
                ))}
              </div>
              {selectedCategory && (
                <p className="mt-3 rounded-xl bg-[#F9FAFB] px-4 py-3 text-xs leading-relaxed text-[#6B7280]">
                  {selectedCategory.description}
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
              <label className="block text-sm font-bold text-[#111827]">Who can join?</label>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    visibility === "public" ? "border-[#4F46E5] bg-[#EEF2FF] ring-2 ring-[#4F46E5]/[0.15]" : "border-[#E5E7EB] bg-white hover:border-[#C7D2FE]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-[#4F46E5]" />
                    <span className="text-sm font-bold">Public</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">Anyone can find it in discovery and predict. Goes through admin review before going live.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    visibility === "private" ? "border-[#4F46E5] bg-[#EEF2FF] ring-2 ring-[#4F46E5]/[0.15]" : "border-[#E5E7EB] bg-white hover:border-[#C7D2FE]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4 text-[#4F46E5]" />
                    <span className="text-sm font-bold">Private</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">Hidden from discovery. Only people with your invite link can join and predict.</p>
                </button>
              </div>

              {visibility === "private" && (
                <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">Invite code</span>
                      <div className="mt-1 text-xl font-black tracking-[0.3em] text-[#4F46E5]">{inviteCode}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInviteCode(generateInviteCode())}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-bold text-[#6B7280] transition hover:text-[#4F46E5]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerate
                    </button>
                  </div>
                  <label className="mt-4 block text-xs font-bold text-[#6B7280]">Participant limit</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#9CA3AF]" />
                    <input
                      type="number"
                      min={2}
                      max={500}
                      value={participantLimit}
                      onChange={(e) => setParticipantLimit(Math.max(2, Math.min(500, Number(e.target.value) || 2)))}
                      className="w-28 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#4F46E5]"
                    />
                    <span className="text-xs text-[#9CA3AF]">people including you</span>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-[#111827]">Resolves by</label>
                  <input
                    type="datetime-local"
                    value={resolvesAt}
                    min={toLocalDateTime(new Date(Date.now() + ONE_HOUR_MS))}
                    onChange={(e) => setResolvesAt(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
                  />
                  <p className="mt-1.5 text-xs text-[#9CA3AF]">Predictions close one hour before this.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#111827]">Starting YES chance</label>
                  <input
                    type="range"
                    min={5}
                    max={95}
                    value={yesChance}
                    onChange={(e) => setYesChance(Number(e.target.value))}
                    className="mt-6 w-full accent-[#4F46E5]"
                  />
                  <div className="mt-1 flex items-center justify-between text-xs font-bold">
                    <span className="text-[#12B886]">YES {yesChance}%</span>
                    <span className="text-[#E85D5D]">NO {100 - yesChance}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-[#111827]">Minimum stake (₦)</label>
                  <input
                    type="number"
                    min={1}
                    step={25}
                    value={minAmount}
                    onChange={(e) => setMinAmount(Math.max(1, Number(e.target.value) || 1))}
                    className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#111827]">Resolution criteria</label>
                  <textarea
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    placeholder="e.g. Official announcement on the project's X handle. If unclear, resolved as NO."
                    rows={2}
                    className="mt-2 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium outline-none placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
              <label className="block text-sm font-bold text-[#111827]">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Add context, sources, or background for predictors."
                className="mt-2 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium outline-none placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
              />
            </section>

            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <ul className="grid gap-2 text-xs leading-relaxed text-[#6B7280] sm:grid-cols-2">
                <li className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4F46E5]" />
                  The pool only goes live once the activation targets are met by predictors.
                </li>
                <li className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4F46E5]" />
                  If the pool never activates, every stake is refunded in full.
                </li>
                <li className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4F46E5]" />
                  The winner's payout is the winner's stake plus a share of the losing pool.
                </li>
                <li className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4F46E5]" />
                  The creator cannot predict on their own pool.
                </li>
              </ul>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !question.trim() || question.trim().length < 5}
              className="h-13 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#4F46E5]/20 transition-all hover:bg-[#4338CA] hover:shadow-[#4F46E5]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating pool...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create {visibility === "private" ? "private" : "public"} pool
                </>
              )}
            </button>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
};

export default CreateMarket;