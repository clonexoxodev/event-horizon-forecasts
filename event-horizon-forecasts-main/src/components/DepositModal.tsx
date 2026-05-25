import { useState } from "react";
import { ArrowDownRight, CheckCircle, CreditCard, Loader2, Smartphone, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import apiService from "@/lib/api";

type DepositModalProps = {
  open: boolean;
  onClose: () => void;
  currency: "NGN" | "USD";
  onSaved?: () => void;
};

export const DepositModal = ({ open, onClose, currency, onSaved }: DepositModalProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");
  const { toast } = useToast();

  const quickAmounts = currency === "NGN" ? [5000, 10000, 25000, 50000] : [10, 25, 50, 100];
  const numAmount = Number.parseFloat(amount) || 0;

  const handleDeposit = async () => {
    if (numAmount <= 0) return;

    setLoading(true);
    try {
      await apiService.deposit(numAmount, currency, paymentMethod === "transfer" ? "bank_transfer" : "card");
      setSuccess(true);
      onSaved?.();
      toast({ title: "Request saved", description: "Your add money request is pending." });
      setTimeout(() => {
        setSuccess(false);
        setAmount("");
        onClose();
      }, 1600);
    } catch (error: any) {
      toast({
        title: "Add money failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setAmount("");
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#080b16] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:max-w-md">
        <div className="h-1 w-full bg-emerald-400" />
        {success ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-black">Request saved</h3>
            <p className="text-sm text-slate-400">
              {currency} {numAmount.toLocaleString()} is pending.
            </p>
          </div>
        ) : (
          <div className="p-6">
            <button
              onClick={handleClose}
              disabled={loading}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Wallet</p>
              <h3 className="mt-1 text-2xl font-black">Add Money</h3>
              <p className="mt-1 text-sm text-slate-400">Your request will show as pending.</p>
            </div>

            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Amount ({currency})
            </label>
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">{currency}</span>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={loading}
                className="h-13 rounded-2xl border-white/10 bg-white/[0.055] pl-14 text-lg font-black text-white placeholder:text-slate-600 focus:border-emerald-300"
              />
            </div>

            <div className="mb-6 grid grid-cols-4 gap-2">
              {quickAmounts.map((value) => (
                <button
                  key={value}
                  onClick={() => setAmount(value.toString())}
                  disabled={loading}
                  className={`h-10 rounded-xl border text-sm font-black transition ${
                    amount === value.toString()
                      ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-200"
                      : "border-white/10 bg-white/[0.055] text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {value >= 1000 ? `${value / 1000}k` : value}
                </button>
              ))}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2">
              <MethodButton active={paymentMethod === "card"} onClick={() => setPaymentMethod("card")} disabled={loading} icon={CreditCard} label="Card" />
              <MethodButton active={paymentMethod === "transfer"} onClick={() => setPaymentMethod("transfer")} disabled={loading} icon={Smartphone} label="Transfer" />
            </div>

            <Button
              onClick={handleDeposit}
              disabled={loading || numAmount <= 0}
              className="h-12 w-full rounded-2xl bg-emerald-500 text-base font-black text-white hover:bg-emerald-400 disabled:opacity-50"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownRight className="mr-2 h-4 w-4" />}
              Add {numAmount > 0 ? `${currency} ${numAmount.toLocaleString()}` : "money"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const MethodButton = ({ active, onClick, disabled, icon: Icon, label }: { active: boolean; onClick: () => void; disabled: boolean; icon: any; label: string }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-black transition ${
      active ? "border-violet-300/40 bg-violet-400/20 text-violet-200" : "border-white/10 bg-white/[0.055] text-slate-300 hover:bg-white/10"
    } disabled:opacity-50`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);
