import { useState } from "react";
import { X, TrendingUp, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNaira } from "@/lib/markets";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

type ForecastSelection = {
  marketId: string;
  marketQuestion: string;
  marketIcon: string;
  side: "YES" | "NO";
  currentPrice: number;
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
  const { user } = useAuth();

  const quickAmounts = [1000, 5000, 10000, 25000];
  const numAmount = parseFloat(amount) || 0;
  const probability = selection?.currentPrice || 50;
  const projectedReturn = numAmount > 0 ? numAmount * (100 / probability) : 0;
  const projectedProfit = projectedReturn - numAmount;

  const userBalance = user?.balance || 0;
  const insufficientBalance = numAmount > userBalance;

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleConfirm = async () => {
    if (!selection || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (insufficientBalance) {
      toast.error("Insufficient funds. Please add funds to your wallet.");
      return;
    }

    setLoading(true);

    try {
      await onConfirm(selection, numAmount);
      
      setSuccess(true);
      
      toast.success(`Forecast placed! You staked ${formatNaira(numAmount)} on ${selection.side}`);

      // Reset and close after animation
      setTimeout(() => {
        setSuccess(false);
        setAmount("");
        onClose();
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to place forecast");
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
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Mobile: Bottom Sheet */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-elevated animate-slide-up max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-graphite/30" />
        </div>

        {success ? (
          <SuccessState selection={selection} amount={numAmount} />
        ) : (
          <ForecastContent
            selection={selection}
            amount={amount}
            setAmount={setAmount}
            numAmount={numAmount}
            probability={probability}
            projectedReturn={projectedReturn}
            projectedProfit={projectedProfit}
            quickAmounts={quickAmounts}
            handleQuickAmount={handleQuickAmount}
            handleConfirm={handleConfirm}
            handleClear={handleClear}
            loading={loading}
            userBalance={userBalance}
            insufficientBalance={insufficientBalance}
          />
        )}
      </div>

      {/* Desktop: Right Panel */}
      <div className="hidden md:block fixed right-0 top-0 bottom-0 w-[480px] bg-card shadow-elevated z-50 animate-slide-left overflow-y-auto border-l border-border/40">
        {success ? (
          <SuccessState selection={selection} amount={numAmount} />
        ) : (
          <ForecastContent
            selection={selection}
            amount={amount}
            setAmount={setAmount}
            numAmount={numAmount}
            probability={probability}
            projectedReturn={projectedReturn}
            projectedProfit={projectedProfit}
            quickAmounts={quickAmounts}
            handleQuickAmount={handleQuickAmount}
            handleConfirm={handleConfirm}
            handleClear={handleClear}
            loading={loading}
            userBalance={userBalance}
            insufficientBalance={insufficientBalance}
          />
        )}
      </div>
    </>
  );
};

// Success State Component
const SuccessState = ({ selection, amount }: { selection: ForecastSelection; amount: number }) => (
  <div className="p-8 text-center animate-fade-in">
    <div
      className={`w-20 h-20 rounded-full mx-auto mb-6 grid place-items-center animate-bounce-slow ${
        selection.side === "YES" ? "bg-emerald-soft text-emerald" : "bg-coral-soft text-coral"
      }`}
    >
      <CheckCircle className="w-10 h-10" />
    </div>
    <h3 className="text-2xl font-bold mb-2 text-charcoal">Forecast Placed!</h3>
    <p className="text-sm text-graphite mb-6">
      You staked {formatNaira(amount)} on {selection.side}
    </p>
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
        selection.side === "YES" ? "bg-emerald-soft text-emerald" : "bg-coral-soft text-coral"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full animate-pulse ${
          selection.side === "YES" ? "bg-emerald" : "bg-coral"
        }`}
      />
      Position active
    </div>
  </div>
);

// Forecast Content Component
const ForecastContent = ({
  selection,
  amount,
  setAmount,
  numAmount,
  probability,
  projectedReturn,
  projectedProfit,
  quickAmounts,
  handleQuickAmount,
  handleConfirm,
  handleClear,
  loading,
  userBalance,
  insufficientBalance,
}: {
  selection: ForecastSelection;
  amount: string;
  setAmount: (value: string) => void;
  numAmount: number;
  probability: number;
  projectedReturn: number;
  projectedProfit: number;
  quickAmounts: number[];
  handleQuickAmount: (value: number) => void;
  handleConfirm: () => void;
  handleClear: () => void;
  loading: boolean;
  userBalance: number;
  insufficientBalance: boolean;
}) => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold text-charcoal">Forecast Slip</h2>
      <button
        onClick={handleClear}
        disabled={loading}
        className="w-9 h-9 rounded-xl grid place-items-center text-graphite hover:text-charcoal hover:bg-graphite/8 transition-fast disabled:opacity-50"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* Selected Market */}
    <div className="p-4 rounded-xl bg-off-white border border-graphite/10 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white shadow-sm grid place-items-center text-2xl flex-shrink-0">
          {selection.marketIcon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2 leading-snug text-charcoal">
            {selection.marketQuestion}
          </h3>
        </div>
      </div>

      {/* Selected Side & Current Price */}
      <div className="flex items-center justify-between">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-sm ${
            selection.side === "YES"
              ? "bg-emerald-soft text-emerald border border-emerald/20"
              : "bg-coral-soft text-coral border border-coral/20"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${selection.side === "YES" ? "bg-emerald" : "bg-coral"}`} />
          Forecasting {selection.side}
        </div>
        <div className="text-right">
          <div className="text-xs text-graphite">Current price</div>
          <div className="text-sm font-bold text-charcoal">{probability}%</div>
        </div>
      </div>
    </div>

    {/* Current Balance */}
    <div className="p-4 rounded-xl bg-purple/5 border border-purple/10">
      <div className="flex items-center justify-between">
        <span className="text-sm text-graphite font-medium">Current Balance</span>
        <span className="text-lg font-bold text-purple">{formatNaira(userBalance)}</span>
      </div>
    </div>

    {/* Amount Input */}
    <div>
      <label className="text-xs font-semibold text-graphite uppercase tracking-wider mb-2 block">
        Amount to Stake
      </label>
      <div className="relative group">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-graphite font-bold text-lg transition-colors group-focus-within:text-purple">
          ₦
        </span>
        <Input
          type="number"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
          className={`pl-9 h-14 text-xl font-bold rounded-xl border-2 focus:border-purple transition-all duration-300 focus:shadow-lg focus:shadow-purple/10 ${
            insufficientBalance && numAmount > 0 ? "border-coral focus:border-coral" : ""
          }`}
        />
        {insufficientBalance && numAmount > 0 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <AlertCircle className="w-5 h-5 text-coral" />
          </div>
        )}
      </div>
      {insufficientBalance && numAmount > 0 && (
        <p className="text-xs text-coral mt-2 flex items-center gap-1 font-medium">
          <AlertCircle className="w-3 h-3" />
          Insufficient balance
        </p>
      )}
    </div>

    {/* Preset Amount Buttons */}
    <div>
      <label className="text-xs font-semibold text-graphite uppercase tracking-wider mb-2 block">
        Quick Select
      </label>
      <div className="grid grid-cols-4 gap-2">
        {quickAmounts.map((value) => (
          <button
            key={value}
            onClick={() => handleQuickAmount(value)}
            disabled={loading}
            className={`h-11 rounded-xl text-sm font-bold transition-all duration-300 border relative overflow-hidden group ${
              amount === value.toString()
                ? selection.side === "YES"
                  ? "bg-emerald text-white border-emerald shadow-sm scale-105"
                  : "bg-coral text-white border-coral shadow-sm scale-105"
                : "border-graphite/20 text-graphite hover:text-charcoal hover:bg-graphite/8 hover:scale-105 hover:border-graphite/30 active:scale-95"
            } disabled:opacity-50`}
          >
            <span className="relative z-10">₦{value / 1000}k</span>
            {amount !== value.toString() && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
            )}
          </button>
        ))}
      </div>
    </div>

    {/* Projected Return */}
    {numAmount > 0 && !insufficientBalance && (
      <div
        className={`rounded-xl p-4 space-y-3 animate-fade-in border-2 transition-all duration-500 ${
          selection.side === "YES"
            ? "bg-emerald-soft/30 border-emerald/30"
            : "bg-coral-soft/30 border-coral/30"
        }`}
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-graphite font-medium">Your stake</span>
          <span className="font-bold text-charcoal">{formatNaira(numAmount)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-graphite font-medium">Probability</span>
          <span className="font-bold text-charcoal">{probability}%</span>
        </div>
        <div className="h-px bg-border/50 my-2" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-charcoal">Projected Return</span>
          <div className="text-right">
            <div className="font-extrabold text-xl text-charcoal animate-fade-in">
              {formatNaira(projectedReturn)}
            </div>
            <div
              className={`text-xs font-bold animate-fade-in ${
                selection.side === "YES" ? "text-emerald" : "text-coral"
              }`}
            >
              +{formatNaira(projectedProfit)} profit
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Confirm Button */}
    <Button
      onClick={handleConfirm}
      disabled={loading || numAmount <= 0 || insufficientBalance}
      className={`w-full h-13 font-bold rounded-xl text-base shadow-sm transition-all duration-300 relative overflow-hidden group ${
        selection.side === "YES"
          ? "bg-emerald hover:bg-emerald/90 text-white hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98]"
          : "bg-coral hover:bg-coral/90 text-white hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98]"
      } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Placing forecast...
        </>
      ) : (
        <>
          <TrendingUp className="w-5 h-5 mr-2" />
          Confirm Forecast
        </>
      )}
      {!loading && numAmount > 0 && !insufficientBalance && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
      )}
    </Button>

    {numAmount <= 0 && (
      <p className="text-xs text-graphite text-center">Enter an amount to continue</p>
    )}

    {/* Clear Button */}
    <button
      onClick={handleClear}
      disabled={loading}
      className="w-full text-sm text-graphite hover:text-charcoal font-semibold transition-fast disabled:opacity-50"
    >
      Clear selection
    </button>
  </div>
);
