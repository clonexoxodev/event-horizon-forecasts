import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Eye,
  History,
  RefreshCcw,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import apiService, { type AdminMarket } from "@/lib/api";
import {
  Card,
  DataTable,
  Th,
  Td,
  Badge,
  EmptyState,
  SectionHeader,
  SkeletonCard,
  MetricCard,
  ConfirmDialog,
  SelectField,
  TabBar,
} from "./ui";
import {
  formatNaira,
  formatDateTime,
  formatRelativeTime,
  statusLabel,
  koboToNaira,
  classNames,
  getErrorMessage,
} from "./utils";

type SettlementFilter = "all" | "pending_resolution" | "resolving" | "resolved" | "failed" | "refunded";

const SETTLEMENT_FILTER_OPTIONS: { value: SettlementFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending_resolution", label: "Pending" },
  { value: "resolving", label: "Resolving" },
  { value: "resolved", label: "Resolved" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const settlementStatusVariant = (s?: string | null): "default" | "success" | "warning" | "danger" | "info" | "muted" => {
  switch (s) {
    case "completed":
      return "success";
    case "settling":
      return "warning";
    case "pending":
      return "warning";
    case "failed":
      return "danger";
    case "refunding":
      return "warning";
    case "refunded":
      return "info";
    case "cancelled":
      return "danger";
    case "idle":
      return "muted";
    default:
      return "default";
  }
};

const marketStatusVariant = (s: string): "default" | "success" | "warning" | "danger" | "info" | "muted" => {
  switch (s) {
    case "active":
      return "success";
    case "closed":
      return "warning";
    case "pending_resolution":
      return "warning";
    case "resolved":
      return "info";
    case "refunded":
      return "info";
    case "cancelled":
      return "danger";
    case "draft":
      return "muted";
    case "archived":
      return "muted";
    default:
      return "default";
  }
};

const isResolving = (m: AdminMarket) =>
  m.settlement_status === "settling" || m.settlement_status === "pending";

const isFailed = (m: AdminMarket) => m.settlement_status === "failed";

const isRecentlyResolved = (m: AdminMarket) => {
  if (m.status !== "resolved" || !m.settlement_completed_at) return false;
  const completed = new Date(m.settlement_completed_at).getTime();
  return Date.now() - completed < 86400000;
};

export const SettlementDashboardView = ({
  setSelectedMarketId,
}: {
  setSelectedMarketId: (id: string) => void;
}) => {
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SettlementFilter>("all");
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [allMarkets, setAllMarkets] = useState<AdminMarket[]>([]);

  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [retryDialogOpen, setRetryDialogOpen] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<AdminMarket | null>(null);
  const [resolveOutcome, setResolveOutcome] = useState<"YES" | "NO">("YES");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchMarkets = useCallback(async (status: SettlementFilter, q: string) => {
    setLoading(true);
    try {
      const params: { status?: string; search?: string } = {};
      if (status !== "all") params.status = status;
      if (q.trim()) params.search = q.trim();
      const result = await apiService.listAdminMarkets(params);
      if (!mountedRef.current) return;
      setMarkets(result.markets || []);
    } catch {
      if (mountedRef.current) setMarkets([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const fetchAllMarkets = useCallback(async () => {
    try {
      const result = await apiService.listAdminMarkets({});
      if (!mountedRef.current) return;
      setAllMarkets(result.markets || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const result = await apiService.getSettlementAudit();
      if (!mountedRef.current) return;
      setAuditLog(result.audit || []);
    } catch {
      if (mountedRef.current) setAuditLog([]);
    } finally {
      if (mountedRef.current) setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchAllMarkets();
    fetchAudit();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchAllMarkets, fetchAudit]);

  useEffect(() => {
    fetchMarkets(statusFilter, debouncedSearch);
  }, [statusFilter, debouncedSearch, fetchMarkets]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchMarkets(statusFilter, debouncedSearch);
      fetchAllMarkets();
      fetchAudit();
    }, 30000);
    return () => clearInterval(interval);
  }, [statusFilter, debouncedSearch, fetchMarkets, fetchAllMarkets, fetchAudit]);

  const handleRefresh = () => {
    fetchMarkets(statusFilter, debouncedSearch);
    fetchAllMarkets();
    fetchAudit();
  };

  const pendingCount = allMarkets.filter((m) => m.status === "pending_resolution").length;
  const activeSettlements = allMarkets.filter((m) => isResolving(m)).length;
  const failedCount = allMarkets.filter((m) => isFailed(m)).length;
  const recentlyResolvedCount = allMarkets.filter((m) => isRecentlyResolved(m)).length;

  const openResolveDialog = (m: AdminMarket) => {
    setSelectedMarket(m);
    setResolveOutcome("YES");
    setActionError("");
    setResolveDialogOpen(true);
  };

  const openRetryDialog = (m: AdminMarket) => {
    setSelectedMarket(m);
    setActionError("");
    setRetryDialogOpen(true);
  };

  const openRollbackDialog = (m: AdminMarket) => {
    setSelectedMarket(m);
    setActionError("");
    setRollbackDialogOpen(true);
  };

  const handleResolve = async () => {
    if (!selectedMarket) return;
    setActionLoading(true);
    setActionError("");
    try {
      await apiService.resolveAdminMarket(selectedMarket.id, resolveOutcome);
      setResolveDialogOpen(false);
      handleRefresh();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!selectedMarket) return;
    setActionLoading(true);
    setActionError("");
    try {
      const outcome = selectedMarket.winning_outcome || "YES";
      await apiService.retrySettlement(selectedMarket.id, outcome);
      setRetryDialogOpen(false);
      handleRefresh();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedMarket) return;
    setActionLoading(true);
    setActionError("");
    try {
      await apiService.rollbackSettlement(selectedMarket.id);
      setRollbackDialogOpen(false);
      handleRefresh();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = SETTLEMENT_FILTER_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
    count: opt.value === "all"
      ? allMarkets.length
      : opt.value === "resolving"
        ? allMarkets.filter((m) => isResolving(m)).length
        : allMarkets.filter((m) => {
            if (opt.value === "failed") return isFailed(m);
            return m.status === opt.value || (m.settlement_status === opt.value);
          }).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Settlement Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">Monitor and manage market settlements</p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 active:scale-[0.98]"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading && allMarkets.length === 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<Clock className="h-4 w-4" />}
            label="Pending Resolution"
            value={pendingCount}
            tone={pendingCount > 0 ? "amber" : "neutral"}
          />
          <MetricCard
            icon={<ArrowLeftRight className="h-4 w-4" />}
            label="Active Settlements"
            value={activeSettlements}
            tone={activeSettlements > 0 ? "blue" : "neutral"}
          />
          <MetricCard
            icon={<XCircle className="h-4 w-4" />}
            label="Failed Settlements"
            value={failedCount}
            tone={failedCount > 0 ? "red" : "neutral"}
          />
          <MetricCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Resolved (24h)"
            value={recentlyResolvedCount}
            tone={recentlyResolvedCount > 0 ? "green" : "neutral"}
          />
        </div>
      )}

      <div className="space-y-3">
        <SectionHeader
          title="Market Settlements"
          description="All markets with settlement tracking"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search markets..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
        </div>

        <TabBar tabs={tabs} active={statusFilter} onChange={(v) => setStatusFilter(v as SettlementFilter)} />

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : markets.length === 0 ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="No markets found"
            body="Try adjusting your search or filter."
          />
        ) : (
          <Card padding={false}>
            <DataTable>
              <thead>
                <tr>
                  <Th>Question</Th>
                  <Th>Status</Th>
                  <Th>Settlement</Th>
                  <Th>Winner</Th>
                  <Th className="text-right">Predictions</Th>
                  <Th className="text-right">Payout</Th>
                  <Th>Updated</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {markets.map((m) => (
                  <tr
                    key={m.id}
                    className="cursor-pointer transition hover:bg-gray-50"
                    onClick={() => setSelectedMarketId(m.id)}
                  >
                    <Td className="max-w-[260px]">
                      <p className="line-clamp-2 font-semibold text-gray-900">
                        {m.question}
                      </p>
                    </Td>
                    <Td>
                      <Badge variant={marketStatusVariant(m.status)}>
                        {statusLabel(m.status)}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge variant={settlementStatusVariant(m.settlement_status)}>
                        {statusLabel(m.settlement_status || "idle")}
                      </Badge>
                      {m.settlement_error && (
                        <p className="mt-1 max-w-[180px] truncate text-[10px] text-red-600">
                          {m.settlement_error}
                        </p>
                      )}
                    </Td>
                    <Td>
                      {m.winning_outcome ? (
                        <span className={classNames(
                          "text-sm font-bold",
                          m.winning_outcome === "YES" ? "text-emerald-600" : "text-red-600"
                        )}>
                          {m.winning_outcome}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </Td>
                    <Td className="text-right text-sm tabular-nums">
                      {m.total_settled_positions ?? 0}
                    </Td>
                    <Td className="text-right text-sm tabular-nums font-medium">
                      {m.total_settled_payout_smallest_unit
                        ? formatNaira(koboToNaira(m.total_settled_payout_smallest_unit))
                        : m.total_refunded_smallest_unit
                          ? formatNaira(koboToNaira(m.total_refunded_smallest_unit))
                          : "—"}
                    </Td>
                    <Td className="text-xs text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(m.updated_at || m.settlement_completed_at || m.settlement_started_at)}
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMarketId(m.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {m.status === "pending_resolution" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openResolveDialog(m);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                            title="Resolve"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {m.settlement_status === "failed" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openRetryDialog(m);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                            title="Retry"
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {m.status === "resolved" && m.settlement_status !== "idle" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openRollbackDialog(m);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            title="Rollback"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <SectionHeader
          title="Settlement Audit Log"
          description="Recent settlement actions and events"
          action={
            <button
              onClick={fetchAudit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
          }
        />

        {auditLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : auditLog.length === 0 ? (
          <EmptyState
            icon={<History className="h-5 w-5" />}
            title="No audit entries"
            body="Settlement audit entries will appear here."
          />
        ) : (
          <Card padding={false}>
            <DataTable>
              <thead>
                <tr>
                  <Th>Time</Th>
                  <Th>Action</Th>
                  <Th>Market</Th>
                  <Th>Admin</Th>
                  <Th>Outcome</Th>
                  <Th>Amounts</Th>
                  <Th>Error</Th>
                </tr>
              </thead>
              <tbody>
                {auditLog.slice(0, 30).map((entry: any, idx: number) => (
                  <tr key={entry.id || idx} className="transition hover:bg-gray-50">
                    <Td className="whitespace-nowrap text-xs text-gray-500">
                      {formatDateTime(entry.created_at || entry.createdAt)}
                    </Td>
                    <Td>
                      <Badge variant={
                        entry.action?.includes("resolve") ? "info"
                          : entry.action?.includes("settle") ? "success"
                          : entry.action?.includes("refund") ? "warning"
                          : entry.action?.includes("rollback") ? "danger"
                          : entry.action?.includes("fail") ? "danger"
                          : "default"
                      }>
                        {statusLabel(entry.action || "unknown")}
                      </Badge>
                    </Td>
                    <Td className="max-w-[200px]">
                      <p className="truncate text-sm text-gray-700">
                        {entry.targetLabel || entry.metadata?.marketQuestion || "—"}
                      </p>
                    </Td>
                    <Td className="text-xs text-gray-500">
                      {entry.actorEmail || entry.actorId?.slice(0, 8) || "—"}
                    </Td>
                    <Td>
                      {entry.metadata?.outcome || entry.details?.outcome ? (
                        <span className={classNames(
                          "text-xs font-bold",
                          (entry.metadata?.outcome || entry.details?.outcome) === "YES" ? "text-emerald-600" : "text-red-600"
                        )}>
                          {String(entry.metadata?.outcome || entry.details?.outcome)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </Td>
                    <Td className="text-xs tabular-nums text-gray-600">
                      {entry.metadata?.total_payout != null
                        ? formatNaira(koboToNaira(entry.metadata.total_payout))
                        : entry.details?.total_payout != null
                          ? formatNaira(koboToNaira(entry.details.total_payout))
                          : "—"}
                    </Td>
                    <Td className="max-w-[160px]">
                      {(entry.error || entry.metadata?.error || entry.details?.error) ? (
                        <p className="truncate text-[10px] text-red-600">
                          {String(entry.error || entry.metadata?.error || entry.details?.error)}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </Card>
        )}
      </div>

      {resolveDialogOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">Resolve Market</h3>
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              &ldquo;{selectedMarket?.question}&rdquo;
            </p>
            <div className="mt-4">
              <SelectField
                label="Winning Outcome"
                value={resolveOutcome}
                onChange={(v) => setResolveOutcome(v as "YES" | "NO")}
                options={[
                  { value: "YES", label: "YES" },
                  { value: "NO", label: "NO" },
                ]}
              />
            </div>
            {actionError && (
              <p className="mt-3 text-xs font-semibold text-red-600">{actionError}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setResolveDialogOpen(false)}
                disabled={actionLoading}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={actionLoading}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : "Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={retryDialogOpen}
        title="Retry Settlement"
        body={`Retry settlement for "${selectedMarket?.question || ""}"? This will attempt to re-process the failed settlement.`}
        confirmLabel="Retry"
        confirmVariant="warning"
        loading={actionLoading}
        onConfirm={handleRetry}
        onCancel={() => setRetryDialogOpen(false)}
      />
      {retryDialogOpen && actionError && (
        <div className="fixed bottom-4 right-4 z-[80] max-w-sm rounded-xl border border-red-200 bg-red-50 p-4 shadow-lg">
          <p className="text-xs font-semibold text-red-600">{actionError}</p>
        </div>
      )}

      <ConfirmDialog
        open={rollbackDialogOpen}
        title="Rollback Settlement"
        body={`Rollback settlement for "${selectedMarket?.question || ""}"? This will undo the settlement and return positions to their pre-settlement state.`}
        confirmLabel="Rollback"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleRollback}
        onCancel={() => setRollbackDialogOpen(false)}
      />
      {rollbackDialogOpen && actionError && (
        <div className="fixed bottom-4 right-4 z-[80] max-w-sm rounded-xl border border-red-200 bg-red-50 p-4 shadow-lg">
          <p className="text-xs font-semibold text-red-600">{actionError}</p>
        </div>
      )}
    </div>
  );
};
