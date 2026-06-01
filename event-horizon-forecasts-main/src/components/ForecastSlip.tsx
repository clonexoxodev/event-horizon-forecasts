import { useState } from "react";
import { AlertCircle, CheckCircle, Flame, Loader2, Sparkles, TrendingUp, X, Zap } from "lucide-react";
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
  const yesPool = selection?.yesPool ?? 500;
  const noPool = selection?.noPool ?? 500;
  const oppositePool = isPositiveSide ? noPool : yesPool;
  const maxLiquidityStake = Math.floor(oppositePool * 0.5);
  const sharesReceived = probability > 0 && numAmount > 0 ? numAmount / probability : 0;
  const projectedReturn = sharesReceived * 100;
  const projectedProfit = projectedReturn - numAmount;
  const userBalance = user?.balance || 0;
  const insufficientBalance = numAmount > userBalance;
  const exceedsLiquidity = numAmount > 0 && numAmount > maxLiquidityStake;

  const handleConfirm = async () => {
    if (!selection || numAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    if (insufficientBalance) {
      toast.error("Insufficient balance. Add money to continue.");
      return;
    }

    if (exceedsLiquidity) {
      toast.error(`Maximum available for this side is ${formatNaira(maxLiquidityStake)} based on current liquidity.`);
      return;
    }

    setLoading(true);
    try {
      await onConfirm(selection, numAmount);
      setSuccess(true);
      toast.success(`Prediction placed: ${selection.side} with ${formatNaira(numAmount)}`);
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
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#080b16] pb-[calc(90px+env(safe-area-inset-bottom))] shadow-[0_-24px_80px_rgba(0,0,0,0.55)] md:bottom-auto md:left-auto md:top-0 md:h-screen md:w-[460px] md:rounded-none md:border-l md:pb-0">
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {success ? (
          <SuccessState selection={selection} amount={numAmount} />
        ) : (
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  Fast prediction
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">Lock your call</h2>
              </div>
              <button
                onClick={handleClear}
                disabled={loading}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={`rounded-3xl border p-4 ${isPositiveSide ? "border-emerald-300/20 bg-emerald-400/10" : "border-red-300/20 bg-red-400/10"}`}>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-2xl shadow-[0_0_28px_rgba(255,255,255,0.08)]">
                  {selection.marketIcon}
                </div>
                <div className="min-w-0">
                  <div className="line-clamp-3 text-sm font-black leading-snug text-white">
                    {selection.marketQuestion}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${isPositiveSide ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
                      {selection.side}
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">
                      {formatNairaPrice(probability)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="Wallet balance" value={user ? formatNaira(userBalance) : "Login required"} />
              <InfoCard label="Current price" value={formatNairaPrice(probability)} />
            </div>

            {!user && (
              <div className="rounded-3xl border border-violet-300/20 bg-violet-400/10 p-4">
                <div className="font-black text-white">Login to place this prediction</div>
                <p className="mt-1 text-sm text-slate-400">You can browse markets freely. Sign in only when you are ready to predict.</p>
                <button onClick={() => { onClose(); setAuthOpen(true); }} className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl bg-violet-500 text-sm font-black text-white">
                  Continue
                </button>
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
                  NGN
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={loading}
                  className={`h-14 rounded-2xl border-2 bg-white/[0.055] pl-14 text-xl font-black text-white placeholder:text-slate-600 focus:border-violet-400 ${
                    insufficientBalance && numAmount > 0 ? "border-red-400" : "border-white/10"
                  }`}
                />
                {insufficientBalance && numAmount > 0 && (
                  <AlertCircle className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-red-300" />
                )}
              </div>
              {insufficientBalance && numAmount > 0 && (
                <p className="mt-2 text-xs font-bold text-red-300">Insufficient balance.</p>
              )}
              {exceedsLiquidity && (
                <p className="mt-2 text-xs font-bold text-amber-200">Maximum available for this side is {formatNaira(maxLiquidityStake)} based on current liquidity.</p>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((value) => (
                <button
                  key={value}
                  onClick={() => setAmount(value.toString())}
                  disabled={loading}
                  className={`h-11 rounded-2xl border text-sm font-black transition ${
                    amount === value.toString()
                      ? isPositiveSide
                        ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-200"
                        : "border-red-300/40 bg-red-400/20 text-red-200"
                      : "border-white/10 bg-white/[0.055] text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {formatNaira(value).replace(".00", "")}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-violet-300/20 bg-violet-400/10 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-violet-200">
                <Sparkles className="h-3.5 w-3.5" />
                Outcome preview
              </div>
              {numAmount > 0 && !insufficientBalance ? (
                <>
                <Row label="You enter" value={formatNaira(numAmount)} />
                <Row label="Shares" value={sharesReceived.toFixed(2)} />
                <Row label="Possible return" value={formatNaira(projectedReturn)} />
                <Row label="Possible profit" value={`+${formatNaira(projectedProfit)}`} highlight />
                <Row label="Max available" value={formatNaira(maxLiquidityStake)} />
                </>
              ) : (
                <p className="text-sm font-bold text-slate-400">Choose an amount to see your payout instantly.</p>
              )}
            </div>

            <Button
              onClick={handleConfirm}
              disabled={!user || loading || numAmount <= 0 || insufficientBalance || exceedsLiquidity}
              className={`h-13 w-full rounded-2xl text-base font-black text-white shadow-lg transition ${
                isPositiveSide
                  ? "bg-emerald-500 hover:bg-emerald-400"
                  : "bg-red-500 hover:bg-red-400"
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
                  Predict {selection.side}
                </>
              )}
            </Button>

            <button
              onClick={handleClear}
              disabled={loading}
              className="w-full text-sm font-bold text-slate-500 transition hover:text-white disabled:opacity-50"
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
        <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-violet-100">
          <Flame className="h-4 w-4 text-violet-300" />
          Streak momentum saved
        </div>
        <div className={`mx-auto mb-6 grid h-24 w-24 animate-pulse place-items-center rounded-full ${isPositiveSide ? "bg-emerald-400/10 text-emerald-300 shadow-[0_0_70px_rgba(52,211,153,0.22)]" : "bg-red-400/10 text-red-300 shadow-[0_0_70px_rgba(248,113,113,0.22)]"}`}>
          <CheckCircle className="h-10 w-10" />
        </div>
        <h3 className="text-3xl font-black text-white">You’re in</h3>
        <p className="mt-2 text-sm text-slate-400">
          {formatNaira(amount)} on {selection.side}. Watch the market move.
        </p>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
    <div className="text-xs font-bold text-slate-500">{label}</div>
    <div className="mt-1 text-base font-black text-white">{value}</div>
  </div>
);

const Row = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between border-b border-white/10 py-2 last:border-0">
    <span className="text-sm font-bold text-slate-400">{label}</span>
    <span className={`text-sm font-black ${highlight ? "text-emerald-300" : "text-white"}`}>{value}</span>
  </div>
);
