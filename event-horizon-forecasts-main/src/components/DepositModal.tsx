import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ArrowDownRight, Loader2, CheckCircle, CreditCard, Smartphone } from "lucide-react";
import { formatNaira } from "@/lib/markets";
import { useToast } from "@/hooks/use-toast";

type DepositModalProps = {
  open: boolean;
  onClose: () => void;
  currency: "NGN" | "USD";
};

export const DepositModal = ({ open, onClose, currency }: DepositModalProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");
  const { toast } = useToast();

  const quickAmounts = currency === "NGN" ? [5000, 10000, 25000, 50000] : [10, 25, 50, 100];
  const numAmount = parseFloat(amount) || 0;
  const symbol = currency === "NGN" ? "₦" : "$";

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleDeposit = async () => {
    if (numAmount <= 0) return;

    setLoading(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setLoading(false);
    setSuccess(true);

    toast({
      title: "Deposit successful!",
      description: `${symbol}${numAmount.toLocaleString()} added to your wallet`,
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
        <div className="h-1 bg-success w-full" />

        {success ? (
          <div className="p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 grid place-items-center bg-success/10 text-success">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Deposit Successful!</h3>
            <p className="text-sm text-muted-foreground">
              {symbol}{numAmount.toLocaleString()} has been added to your wallet
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
              <h3 className="text-xl font-bold mb-2">Deposit Funds</h3>
              <p className="text-sm text-muted-foreground">Add money to your wallet</p>
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
                  className="pl-7 h-12 text-lg font-bold rounded-xl"
                />
              </div>
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {quickAmounts.map((value) => (
                <button
                  key={value}
                  onClick={() => handleQuickAmount(value)}
                  disabled={loading}
                  className={`h-10 rounded-xl text-sm font-semibold transition-smooth border ${
                    amount === value.toString()
                      ? "bg-success/10 border-success/30 text-success"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  } disabled:opacity-50`}
                >
                  {symbol}{value >= 1000 ? `${value / 1000}k` : value}
                </button>
              ))}
            </div>

            {/* Payment method */}
            <div className="mb-6">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod("card")}
                  disabled={loading}
                  className={`h-12 rounded-xl font-semibold transition-smooth border flex items-center justify-center gap-2 ${
                    paymentMethod === "card"
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  } disabled:opacity-50`}
                >
                  <CreditCard className="w-4 h-4" />
                  Card
                </button>
                <button
                  onClick={() => setPaymentMethod("transfer")}
                  disabled={loading}
                  className={`h-12 rounded-xl font-semibold transition-smooth border flex items-center justify-center gap-2 ${
                    paymentMethod === "transfer"
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  } disabled:opacity-50`}
                >
                  <Smartphone className="w-4 h-4" />
                  Transfer
                </button>
              </div>
            </div>

            {/* Confirm button */}
            <Button
              onClick={handleDeposit}
              disabled={loading || numAmount <= 0}
              className="w-full h-12 bg-success hover:bg-success/90 text-white font-bold rounded-xl text-base shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  Deposit {numAmount > 0 ? `${symbol}${numAmount.toLocaleString()}` : ""}
                </>
              )}
            </Button>

            {numAmount <= 0 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Enter an amount to continue
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
