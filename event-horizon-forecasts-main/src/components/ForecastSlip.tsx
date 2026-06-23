import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { formatNaira, formatNairaPrice } from "@/lib/markets";
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

  const quickAmounts = [100, 500, 1000, 5000];
  const numAmount = Number.parseFloat(amount) || 0;
  const probability = selection?.currentPrice || 50;
  const isPositiveSide = selection?.side === "YES" || selection?.side === "UP";
  const oppositeStake = isPositiveSide ? selection?.noPool ?? 0 : selection?.yesPool ?? 0;
  const totalPool = (selection?.yesPool ?? 0) + (selection?.noPool ?? 0);
  const userBalance = user?.balance || 0;
  const insufficientBalance = numAmount > userBalance;

  const handleConfirm = async () => {
    if (loading) return;
    if (!selection || numAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    if (insufficientBalance) {
      toast.error("Insufficient balance. Add money to continue.");
      return;
    }

    setLoading(true);
    try {
      await onConfirm(selection, numAmount);
      setSuccess(true);
      toast.success("Prediction locked.");
      setLoading(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Server error. Please try again.");
      setLoading(false);
    }
  };

  const handleClear = () => {
    setAmount("");
    setSuccess(false);
    onClose();
  };

  if (!selection) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#111827]/35 backdrop-blur-sm" onClick={() => !loading && onClose()} />

      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-2xl border border-[#E5E7EB] bg-white pb-[calc(90px+env(safe-area-inset-bottom))] shadow-[0_-24px_80px_rgba(17,24,39,0.16)] md:bottom-auto md:left-auto md:top-0 md:h-screen md:w-[460px] md:rounded-none md:border-l md:pb-0">
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {success ? (
          <SuccessState selection={selection} amount={numAmount} onClose={handleClear} />
        ) : (
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">Prediction slip</p>
                <h2 className="mt-1 text-2xl font-black text-[#111827]">Back your opinion</h2>
              </div>
              <button
                onClick={handleClear}
                disabled={loading}
                className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] transition hover:text-[#111827] disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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
                      Crowd View {formatNairaPrice(probability)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 border-y border-[#E5E7EB] py-4">
              <InfoCard label="Wallet balance" value={user ? formatNaira(userBalance) : "Login required"} />
              <InfoCard label="Crowd View" value={formatNairaPrice(probability)} />
            </div>

            {!user && (
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
                <div className="font-black text-[#111827]">Login to place this prediction</div>
                <p className="mt-1 text-sm text-[#6B7280]">You can browse markets freely. Sign in only when you are ready to predict.</p>
                <button onClick={() => { onClose(); setAuthOpen(true); }} className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-black text-white hover:bg-[#4338CA]">
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
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={loading}
                  className={`h-14 rounded-xl border-2 bg-[#F8F7F4] pl-14 text-xl font-black text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] ${
                    insufficientBalance && numAmount > 0 ? "border-[#E85D5D]" : "border-[#E5E7EB]"
                  }`}
                />
              </div>
              {insufficientBalance && numAmount > 0 && (
                <p className="mt-2 text-xs font-bold text-[#B42318]">Insufficient balance.</p>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((value) => (
                <button
                  key={value}
                  onClick={() => setAmount(value.toString())}
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
              <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">
                Projection
              </div>
              {numAmount > 0 && !insufficientBalance ? (
                <>
                <Row label="Your stake" value={formatNaira(numAmount)} />
                <Row label="Crowd View" value={formatNairaPrice(probability)} />
                <Row label="Total Pool" value={formatNaira(totalPool)} />
                <Row label="Opposing Pool" value={formatNaira(oppositeStake)} highlight />
                <Row label="Market participants" value={`${selection.participants ?? 0}`} />
                <p className="mt-3 text-xs font-bold leading-relaxed text-[#6B7280]">
                  Final payout depends on the result and the final pool when the market closes.
                </p>
                </>
              ) : (
                <p className="text-sm font-bold text-[#6B7280]">Choose an amount to back this side.</p>
              )}
            </div>

            <Button
              onClick={handleConfirm}
              disabled={!user || loading || numAmount <= 0 || insufficientBalance}
              className={`h-13 w-full rounded-xl text-base font-black text-white transition ${
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
                <>
                  Back {selection.side}
                </>
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

const SuccessState = ({ selection, amount, onClose }: { selection: ForecastSelection; amount: number; onClose: () => void }) => {
  const isPositiveSide = selection.side === "YES" || selection.side === "UP";

  return (
    <div className="grid min-h-[460px] place-items-center bg-white p-8 text-center">
      <div className="w-full max-w-sm">
        <div className={`mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full text-white shadow-[0_18px_44px_rgba(16,24,40,0.16)] ${isPositiveSide ? "bg-[#12B886]" : "bg-[#E85D5D]"}`}>
          <CheckCircle className="h-11 w-11" />
        </div>
        <h3 className="text-3xl font-black text-[#101828]">Prediction Locked</h3>
        <p className="mt-3 text-base font-black text-[#101828]">
          You backed {selection.side}
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#475467]">
          {formatNaira(amount)} at {formatNairaPrice(selection.currentPrice)}. Track this prediction in My Predictions.
        </p>
        <div className="mt-7 grid gap-3">
          <Link to="/portfolio" onClick={onClose} className="flex h-12 items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-black text-white transition hover:bg-[#4338CA]">
            View Prediction
          </Link>
          <button onClick={onClose} className="h-12 rounded-xl border border-[#E5E7EB] bg-white text-sm font-black text-[#344054] transition hover:bg-[#F3F4F6]">
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-xs font-bold text-[#6B7280]">{label}</div>
    <div className="mt-1 text-base font-black text-[#111827]">{value}</div>
  </div>
);

const Row = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between border-b border-[#E5E7EB] py-2 last:border-0">
    <span className="text-sm font-bold text-[#6B7280]">{label}</span>
    <span className={`text-sm font-black ${highlight ? "text-[#047857]" : "text-[#111827]"}`}>{value}</span>
  </div>
);
