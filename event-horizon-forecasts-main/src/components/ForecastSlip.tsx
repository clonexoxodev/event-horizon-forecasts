import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { formatNaira, formatNairaPrice, getMarketActivation } from "@/lib/markets";
import { toast } from "sonner";

type ForecastSelection = {
  marketId: string;
  marketQuestion: string;
  marketIcon: string;
  side: "YES" | "NO" | "UP" | "DOWN";
  currentPrice: number;
  yesPool?: number;
  noPool?: number;
  totalYesShares?: number;
  totalNoShares?: number;
  participants?: number;
  minAmount?: number;
  maxAmount?: number;
};

type ForecastSlipProps = {
  selection: ForecastSelection | null;
  onClose: () => void;
  onConfirm: (selection: ForecastSelection, amount: number) => Promise<void>;
};

export const ForecastSlip = ({ selection, onClose, onConfirm }: ForecastSlipProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user, setAuthOpen } = useAuth();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    },
    [loading, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!selection) return null;

  const quickAmounts = [100, 500, 1000, 2000];
  const numAmount = Number.parseFloat(amount) || 0;
  const probability = Number(selection.currentPrice || 50);
  const isPositiveSide = selection.side === "YES" || selection.side === "UP";
  const yesView = isPositiveSide ? probability : 100 - probability;
  const noView = 100 - yesView;
  const selectedStake = isPositiveSide ? selection.yesPool ?? 0 : selection.noPool ?? 0;
  const oppositeStake = isPositiveSide ? selection.noPool ?? 0 : selection.yesPool ?? 0;
  const totalPool = (selection.yesPool ?? 0) + (selection.noPool ?? 0);
  const activation = getMarketActivation({
    status: "active",
    yesPool: selection.yesPool,
    noPool: selection.noPool,
    totalPool,
    participants: selection.participants,
  });
  const userBalance = user?.balance || 0;
  const insufficientBalance = numAmount > userBalance;
  const exceedsProtectedLimit = activation.isProtected && numAmount > activation.requirements.protectedMaxStake;
  const estimatedReturn =
    activation.isLive && numAmount > 0 && selectedStake + numAmount > 0
      ? numAmount + (numAmount / (selectedStake + numAmount)) * oppositeStake
      : 0;
  const estimatedProfit = Math.max(0, estimatedReturn - numAmount);
  const selectionMissingData = Boolean(
    !selection.marketId ||
      !selection.marketQuestion ||
      !selection.side ||
      !Number.isFinite(Number(selection.currentPrice))
  );

  const isFormValid = Boolean(
    user &&
      !loading &&
      numAmount > 0 &&
      !insufficientBalance &&
      !exceedsProtectedLimit &&
      !selectionMissingData
  );

  const handleConfirm = async () => {
    if (loading) return;
    if (selectionMissingData) {
      toast.error("Market not available. Please go back and try again.");
      return;
    }
    if (numAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (insufficientBalance) {
      toast.error("Insufficient balance. Add money to continue.");
      return;
    }
    if (exceedsProtectedLimit) {
      toast.error(`Protected markets are limited to ${formatNaira(activation.requirements.protectedMaxStake)} per user until they go live.`);
      return;
    }

    setLoading(true);
    try {
      await onConfirm(selection, numAmount);
      setSuccess(true);
      toast.success("Prediction locked.");
    } catch (error) {
      console.error("Prediction submit failed", error);
      toast.error(error instanceof Error ? error.message : "Could not place prediction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setAmount("");
    setSuccess(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#111827]/35 backdrop-blur-sm" onClick={() => !loading && onClose()} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Prediction slip"
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-2xl border border-[#E5E7EB] bg-white pb-[calc(90px+env(safe-area-inset-bottom))] shadow-[0_-24px_80px_rgba(17,24,39,0.16)] md:bottom-auto md:left-auto md:top-0 md:h-screen md:w-[460px] md:rounded-none md:border-l md:pb-0"
      >
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1 w-10 rounded-full bg-[#E5E7EB]" />
        </div>

        {success ? (
          <SuccessState selection={selection} amount={numAmount} onClose={handleClear} />
        ) : selectionMissingData ? (
          <UnavailableState loading={loading} onClose={handleClear} />
        ) : (
          <div className="space-y-5 p-5 sm:p-6">
            <SlipHeader onClose={handleClear} loading={loading} />

            <div className={`rounded-2xl p-4 ${isPositiveSide ? "bg-[#12B886]/8" : "bg-[#E85D5D]/8"}`}>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-2xl shadow-sm">
                  {selection.marketIcon}
                </div>
                <div className="min-w-0">
                  <div className="line-clamp-3 text-sm font-black leading-snug text-[#111827]">
                    {selection.marketQuestion}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${isPositiveSide ? "bg-[#12B886]/12 text-[#047857]" : "bg-[#E85D5D]/12 text-[#B42318]"}`}>
                      {selection.side}
                    </span>
                    <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-bold text-[#6B7280]">
                      YES {formatNairaPrice(yesView)} / NO {formatNairaPrice(noView)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-y border-[#E5E7EB] py-4">
              <InfoCard label="Wallet balance" value={user ? formatNaira(userBalance) : "Login required"} />
            </div>

            {!user && (
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
                <div className="font-black text-[#111827]">Login to place this prediction</div>
                <p className="mt-1 text-sm text-[#6B7280]">You can browse markets freely. Sign in only when you are ready to predict.</p>
                <button onClick={() => { onClose(); setAuthOpen(true); }} aria-label="Log in to place prediction" className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-black text-white hover:bg-[#4338CA]">
                  Continue
                </button>
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#6B7280]">
                  NGN
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  aria-label="Bet amount in Naira"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={loading}
                  className={`h-14 rounded-xl border-2 bg-[#F8F7F4] pl-14 text-xl font-black text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] ${
                    (insufficientBalance || exceedsProtectedLimit) && numAmount > 0 ? "border-[#E85D5D]" : "border-[#E5E7EB]"
                  }`}
                />
              </div>
              {insufficientBalance && numAmount > 0 && (
                <p className="mt-2 text-xs font-bold text-[#B42318]">Insufficient balance.</p>
              )}
              {exceedsProtectedLimit && (
                <p className="mt-2 text-xs font-bold text-[#B42318]">
                  Protected markets are limited to {formatNaira(activation.requirements.protectedMaxStake)} per user until they go live.
                </p>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((value) => (
                <button
                  key={value}
                  onClick={() => setAmount(value.toString())}
                  aria-label={`Set amount to ${formatNaira(value).replace(".00", "")}`}
                  disabled={loading}
                  className={`h-11 rounded-xl border text-sm font-black transition ${
                    amount === value.toString()
                      ? isPositiveSide
                        ? "border-[#12B886]/45 bg-[#12B886]/18 text-[#047857]"
                        : "border-[#E85D5D]/45 bg-[#E85D5D]/18 text-[#B42318]"
                      : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  {formatNaira(value).replace(".00", "")}
                </button>
              ))}
            </div>

            <div className="border-t border-[#E5E7EB] pt-4">
              {activation.isProtected ? (
                <RefundProtectionState progress={activation.progress} totalPool={activation.totalPool} requiredPool={activation.requirements.totalPool} />
              ) : numAmount > 0 && !insufficientBalance ? (
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard label="Estimated Return" value={formatNaira(estimatedReturn)} />
                    <InfoCard label="Estimated Profit" value={formatNaira(estimatedProfit)} />
                  </div>
                  <p className="mt-3 text-xs font-bold leading-relaxed text-[#6B7280]">
                    Returns may change as market activity changes.
                  </p>
                </div>
              ) : (
                <p className="text-sm font-bold text-[#6B7280]">Choose an amount to back this side.</p>
              )}
            </div>

            <Button
              onClick={handleConfirm}
              disabled={!isFormValid}
              aria-disabled={!isFormValid}
              className={`h-12 w-full rounded-xl text-base font-bold text-white transition ${
                isPositiveSide
                  ? "bg-[#12B886] text-[#06100d] hover:bg-[#2dd4a0]"
                  : "bg-[#E85D5D] hover:bg-[#f07575]"
              } disabled:opacity-50`}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>Confirm {selection.side}</>
              )}
            </Button>

            <button
              onClick={handleClear}
              disabled={loading}
              className="w-full text-sm font-bold text-[#6B7280] transition hover:text-[#111827] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const SlipHeader = ({ onClose, loading }: { onClose: () => void; loading: boolean }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">Prediction slip</p>
      <h2 className="mt-1 text-2xl font-black text-[#111827]">Back your opinion</h2>
    </div>
    <button
      onClick={onClose}
      disabled={loading}
      aria-label="Close prediction slip"
      className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] transition hover:text-[#111827] disabled:opacity-50"
    >
      <X className="h-5 w-5" aria-hidden="true" />
    </button>
  </div>
);

const UnavailableState = ({ loading, onClose }: { loading: boolean; onClose: () => void }) => (
  <div className="space-y-5 p-5 sm:p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B42318]">Prediction slip</p>
        <h2 className="mt-1 text-2xl font-black text-[#111827]">Market not available</h2>
      </div>
      <button
        onClick={onClose}
        disabled={loading}
        aria-label="Close prediction slip"
        className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] transition hover:text-[#111827] disabled:opacity-50"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
    <div className="rounded-xl border border-[#E85D5D]/30 bg-[#E85D5D]/10 p-4 text-sm font-bold leading-relaxed text-[#B42318]">
      Market not available. Please go back and try again.
    </div>
  </div>
);

const SuccessState = ({ selection, amount, onClose }: { selection: ForecastSelection; amount: number; onClose: () => void }) => {
  const isPositiveSide = selection.side === "YES" || selection.side === "UP";
  const selectedStake = isPositiveSide ? selection.yesPool ?? 0 : selection.noPool ?? 0;
  const oppositeStake = isPositiveSide ? selection.noPool ?? 0 : selection.yesPool ?? 0;
  const totalPool = (selection.yesPool ?? 0) + (selection.noPool ?? 0);
  const activation = getMarketActivation({
    status: "active",
    yesPool: selection.yesPool,
    noPool: selection.noPool,
    totalPool,
    participants: selection.participants,
  });
  const estimatedReturn =
    activation.isLive && selectedStake + amount > 0
      ? amount + (amount / (selectedStake + amount)) * oppositeStake
      : 0;
  const estimatedProfit = Math.max(0, estimatedReturn - amount);

  return (
    <div className="grid min-h-[460px] place-items-center bg-white p-8 text-center">
      <div className="w-full max-w-sm">
        <div className={`mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full text-white shadow-[0_18px_44px_rgba(16,24,40,0.16)] ${isPositiveSide ? "bg-[#12B886]" : "bg-[#E85D5D]"}`}>
          <CheckCircle className="h-11 w-11" />
        </div>
        <h3 className="text-3xl font-black text-[#101828]">Prediction Locked</h3>
        <p className="mt-3 text-base font-black text-[#101828]">
          You backed {selection.side} with {formatNaira(amount)}.
        </p>
        {activation.isProtected ? (
          <div className="mt-4">
            <RefundProtectionState progress={activation.progress} totalPool={activation.totalPool} requiredPool={activation.requirements.totalPool} compact />
            <p className="mt-3 text-sm font-semibold leading-6 text-[#475467]">
              We will notify you when this market goes live or if a refund is issued.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#F8F7F4] p-3 text-left">
            <InfoCard label="Estimated return" value={formatNaira(estimatedReturn)} />
            <InfoCard label="Estimated profit" value={formatNaira(estimatedProfit)} />
          </div>
        )}
        <div className="mt-7 grid gap-3">
          <Link to="/portfolio" onClick={onClose} className="flex h-12 items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-black text-white transition hover:bg-[#4338CA]">
            View Prediction
          </Link>
          <Link to="/" onClick={onClose} className="flex h-12 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-sm font-black text-[#344054] transition hover:bg-[#F3F4F6]">
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
};

const RefundProtectionState = ({
  progress,
  totalPool,
  requiredPool,
  compact = false,
}: {
  progress: number;
  totalPool: number;
  requiredPool: number;
  compact?: boolean;
}) => (
  <div className="rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] p-4">
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm font-black text-[#101828]">Refund Protected</div>
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#4F46E5]">Protection Active</span>
    </div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
      <div className="h-full rounded-full bg-[#4F46E5]" style={{ width: `${progress}%` }} />
    </div>
    <p className="mt-2 text-xs font-bold text-[#475467]">
      {formatNaira(totalPool)} / {formatNaira(requiredPool)} activity
    </p>
    {!compact && (
      <p className="mt-3 text-sm font-bold leading-6 text-[#344054]">
        Your stake is protected if this market does not reach enough activity before closing.
      </p>
    )}
  </div>
);

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-xs font-bold text-[#6B7280]">{label}</div>
    <div className="mt-1 text-base font-black text-[#111827]">{value}</div>
  </div>
);
