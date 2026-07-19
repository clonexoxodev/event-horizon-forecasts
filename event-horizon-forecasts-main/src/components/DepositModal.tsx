import { useState } from "react";
import { ArrowDownRight, CheckCircle, Loader2, ShieldCheck, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import apiService from "@/lib/api";
import { formatNaira } from "@/lib/markets";

type DepositModalProps = {
  open: boolean;
  onClose: () => void;
  currency: "NGN" | "USD";
  onSaved?: () => void;
};

export const DepositModal = ({
  open,
  onClose,
  currency,
  onSaved,
}: DepositModalProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const quickAmounts = [
    { value: 500, label: "500" },
    { value: 1000, label: "1,000" },
    { value: 5000, label: "5,000" },
    { value: 10000, label: "10,000" },
  ];
  const numAmount = Number.parseFloat(amount) || 0;

  const handleContinue = async () => {
    if (numAmount <= 0) return;

    setLoading(true);
    try {
      const session = await apiService.createPaymentSession(numAmount);
      toast({
        title: "Opening secure checkout",
        description: `Continue on ${providerLabel(session.provider)} to add ${formatNaira(numAmount)}.`,
      });
      window.location.href = session.authorizationUrl;
    } catch (error: any) {
      toast({
        title: "Could not start payment",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setAmount("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent aria-label="Deposit funds" className="max-h-[90vh] overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-0 text-[#111827] shadow-modal sm:max-w-md">
        <div className="h-1 w-full bg-[#4F46E5]" />
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
                  <ArrowDownRight className="h-4 w-4" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#4F46E5]">
                  Deposit
                </p>
              </div>
              <h3 className="mt-3 text-2xl font-black">Add Money</h3>
              <p className="mt-1 text-sm text-[#6B7280]">
                Enter an amount below to add funds to your wallet.
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] transition hover:text-[#111827] disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">
            Amount
          </label>
          <div className="relative mb-3">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-[#4F46E5]">
              ₦
            </span>
            <Input
              type="number"
              min="1"
              placeholder="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={loading}
              aria-label="Amount in Naira"
              className="h-14 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-12 text-2xl font-black text-[#111827] placeholder:text-[#D1D5DB] focus:border-[#4F46E5] focus:ring-[#4F46E5]/20"
            />
            {numAmount > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#6B7280]">
                {currency}
              </span>
            )}
          </div>

          <div className="mb-5 grid grid-cols-4 gap-2">
            {quickAmounts.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setAmount(value.toString())}
                disabled={loading}
                aria-label={`Deposit ${label} Naira`}
                className={`rounded-xl border py-2.5 text-xs font-black transition sm:text-sm ${
                  amount === value.toString()
                    ? "border-[#4F46E5]/40 bg-[#4F46E5]/10 text-[#4F46E5] shadow-[0_2px_8px_rgba(79,70,229,0.15)]"
                    : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] hover:border-[#4F46E5]/20 hover:text-[#111827]"
                }`}
              >
                ₦{label}
              </button>
            ))}
          </div>

          <div className="mb-5 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6B7280]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#4F46E5]" />
              <span>
                Powered by <span className="font-black text-[#111827]">{providerLabel()}</span> — secure, encrypted payment
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#9CA3AF]">
              You'll be redirected to a secure checkout. Your wallet is only credited after payment verification.
            </p>
          </div>

          <Button
            onClick={handleContinue}
            disabled={loading || numAmount <= 0}
            className="sticky bottom-0 h-12 w-full rounded-xl bg-[#4F46E5] text-sm font-black text-white shadow-lg transition hover:bg-[#4338CA] hover:shadow-[0_4px_14px_rgba(79,70,229,0.4)] disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting to checkout...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4" />
                Deposit {numAmount > 0 ? formatNaira(numAmount) : ""}
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const providerLabel = (provider?: string) => {
  if (provider === "flutterwave") return "Flutterwave";
  if (provider === "monnify") return "Monnify";
  return "Paystack";
};
