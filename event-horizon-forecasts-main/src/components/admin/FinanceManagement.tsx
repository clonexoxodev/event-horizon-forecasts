import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Loader2,
  ReceiptText,
  Search,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApiTransaction, DepositRequest, WithdrawalRequest } from "@/lib/api";
import { formatNaira } from "@/lib/markets";
import type { FinanceOverview, FinanceTransaction } from "./types";
import { ShellCard, SectionHeader, Badge, EmptyState, MetricCard } from "./ui";
import {
  formatDate,
  metricValue,
  requestUserLabel,
  statusText,
  txDate,
  txMarketLabel,
  txReference,
  txUserLabel,
} from "./utils";

export const FinanceView = ({
  overview,
  deposits,
  withdrawals,
  transactions,
  busyId,
  onAction,
}: {
  overview: FinanceOverview | null;
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  transactions: FinanceTransaction[];
  busyId: string | null;
  onAction: (
    kind: "deposit" | "withdrawal",
    id: string,
    action: "approve" | "reject"
  ) => void;
}) => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total deposits" value={formatNaira(metricValue(overview?.totalDeposits))} icon={Wallet} tone="green" />
      <MetricCard label="Total withdrawals" value={formatNaira(metricValue(overview?.totalWithdrawals))} icon={ReceiptText} />
      <MetricCard label="Prediction volume" value={formatNaira(metricValue(overview?.totalPredictionVolume))} icon={BarChart3} />
      <MetricCard label="Pending payouts" value={metricValue(overview?.pendingPayouts)} icon={Clock} tone="amber" />
      <MetricCard label="Wallet balances" value={formatNaira(metricValue(overview?.totalUserBalances))} icon={Users} />
      <MetricCard label="Pending deposits" value={metricValue(overview?.pendingDeposits)} icon={AlertTriangle} tone="amber" />
      <MetricCard label="Pending withdrawals" value={metricValue(overview?.pendingWithdrawals)} icon={AlertTriangle} tone="amber" />
      <MetricCard label="Today withdrawals" value={formatNaira(metricValue(overview?.todayWithdrawals))} icon={Activity} />
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <FinanceQueue
        title="Deposit queue"
        kind="deposit"
        items={deposits}
        busyId={busyId}
        onAction={onAction}
      />
      <FinanceQueue
        title="Withdrawal queue"
        kind="withdrawal"
        items={withdrawals}
        busyId={busyId}
        onAction={onAction}
      />
    </div>

    <TransactionsView
      transactions={transactions}
      filter="all"
      setFilter={() => undefined}
      search=""
      setSearch={() => undefined}
      compact
    />
  </div>
);

const FinanceQueue = ({
  title,
  kind,
  items,
  busyId,
  onAction,
}: {
  title: string;
  kind: "deposit" | "withdrawal";
  items: Array<DepositRequest | WithdrawalRequest>;
  busyId: string | null;
  onAction: (
    kind: "deposit" | "withdrawal",
    id: string,
    action: "approve" | "reject"
  ) => void;
}) => (
  <ShellCard>
    <SectionHeader title={title} description="Approve only after operational verification." />
    <div className="divide-y divide-[#E5E7EB]">
      {items.map((item) => {
        const busyApprove = busyId === `${kind}-${item.id}-approve`;
        const busyReject = busyId === `${kind}-${item.id}-reject`;
        return (
          <div key={item.id} className="p-6 hover:bg-[#F8F7F4]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{formatNaira(Number(item.amount || 0))}</p>
                <p className="text-sm text-[#667085]">
                  {requestUserLabel(item)}
                </p>
                <p className="mt-1 text-xs text-[#667085]">
                  Reference: {item.reference || "Not set"}
                </p>
                {"bankName" in item && (
                  <p className="mt-1 text-xs text-[#667085]">
                    {item.bankName} - {item.accountNumber} - {item.accountName}
                  </p>
                )}
              </div>
              <Badge tone={item.status === "pending" ? "amber" : "neutral"}>
                {item.status}
              </Badge>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                className="bg-[#4F46E5] text-[#FFFFFF] hover:bg-[#4338CA]"
                disabled={item.status !== "pending" || Boolean(busyId)}
                onClick={() => onAction(kind, item.id, "approve")}
              >
                {busyApprove && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {kind === "withdrawal" ? "Mark paid" : "Approve"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/30 bg-red-500/10 text-[#E85D5D] hover:bg-red-500/20"
                disabled={item.status !== "pending" || Boolean(busyId)}
                onClick={() => onAction(kind, item.id, "reject")}
              >
                {busyReject && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reject
              </Button>
            </div>
          </div>
        );
      })}
      {!items.length && (
        <EmptyState title={`No ${kind}s pending`} body="Queue is clear." />
      )}
    </div>
  </ShellCard>
);

export const TransactionsView = ({
  transactions,
  filter,
  setFilter,
  search,
  setSearch,
  compact,
}: {
  transactions: Array<ApiTransaction | FinanceTransaction>;
  filter: string;
  setFilter: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  compact?: boolean;
}) => {
  const term = search.trim().toLowerCase();
  const filtered = transactions.filter((tx) => {
    const matchesFilter =
      filter === "all" || tx.type === filter || tx.status === filter;
    if (!matchesFilter) return false;
    if (!term) return true;
    return [
      tx.type,
      tx.status,
      tx.description,
      txUserLabel(tx),
      txReference(tx),
      txMarketLabel(tx),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  const filters = [
    "all",
    "deposit",
    "withdrawal",
    "prediction",
    "payout",
    "refund",
    "completed",
    "pending",
  ];

  return (
    <ShellCard>
      <SectionHeader
        eyebrow={compact ? undefined : "Ledger"}
        title={compact ? "Recent ledger" : "Transactions"}
        description="Searchable money movement and operational transaction history."
        action={
          !compact && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <div className="relative sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ledger..."
                  className="border-[#E5E7EB] bg-white pl-9 text-[#101828]"
                />
              </div>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#101828] outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              >
                {filters.map((item) => (
                  <option key={item} value={item}>
                    {statusText(item)}
                  </option>
                ))}
              </select>
            </div>
          )
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-[#E5E7EB] text-xs uppercase tracking-wide text-[#667085]">
            <tr>
              <th className="px-6 py-4">Type</th>
              <th>User</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Reference</th>
              <th>Market</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filtered.slice(0, compact ? 10 : 100).map((tx) => (
              <tr key={tx.id} className="hover:bg-[#F8F7F4]">
                <td className="px-6 py-4 font-medium">{statusText(tx.type)}</td>
                <td className="text-[#667085]">{txUserLabel(tx)}</td>
                <td>{formatNaira(Number(tx.amount || 0))}</td>
                <td>
                  <Badge
                    tone={
                      tx.status === "completed"
                        ? "green"
                        : tx.status === "pending"
                          ? "amber"
                          : "neutral"
                    }
                  >
                    {tx.status}
                  </Badge>
                </td>
                <td className="text-[#667085]">{txReference(tx)}</td>
                <td className="max-w-[240px] truncate text-[#667085]">
                  {txMarketLabel(tx)}
                </td>
                <td className="text-[#667085]">{formatDate(txDate(tx))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <EmptyState title="No transactions found" body="No records match this filter." />
        )}
      </div>
    </ShellCard>
  );
};
