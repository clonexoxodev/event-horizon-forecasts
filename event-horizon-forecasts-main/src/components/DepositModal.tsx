import { useState } from "react";
import { ArrowDownRight, Loader2, X } from "lucide-react";
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

export const DepositModal = ({ open, onClose, currency }: DepositModalProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const quickAmounts = [500, 1000, 5000, 10000];
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
      <DialogContent className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-0 text-[#111827] shadow-[0_24px_80px_rgba(17,24,39,0.16)] sm:max-w-md">
        <div className="h-1 w-full bg-[#12B886]" />
        <div className="p-6">
          <button
            onClick={handleClose}
            disabled={loading}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] transition hover:text-[#111827] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#12B886]">Wallet</p>
            <h3 className="mt-1 text-2xl font-black">Add Money</h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              Enter an amount and continue to secure checkout. Your wallet is credited only after payment is verified.
            </p>
          </div>

          <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">
            Amount ({currency})
          </label>
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#6B7280]">₦</span>
            <Input
              type="number"
              min="1"
              placeholder="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={loading}
              className="h-13 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-10 text-lg font-black text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5]"
            />
          </div>

          <div className="mb-6 grid grid-cols-4 gap-2">
            {quickAmounts.map((value) => (
              <button
                key={value}
                onClick={() => setAmount(value.toString())}
                disabled={loading}
                className={`h-10 rounded-xl border text-xs font-black transition sm:text-sm ${
                  amount === value.toString()
                    ? "border-[#12B886]/40 bg-[#12B886]/18 text-[#047857]"
                    : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {formatNaira(value)}
              </button>
            ))}
          </div>

          <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-4 text-xs font-bold leading-relaxed text-[#6B7280]">
            FLIPPE will send you to the configured payment provider. We never credit your wallet until the backend verifies the payment.
          </div>

          <Button
            onClick={handleContinue}
            disabled={loading || numAmount <= 0}
            className="h-12 w-full rounded-xl bg-[#12B886] text-base font-black text-[#06100d] hover:bg-[#2dd4a0] disabled:opacity-50"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownRight className="mr-2 h-4 w-4" />}
            Continue
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
