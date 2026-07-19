import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  CreditCard,
  Gift,
  History,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
  X,
  Landmark,
  BarChart3,
} from "lucide-react";
import { Header } from "@/components/Header";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { DepositModal } from "@/components/DepositModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import apiService, { type ApiTransaction } from "@/lib/api";
import { toast } from "sonner";

type WalletRow = {
  id: string;
  label: string;
  amount: number;
  status: string;
  date: string;
  type: ApiTransaction["type"];
  transaction: ApiTransaction;
};

export default function Wallet() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<WalletRow[]>([]);
  const [walletSnapshot, setWalletSnapshot] = useState<{
    availableNgn?: number;
    lockedNgn?: number;
    balanceNgn?: number;
  } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<ApiTransaction | null>(null);

  const loadHistory = async () => {
    if (!user || authLoading) return;

    setHistoryLoading(true);
    try {
      const [walletResponse, response] = await Promise.all([
        apiService.getWallet().catch(() => null),
        apiService.getTransactions(),
      ]);
      if (walletResponse?.wallet) setWalletSnapshot(walletResponse.wallet);
      setTransactions(
        response.transactions.map((tx) => ({
          id: tx.id,
          label: labelForTransaction(tx),
          amount: tx.direction === "IN" ? tx.amount : -tx.amount,
          status: statusText(tx),
          date: new Date(tx.createdAt).toLocaleDateString(),
          type: tx.type,
          transaction: tx,
        }))
      );
    } catch (error: any) {
      console.warn("Wallet history request failed", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshWallet = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      if (user) await loadHistory();
      toast.success("Wallet refreshed.");
    } catch (error: any) {
      toast.error(error.message || "Could not refresh wallet.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    loadHistory();
  }, [authLoading, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    if (!paymentStatus) return;
    if (paymentStatus === "success") {
      toast.success("Deposit successful. Your wallet has been updated.");
      refreshWallet();
    }
    if (paymentStatus === "failed") {
      toast.error("Deposit was not completed.");
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const ngnBalance = walletSnapshot?.availableNgn ?? user?.balance ?? 0;
  const lockedBalance = walletSnapshot?.lockedNgn ?? 0;

  if (authLoading) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4">
          <DelayedFlippeLoader active label="Restoring your wallet" />
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-2xl font-black">Log in to see your wallet</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Your balance and history will show here.
          </p>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#6B7280]">
              Wallet
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Balance and history
            </h1>
            <p className="mt-2 text-sm text-[#6B7280]">
              Add money, withdraw, and review transactions.
            </p>
          </div>
        </div>

        <section>
          <div className="relative overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(79,70,229,0.25)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#4338CA]" />
            <div className="absolute inset-0 opacity-10">
              <svg className="h-full w-full" viewBox="0 0 400 250" fill="none">
                <circle cx="350" cy="50" r="120" fill="white" opacity="0.08" />
                <circle cx="300" cy="200" r="80" fill="white" opacity="0.05" />
                <circle cx="50" cy="180" r="60" fill="white" opacity="0.06" />
              </svg>
            </div>
            <div className="relative p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-white backdrop-blur-sm">
                    <WalletIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white/80">
                      Available balance
                    </div>
                    <div className="text-xs text-white/60">
                      Ready to use
                    </div>
                  </div>
                </div>
                <button
                  onClick={refreshWallet}
                  disabled={refreshing}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white/80 backdrop-blur-sm transition hover:bg-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              <div className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl">
                {formatNaira(ngnBalance)}
              </div>

              {lockedBalance > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-white/70">
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {formatNaira(lockedBalance)} locked in active predictions
                  </span>
                </div>
              )}

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDepositModalOpen(true)}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-[#4F46E5] shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition hover:bg-white/95 hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
                >
                  <ArrowDownRight className="h-4 w-4" />
                  Add Money
                </button>
                <button
                  onClick={() => setWithdrawModalOpen(true)}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 text-sm font-black text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => setDepositModalOpen(true)}
            className="group flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_18px_52px_rgba(17,24,39,0.08)] transition hover:border-[#4F46E5]/30 hover:shadow-[0_22px_60px_rgba(79,70,229,0.12)] sm:p-5"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5] transition group-hover:bg-[#4F46E5] group-hover:text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-black text-[#111827]">Deposit</div>
              <div className="text-xs text-[#6B7280]">Add funds</div>
            </div>
          </button>
          <button
            onClick={() => setWithdrawModalOpen(true)}
            className="group flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_18px_52px_rgba(17,24,39,0.08)] transition hover:border-[#E85D5D]/30 hover:shadow-[0_22px_60px_rgba(232,93,93,0.12)] sm:p-5"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#FEF2F2] text-[#E85D5D] transition group-hover:bg-[#E85D5D] group-hover:text-white">
              <Landmark className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-black text-[#111827]">Withdraw</div>
              <div className="text-xs text-[#6B7280]">Cash out</div>
            </div>
          </button>
        </section>

        <section className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black">Transaction History</h2>
                <p className="text-xs text-[#6B7280]">
                  Deposits, withdrawals, predictions, and winnings.
                </p>
              </div>
            </div>
            <span className="rounded-full border border-[#E5E7EB] bg-[#F8F7F4] px-3 py-1 text-xs font-bold text-[#6B7280]">
              {historyLoading ? "Loading" : `${transactions.length} items`}
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] py-16 text-center">
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
                <BarChart3 className="h-10 w-10" />
              </div>
              <h3 className="text-lg font-black text-[#111827]">
                No transactions yet
              </h3>
              <p className="mt-2 text-sm text-[#6B7280]">
                Your transaction history will appear here once you add money or
                make a prediction.
              </p>
              <button
                onClick={() => setDepositModalOpen(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#4338CA]"
              >
                <ArrowDownRight className="h-4 w-4" />
                Add Money
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {transactions.map((tx) => (
                <li key={tx.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTransaction(tx.transaction)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-4 text-left transition hover:border-[#4F46E5]/30 hover:bg-white hover:shadow-[0_10px_28px_rgba(17,24,39,0.08)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                          tx.amount >= 0
                            ? "bg-[#12B886]/10 text-[#047857]"
                            : "bg-[#E85D5D]/10 text-[#B42318]"
                        }`}
                      >
                        <TransactionTypeIcon type={tx.type} positive={tx.amount >= 0} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-[#111827]">
                          {tx.label}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-[#6B7280]">
                          <Clock className="h-3 w-3" />
                          {tx.date}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-black ${
                          tx.amount >= 0 ? "text-[#12B886]" : "text-[#E85D5D]"
                        }`}
                      >
                        {tx.amount >= 0 ? "+" : "-"}
                        {formatNaira(Math.abs(tx.amount))}
                      </div>
                      <StatusBadge status={tx.status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <DepositModal
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        currency="NGN"
        onSaved={refreshWallet}
      />
      <WithdrawModal
        open={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        currency="NGN"
        availableBalance={ngnBalance}
        onSaved={refreshWallet}
      />
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}

      <MobileNav />
    </div>
  );
}

const TransactionTypeIcon = ({
  type,
  positive,
}: {
  type: string;
  positive: boolean;
}) => {
  if (type === "deposit" || type === "deposit_approved" || type === "deposit_request") {
    return <ArrowDownRight className="h-5 w-5" />;
  }
  if (type === "withdrawal" || type === "withdrawal_approved" || type === "withdrawal_request" || type === "withdrawal_rejected") {
    return <ArrowUpRight className="h-5 w-5" />;
  }
  if (type === "refund") {
    return <Gift className="h-5 w-5" />;
  }
  if (positive) {
    return <TrendingUp className="h-5 w-5" />;
  }
  return <TrendingDown className="h-5 w-5" />;
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    approved:
      "bg-[#12B886]/10 text-[#047857] border-[#12B886]/20",
    completed:
      "bg-[#12B886]/10 text-[#047857] border-[#12B886]/20",
    pending:
      "bg-[#F59E0B]/10 text-[#92400E] border-[#F59E0B]/20",
    failed:
      "bg-[#E85D5D]/10 text-[#B42318] border-[#E85D5D]/20",
    rejected:
      "bg-[#E85D5D]/10 text-[#B42318] border-[#E85D5D]/20",
  };

  return (
    <span
      className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${
        styles[status] || "bg-[#F8F7F4] text-[#6B7280] border-[#E5E7EB]"
      }`}
    >
      {status}
    </span>
  );
};

const TransactionDetailModal = ({
  transaction,
  onClose,
}: {
  transaction: ApiTransaction;
  onClose: () => void;
}) => {
  const metadata = transaction.metadata || {};
  const bankName =
    stringMeta(metadata, "bankName") || stringMeta(metadata, "bank_name");
  const accountNumber =
    stringMeta(metadata, "accountNumber") ||
    stringMeta(metadata, "account_number");
  const accountName =
    stringMeta(metadata, "accountName") ||
    stringMeta(metadata, "account_name");
  const adminNote =
    stringMeta(metadata, "adminNote") ||
    stringMeta(metadata, "reason") ||
    stringMeta(metadata, "admin_note");
  const marketQuestion =
    stringMeta(metadata, "marketQuestion") ||
    stringMeta(metadata, "market_question");
  const side =
    stringMeta(metadata, "side") || stringMeta(metadata, "outcome");
  const paymentMethod =
    stringMeta(metadata, "provider") ||
    stringMeta(metadata, "paymentMethod") ||
    stringMeta(metadata, "payment_method");
  const isWithdrawal = transaction.type.includes("withdrawal");
  const isDeposit = transaction.type.includes("deposit");
  const isPrediction =
    transaction.type === "prediction_stake" ||
    transaction.type === "position_entry";
  const isPayout =
    transaction.type === "market_payout" ||
    transaction.type === "position_payout" ||
    transaction.type === "refund";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/35 px-3 py-4 sm:place-items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-5 text-[#111827] shadow-[0_24px_80px_rgba(17,24,39,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#667085]">
              Transaction details
            </p>
            <h3 className="mt-1 text-2xl font-black">
              {labelForTransaction(transaction)}
            </h3>
            <p className="mt-1 text-sm text-[#667085]">
              {new Date(transaction.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#667085] transition hover:text-[#111827]"
            aria-label="Close transaction details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <DetailRow
            label="Amount"
            value={formatNaira(transaction.amount)}
          />
          <DetailRow label="Status" value={statusText(transaction)} />
          <DetailRow
            label="Reference"
            value={transaction.reference || transaction.referenceId || "Not available"}
          />
          {isDeposit && (
            <DetailRow
              label="Payment method"
              value={paymentMethod || "Payment provider"}
            />
          )}
          {isWithdrawal && (
            <>
              <DetailRow label="Bank name" value={bankName || "Not available"} />
              <DetailRow
                label="Account number"
                value={accountNumber || "Not available"}
              />
              <DetailRow
                label="Account name"
                value={accountName || "Not available"}
              />
              {adminNote && <DetailRow label="Admin note" value={adminNote} />}
            </>
          )}
          {(isPrediction || isPayout) && (
            <>
              {marketQuestion && (
                <DetailRow label="Market" value={marketQuestion} />
              )}
              {side && <DetailRow label="Side" value={side} />}
            </>
          )}
          <DetailRow
            label="Ledger type"
            value={transaction.type.replace(/_/g, " ")}
          />
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-[#F8F7F4] px-4 py-3">
    <div className="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">
      {label}
    </div>
    <div className="mt-1 break-words text-sm font-bold text-[#111827]">
      {value}
    </div>
  </div>
);

const stringMeta = (
  metadata: Record<string, unknown>,
  key: string
) => {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
};

const labelForTransaction = (tx: ApiTransaction) => {
  const marketQuestion =
    typeof tx.metadata?.marketQuestion === "string"
      ? tx.metadata.marketQuestion
      : "";
  if (
    marketQuestion &&
    (tx.type === "position_entry" ||
      tx.type === "prediction_stake" ||
      tx.type === "position_payout" ||
      tx.type === "market_payout")
  ) {
    return tx.type === "position_payout" || tx.type === "market_payout"
      ? `Winnings Credited: ${marketQuestion}`
      : `Prediction Backed: ${marketQuestion}`;
  }

  const labels: Record<ApiTransaction["type"], string> = {
    deposit: tx.status === "failed" ? "Deposit Failed" : "Deposit Successful",
    withdrawal:
      tx.status === "failed" ? "Withdrawal Rejected" : "Withdrawal Approved",
    position_entry: "Prediction Backed",
    position_payout: "Winnings Credited",
    refund: "Refund Credited",
    deposit_request: "Deposit Pending",
    deposit_approved: "Deposit Successful",
    deposit_rejected: "Deposit Failed",
    withdrawal_request: "Withdrawal Pending",
    withdrawal_approved: "Withdrawal Approved",
    withdrawal_rejected: "Withdrawal Rejected",
    prediction_stake: "Prediction Backed",
    market_payout: "Winnings Credited",
    admin_adjustment: "Admin Adjustment",
  };

  return labels[tx.type] || tx.type.replace(/_/g, " ");
};

const statusText = (tx: ApiTransaction) => {
  if (tx.status === "completed") return "approved";
  if (tx.status === "failed" && tx.type === "withdrawal") return "rejected";
  if (tx.status === "failed") return "failed";
  return tx.status;
};
