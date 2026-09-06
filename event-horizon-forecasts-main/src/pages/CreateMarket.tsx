import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Check, CheckCircle2, ChevronLeft, Clock, Info, ImagePlus, Link2, Loader2, Plus, RefreshCw, Shield, Users, Eye, EyeOff, X } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { MARKET_CATEGORIES } from "@/lib/categories";
import apiService from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const ONE_HOUR_MS = 60 * 60 * 1000;

const createMarketSchema = z.object({
  question: z.string().trim().min(5, "Write a clear prediction question (at least 5 characters)."),
  description: z.string().trim().max(2000, "Description is too long.").optional(),
  rules: z.string().trim().max(4000, "Resolution rules are too long.").optional(),
  category: z.string().min(1, "Choose a category."),
  visibility: z.enum(["public", "private"]),
  resolvesAt: z.string().refine((v) => {
    const t = new Date(v).getTime();
    return Number.isFinite(t) && t > Date.now();
  }, "Resolution time must be in the future."),
  yesChance: z.number().int().min(1).max(99, "Starting probability must be between 1% and 99%."),
  minAmount: z.number().min(100, "Minimum entry must be at least ₦100."),
  participantLimit: z.number().int().min(2).max(500).optional(),
  inviteCode: z.string().trim().regex(/^[A-Z2-9]{4,16}$/i, "Invite code must be 4–16 letters/numbers without confusing characters.").optional(),
});

type CreateMarketFormData = z.infer<typeof createMarketSchema>;

const generateInviteCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomValues = new Uint8Array(8);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (v) => alphabet[v % alphabet.length]).join("");
};

const toLocalDateTime = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const defaultTimeout = () => {
  return toLocalDateTime(new Date(Date.now() + 24 * ONE_HOUR_MS));
};

type Duplicate = { id: string; question: string; status: string; participants: number; totalVolume?: number };

type Step = 1 | 2 | 3;

const STEPS: { step: Step; label: string }[] = [
  { step: 1, label: "Who can join" },
  { step: 2, label: "Question & rules" },
  { step: 3, label: "Review & launch" },
];

const CreateMarket = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [category, setCategory] = useState("Sports");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [resolvesAt, setResolvesAt] = useState(() => defaultTimeout());
  const [yesChance, setYesChance] = useState(50);
  const [minAmount, setMinAmount] = useState(100);
  const [participantLimit, setParticipantLimit] = useState(20);
  const [inviteCode, setInviteCode] = useState(() => generateInviteCode());
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ marketId: string; question: string; inviteCode: string | null; message: string } | null>(null);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const duplicateTimerRef = useRef<number | null>(null);

  const selectedCategory = MARKET_CATEGORIES.find((c) => c.value === category);

  const deadline = useMemo(() => {
    const time = new Date(resolvesAt).getTime();
    return Number.isFinite(time) ? time : Date.now() + 24 * ONE_HOUR_MS;
  }, [resolvesAt]);

  const isSignedIn = Boolean(user);
  const questionDraft = question.trim();
  const canNextFromStep2 = questionDraft.length >= 5 && duplicates.length === 0;

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

  const handleCoverImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file for your cover (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error("Cover image must be under 30MB.");
      return;
    }
    setUploadingImage(true);
    try {
      const result = await apiService.uploadMarketMedia(file);
      setCoverImage(result.url);
      toast.success("Cover image added");
    } catch (error: any) {
      toast.error(error?.message || "Could not upload cover image");
    } finally {
      setUploadingImage(false);
    }
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

  const goNext = () => {
    if (step === 1) { setStep(2); return; }
    if (step === 2) {
      if (!canNextFromStep2) {
        if (duplicates.length > 0) toast.error("A very similar pool already exists. Review the suggestions first.");
        else toast.error("Write a clear prediction question first (at least 5 characters).");
        return;
      }
      setStep(3);
    }
  };

  const goBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
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

    const parsed = createMarketSchema.safeParse({
      question: questionDraft,
      description: description.trim() || undefined,
      rules: rules.trim(),
      category,
      visibility,
      resolvesAt: new Date(deadline).toISOString(),
      yesChance,
      minAmount,
      participantLimit: visibility === "private" ? Math.max(2, Math.min(500, Math.round(participantLimit))) : undefined,
      inviteCode: visibility === "private" ? inviteCode : undefined,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      toast.error(firstError?.message || "Please fix the highlighted details before launching.");
      return;
    }

    if (deadline <= Date.now()) {
      toast.error("Resolution time must be in the future");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiService.createMarket({
        question: questionDraft,
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
        image_url: coverImage || undefined,
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

  const stepNumber = STEPS.indexOf(STEPS.find((s) => s.step === step)!) + 1;

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
              Start a prediction
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Create a Prediction</h1>
          <p className="mt-2 max-w-xl text-sm text-[#6B7280]">
            Ask a real-world question, set the resolution rules, and invite others to predict the outcome.
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
              <div className="mx-auto mt-4 max-w-md rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-xs leading-relaxed text-[#6B7280]">
                This pool is now in admin review — it will go live once approved.
              </div>
            )}

            <div className="mx-auto mt-6 max-w-md">
              <button
                onClick={() => navigate(`/market/${created.marketId}`)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#4338CA]"
              >
                View prediction
              </button>
              <button
                onClick={() => {
                  setCreated(null);
                  setStep(1);
                  setQuestion("");
                  setDescription("");
                  setRules("");
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-6 py-3 text-sm font-bold text-[#111827] transition hover:bg-[#F3F4F6]"
              >
                <Plus className="h-4 w-4" />
                Create another prediction
              </button>
            </div>
          </div>
        ) : (
          <>
            <ol className="mb-6 flex items-center gap-2" aria-label="Create a prediction steps">
              {STEPS.map((s) => {
                const done = stepNumber > s.step || (created !== null && s.step === STEPS.length);
                const active = step === s.step;
                return (
                  <li key={s.step} className="flex items-center gap-2">
                    <span
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                        active
                          ? "bg-[#4F46E5] text-white shadow-[0_2px_10px_rgba(79,70,229,0.35)]"
                          : done
                            ? "bg-[#12B886]/10 text-[#047857]"
                            : "border border-[#E5E7EB] bg-white text-[#9CA3AF]"
                      }`}
                    >
                      <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-black ${active ? "bg-white/25" : done ? "bg-[#12B886]/15" : "bg-[#F3F4F6]"}`}>
                        {done ? <Check className="h-2.5 w-2.5" /> : s.step}
                      </span>
                      {s.label}
                    </span>
                    {s.step !== STEPS.length && <span className="h-px w-4 bg-[#E5E7EB]" aria-hidden="true" />}
                  </li>
                );
              })}
            </ol>

            <div className="space-y-5">
              {step === 1 && (
                <>
                  <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
                    <h2 className="text-lg font-black text-[#111827]">Who can join your prediction?</h2>
                    <p className="mt-1 text-sm text-[#6B7280]">Everything else — the question, rules, timing — comes next.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setVisibility("public")}
                        aria-pressed={visibility === "public"}
                        className={`rounded-2xl border p-5 text-left transition-all ${
                          visibility === "public" ? "border-[#4F46E5] bg-[#EEF2FF] ring-2 ring-[#4F46E5]/[0.15]" : "border-[#E5E7EB] bg-white hover:border-[#C7D2FE]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5]">
                            <Eye className="h-5 w-5" />
                          </div>
                          <span className="text-base font-bold">Public</span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-[#6B7280]">
                          Anyone can find it in Discover and predict. Goes through admin review before going live.
                        </p>
                        <span className={`mt-3 inline-flex items-center gap-1 text-xs font-bold ${visibility === "public" ? "text-[#4F46E5]" : "text-[#9CA3AF]"}`}>
                          {visibility === "public" ? <Check className="h-3.5 w-3.5" /> : null}
                          {visibility === "public" ? "Selected" : "Select public"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibility("private")}
                        aria-pressed={visibility === "private"}
                        className={`rounded-2xl border p-5 text-left transition-all ${
                          visibility === "private" ? "border-[#4F46E5] bg-[#EEF2FF] ring-2 ring-[#4F46E5]/[0.15]" : "border-[#E5E7EB] bg-white hover:border-[#C7D2FE]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5]">
                            <EyeOff className="h-5 w-5" />
                          </div>
                          <span className="text-base font-bold">Private</span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-[#6B7280]">
                          Hidden from Discover. Only people with your invite code can join and predict.
                        </p>
                        <span className={`mt-3 inline-flex items-center gap-1 text-xs font-bold ${visibility === "private" ? "text-[#4F46E5]" : "text-[#9CA3AF]"}`}>
                          {visibility === "private" ? <Check className="h-3.5 w-3.5" /> : null}
                          {visibility === "private" ? "Selected" : "Select private"}
                        </span>
                      </button>
                    </div>
                  </section>

                  <div className="rounded-2xl border border-[#4F46E5]/15 bg-[#EEF2FF]/70 p-4">
                    <div className="flex items-start gap-2.5">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#4F46E5]" />
                      <div className="text-xs leading-relaxed text-[#4338CA]">
                        <span className="font-bold">Both types start refund-protected.</span>{" "}
                        Your pool is closed until it reaches enough activity. If it never activates, every stake is refunded in full.
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
                    <label className="block text-sm font-bold text-[#111827]">Your question</label>
                    <input
                      value={question}
                      onChange={(e) => handleQuestionChange(e.target.value)}
                      maxLength={160}
                      autoFocus
                      placeholder={visibility === "public" ? "e.g. Will Ethereum hit $10,000 before the end of the year?" : "e.g. Will we reach the revenue goal by Friday?"}
                      className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-[15px] font-medium text-[#111827] shadow-sm outline-none placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
                    />
                    <p className="mt-1.5 text-xs text-[#9CA3AF]">{question.length}/160</p>

                    {checkingDuplicates && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-xs font-semibold text-[#6B7280]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4F46E5]" />
                        Checking for similar predictions...
                      </div>
                    )}

                    {!checkingDuplicates && duplicates.length > 0 && (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-2">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <div>
                            <p className="text-sm font-bold text-amber-800">Similar predictions already exist</p>
                            <p className="mt-0.5 text-xs text-amber-700">Stakes on the same event are split across pools. Consider joining an existing one or reword your question.</p>
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

                    <label className="mt-5 block text-sm font-bold text-[#111827]">Category</label>
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

                    <label className="mt-5 block text-sm font-bold text-[#111827]">Resolution criteria</label>
                    <textarea
                      value={rules}
                      onChange={(e) => setRules(e.target.value)}
                      placeholder="e.g. Official announcement on the project's X handle. If unclear, resolved as NO."
                      rows={2}
                      className="mt-2 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium outline-none placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
                    />
                    <div className="mt-2 flex items-start gap-2 rounded-xl bg-[#FEFCE8] px-4 py-3">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <p className="text-xs leading-relaxed text-amber-800">
                        Ambiguous questions are hard to resolve fairly. Make the outcome objectively verifiable — say exactly which source decides the result and what happens when it's unclear.
                      </p>
                    </div>

                    <label className="mt-5 block text-sm font-bold text-[#111827]">Description (optional)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Add context, sources, or background for predictors."
                      className="mt-2 w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium outline-none placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
                    />

                    <div className="mt-5">
                      <span className="block text-sm font-bold text-[#111827]">Cover image (optional)</span>
                      {coverImage ? (
                        <div className="relative mt-2 overflow-hidden rounded-2xl border border-[#E5E7EB]">
                          <img src={coverImage} alt="Cover preview" className="h-44 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setCoverImage(null)}
                            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-xl bg-white/90 text-[#111827] shadow transition hover:bg-white"
                            aria-label="Remove cover image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#C7D2FE] bg-[#F9FAFB] px-4 py-6 text-sm font-semibold text-[#6B7280] transition hover:bg-[#EEF2FF] hover:text-[#4F46E5]">
                          <ImagePlus className="h-5 w-5" />
                          {uploadingImage ? "Uploading..." : "Upload a cover image"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingImage}
                            onChange={(e) => handleCoverImage(e.target.files?.[0])}
                          />
                        </label>
                      )}
                      <p className="mt-1.5 text-xs text-[#9CA3AF]">
                        Adds a visual header when the prediction is shown in Discover.
                      </p>
                    </div>
                  </section>
                </>
              )}

              {step === 3 && (
                <>
                  <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-bold text-[#111827]">Predictions close by</label>
                        <input
                          type="datetime-local"
                          value={resolvesAt}
                          min={toLocalDateTime(new Date(Date.now() + ONE_HOUR_MS))}
                          onChange={(e) => setResolvesAt(e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
                        />
                        <p className="mt-1.5 text-xs text-[#9CA3AF]">Predictions close one hour before resolution.</p>
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
                      <div className="flex items-end pb-1">
                        <div className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-xs leading-relaxed text-[#6B7280]">
                          Payouts are refund-protected until the pool is active. The winner takes the winner's stakes plus a share of the losing side.
                        </div>
                      </div>
                    </div>

                    {visibility === "private" && (
                      <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
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

                  <section className="rounded-3xl border border-[#4F46E5]/20 bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] p-5">
                    <p className="text-[11px] font-black uppercase tracking-wider text-[#4F46E5]">Summary</p>
                    <div className="mt-3 grid gap-2 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-bold text-[#6B7280]">Audience</span>
                        <span className="text-right text-xs font-black text-[#111827] capitalize">{visibility}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-bold text-[#6B7280]">Question</span>
                        <span className="max-w-[60%] text-right text-xs font-semibold text-[#111827] line-clamp-2">{questionDraft || "—"}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-bold text-[#6B7280]">Category</span>
                        <span className="text-right text-xs font-black text-[#111827]">{category}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-bold text-[#6B7280]">Closes</span>
                        <span className="text-right text-xs font-black text-[#111827]">{new Date(deadline).toLocaleString()}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-bold text-[#6B7280]">Starting chance</span>
                        <span className="text-right text-xs font-black text-[#111827]">{yesChance}% YES</span>
                      </div>
                    </div>
                  </section>

                  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                    <ul className="grid gap-2 text-xs leading-relaxed text-[#6B7280] sm:grid-cols-2">
                      <li className="flex items-start gap-2">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4F46E5]" />
                        The pool only goes live once the activity targets are met by predictors.
                      </li>
                      <li className="flex items-start gap-2">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4F46E5]" />
                        If the pool never activates, every stake is refunded in full.
                      </li>
                      <li className="flex items-start gap-2">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4F46E5]" />
                        The winning side's payout is their stake plus a share of the losing pool.
                      </li>
                      <li className="flex items-start gap-2">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4F46E5]" />
                        The creator cannot predict on their own pool.
                      </li>
                    </ul>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                {step > 1 && (
                  <button
                    onClick={goBack}
                    className="inline-flex h-13 items-center gap-1.5 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-bold text-[#6B7280] transition hover:bg-[#F3F4F6]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                )}
                {step < 3 ? (
                  <button
                    onClick={goNext}
                    className="h-13 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#4F46E5]/20 transition-all hover:bg-[#4338CA] active:scale-[0.98]"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !isSignedIn || !canNextFromStep2}
                    className="h-13 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#4F46E5]/20 transition-all hover:bg-[#4338CA] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating {visibility} prediction...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create {visibility} prediction
                      </>
                    )}
                  </button>
                )}
              </div>

              {!isSignedIn && step === 3 && (
                <p className="text-center text-xs font-semibold text-[#6B7280]">
                  You'll need an account to create a prediction.{" "}
                  <button className="font-bold text-[#4F46E5] underline-offset-2 hover:underline" onClick={() => navigate("/signup")}>
                    Create an account
                  </button>
                </p>
              )}
                  </div>

                  {questionDraft.length >= 5 && (
                    <section className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white">
                      <div className="flex items-center justify-between gap-2 border-b border-[#F3F4F6] px-5 py-3">
                        <p className="text-[11px] font-black uppercase tracking-wider text-[#9CA3AF]">Preview</p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          visibility === "private" ? "bg-amber-100 text-amber-700" : "bg-[#EEF2FF] text-[#4F46E5]"
                        }`}>
                          {visibility === "private" ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                          {visibility === "private" ? "Private" : "Public"}
                        </span>
                      </div>
                      <div className="p-5">
                        {coverImage && (
                          <img
                            src={coverImage}
                            alt="Cover preview"
                            className="mb-4 h-40 w-full rounded-2xl border border-[#E5E7EB] object-cover"
                          />
                        )}
                        <h3 className="text-[15px] font-bold leading-snug text-[#111827]">{questionDraft}</h3>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="rounded-2xl border border-[#12B886]/20 bg-[#12B886]/[0.05] p-3 text-center">
                            <div className="text-xl font-black tabular-nums text-[#12B886]">YES {yesChance}%</div>
                            <div className="mt-0.5 text-[10px] font-bold text-[#6B7280]">Predict YES</div>
                          </div>
                          <div className="rounded-2xl border border-[#E85D5D]/20 bg-[#E85D5D]/[0.05] p-3 text-center">
                            <div className="text-xl font-black tabular-nums text-[#E85D5D]">NO {100 - yesChance}%</div>
                            <div className="mt-0.5 text-[10px] font-bold text-[#6B7280]">Predict NO</div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-[#6B7280]">
                          <span className="inline-flex items-center gap-1 font-bold capitalize">
                            {category}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[#9CA3AF]">
                            <Clock className="h-3 w-3" />
                            Closes {new Date(deadline).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                          </span>
                        </div>
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

export default CreateMarket;