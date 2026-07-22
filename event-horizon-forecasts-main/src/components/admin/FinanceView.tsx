import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  RefreshCcw,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { apiService, type ApiTransaction, type DepositRequest } from "@/lib/api";
import {
  Card,
  MetricCard,
  Badge,
  SectionHeader,
  EmptyState,
  TabBar,
  DataTable,
  Th,
  Td,
  SkeletonCard,
} from "./ui";
import {
  formatNaira,
  formatDate,
  statusLabel,
  statusColor,
  txUserLabel,
  txMarketLabel,
} from "./utils";

const TX_TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "position_entry", label: "Entries" },
  { value: "position_payout", label: "Payouts" },
  { value: "refund", label: "Refunds" },
];

const TX_BADGE_VARIANT = (status: string): "default" | "success" | "warning" | "danger" | "info" | "muted" => {
  switch (status) {
    case "completed":
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "failed":
    case "rejected":
      return "danger";
    default:
      return "default";
  }
};

export const FinanceView = () => {
  const [overview, setOverview] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [overviewRes, depositsRes] = await Promise.allSettled([
          apiService.getAdminFinanceOverview(),
          apiService.listAdminFinanceDeposits("pending"),
        ]);
        if (cancelled) return;
        if (overviewRes.status === "fulfilled") setOverview(overviewRes.value.overview || {});
        if (depositsRes.status === "fulfilled") setDeposits(depositsRes.value.deposits || []);
      } catch {
        if (!cancelled) {
          setOverview({});
          setDeposits([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTxLoading(true);
      try {
        const params: { type?: string; search?: string } = {};
        if (typeFilter !== "all") params.type = typeFilter;
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        const res = await apiService.listAdminFinanceTransactions(params);
        if (!cancelled) setTransactions(res.transactions || []);
      } catch {
        if (!cancelled) setTransactions([]);
      } finally {
        if (!cancelled) setTxLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [typeFilter, debouncedSearch]);

  const o = overview;
  const totalDeposits = o.total_deposits ?? o.totalDeposits ?? 0;
  const totalWithdrawals = o.total_withdrawals ?? o.totalWithdrawals ?? 0;
  const pendingWithdrawals = o.pending_withdrawals ?? o.pendingWithdrawals ?? 0;
  const totalRefunds = o.total_refunds ?? o.totalRefunds ?? 0;
  const todayVolume = o.today_volume ?? o.todayVolume ?? 0;
  const platformRevenue = o.platform_revenue ?? o.platformRevenue ?? 0;

  return (
    <div className="space-y-6">
      {loading ? (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonCard />
        </>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              icon={<Wallet className="h-4 w-4" />}
              label="Total Deposits"
              value={formatNaira(totalDeposits)}
              tone="green"
            />
            <MetricCard
              icon={<ArrowUpRight className="h-4 w-4" />}
              label="Total Withdrawals"
              value={formatNaira(totalWithdrawals)}
              tone="red"
            />
            <MetricCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Pending Withdrawals"
              value={pendingWithdrawals.toLocaleString()}
              sub={pendingWithdrawals > 0 ? "Requires review" : undefined}
              tone={pendingWithdrawals > 0 ? "amber" : "neutral"}
            />
            <MetricCard
              icon={<RefreshCcw className="h-4 w-4" />}
              label="Total Refunds"
              value={formatNaira(totalRefunds)}
              tone="indigo"
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Today's Volume"
              value={formatNaira(todayVolume)}
              tone="blue"
            />
            <MetricCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Platform Revenue"
              value={formatNaira(platformRevenue)}
              tone="green"
            />
          </div>

          <Card padding={false}>
            <div className="p-5 pb-3">
              <SectionHeader
                title="Transactions"
                description="All financial transactions across the platform."
                action={
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search reference..."
                        className="w-full sm:w-56 rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                      />
                    </div>
                  </div>
                }
              />
              <div className="mt-3">
                <TabBar
                  tabs={TX_TYPE_FILTERS}
                  active={typeFilter}
                  onChange={setTypeFilter}
                />
              </div>
            </div>

            {txLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState
                  icon={<Search className="h-5 w-5" />}
                  title="No transactions found"
                  body="Try adjusting your filter or search term."
                />
              </div>
            ) : (
              <DataTable>
                <thead>
                  <tr>
                    <Th>User</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Amount</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                    <Th>Reference</Th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="transition hover:bg-gray-50">
                      <Td>{txUserLabel(tx)}</Td>
                      <Td>
                        <span className="text-xs font-semibold text-gray-600">
                          {statusLabel(tx.type)}
                        </span>
                      </Td>
                      <Td className="text-right">
                        <span className={tx.direction === "OUT" ? "text-red-600" : tx.direction === "IN" ? "text-emerald-600" : ""}>
                          {tx.direction === "OUT" ? "−" : tx.direction === "IN" ? "+" : ""}
                          {formatNaira(tx.amount)}
                        </span>
                      </Td>
                      <Td>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(tx.status)}`}>
                          {statusLabel(tx.status)}
                        </span>
                      </Td>
                      <Td className="text-xs text-gray-500">
                        {formatDate(tx.createdAt)}
                      </Td>
                      <Td className="max-w-[200px] truncate text-xs text-gray-400 font-mono">
                        {tx.reference || "—"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </Card>

          {deposits.length > 0 && (
            <Card>
              <SectionHeader
                title="Pending Deposits"
                description={`${deposits.length} deposit request(s) awaiting approval.`}
              />
              <div className="divide-y divide-gray-100">
                {deposits.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {d.user?.username || d.user?.email || "—"}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                        <span className="font-semibold text-gray-600">{formatNaira(d.amount)}</span>
                        <span>·</span>
                        <span className="font-mono">{d.reference || "—"}</span>
                      </div>
                    </div>
                    <Badge variant="warning">{statusLabel(d.status)}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
