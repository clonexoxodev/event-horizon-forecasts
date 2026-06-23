import { useEffect, useState } from "react";
import { AlertCircle, ArrowUpRight, CheckCircle, Loader2, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import apiService from "@/lib/api";
import { formatNaira } from "@/lib/markets";

type WithdrawModalProps = {
  open: boolean;
  onClose: () => void;
  currency: "NGN" | "USD";
  availableBalance: number;
  onSaved?: () => void;
};

type BankDetails = {
  bankName: string;
  accountNumber: string;
  accountName: string;
};

const SAVED_BANK_KEY = "flippe_saved_bank_details";

export const WithdrawModal = ({ open, onClose, currency, availableBalance, onSaved }: WithdrawModalProps) => {
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [saveDetails, setSaveDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [reference, setReference] = useState("");
  const { toast } = useToast();

  const quickAmounts = [500, 1000, 5000, 10000];
  const numAmount = Number.parseFloat(amount) || 0;
  const insufficientFunds = numAmount > availableBalance;
  const belowMinimum = numAmount > 0 && numAmount < 500;
  const missingBankDetails = !bankName.trim() || !accountNumber.trim() || !accountName.trim();

  useEffect(() => {
    if (!open) return;
    const saved = loadSavedBankDetails();
    if (!saved) return;
    setBankName(saved.bankName);
    setAccountNumber(saved.accountNumber);
    setAccountName(saved.accountName);
    setSaveDetails(true);
  }, [open]);

  const handleWithdraw = async () => {
    if (numAmount <= 0 || insufficientFunds || belowMinimum || missingBankDetails) return;

    setLoading(true);
    try {
      const response = await apiService.createWithdrawalRequest(numAmount, { bankName, accountNumber, accountName });
      if (saveDetails) saveBankDetails({ bankName, accountNumber, accountName });
      setReference(response.withdrawalRequest.reference);
      setSuccess(true);
      onSaved?.();
      toast({ title: "Withdrawal submitted", description: "Your withdrawal request is awaiting review." });
      window.setTimeout(() => {
        setSuccess(false);
        setAmount("");
        setReference("");
        if (!saveDetails) {
          setBankName("");
          setAccountNumber("");
          setAccountName("");
        }
        onClose();
      }, 1800);
    } catch (error: any) {
      toast({
        title: "Withdraw failed",
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
    setReference("");
    if (!saveDetails) {
      setBankName("");
      setAccountNumber("");
      setAccountName("");
    }
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-0 text-[#111827] shadow-[0_24px_80px_rgba(17,24,39,0.16)] sm:max-w-md">
        <div className="h-1 w-full bg-[#E85D5D]" />
        {success ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#12B886]/10 text-[#12B886]">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-black">Withdrawal submitted</h3>
            <p className="text-sm text-[#6B7280]">
              Your withdrawal request has been submitted and is awaiting review.
            </p>
            {reference && <p className="mt-3 text-sm font-black text-[#12B886]">Reference: {reference}</p>}
          </div>
        ) : (
          <div className="p-6">
            <button
              onClick={handleClose}
              disabled={loading}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] transition hover:text-[#111827] disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#E85D5D]">Wallet</p>
              <h3 className="mt-1 text-2xl font-black">Withdraw</h3>
              <p className="mt-1 text-sm text-[#6B7280]">Available: {formatNaira(availableBalance)}</p>
            </div>

            <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">
              Amount ({currency})
            </label>
            <div className="relative mb-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#6B7280]">₦</span>
              <Input
                type="number"
                min="1"
                placeholder="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={loading}
                className={`h-13 rounded-xl bg-[#F8F7F4] pl-10 text-lg font-black text-[#111827] placeholder:text-[#9CA3AF] ${
                  insufficientFunds ? "border-[#E85D5D] focus:border-[#E85D5D]" : "border-[#E5E7EB] focus:border-[#4F46E5]"
                }`}
              />
              {insufficientFunds && <AlertCircle className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#E85D5D]" />}
            </div>
            {insufficientFunds && <p className="mb-4 text-xs font-bold text-[#FF9C9C]">Amount must not exceed your wallet balance.</p>}
            {belowMinimum && <p className="mb-4 text-xs font-bold text-[#F2C94C]">Minimum withdrawal is ₦500.</p>}

            <div className="mb-4 grid grid-cols-4 gap-2">
              {quickAmounts.filter((value) => value <= availableBalance).map((value) => (
                <button
                  key={value}
                  onClick={() => setAmount(value.toString())}
                  disabled={loading}
                  className={`h-10 rounded-xl border text-xs font-black transition sm:text-sm ${
                    amount === value.toString()
                      ? "border-[#E85D5D]/40 bg-[#E85D5D]/18 text-[#B42318]"
                      : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  {formatNaira(value)}
                </button>
              ))}
            </div>

            <div className="mb-6 grid gap-3">
              <Input value={bankName} onChange={(event) => setBankName(event.target.value)} disabled={loading} placeholder="Bank name" className="h-12 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] text-[#111827] placeholder:text-[#9CA3AF]" />
              <Input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} disabled={loading} placeholder="Account number" className="h-12 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] text-[#111827] placeholder:text-[#9CA3AF]" />
              <Input value={accountName} onChange={(event) => setAccountName(event.target.value)} disabled={loading} placeholder="Account name" className="h-12 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] text-[#111827] placeholder:text-[#9CA3AF]" />
              <label className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-3 text-sm font-bold text-[#374151]">
                <input
                  type="checkbox"
                  checked={saveDetails}
                  onChange={(event) => setSaveDetails(event.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 accent-[#12B886]"
                />
                Save these bank details for next time
              </label>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-4 text-xs font-bold leading-relaxed text-[#6B7280]">
                For faster processing, use a bank account that matches your registered name. Third-party accounts may require additional review.
              </div>
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={loading || numAmount <= 0 || insufficientFunds || belowMinimum || missingBankDetails}
              className="h-12 w-full rounded-xl bg-[#E85D5D] text-base font-black text-white hover:bg-[#f07575] disabled:opacity-50"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUpRight className="mr-2 h-4 w-4" />}
              Submit request
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const loadSavedBankDetails = (): BankDetails | null => {
  try {
    const raw = window.localStorage.getItem(SAVED_BANK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.bankName || !parsed.accountNumber || !parsed.accountName) return null;
    return {
      bankName: String(parsed.bankName),
      accountNumber: String(parsed.accountNumber),
      accountName: String(parsed.accountName),
    };
  } catch {
    return null;
  }
};

const saveBankDetails = (details: BankDetails) => {
  window.localStorage.setItem(SAVED_BANK_KEY, JSON.stringify(details));
};
