import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ArrowUpRight, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { formatNaira } from "@/lib/markets";
import { useToast } from "@/hooks/use-toast";

type WithdrawModalProps = {
  open: boolean;
  onClose: () => void;
  currency: "NGN" | "USD";
  availableBalance: number;
};

export const WithdrawModal = ({ open, onClose, currency, availableBalance }: WithdrawModalProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const quickAmounts = currency === "NGN" ? [5000, 10000, 25000, 50000] : [10, 25, 50, 100];
  const numAmount = parseFloat(amount) || 0;
  const symbol = currency === "NGN" ? "₦" : "$";
  const insufficientFunds = numAmount > availableBalance;

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleWithdraw = async () => {
    if (numAmount <= 0 || insufficientFunds) return;

    setLoading(true);

    // Simulate withdrawal processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setLoading(false);
    setSuccess(true);

    toast({
      title: "Withdrawal successful!",
      description: `${symbol}${numAmount.toLocaleString()} will be sent to your account`,
    });

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
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-border/60 shadow-elevated">
        <div className="h-1 bg-coral w-full" />

        {success ? (
          <div className="p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 grid place-items-center bg-emerald-soft text-emerald">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-charcoal mb-2">Withdrawal Successful!</h3>
            <p className="text-sm text-graphite">
              {symbol}{numAmount.toLocaleString()} will be sent to your account within 24 hours
            </p>
          </div>
        ) : (
          <div className="p-6">
            <button
              onClick={handleClose}
              disabled={loading}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-charcoal mb-2">Withdraw Funds</h3>
              <p className="text-sm text-graphite">
                Available: {symbol}{availableBalance.toLocaleString()}
              </p>
            </div>

            {/* Amount input */}
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                Amount ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  {symbol}
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  className={`pl-7 h-12 text-lg font-bold rounded-xl transition-fast ${
                    insufficientFunds ? "border-coral focus:border-coral" : "focus:border-2 focus:border-purple"
                  }`}
                />
              </div>
              {insufficientFunds && (
                <div className="flex items-center gap-2 text-xs text-coral mt-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Insufficient funds
                </div>
              )}
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {quickAmounts.filter(v => v <= availableBalance).map((value) => (
                <button
                  key={value}
                  onClick={() => handleQuickAmount(value)}
                  disabled={loading}
                  className={`h-10 rounded-xl text-sm font-semibold transition-fast border ${
                    amount === value.toString()
                      ? "bg-coral-soft border-coral/30 text-coral"
                      : "border-graphite/20 text-graphite hover:text-charcoal hover:bg-graphite/5"
                  } disabled:opacity-50`}
                >
                  {symbol}{value >= 1000 ? `${value / 1000}k` : value}
                </button>
              ))}
              <button
                onClick={() => setAmount(availableBalance.toString())}
                disabled={loading}
                className={`h-10 rounded-xl text-sm font-semibold transition-fast border ${
                  amount === availableBalance.toString()
                    ? "bg-coral-soft border-coral/30 text-coral"
                    : "border-graphite/20 text-graphite hover:text-charcoal hover:bg-graphite/5"
                } disabled:opacity-50`}
              >
                All
              </button>
            </div>

            {/* Bank info placeholder */}
            <div className="bg-graphite/5 rounded-xl p-4 mb-6 border border-graphite/10">
              <div className="text-xs text-graphite mb-2">Withdrawal to</div>
              <div className="font-semibold text-sm text-charcoal">Bank Account •••• 1234</div>
              <div className="text-xs text-graphite mt-1">Processing time: 1-24 hours</div>
            </div>

            {/* Confirm button */}
            <Button
              onClick={handleWithdraw}
              disabled={loading || numAmount <= 0 || insufficientFunds}
              className="w-full h-12 bg-coral hover:bg-coral/90 text-white font-bold rounded-xl text-base shadow-sm transition-fast hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Withdraw {numAmount > 0 ? `${symbol}${numAmount.toLocaleString()}` : ""}
                </>
              )}
            </Button>

            {numAmount <= 0 && !insufficientFunds && (
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
