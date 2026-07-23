import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Loader2, CheckCircle2, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import { toast } from "sonner";

const QUICK_AMOUNTS = [500, 1000, 5000, 10000];

export const ForecastSlip = ({
  selection,
  onClose,
  onConfirm,
}: {
  selection: {
    marketId: string;
    marketQuestion: string;
    side: "YES" | "NO";
    marketIcon?: string;
    currentPrice?: number;
  } | null;
  onClose: () => void;
  onConfirm: (
    selection: { marketId: string; marketQuestion: string; side: "YES" | "NO"; marketIcon?: string },
    amount: number
  ) => Promise<void>;
}) => {
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<"form" | "submitting" | "success">("form");
  const [submittedAmount, setSubmittedAmount] = useState(0);
  const { user } = useAuth();

  const numAmount = parseFloat(amount) || 0;
  const balance = user?.balance ?? 0;
  const remaining = Math.max(0, balance - numAmount);
  const insufficient = numAmount > balance;
  const currentPrice = selection?.currentPrice ?? 50;
  const yesPercent = currentPrice;
  const noPercent = 100 - currentPrice;

  const estimatedReturn = useMemo(() => {
    if (numAmount <= 0 || currentPrice <= 0) return 0;
    return (numAmount / currentPrice) * 100;
  }, [numAmount, currentPrice]);

  const estimatedProfit = estimatedReturn - numAmount;

  const predictionStrength = useMemo(() => {
    if (numAmount <= 0) return 0;
    const strength = Math.min(100, (numAmount / 5000) * 100);
    return Math.round(strength);
  }, [numAmount]);

  const isValid = useMemo(() => {
    if (!user || numAmount <= 0 || insufficient) return false;
    return true;
  }, [user, numAmount, insufficient]);

  useEffect(() => {
    setAmount(""); setPhase("form"); setSubmittedAmount(0);
  }, [selection?.marketId, selection?.side]);

  const handleClose = useCallback(() => {
    setAmount(""); setPhase("form"); setSubmittedAmount(0); onClose();
  }, [onClose]);

  const handlePlacePrediction = async () => {
    if (!selection || !isValid) return;
    setPhase("submitting");
    try {
      await onConfirm(
        { marketId: selection.marketId, marketQuestion: selection.marketQuestion, side: selection.side, marketIcon: selection.marketIcon },
        numAmount
      );
      setSubmittedAmount(numAmount);
      setPhase("success");
      toast.success(`Prediction placed: ${formatNaira(numAmount)} on ${selection.side}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place prediction");
      setPhase("form");
    }
  };

  if (!selection) return null;
  const posSide = selection.side === "YES";
  const accent = posSide ? "#12B886" : "#E85D5D";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Place prediction"
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-gray-200 bg-white shadow-2xl md:bottom-auto md:left-auto md:top-0 md:h-screen md:w-[420px] md:rounded-none md:border-l md:border-t-0"
      >
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        {phase === "form" && (
          <FormPhase
            selection={selection} amount={amount} setAmount={setAmount}
            numAmount={numAmount} balance={balance} remaining={remaining}
            insufficient={insufficient} isValid={isValid}
            yesPercent={yesPercent} noPercent={noPercent}
            estimatedReturn={estimatedReturn} estimatedProfit={estimatedProfit}
            predictionStrength={predictionStrength} currentPrice={currentPrice}
            onPlacePrediction={handlePlacePrediction} onClose={handleClose}
          />
        )}
        {phase === "submitting" && <SubmittingPhase side={selection.side} />}
        {phase === "success" && (
          <SuccessPhase
            side={selection.side} amount={submittedAmount} marketQuestion={selection.marketQuestion}
            estimatedReturn={(submittedAmount / currentPrice) * 100} currentPrice={currentPrice}
            onDone={handleClose}
          />
        )}
      </div>
    </>
  );
};

function FormPhase({
  selection, amount, setAmount, numAmount, balance, remaining, insufficient, isValid,
  yesPercent, noPercent, estimatedReturn, estimatedProfit, predictionStrength, currentPrice,
  onPlacePrediction, onClose,
}: {
  selection: { marketId: string; marketQuestion: string; side: "YES" | "NO"; marketIcon?: string; currentPrice?: number };
  amount: string; setAmount: (v: string) => void;
  numAmount: number; balance: number; remaining: number; insufficient: boolean;
  isValid: boolean; yesPercent: number; noPercent: number;
  estimatedReturn: number; estimatedProfit: number;
  predictionStrength: number; currentPrice: number;
  onPlacePrediction: () => void; onClose: () => void;
}) {
  const posSide = selection.side === "YES";
  const accent = posSide ? "#12B886" : "#E85D5D";

  return (
    <div className="flex flex-col p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Place Prediction</p>
          <h2 className="mt-1 text-2xl font-black text-gray-900">Back {selection.side}</h2>
        </div>
        <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Market card */}
      <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: `${accent}33`, backgroundColor: `${accent}08` }}>
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-2xl shadow-sm">
            {selection.marketIcon ?? "📈"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">{selection.marketQuestion}</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                style={{ backgroundColor: `${accent}18`, color: posSide ? "#047857" : "#B42318" }}>
                {selection.side}
              </span>
              <span className="text-xs font-bold text-gray-400">{currentPrice}% probability</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pool Distribution */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Pool Distribution</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-gray-200">
          <div className="bg-[#12B886] transition-all duration-500" style={{ width: `${yesPercent}%` }} />
          <div className="bg-[#E85D5D] transition-all duration-500" style={{ width: `${noPercent}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-bold">
          <span className="text-[#047857]">YES {yesPercent}%</span>
          <span className="text-[#B42318]">NO {noPercent}%</span>
        </div>
      </div>

      {/* Amount */}
      <div className="mt-4">
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₦</span>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
            className={`h-14 w-full rounded-xl border-2 bg-white pl-9 pr-4 text-xl font-black text-gray-900 placeholder:text-gray-300 focus:border-gray-900 focus:outline-none ${insufficient ? "border-red-400" : "border-gray-200"}`} />
        </div>
        {insufficient && <p className="mt-1.5 text-[10px] font-bold text-red-500">Insufficient balance</p>}
      </div>

      {/* Quick amounts */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((v) => (
          <button key={v} onClick={() => setAmount(String(v))}
            className={`h-9 rounded-lg border-2 text-xs font-bold transition ${amount === String(v) ? "border-gray-900 bg-gray-900 text-white" : v > balance ? "cursor-not-allowed border-gray-100 bg-white text-gray-300" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>
            {formatNaira(v).replace(".00", "")}
          </button>
        ))}
      </div>

      {/* Prediction Summary */}
      {numAmount > 0 && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Current Probability</span>
            <span className="text-sm font-black" style={{ color: posSide ? "#047857" : "#B42318" }}>{currentPrice}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Estimated Return</span>
            <span className="text-sm font-black text-gray-900">{formatNaira(estimatedReturn)}</span>
          </div>
          {estimatedProfit > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">Potential Profit</span>
              <span className="text-sm font-black text-emerald-600">+{formatNaira(estimatedProfit)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2.5 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Available Balance</span>
            <span className="text-sm font-black text-gray-900">{formatNaira(balance)}</span>
          </div>
          {remaining < balance && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">After Prediction</span>
              <span className={`text-sm font-black ${remaining <= 0 ? "text-red-500" : "text-emerald-600"}`}>{formatNaira(remaining)}</span>
            </div>
          )}
        </div>
      )}

      {/* Prediction Strength */}
      {numAmount > 0 && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">Prediction Strength</span>
            <span className="text-sm font-black" style={{ color: accent }}>{predictionStrength}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${predictionStrength}%`, backgroundColor: accent }} />
          </div>
          <p className="mt-1.5 text-[10px] font-bold text-gray-400">
            This estimate changes as more users join either side before market resolution.
          </p>
        </div>
      )}

      <p className="mt-4 text-center text-xs font-bold text-gray-400 leading-relaxed">
        Predictions are active immediately. No waiting for matches.
      </p>

      <button onClick={onPlacePrediction} disabled={!isValid}
        className="mt-4 h-14 w-full rounded-xl text-sm font-black uppercase tracking-wider text-white transition disabled:opacity-40"
        style={{ backgroundColor: isValid ? accent : undefined, boxShadow: isValid ? `0 4px 14px ${accent}33` : undefined }}>
        Predict {selection.side}
      </button>
      <button onClick={onClose} className="mt-3 w-full text-sm font-bold text-gray-400 transition hover:text-gray-900">Cancel</button>
    </div>
  );
}

function SubmittingPhase({ side }: { side: "YES" | "NO" }) {
  const accent = side === "YES" ? "#12B886" : "#E85D5D";
  return (
    <div className="grid min-h-[500px] place-items-center p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full text-white" style={{ backgroundColor: accent }}>
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-900">Placing Prediction</h3>
          <p className="mt-2 text-sm font-bold text-gray-500">Adding your prediction to the pool...</p>
        </div>
      </div>
    </div>
  );
}

function SuccessPhase({
  side, amount, marketQuestion, estimatedReturn, currentPrice, onDone,
}: {
  side: "YES" | "NO"; amount: number; marketQuestion: string;
  estimatedReturn: number; currentPrice: number; onDone: () => void;
}) {
  const accent = side === "YES" ? "#12B886" : "#E85D5D";

  return (
    <div className="flex flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Prediction Placed</p>
          <h2 className="mt-1 text-2xl font-black text-gray-900">You're In!</h2>
        </div>
        <button onClick={onDone} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="grid h-20 w-20 place-items-center rounded-full" style={{ backgroundColor: `${accent}18` }}>
          <CheckCircle2 className="h-10 w-10" style={{ color: accent }} />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black"
          style={{ backgroundColor: `${accent}18`, color: posSide(side) }}>
          {side} Prediction Active
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Prediction Details</p>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Market</span>
            <span className="text-sm font-black text-gray-900 max-w-[200px] truncate">{marketQuestion}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Side</span>
            <span className="text-sm font-black" style={{ color: posSide(side) }}>{side}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Stake</span>
            <span className="text-sm font-black text-gray-900">{formatNaira(amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Probability at Entry</span>
            <span className="text-sm font-black" style={{ color: posSide(side) }}>{currentPrice}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Estimated Return</span>
            <span className="text-sm font-black text-gray-900">{formatNaira(estimatedReturn)}</span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs font-bold text-gray-400 leading-relaxed">
        This estimate changes as more users join either side before market resolution.
      </p>

      <button onClick={onDone}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-gray-900 text-sm font-black text-white transition hover:bg-gray-800">
        Done
      </button>
    </div>
  );
}

function posSide(side: "YES" | "NO") {
  return side === "YES" ? "#047857" : "#B42318";
}
