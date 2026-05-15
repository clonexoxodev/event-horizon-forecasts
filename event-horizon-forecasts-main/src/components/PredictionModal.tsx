import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, TrendingUp, Loader2, CheckCircle } from "lucide-react";
import { formatNaira } from "@/lib/markets";
import { useToast } from "@/hooks/use-toast";

type PredictionModalProps = {
  open: boolean;
  onClose: () => void;
  market: {
    id: string;
    question: string;
    icon: string;
    yesPercent: number;
  };
  side: "YES" | "NO";
};

export const PredictionModal = ({ open, onClose, market, side }: PredictionModalProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const quickAmounts = [1000, 5000, 10000, 25000];
  const numAmount = parseFloat(amount) || 0;
  const probability = side === "YES" ? market.yesPercent : 100 - market.yesPercent;
  const projectedReturn = numAmount > 0 ? numAmount * (100 / probability) : 0;
  const projectedProfit = projectedReturn - numAmount;

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleConfirm = async () => {
    if (numAmount <= 0) return;

    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setLoading(false);
    setSuccess(true);

    // Show success toast
    toast({
      title: "Forecast placed!",
      description: `You staked ${formatNaira(numAmount)} on ${side}`,
    });

    // Reset and close after animation
    setTimeout(() => {
      setSuccess(false);
      setAmount("");
      onClose();
    }, 2000);
  };

  const handleClose = () => {
    if (loading) return;
    setAmount("");
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-border/60 shadow-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-bottom-[48%] data-[state=open]:slide-in-from-bottom-[48%] sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95">
        {/* Header accent */}
        <div className={`h-1 w-full ${side === "YES" ? "bg-emerald" : "bg-coral"}`} />

        {success ? (
          // Success State
          <div className="p-8 text-center animate-fade-in">
            <div
              className={`w-16 h-16 rounded-full mx-auto mb-4 grid place-items-center animate-bounce-slow ${
                side === "YES" ? "bg-emerald-soft text-emerald" : "bg-coral-soft text-coral"
              }`}
            >
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-charcoal">Forecast Placed!</h3>
            <p className="text-sm text-graphite">
              You staked {formatNaira(numAmount)} on {side}
            </p>
            <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
              side === "YES" ? "bg-emerald-soft text-emerald" : "bg-coral-soft text-coral"
            }`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${side === "YES" ? "bg-emerald" : "bg-coral"}`} />
              Position active
            </div>
          </div>
        ) : (
          // Prediction Form
          <div className="p-6">
            {/* Close button */}
            <button
              onClick={handleClose}
              disabled={loading}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg grid place-items-center text-graphite hover:text-charcoal hover:bg-graphite/8 transition-fast disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Market info */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-graphite/10 grid place-items-center text-2xl">
                  {market.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm line-clamp-2 leading-snug text-charcoal">
                    {market.question}
                  </h3>
                </div>
              </div>

              {/* Selected side */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-sm ${
                  side === "YES"
                    ? "bg-emerald-soft text-emerald border border-emerald/20"
                    : "bg-coral-soft text-coral border border-coral/20"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${side === "YES" ? "bg-emerald" : "bg-coral"}`} />
                Forecasting {side}
              </div>
            </div>

            {/* Amount input */}
            <div className="mb-4">
              <label className="text-tiny font-medium text-graphite uppercase tracking-wide mb-2 block">
                Amount
              </label>
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite font-semibold transition-colors group-focus-within:text-purple">
                  ₦
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  className="pl-7 h-12 text-lg font-bold rounded-xl border-2 focus:border-purple transition-all duration-300 focus:shadow-lg focus:shadow-purple/10"
                />
                {/* Focus ring animation */}
                <div className={`absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 ${
                  amount ? "opacity-100" : "opacity-0"
                } ${side === "YES" ? "ring-2 ring-emerald/20" : "ring-2 ring-coral/20"}`} />
              </div>
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {quickAmounts.map((value) => (
                <button
                  key={value}
                  onClick={() => handleQuickAmount(value)}
                  disabled={loading}
                  className={`h-10 rounded-xl text-sm font-semibold transition-all duration-300 border relative overflow-hidden group ${
                    amount === value.toString()
                      ? side === "YES"
                        ? "bg-emerald-soft border-emerald/30 text-emerald scale-105 shadow-sm"
                        : "bg-coral-soft border-coral/30 text-coral scale-105 shadow-sm"
                      : "border-border text-graphite hover:text-charcoal hover:bg-graphite/8 hover:scale-105 hover:border-graphite/30 active:scale-95"
                  } disabled:opacity-50`}
                >
                  <span className="relative z-10">₦{value / 1000}k</span>
                  {/* Hover shimmer effect */}
                  {amount !== value.toString() && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Projected return preview */}
            {numAmount > 0 && (
              <div className={`rounded-xl p-4 mb-6 space-y-2 animate-fade-in border transition-all duration-500 ${
                side === "YES" 
                  ? "bg-emerald-soft/30 border-emerald/20" 
                  : "bg-coral-soft/30 border-coral/20"
              }`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-graphite">Your stake</span>
                  <span className="font-bold text-charcoal">{formatNaira(numAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-graphite">Probability</span>
                  <span className="font-bold text-charcoal">{probability}%</span>
                </div>
                <div className="h-px bg-border/50 my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-charcoal">Projected return</span>
                  <div className="text-right">
                    <div className="font-extrabold text-lg text-charcoal animate-fade-in">{formatNaira(projectedReturn)}</div>
                    <div
                      className={`text-xs font-semibold animate-fade-in ${
                        side === "YES" ? "text-emerald" : "text-coral"
                      }`}
                    >
                      +{formatNaira(projectedProfit)} profit
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm button */}
            <Button
              onClick={handleConfirm}
              disabled={loading || numAmount <= 0}
              className={`w-full h-12 font-bold rounded-xl text-base shadow-sm transition-all duration-300 relative overflow-hidden group ${
                side === "YES"
                  ? "bg-emerald hover:bg-emerald/90 text-white hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-coral hover:bg-coral/90 text-white hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98]"
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Placing forecast...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Confirm Forecast
                </>
              )}
              {/* Button shimmer effect on hover */}
              {!loading && numAmount > 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              )}
            </Button>

            {numAmount <= 0 && (
              <p className="text-xs text-graphite text-center mt-3">
                Enter an amount to continue
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
