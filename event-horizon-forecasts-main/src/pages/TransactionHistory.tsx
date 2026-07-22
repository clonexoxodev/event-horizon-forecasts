import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  Clock,
  CreditCard,
  Filter,
  Gift,
  History,
  Loader2,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import apiService, { type ApiTransaction } from "@/lib/api";

type FilterType = "all" | "deposits" | "withdrawals" | "settlements" | "refunds" | "orders";
type FilterDirection = "all" | "IN" | "OUT";
type FilterDateRange = "7" | "30" | "90" | "all";

const DEPOSIT_TYPES = ["deposit", "deposit_request", "deposit_approved"] as const;
const WITHDRAWAL_TYPES = ["withdrawal", "withdrawal_request", "withdrawal_approved"] as const;
const SETTLEMENT_TYPES = ["position_payout", "market_payout"] as const;
const REFUND_TYPES = ["refund"] as const;
const ORDER_TYPES = ["position_entry", "prediction_stake"] as const;

const isDepositType = (t: ApiTransaction["type"]) => (DEPOSIT_TYPES as readonly string[]).includes(t);
const isWithdrawalType = (t: ApiTransaction["type"]) => (WITHDRAWAL_TYPES as readonly string[]).includes(t);
const isSettlementType = (t: ApiTransaction["type"]) => (SETTLEMENT_TYPES as readonly string[]).includes(t);
const isRefundType = (t: ApiTransaction["type"]) => (REFUND_TYPES as readonly string[]).includes(t);
const isOrderType = (t: ApiTransaction["type"]) => (ORDER_TYPES as readonly string[]).includes(t);

const TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  deposit_request: "Deposit",
  deposit_approved: "Deposit",
  deposit_rejected: "Rejected",
  withdrawal: "Withdrawal",
  withdrawal_request: "Withdrawal",
  withdrawal_approved: "Withdrawal",
  withdrawal_rejected: "Rejected",
  position_entry: "Prediction Stake",
  prediction_stake: "Prediction Stake",
  position_payout: "Settlement Won",
  market_payout: "Settlement Won",
  refund: "Refund",
  admin_adjustment: "Admin Adjustment",
};

const STATUS_STYLES: Record<string, string> = {
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

function formatRelativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeStatus(tx: ApiTransaction): string {
  if (tx.status === "completed") return "completed";
  if (tx.status === "failed" && tx.type === "withdrawal") return "rejected";
  return tx.status;
}

function getMarketQuestion(tx: ApiTransaction): string {
  const m = tx.metadata;
  if (!m) return "";
  const q = m.marketQuestion || m.market_question;
  return typeof q === "string" ? q : "";
}

export default function TransactionHistory() {
  const { user, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [directionFilter, setDirectionFilter] = useState<FilterDirection>("all");
  const [dateRange, setDateRange] = useState<FilterDateRange>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    setLoading(true);
    apiService
      .getTransactions()
      .then((res) => {
        if (mounted) setTransactions(res.transactions || []);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [authLoading, user]);

  const filteredTransactions = useMemo(() => {
    const now = Date.now();
    let result = [...transactions];

    if (typeFilter === "deposits") result = result.filter((tx) => isDepositType(tx.type));
    else if (typeFilter === "withdrawals") result = result.filter((tx) => isWithdrawalType(tx.type));
    else if (typeFilter === "settlements") result = result.filter((tx) => isSettlementType(tx.type));
    else if (typeFilter === "refunds") result = result.filter((tx) => isRefundType(tx.type));
    else if (typeFilter === "orders") result = result.filter((tx) => isOrderType(tx.type));

    if (directionFilter !== "all") result = result.filter((tx) => tx.direction === directionFilter);

    if (dateRange !== "all") {
      const days = Number(dateRange);
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      result = result.filter((tx) => new Date(tx.createdAt).getTime() >= cutoff);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((tx) => {
        const desc = tx.description?.toLowerCase() || "";
        const market = getMarketQuestion(tx).toLowerCase();
        const label = (TYPE_LABELS[tx.type] || "").toLowerCase();
        return desc.includes(q) || market.includes(q) || label.includes(q);
      });
    }

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [transactions, typeFilter, directionFilter, dateRange, searchQuery]);

  const summary = useMemo(() => {
    let totalDeposits = 0;
    let totalWithdrawn = 0;
    let totalWon = 0;
    let totalStaked = 0;

    for (const tx of transactions) {
      const normStatus = normalizeStatus(tx);
      if (normStatus !== "completed" && normStatus !== "approved") continue;

      if (isDepositType(tx.type) && tx.direction === "IN") {
        totalDeposits += tx.amount;
      } else if (isWithdrawalType(tx.type) && tx.direction === "OUT") {
        totalWithdrawn += tx.amount;
      } else if (isSettlementType(tx.type) && tx.direction === "IN") {
        totalWon += tx.amount;
      } else if (isOrderType(tx.type) && tx.direction === "OUT") {
        totalStaked += tx.amount;
      }
    }

    return { totalDeposits, totalWithdrawn, totalWon, totalStaked };
  }, [transactions]);

  if (authLoading) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
          <div className="grid min-h-[50vh] place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#4F46E5]" />
          </div>
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
          <h2 className="text-2xl font-bold">Log in to see your transaction history</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Your deposits, withdrawals, and settlements will appear here.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex h-10 items-center rounded-xl bg-[#4F46E5] px-5 text-sm font-bold text-white hover:bg-[#4338CA]"
          >
            Log in
          </Link>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8 w-full">
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7280] transition hover:text-[#4F46E5]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Portfolio
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                Transactions
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                Transaction History
              </h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                Deposits, withdrawals, predictions, and winnings.
              </p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
                <History className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Total Deposits"
            value={summary.totalDeposits}
            icon={ArrowDownLeft}
            color="text-[#047857]"
            bg="bg-[#D1FAE5]"
          />
          <SummaryCard
            label="Total Withdrawn"
            value={summary.totalWithdrawn}
            icon={ArrowUpRight}
            color="text-[#B42318]"
            bg="bg-[#FEE2E2]"
          />
          <SummaryCard
            label="Total Won"
            value={summary.totalWon}
            icon={Trophy}
            color="text-[#047857]"
            bg="bg-[#D1FAE5]"
          />
          <SummaryCard
            label="Total Staked"
            value={summary.totalStaked}
            icon={CreditCard}
            color="text-[#4F46E5]"
            bg="bg-[#EEF2FF]"
          />
        </section>

        {/* Filter Bar */}
        <section className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-[#6B7280]" />
            <span className="text-xs font-bold text-[#6B7280]">Filters</span>
            {(typeFilter !== "all" || directionFilter !== "all" || dateRange !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setTypeFilter("all");
                  setDirectionFilter("all");
                  setDateRange("all");
                  setSearchQuery("");
                }}
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#F8F7F4] px-2.5 py-1 text-[10px] font-bold text-[#6B7280] transition hover:bg-white"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by description or market..."
                className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-[#F8F7F4] pl-8 pr-3 text-xs font-bold text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#4F46E5]/40 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]/20"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterType)}
              className="h-9 rounded-lg border border-[#E5E7EB] bg-[#F8F7F4] px-2.5 text-xs font-bold text-[#111827] outline-none transition focus:border-[#4F46E5]/40 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]/20"
            >
              <option value="all">All Types</option>
              <option value="deposits">Deposits</option>
              <option value="withdrawals">Withdrawals</option>
              <option value="settlements">Settlements</option>
              <option value="refunds">Refunds</option>
              <option value="orders">Orders</option>
            </select>
            <div className="flex gap-2">
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as FilterDirection)}
                className="h-9 flex-1 rounded-lg border border-[#E5E7EB] bg-[#F8F7F4] px-2.5 text-xs font-bold text-[#111827] outline-none transition focus:border-[#4F46E5]/40 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]/20"
              >
                <option value="all">All Directions</option>
                <option value="IN">Incoming</option>
                <option value="OUT">Outgoing</option>
              </select>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as FilterDateRange)}
                className="h-9 flex-1 rounded-lg border border-[#E5E7EB] bg-[#F8F7F4] px-2.5 text-xs font-bold text-[#111827] outline-none transition focus:border-[#4F46E5]/40 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]/20"
              >
                <option value="all">All Time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#9CA3AF]">
            <span>{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}</span>
            {(typeFilter !== "all" || directionFilter !== "all" || dateRange !== "all" || searchQuery) && (
              <span> (filtered)</span>
            )}
          </div>
        </section>

        {/* Transaction List */}
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-4 animate-pulse">
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-[#E5E7EB]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-[#E5E7EB]" />
                    <div className="h-2.5 w-1/4 rounded bg-[#E5E7EB]" />
                  </div>
                  <div className="h-5 w-16 rounded bg-[#E5E7EB]" />
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] py-16 text-center">
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
                <History className="h-10 w-10" />
              </div>
              <h3 className="text-lg font-bold text-[#111827]">
                No transactions found
              </h3>
              <p className="mt-2 text-sm text-[#6B7280]">
                {(typeFilter !== "all" || directionFilter !== "all" || dateRange !== "all" || searchQuery)
                  ? "Try adjusting your filters to see more results."
                  : "Your transaction history will appear here once you add money or make a prediction."}
              </p>
              {!searchQuery && typeFilter === "all" && (
                <Link
                  to="/wallet"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#4338CA]"
                >
                  <ArrowDownLeft className="h-4 w-4" />
                  Add Money
                </Link>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredTransactions.map((tx) => {
                const isIn = tx.direction === "IN";
                const status = normalizeStatus(tx);
                const label = TYPE_LABELS[tx.type] || tx.type.replace(/_/g, " ");
                const marketQuestion = getMarketQuestion(tx);
                const displayDesc = marketQuestion || tx.description || "";

                return (
                  <li key={tx.id}>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] px-4 py-3.5 transition hover:border-[#4F46E5]/30 hover:bg-white hover:shadow-[0_2px_12px_rgba(17,24,39,0.06)] sm:px-5 sm:py-4">
                      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <div
                          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                            isIn
                              ? "bg-[#12B886]/10 text-[#047857]"
                              : "bg-[#E85D5D]/10 text-[#B42318]"
                          }`}
                        >
                          <TxIcon type={tx.type} isIn={isIn} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold text-[#111827]">
                              {label}
                            </span>
                            <TxStatusBadge status={status} />
                          </div>
                          {displayDesc && (
                            <div className="mt-1 line-clamp-1 text-xs text-[#6B7280]">
                              {displayDesc}
                            </div>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-[#9CA3AF]">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{formatRelativeDate(tx.createdAt)}</span>
                            <span className="font-mono opacity-60">
                              {tx.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div
                          className={`text-sm font-bold ${
                            isIn ? "text-[#12B886]" : "text-[#E85D5D]"
                          }`}
                        >
                          {isIn ? "+" : "-"}
                          {formatNaira(tx.amount)}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <MobileNav />
    </div>
  );
}

/* ── Sub-components ── */

const SummaryCard = ({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}) => (
  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2">
      <div className={`grid h-8 w-8 place-items-center rounded-lg ${bg} ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
        {label}
      </span>
    </div>
    <div className="mt-2.5 text-xl font-black tracking-tight text-[#111827]">
      {formatNaira(value)}
    </div>
  </div>
);

const TxIcon = ({ type, isIn }: { type: string; isIn: boolean }) => {
  if (isDepositType(type)) return <ArrowDownLeft className="h-5 w-5" />;
  if (isWithdrawalType(type)) return <ArrowUpRight className="h-5 w-5" />;
  if (isSettlementType(type)) return <Trophy className="h-5 w-5" />;
  if (isRefundType(type)) return <Gift className="h-5 w-5" />;
  if (type === "admin_adjustment") return <ShieldCheck className="h-5 w-5" />;
  if (isIn) return <TrendingUp className="h-5 w-5" />;
  return <TrendingDown className="h-5 w-5" />;
};

const TxStatusBadge = ({ status }: { status: string }) => {
  const styles = STATUS_STYLES[status] || "bg-[#F8F7F4] text-[#6B7280] border-[#E5E7EB]";
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${styles}`}
    >
      {status}
    </span>
  );
};
