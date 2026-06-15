import { useState } from "react";
import { CheckCircle, Loader2, TrendingUp, X } from "lucide-react";
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
  const sideShares = isPositiveSide ? selection?.totalYesShares ?? 0 : selection?.totalNoShares ?? 0;
  const oppositeStake = isPositiveSide ? selection?.noPool ?? 0 : selection?.yesPool ?? 0;
  const sharesReceived = probability > 0 && numAmount > 0 ? numAmount / probability : 0;
  const projectedProfit = sideShares + sharesReceived > 0 && oppositeStake > 0
    ? (sharesReceived / (sideShares + sharesReceived)) * oppositeStake
    : 0;
  const projectedPayout = numAmount + projectedProfit;
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
      setTimeout(() => {
        setSuccess(false);
        setLoading(false);
        setAmount("");
        onClose();
      }, 1400);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Server error. Please try again.");
      setLoading(false);
    }
  };

  const handleClear = () => {
    setAmount("");
    onClose();
  };

  if (!selection) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => !loading && onClose()} />

      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-2xl border border-[#263241] bg-[#101720] pb-[calc(90px+env(safe-area-inset-bottom))] shadow-[0_-24px_80px_rgba(0,0,0,0.55)] md:bottom-auto md:left-auto md:top-0 md:h-screen md:w-[460px] md:rounded-none md:border-l md:pb-0">
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {success ? (
          <SuccessState selection={selection} amount={numAmount} />
        ) : (
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">Prediction slip</p>
                <h2 className="mt-1 text-2xl font-black text-white">Lock Prediction</h2>
              </div>
              <button
                onClick={handleClear}
                disabled={loading}
                className="grid h-10 w-10 place-items-center rounded-xl border border-[#263241] bg-[#151E28] text-[#8B98A8] transition hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={`rounded-2xl border p-4 ${isPositiveSide ? "border-[#12B886]/25 bg-[#12B886]/10" : "border-[#E85D5D]/25 bg-[#E85D5D]/10"}`}>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-2xl">
                  {selection.marketIcon}
                </div>
                <div className="min-w-0">
                  <div className="line-clamp-3 text-sm font-black leading-snug text-white">
                    {selection.marketQuestion}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${isPositiveSide ? "bg-[#12B886]/12 text-[#7AE4BD]" : "bg-[#E85D5D]/12 text-[#FF9C9C]"}`}>
                      {selection.side}
                    </span>
                    <span className="rounded-full border border-[#263241] bg-[#151E28] px-3 py-1 text-xs font-bold text-[#8B98A8]">
                      {formatNairaPrice(probability)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="Wallet balance" value={user ? formatNaira(userBalance) : "Login required"} />
              <InfoCard label="Current confidence" value={formatNairaPrice(probability)} />
            </div>

            {!user && (
              <div className="rounded-2xl border border-[#12B886]/25 bg-[#12B886]/10 p-4">
                <div className="font-black text-white">Login to place this prediction</div>
                <p className="mt-1 text-sm text-[#8B98A8]">You can browse markets freely. Sign in only when you are ready to predict.</p>
                <button onClick={() => { onClose(); setAuthOpen(true); }} className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-[#12B886] text-sm font-black text-[#06100d]">
                  Continue
                </button>
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#8B98A8]">
                  NGN
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={loading}
                  className={`h-14 rounded-xl border-2 bg-[#151E28] pl-14 text-xl font-black text-white placeholder:text-[#8B98A8] focus:border-[#12B886] ${
                    insufficientBalance && numAmount > 0 ? "border-[#E85D5D]" : "border-[#263241]"
                  }`}
                />
              </div>
              {insufficientBalance && numAmount > 0 && (
                <p className="mt-2 text-xs font-bold text-[#FF9C9C]">Insufficient balance.</p>
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
                        ? "border-[#12B886]/45 bg-[#12B886]/18 text-[#7AE4BD]"
                        : "border-[#E85D5D]/45 bg-[#E85D5D]/18 text-[#FF9C9C]"
                      : "border-[#263241] bg-[#151E28] text-[#8B98A8] hover:text-white"
                  }`}
                >
                  {formatNaira(value).replace(".00", "")}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-[#263241] bg-[#151E28] p-4">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">
                Projection
              </div>
              {numAmount > 0 && !insufficientBalance ? (
                <>
                <Row label="Amount" value={formatNaira(numAmount)} />
                <Row label="Current confidence" value={formatNairaPrice(probability)} />
                <Row label="Units received" value={sharesReceived.toFixed(2)} />
                <Row label="Potential payout if correct" value={formatNaira(projectedPayout)} highlight />
                <Row label="Market participants" value={`${selection.participants ?? 0}`} />
                <p className="mt-3 text-xs font-bold leading-relaxed text-[#8B98A8]">
                  Payout is projected and the final amount is confirmed when the market resolves.
                </p>
                </>
              ) : (
                <p className="text-sm font-bold text-[#8B98A8]">Choose an amount to see your potential payout.</p>
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
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Lock Prediction
                </>
              )}
            </Button>

            <button
              onClick={handleClear}
              disabled={loading}
              className="w-full text-sm font-bold text-[#8B98A8] transition hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const SuccessState = ({ selection, amount }: { selection: ForecastSelection; amount: number }) => {
  const isPositiveSide = selection.side === "YES" || selection.side === "UP";

  return (
    <div className="grid min-h-[420px] place-items-center p-8 text-center">
      <div>
        <div className={`mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full ${isPositiveSide ? "bg-[#12B886]/10 text-[#7AE4BD]" : "bg-[#E85D5D]/10 text-[#FF9C9C]"}`}>
          <CheckCircle className="h-10 w-10" />
        </div>
        <h3 className="text-3xl font-black text-white">Prediction locked</h3>
        <p className="mt-2 text-sm text-[#8B98A8]">
          {formatNaira(amount)} on {selection.side} at {formatNairaPrice(selection.currentPrice)}.
        </p>
        <p className="mt-1 text-xs font-bold text-[#8B98A8]">Track it in My Predictions.</p>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-[#263241] bg-[#151E28] p-4">
    <div className="text-xs font-bold text-[#8B98A8]">{label}</div>
    <div className="mt-1 text-base font-black text-white">{value}</div>
  </div>
);

const Row = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between border-b border-[#263241] py-2 last:border-0">
    <span className="text-sm font-bold text-[#8B98A8]">{label}</span>
    <span className={`text-sm font-black ${highlight ? "text-[#7AE4BD]" : "text-white"}`}>{value}</span>
  </div>
);
