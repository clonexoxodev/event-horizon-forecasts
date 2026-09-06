import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  CreditCard,
  Download,
  Filter,
  Gift,
  History,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
  X,
} from "lucide-react";
import { Header } from "@/components/Header";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";
import { MobileNav } from "@/components/MobileNav";
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

type TabFilter = "all" | "deposits" | "withdrawals" | "predictions" | "payouts";

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "deposits", label: "Deposits" },
  { key: "withdrawals", label: "Withdrawals" },
  { key: "predictions", label: "Predictions" },
  { key: "payouts", label: "Payouts" },
];

const isDepositType = (t: string) =>
  t === "deposit" || t === "deposit_approved" || t === "deposit_request" || t === "deposit_rejected";
const isWithdrawalType = (t: string) =>
  t === "withdrawal" || t === "withdrawal_approved" || t === "withdrawal_request" || t === "withdrawal_rejected";
const isPositionType = (t: string) =>
  t === "position_entry" || t === "prediction_stake";
const isPayoutType = (t: string) =>
  t === "position_payout" || t === "market_payout" || t === "refund";

const categoryFor = (t: string): TabFilter => {
  if (isDepositType(t)) return "deposits";
  if (isWithdrawalType(t)) return "withdrawals";
  if (isPositionType(t)) return "predictions";
  if (isPayoutType(t)) return "payouts";
  return "all";
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
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

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
  const hasLockedFunds = lockedBalance > 0;

  const filteredTransactions =
    activeTab === "all"
      ? transactions
      : transactions.filter((tx) => categoryFor(tx.type) === activeTab);

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
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-[#EEF2FF]">
            <WalletIcon className="h-8 w-8 text-[#4F46E5]" />
          </div>
          <h2 className="text-2xl font-black">Log in to see your wallet</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Your balance and transaction history will appear here.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#4F46E5] px-6 text-sm font-bold text-white transition hover:bg-[#4338CA]"
          >
            Sign in
          </Link>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8 w-full">
        <section>
          <div className="relative overflow-hidden rounded-3xl shadow-[0_8px_30px_rgba(79,70,229,0.25)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#4338CA]" />
            <div className="absolute inset-0 opacity-[0.06]" aria-hidden="true">
              <svg className="h-full w-full" viewBox="0 0 700 320" fill="none">
                <circle cx="600" cy="50" r="180" fill="white" />
                <circle cx="520" cy="280" r="120" fill="white" />
                <circle cx="80" cy="260" r="90" fill="white" />
                <circle cx="350" cy="140" r="60" fill="white" />
              </svg>
            </div>
            <div className="relative p-6 sm:p-8" aria-label="Wallet balance">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-white/60">
                    Balance
                  </div>
                  <div className="mt-3 text-5xl font-black tracking-tight text-white sm:text-6xl">
                    {formatNaira(ngnBalance)}
                  </div>
                </div>
                <button
                  onClick={refreshWallet}
                  disabled={refreshing}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white/80 backdrop-blur-sm transition hover:bg-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  title="Refresh wallet"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDepositModalOpen(true)}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-[#4F46E5] shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:bg-white/95"
                >
                  <ArrowDownRight className="h-4 w-4" />
                  Deposit
                </button>
                <button
                  onClick={() => setWithdrawModalOpen(true)}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Withdraw
                </button>
              </div>

              {hasLockedFunds && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                  <Clock className="h-3.5 w-3.5 text-white/60" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Locked in predictions</span>
                    <span className="ml-2 text-xs font-bold text-white/80">{formatNaira(lockedBalance)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Security Notice ── */}
        <section className="mt-3">
          <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-xs text-[#6B7280]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#12B886]" />
            <span>Secured by Flutterwave &middot; 256-bit encryption &middot; All transactions verified server-side</span>
          </div>
        </section>

        {/* ── Transaction History ── */}
        <section className="mt-6 rounded-3xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Transaction History</h2>
                <p className="text-xs text-[#6B7280]">
                  All deposits, withdrawals, predictions, and payouts.
                </p>
              </div>
            </div>
            <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs font-bold text-[#6B7280]">
              {historyLoading ? "Loading" : `${filteredTransactions.length} items`}
            </span>
          </div>

          {/* ── Category Tabs ── */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {TABS.map((tab) => {
              const count =
                tab.key === "all"
                  ? transactions.length
                  : transactions.filter((tx) => categoryFor(tx.type) === tab.key).length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    activeTab === tab.key
                      ? "bg-[#4F46E5] text-white shadow-[0_2px_8px_rgba(79,70,229,0.3)]"
                      : "border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      activeTab === tab.key ? "bg-white/20 text-white" : "bg-[#E5E7EB] text-[#9CA3AF]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Transaction List ── */}
          {filteredTransactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] py-16 text-center">
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
                <CreditCard className="h-10 w-10" />
              </div>
              <h3 className="text-lg font-bold text-[#111827]">
                {activeTab === "all" ? "No transactions yet" : `No ${activeTab} yet`}
              </h3>
              <p className="mt-2 text-sm text-[#6B7280]">
                {activeTab === "all"
                  ? "Your transaction history will appear here once you fund your account or open a position."
                  : "Try selecting a different category or make a transaction."}
              </p>
              {activeTab === "all" && (
                <button
                  onClick={() => setDepositModalOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#4338CA]"
                >
                  <ArrowDownRight className="h-4 w-4" />
                  Make Your First Deposit
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredTransactions.map((tx) => (
                <li key={tx.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTransaction(tx.transaction)}
                    aria-label={`${tx.label} — ${tx.amount >= 0 ? "credit" : "debit"} of ${formatNaira(Math.abs(tx.amount))}, ${tx.status}`}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-4 text-left transition hover:border-[#4F46E5]/20 hover:bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
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
                        <div className="truncate text-sm font-bold text-[#111827]">
                          {tx.label}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-[#9CA3AF]">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="truncate">{tx.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
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
  if (isDepositType(type)) return <ArrowDownRight className="h-5 w-5" />;
  if (isWithdrawalType(type)) return <ArrowUpRight className="h-5 w-5" />;
  if (type === "refund") return <Gift className="h-5 w-5" />;
  if (positive) return <TrendingUp className="h-5 w-5" />;
  return <TrendingDown className="h-5 w-5" />;
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    approved: "bg-[#12B886]/10 text-[#047857] border-[#12B886]/20",
    completed: "bg-[#12B886]/10 text-[#047857] border-[#12B886]/20",
    pending: "bg-[#F59E0B]/10 text-[#92400E] border-[#F59E0B]/20",
    failed: "bg-[#E85D5D]/10 text-[#B42318] border-[#E85D5D]/20",
    rejected: "bg-[#E85D5D]/10 text-[#B42318] border-[#E85D5D]/20",
  };

  return (
    <span
      className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${
        styles[status] || "bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]"
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
  const closeRef = useRef<HTMLButtonElement>(null);
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isWithdrawal = transaction.type.includes("withdrawal");
  const isDeposit = transaction.type.includes("deposit");
  const isPosition =
    transaction.type === "prediction_stake" ||
    transaction.type === "position_entry";
  const isPayout =
    transaction.type === "market_payout" ||
    transaction.type === "position_payout" ||
    transaction.type === "refund";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/40 px-3 py-4 sm:place-items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#E5E7EB] bg-white p-6 text-[#111827] shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
              Transaction Details
            </p>
            <h3 className="mt-1.5 text-xl font-black leading-tight">
              {labelForTransaction(transaction)}
            </h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              {new Date(transaction.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280] transition hover:text-[#111827]"
            aria-label="Close transaction details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-[#F9FAFB] p-4 text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
            Amount
          </div>
          <div
            className={`mt-1 text-3xl font-black ${
              transaction.direction === "IN" ? "text-[#12B886]" : "text-[#E85D5D]"
            }`}
          >
            {transaction.direction === "IN" ? "+" : "-"}
            {formatNaira(transaction.amount)}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
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
              {adminNote && <DetailRow label="Note" value={adminNote} />}
            </>
          )}
          {(isPosition || isPayout) && (
            <>
              {marketQuestion && (
                <DetailRow label="Market" value={marketQuestion} />
              )}
              {side && <DetailRow label="Side" value={side} />}
            </>
          )}
          <DetailRow
            label="Type"
            value={transaction.type.replace(/_/g, " ")}
          />
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
    <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
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
      ? `Payout Credited: ${marketQuestion}`
      : `Prediction Placed: ${marketQuestion}`;
  }

  const labels: Record<ApiTransaction["type"], string> = {
    deposit: tx.status === "failed" ? "Deposit Failed" : "Deposit Successful",
    withdrawal:
      tx.status === "failed" ? "Withdrawal Rejected" : "Withdrawal Approved",
    position_entry: "Prediction Placed",
    position_payout: "Payout Credited",
    refund: "Refund Credited",
    deposit_request: "Deposit Pending",
    deposit_approved: "Deposit Successful",
    deposit_rejected: "Deposit Failed",
    withdrawal_request: "Withdrawal Pending",
    withdrawal_approved: "Withdrawal Approved",
    withdrawal_rejected: "Withdrawal Rejected",
    prediction_stake: "Prediction Placed",
    market_payout: "Payout Credited",
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
