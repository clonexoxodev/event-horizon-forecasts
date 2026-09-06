import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import jsQR from "jsqr";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardPaste,
  Clock,
  Download,
  Loader2,
  Lock,
  ScanLine,
  Share2,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import type { InviteMarketPreview } from "@/lib/api";
import apiService, { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCountdown, formatNaira } from "@/lib/markets";

const extractCodeFromText = (raw: string): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const queryCode = url.searchParams.get("code");
    if (queryCode) return queryCode.trim().toUpperCase();
    const segments = url.pathname.split("/").filter(Boolean);
    const joinIdx = segments.findIndex((s) => s === "join" || s === "invite");
    if (joinIdx >= 0 && segments[joinIdx + 1]) return segments[joinIdx + 1].toUpperCase();
    const marketIdx = segments.findIndex((s) => s === "market");
    if (marketIdx >= 0 && segments[marketIdx + 1]) {
      const next = segments[marketIdx + 1];
      if (!["invite", "join"].includes(next.toLowerCase())) {
        const marketCode = url.searchParams.get("code");
        if (marketCode) return marketCode.trim().toUpperCase();
      }
    }
    return null;
  } catch {
    return trimmed.toUpperCase();
  }
};

type LookupState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "found"; market: InviteMarketPreview }
  | { phase: "inactive"; market: InviteMarketPreview }
  | { phase: "not_found"; message: string }
  | { phase: "joining"; market: InviteMarketPreview }
  | { phase: "error"; message: string };

const JoinPrivate = () => {
  const { code: codeParam } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setAuthOpen } = useAuth();

  const initialCode = useMemo(() => {
    const fromQuery = searchParams.get("code");
    const fromLink = searchParams.get("link");
    const fromParam = codeParam;
    return extractCodeFromText(fromQuery || fromLink || fromParam || "") || "";
  }, [codeParam, searchParams]);

  const [codeInput, setCodeInput] = useState(initialCode);
  const [state, setState] = useState<LookupState>({ phase: "idle" });
  const [scanOpen, setScanOpen] = useState(false);
  const [pendingJoin, setPendingJoin] = useState(false);
  const joinedRef = useRef(false);

  const lookup = useCallback(async (code: string) => {
    const normalized = extractCodeFromText(code);
    if (!normalized || normalized.length < 4) {
      setState({ phase: "not_found", message: "Enter the full invite code from your invitation." });
      return;
    }
    setCodeInput(normalized);
    setState({ phase: "loading" });
    try {
      const res = await apiService.getMarketByInviteCode(normalized);
      try {
        window.history.replaceState(null, "", `/join/${normalized}`);
      } catch { /* history.replaceState is best-effort */ }
      setState(res.market.isActive ? { phase: "found", market: res.market } : { phase: "inactive", market: res.market });
    } catch (error) {
      const message = error instanceof ApiRequestError
        ? error.message
        : error instanceof Error ? error.message : "We could not find a private pool with that code.";
      setState({ phase: "not_found", message });
    }
  }, []);

  useEffect(() => {
    if (initialCode) lookup(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.error("Clipboard is empty");
        return;
      }
      const code = extractCodeFromText(text);
      if (!code) {
        toast.error("We could not find an invite code in that link.");
        return;
      }
      setCodeInput(code);
      lookup(code);
    } catch {
      toast.error("Clipboard access is blocked. Paste the invite code manually.");
    }
  };

  const handleJoin = async (market: InviteMarketPreview, code: string) => {
    if (!user) {
      setPendingJoin(true);
      setAuthOpen(true);
      return;
    }
    await performJoin(market, code);
  };

  const performJoin = useCallback(async (market: InviteMarketPreview, code: string) => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    setState({ phase: "joining", market });
    try {
      await apiService.joinMarket(market.id, code);
      navigate(`/market/${market.id}?code=${encodeURIComponent(code)}`, { replace: true });
    } catch (error) {
      joinedRef.current = false;
      setState({ phase: "found", market });
      toast.error(error instanceof Error ? error.message : "Could not join this private pool. Please try again.");
    }
  }, [navigate]);

  useEffect(() => {
    if (pendingJoin && user && state.phase === "found") {
      setPendingJoin(false);
      handleJoin(state.market, codeInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingJoin, user, state.phase]);

  const shareLink = useMemo(() => {
    if (state.phase !== "found" && state.phase !== "inactive") return "";
    return `${window.location.origin}/join/${encodeURIComponent(codeInput)}`;
  }, [state.phase, codeInput]);

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const handleShareInvite = async () => {
    if (!shareLink) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `FLIPPE invite: ${state.phase === "found" || state.phase === "inactive" ? state.market.question : "join a private prediction"}`,
          text: `Join my private FLIPPE prediction pool. Invite code: ${codeInput}`,
          url: shareLink,
        });
        return;
      }
      await navigator.clipboard.writeText(shareLink);
      toast.success("Invite link copied");
    } catch (error: any) {
      if (error?.name !== "AbortError") toast.error("Could not share the invite link");
    }
  };

  const reset = () => {
    setState({ phase: "idle" });
    setCodeInput("");
    joinedRef.current = false;
  };

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 lg:py-10">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5]">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Join a Private Prediction</h1>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-[#6B7280]">
            Someone invited you to predict together. Enter their invite code to open the pool.
          </p>
        </div>

        {(state.phase === "idle" || state.phase === "not_found" || state.phase === "error") && (
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
            <label htmlFor="invite-code" className="block text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              Invite code
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="invite-code"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  if (e.target.value.trim()) setState((prev) => (prev.phase === "not_found" || prev.phase === "error" ? { phase: "idle" } : prev));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") lookup(codeInput);
                }}
                placeholder="e.g. 7K2P9XFA"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Private prediction invite code"
                className="h-13 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-base font-black tracking-[0.2em] text-[#111827] uppercase shadow-sm outline-none placeholder:font-semibold placeholder:tracking-normal placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
              />
              <button
                onClick={() => lookup(codeInput)}
                disabled={codeInput.trim().length < 4}
                className="inline-flex h-13 shrink-0 items-center gap-1.5 rounded-2xl bg-[#4F46E5] px-5 text-sm font-bold text-white shadow-sm shadow-[#4F46E5]/20 transition-all hover:bg-[#4338CA] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Find pool
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={handlePaste}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-bold text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                Paste invite link
              </button>
              <button
                onClick={() => setScanOpen(true)}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-bold text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
              >
                <ScanLine className="h-3.5 w-3.5" />
                Scan QR code
              </button>
            </div>

            {(state.phase === "not_found" || state.phase === "error") && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[#E85D5D]/20 bg-[#FEF2F2]/60 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#E85D5D]" />
                <div>
                  <p className="text-sm font-bold text-[#B42318]">We could not find that pool</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#B42318]/80">{state.message}</p>
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-[#F3F4F6] pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">Looking for something else?</p>
              <div className="mt-2 grid gap-2">
                <button
                  onClick={() => navigate("/create")}
                  className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-3 text-left text-xs font-bold text-[#111827] transition hover:border-[#C7D2FE] hover:bg-[#EEF2FF]/50"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-[#4F46E5]" />
                  Start your own private prediction pool
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-[#9CA3AF]" />
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-3 text-left text-xs font-bold text-[#111827] transition hover:border-[#C7D2FE] hover:bg-[#EEF2FF]/50"
                >
                  <Target className="h-4 w-4 shrink-0 text-[#12B886]" />
                  Browse public predictions
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-[#9CA3AF]" />
                </button>
              </div>
            </div>
          </section>
        )}

        {state.phase === "loading" && (
          <section className="grid min-h-[300px] place-items-center rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#4F46E5]" />
              <p className="mt-3 text-sm font-bold text-[#111827]">Finding your pool...</p>
              <p className="mt-1 text-xs text-[#9CA3AF]">Checking the invite code</p>
            </div>
          </section>
        )}

        {(state.phase === "found" || state.phase === "joining") && (
          <InvitationCard
            market={state.market}
            code={codeInput}
            shareLink={shareLink}
            joining={state.phase === "joining"}
            onCopy={copyInviteLink}
            onShare={handleShareInvite}
            onEnter={() => handleJoin(state.market, codeInput)}
            onBack={reset}
          />
        )}

        {state.phase === "inactive" && (
          <section className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#F3F4F6] text-[#6B7280]">
                <Clock className="h-7 w-7" />
              </div>
              <h2 className="text-center text-lg font-black text-[#111827]">This pool is no longer open</h2>
              <p className="mt-1.5 text-center text-sm leading-relaxed text-[#6B7280]">{state.market.question}</p>
              <div className="mt-4 rounded-xl bg-[#F9FAFB] px-4 py-3 text-center">
                <span className="rounded-full bg-[#F3F4F6] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#6B7280]">
                  {state.market.status === "resolved" ? "Resolved" : state.market.status === "cancelled" ? "Cancelled" : state.market.status === "refunded" ? "Refunded" : "Closed"}
                </span>
              </div>
              <button
                onClick={reset}
                className="mt-5 flex h-11 w-full items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-bold text-white transition hover:bg-[#4338CA]"
              >
                Try another code
              </button>
            </div>
          </section>
        )}
      </main>

      {scanOpen && (
        <ScanDialog
          onClose={() => setScanOpen(false)}
          onCode={(code) => {
            setScanOpen(false);
            setCodeInput(code);
            lookup(code);
          }}
        />
      )}

      <MobileNav />
    </div>
  );
};

const InvitationCard = ({
  market,
  code,
  shareLink,
  joining,
  onCopy,
  onShare,
  onEnter,
  onBack,
}: {
  market: InviteMarketPreview;
  code: string;
  shareLink: string;
  joining: boolean;
  onCopy: () => void;
  onShare: () => void;
  onEnter: () => void;
  onBack: () => void;
}) => {
  const closeTime = market.tradingCloseTime || market.closeTime;
  const limitLabel = market.participantLimit != null ? `${market.participantCount} / ${market.participantLimit} joined` : `${market.participantCount} joined`;

  const downloadQr = () => {
    const canvas = document.createElement("canvas");
    const svgEl = document.querySelector<SVGElement>("[data-invite-qr]");
    if (!svgEl) {
      toast.error("QR not ready to download");
      return;
    }
    const xml = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      canvas.width = 480;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20, canvas.width - 40, canvas.height - 40);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `flippe-invite-${code}.png`;
      a.click();
      toast.success("QR code downloaded");
    };
    img.src = url;
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-[#C7D2FE] bg-white shadow-[0_18px_48px_rgba(17,24,39,0.08)]">
      <div className="bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] px-5 py-5 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#4F46E5] shadow-sm">
          <Sparkles className="h-3 w-3" />
          You're invited
        </span>
        <h2 className="mx-auto mt-3 max-w-sm text-lg font-black leading-snug text-[#101828] sm:text-xl">
          {market.question}
        </h2>
        {market.creatorUsername && (
          <p className="mt-1.5 text-xs font-bold text-[#6B7280]">
            Private prediction by <span className="text-[#4F46E5]">@{market.creatorUsername}</span>
          </p>
        )}
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-3">
            <Users className="mx-auto h-4 w-4 text-[#4F46E5]" />
            <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Participants</div>
            <div className="mt-0.5 text-sm font-black text-[#111827]">{limitLabel}</div>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-3">
            <Target className="mx-auto h-4 w-4 text-[#12B886]" />
            <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Entry</div>
            <div className="mt-0.5 text-sm font-black text-[#111827]">{market.minAmount > 0 ? `From ${formatNaira(market.minAmount)}` : "Any amount"}</div>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-3">
            <Clock className="mx-auto h-4 w-4 text-[#F59E0B]" />
            <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Closes</div>
            <div className="mt-0.5 text-sm font-black text-[#111827]">{closeTime ? formatCountdown(closeTime) : "—"}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-[#C7D2FE] bg-white px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Invite code</div>
            <div className="mt-0.5 text-lg font-black tracking-[0.3em] text-[#4F46E5] select-all">{code}</div>
            <button
              onClick={downloadQr}
              className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#4F46E5] transition hover:underline"
            >
              <Download className="h-3 w-3" />
              Download QR
            </button>
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-2 rounded-xl p-1.5" aria-label="QR code for this invite">
            <QRCodeSVG data-invite-qr value={shareLink} size={64} level="M" marginSize={1} aria-label="Invite link QR code" />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={onCopy}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-bold text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Copy invite link
          </button>
          <button
            onClick={onShare}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-bold text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <button
            onClick={onBack}
            className="flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-xs font-bold text-[#6B7280] transition hover:bg-[#F3F4F6]"
          >
            Back
          </button>
        </div>

        <button
          onClick={onEnter}
          disabled={joining}
          className="mt-3 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] text-sm font-black text-white shadow-lg shadow-[#4F46E5]/20 transition-all hover:bg-[#4338CA] active:scale-[0.98] disabled:opacity-60"
        >
          {joining ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining pool...
            </>
          ) : (
            <>
              Enter private pool
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-[#9CA3AF]">
          Joining unlocks the pool so you can place a prediction. Stakes are refunded in full if the pool never activates.
        </p>
      </div>
    </section>
  );
};

const ScanDialog = ({ onClose, onCode }: { onClose: () => void; onCode: (code: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const doneRef = useRef(false);

  const stop = () => {
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement("canvas");
        const scan = () => {
          if (doneRef.current || cancelled) return;
          const v = videoRef.current;
          if (v && v.readyState === v.HAVE_ENOUGH_DATA) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
              if (result?.data) {
                const text = result.data.trim();
                if (/^(https?:\/\/|[\dA-Za-z]{4,})/.test(text)) {
                  const code = extractCodeFromText(text);
                  if (code) {
                    doneRef.current = true;
                    stop();
                    onCode(code);
                    return;
                  }
                }
              }
            }
          }
          rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
      } catch {
        if (!cancelled) {
          setError("Camera access is unavailable. Use the invite code or paste the invite link instead.");
        }
      }
    };
    start();
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Scan invite QR code">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-[#4F46E5]" />
            <h3 className="text-sm font-black text-[#111827]">Scan invite QR</h3>
          </div>
          <button onClick={() => { stop(); onClose(); }} aria-label="Close scanner" className="grid h-9 w-9 place-items-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:bg-[#F3F4F6]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative mx-5 aspect-square overflow-hidden rounded-2xl bg-[#111827]">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-44 w-44 rounded-2xl border-2 border-white/80 opacity-80" style={{ boxShadow: "0 0 0 9999px rgba(17,24,39,0.35)" }} />
          </div>
          <div className="absolute inset-x-0 bottom-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-md">
              <CheckCircle2 className="h-3 w-3 text-[#12B886]" />
              Point at the QR on the invitation
            </span>
          </div>
        </div>
        {error && (
          <p className="px-5 pt-3 text-center text-xs font-bold text-[#E85D5D]">{error}</p>
        )}
        <div className="flex justify-between gap-2 p-5">
          <button onClick={() => { stop(); onClose(); }} className="flex h-10 flex-1 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-xs font-bold text-[#6B7280] transition hover:bg-[#F3F4F6]">
            Close
          </button>
          {error && (
            <button onClick={() => { stop(); onClose(); }} className="flex h-10 flex-1 items-center justify-center rounded-xl bg-[#4F46E5] text-xs font-bold text-white transition hover:bg-[#4338CA]">
              Enter code manually
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinPrivate;