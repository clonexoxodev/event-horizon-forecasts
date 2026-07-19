import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CheckCircle,
  Copy,
  CreditCard,
  Loader2,
  User,
  Wallet,
  X,
} from "lucide-react";
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

const encodeBankDetails = (details: BankDetails): string => {
  try {
    return btoa(JSON.stringify(details));
  } catch {
    return "";
  }
};

const decodeBankDetails = (encoded: string): BankDetails | null => {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
};

export const WithdrawModal = ({
  open,
  onClose,
  currency,
  availableBalance,
  onSaved,
}: WithdrawModalProps) => {
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
  const missingBankDetails =
    !bankName.trim() || !accountNumber.trim() || !accountName.trim();

  const filteredQuickAmounts = quickAmounts.filter(
    (value) => value <= availableBalance && value >= 500
  );

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
    if (
      numAmount <= 0 ||
      insufficientFunds ||
      belowMinimum ||
      missingBankDetails
    )
      return;

    setLoading(true);
    try {
      const response = await apiService.createWithdrawalRequest(numAmount, {
        bankName,
        accountNumber,
        accountName,
        saveBankDetails: saveDetails,
      });
      if (saveDetails)
        saveBankDetails({ bankName, accountNumber, accountName });
      setReference(response.withdrawalRequest.reference);
      setSuccess(true);
      onSaved?.();
      toast({
        title: "Withdrawal submitted",
        description: "Your withdrawal request is awaiting review.",
      });
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

  const handleCopyReference = () => {
    if (reference) {
      navigator.clipboard.writeText(reference);
      toast({ title: "Reference copied" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent aria-label="Withdraw funds" className="max-h-[90vh] overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-0 text-[#111827] shadow-modal sm:max-w-md">
        <div className="h-1 w-full bg-[#E85D5D]" />
        {success ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-[#12B886]/10 text-[#047857]">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-black">Withdrawal Submitted</h3>
            <p className="mt-2 text-sm text-[#6B7280]">
              Your withdrawal request of{" "}
              <span className="font-black text-[#111827]">
                {formatNaira(numAmount)}
              </span>{" "}
              has been submitted and is awaiting review.
            </p>
            {reference && (
              <div className="mt-5 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                  Reference number
                </p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="font-mono text-sm font-black text-[#12B886]">
                    {reference}
                  </span>
                  <button
                    onClick={handleCopyReference}
                    className="grid h-6 w-6 place-items-center rounded-md bg-[#12B886]/10 text-[#047857] transition hover:bg-[#12B886]/20"
                    title="Copy reference"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                setSuccess(false);
                setAmount("");
                setReference("");
                onClose();
              }}
              className="mt-6 rounded-xl bg-[#4F46E5] px-6 py-2.5 text-sm font-black text-white transition hover:bg-[#4338CA]"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#FEF2F2] text-[#E85D5D]">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#E85D5D]">
                    Withdraw
                  </p>
                </div>
                <h3 className="mt-3 text-2xl font-black">Cash Out</h3>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Withdraw to your bank account.
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

            <div className="mb-5 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                  <Wallet className="h-4 w-4" />
                  Available balance
                </div>
                <span className="text-lg font-black text-[#111827]">
                  {formatNaira(availableBalance)}
                </span>
              </div>
            </div>

            <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">
              Amount ({currency})
            </label>
            <div className="relative mb-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-[#E85D5D]">
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
                className={`h-14 rounded-xl bg-[#F8F7F4] pl-12 text-2xl font-black text-[#111827] placeholder:text-[#D1D5DB] ${
                  insufficientFunds
                    ? "border-[#E85D5D] focus:border-[#E85D5D]"
                    : "border-[#E5E7EB] focus:border-[#4F46E5]"
                }`}
              />
            </div>
            {insufficientFunds && (
              <p className="mb-3 flex items-center gap-1 text-xs font-bold text-[#E85D5D]">
                <AlertCircle className="h-3 w-3" />
                Amount exceeds available balance.
              </p>
            )}
            {belowMinimum && (
              <p className="mb-3 flex items-center gap-1 text-xs font-bold text-[#92400E]">
                <AlertCircle className="h-3 w-3" />
                Minimum withdrawal is ₦500.
              </p>
            )}

            {filteredQuickAmounts.length > 0 && (
              <div className="mb-5 grid grid-cols-4 gap-2">
                {filteredQuickAmounts.map((value) => (
                  <button
                    key={value}
                    onClick={() => setAmount(value.toString())}
                    disabled={loading}
                    aria-label={`Withdraw ${value.toLocaleString()} Naira`}
                    className={`rounded-xl border py-2.5 text-xs font-black transition sm:text-sm ${
                      amount === value.toString()
                        ? "border-[#E85D5D]/40 bg-[#E85D5D]/10 text-[#B42318] shadow-[0_2px_8px_rgba(232,93,93,0.15)]"
                        : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] hover:border-[#E85D5D]/20 hover:text-[#111827]"
                    }`}
                  >
                    ₦{value.toLocaleString()}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">
                Bank details
              </p>

              <div className="relative">
                <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <label htmlFor="bankName" className="sr-only">Bank name</label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  disabled={loading}
                  placeholder="Bank name (e.g. GTBank, Access Bank)"
                  aria-label="Bank name"
                  className="h-12 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-11 text-sm font-semibold text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5]"
                />
              </div>

              <div className="relative">
                <CreditCard className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <label htmlFor="accountNumber" className="sr-only">Account number</label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  disabled={loading}
                  placeholder="Account number (10 digits)"
                  maxLength={10}
                  aria-label="Account number"
                  className="h-12 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-11 text-sm font-semibold text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5]"
                />
              </div>

              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <label htmlFor="accountName" className="sr-only">Account name</label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  disabled={loading}
                  placeholder="Account name"
                  aria-label="Account name"
                  className="h-12 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-11 text-sm font-semibold text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5]"
                />
              </div>
            </div>

            <label className="mb-4 flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-3.5 text-sm font-bold text-[#374151] transition hover:bg-white cursor-pointer">
              <input
                type="checkbox"
                checked={saveDetails}
                onChange={(event) => setSaveDetails(event.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded accent-[#12B886]"
              />
              <span>Save these bank details for next time</span>
            </label>

            <div className="mb-5 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-4 text-xs font-bold leading-relaxed text-[#6B7280]">
              For faster processing, use a bank account that matches your
              registered name. Third-party accounts may require additional
              review. Processing typically takes 1-24 hours.
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={
                loading ||
                numAmount <= 0 ||
                insufficientFunds ||
                belowMinimum ||
                missingBankDetails
              }
              className="sticky bottom-0 h-12 w-full rounded-xl bg-[#E85D5D] text-sm font-black text-white shadow-lg transition hover:bg-[#f07575] hover:shadow-[0_4px_14px_rgba(232,93,93,0.35)] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Withdraw {numAmount > 0 ? formatNaira(numAmount) : ""}
                </span>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const loadSavedBankDetails = (): BankDetails | null => {
  try {
    const raw = window.sessionStorage.getItem(SAVED_BANK_KEY);
    if (!raw) return null;
    const decoded = decodeBankDetails(raw);
    if (
      !decoded ||
      !decoded.bankName ||
      !decoded.accountNumber ||
      !decoded.accountName
    )
      return null;
    return decoded;
  } catch {
    return null;
  }
};

const saveBankDetails = (details: BankDetails) => {
  const encoded = encodeBankDetails(details);
  if (encoded) {
    window.sessionStorage.setItem(SAVED_BANK_KEY, encoded);
  }
};
