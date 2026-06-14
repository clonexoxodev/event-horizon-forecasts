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
  const [depositReference, setDepositReference] = useState("");
  const [paymentInstruction, setPaymentInstruction] = useState("");
  const { toast } = useToast();

  const quickAmounts = currency === "NGN" ? [5000, 10000, 25000, 50000] : [10, 25, 50, 100];
  const numAmount = Number.parseFloat(amount) || 0;

  const handleDeposit = async () => {
    if (numAmount <= 0) return;

    setLoading(true);
    try {
      const response = await apiService.createDepositRequest(numAmount, paymentMethod === "transfer" ? "bank_transfer" : "card");
      setDepositReference(response.depositRequest.reference);
      setPaymentInstruction(response.depositRequest.paymentInstruction);
      setSuccess(true);
      onSaved?.();
      toast({ title: "Request saved", description: "Your add money request is pending." });
      setTimeout(() => {
        setSuccess(false);
        setAmount("");
        setDepositReference("");
        setPaymentInstruction("");
        onClose();
      }, 5000);
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
    setDepositReference("");
    setPaymentInstruction("");
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden rounded-2xl border border-[#263241] bg-[#101720] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:max-w-md">
        <div className="h-1 w-full bg-[#12B886]" />
        {success ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#12B886]/10 text-[#12B886]">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-black">Request saved</h3>
            <p className="text-sm text-[#8B98A8]">
              {currency} {numAmount.toLocaleString()} is pending.
            </p>
            {depositReference && (
              <div className="mt-5 rounded-xl border border-[#263241] bg-[#151E28] p-4 text-left">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">Reference</div>
                <div className="mt-1 text-lg font-black text-white">{depositReference}</div>
                <p className="mt-3 text-sm font-bold text-[#D5DEE8]">{paymentInstruction}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <button
              onClick={handleClose}
              disabled={loading}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-[#263241] bg-[#151E28] text-[#8B98A8] transition hover:text-white disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#12B886]">Wallet</p>
              <h3 className="mt-1 text-2xl font-black">Add Money</h3>
              <p className="mt-1 text-sm text-[#8B98A8]">Create a pending request. Your wallet is credited after confirmation.</p>
            </div>

            <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">
              Amount ({currency})
            </label>
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#8B98A8]">{currency}</span>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={loading}
                className="h-13 rounded-xl border-[#263241] bg-[#151E28] pl-14 text-lg font-black text-white placeholder:text-[#8B98A8] focus:border-[#12B886]"
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
                      ? "border-[#12B886]/40 bg-[#12B886]/18 text-[#7AE4BD]"
                      : "border-[#263241] bg-[#151E28] text-[#8B98A8] hover:text-white"
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
              className="h-12 w-full rounded-xl bg-[#12B886] text-base font-black text-[#06100d] hover:bg-[#2dd4a0] disabled:opacity-50"
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
    className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-black transition ${
      active ? "border-[#12B886]/40 bg-[#12B886]/18 text-[#7AE4BD]" : "border-[#263241] bg-[#151E28] text-[#8B98A8] hover:text-white"
    } disabled:opacity-50`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);
