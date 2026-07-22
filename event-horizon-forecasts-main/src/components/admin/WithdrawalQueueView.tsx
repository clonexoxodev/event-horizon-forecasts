import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, Calendar, Check, ChevronDown, ChevronUp, Download, Eye, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import apiService, { type WithdrawalRequest } from "@/lib/api";
import {
  Card,
  Badge,
  SectionHeader,
  EmptyState,
  ConfirmDialog,
  DataTable,
  Th,
  Td,
  SkeletonCard,
  InputField,
} from "./ui";
import {
  formatNaira,
  formatDateTime,
  formatDate,
  statusLabel,
  statusColor,
  formatRelativeTime,
} from "./utils";

type StatusTab = "all" | "pending" | "completed" | "rejected";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

const BADGE_VARIANT = (
  status: string
): "default" | "success" | "warning" | "danger" | "info" | "muted" => {
  switch (status) {
    case "pending":
      return "warning";
    case "completed":
    case "approved":
      return "success";
    case "rejected":
    case "failed":
      return "danger";
    default:
      return "default";
  }
};

export const WithdrawalQueueView = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusTab>("all");

  const [approveTarget, setApproveTarget] = useState<WithdrawalRequest | null>(null);
  const [approving, setApproving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<WithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [detailTarget, setDetailTarget] = useState<WithdrawalRequest | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkRejecting, setBulkRejecting] = useState(false);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (new Date(w.createdAt) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(w.createdAt) > to) return false;
      }
      return true;
    });
  }, [withdrawals, dateFrom, dateTo]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === filteredWithdrawals.length) return new Set();
      return new Set(filteredWithdrawals.map((w) => w.id));
    });
  }, [filteredWithdrawals]);

  const exportCsv = useCallback(() => {
    const headers = ["User", "Amount", "Bank Name", "Account Number", "Account Name", "Status", "Date", "Reference"];
    const rows = filteredWithdrawals.map((w) => [
      w.user?.username || w.user?.email || w.userId || "",
      String(Number(w.amount || 0)),
      w.bankName || "",
      w.accountNumber || "",
      w.accountName || "",
      w.status || "",
      w.createdAt ? new Date(w.createdAt).toISOString() : "",
      w.reference || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `withdrawals-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredWithdrawals.length} withdrawals.`);
  }, [filteredWithdrawals, statusFilter]);

  const handleBulkApprove = useCallback(async () => {
    const pending = filteredWithdrawals.filter((w) => selectedIds.has(w.id) && w.status === "pending");
    if (pending.length === 0) {
      toast.warning("No pending withdrawals selected.");
      return;
    }
    setBulkApproving(true);
    try {
      await Promise.all(pending.map((w) => apiService.approveAdminWithdrawal(w.id)));
      toast.success(`Approved ${pending.length} withdrawal(s).`);
      setSelectedIds(new Set());
      fetchWithdrawals(statusFilter);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bulk approve failed.";
      toast.error(msg);
    } finally {
      setBulkApproving(false);
    }
  }, [filteredWithdrawals, selectedIds, statusFilter, fetchWithdrawals]);

  const handleBulkReject = useCallback(async () => {
    const pending = filteredWithdrawals.filter((w) => selectedIds.has(w.id) && w.status === "pending");
    if (pending.length === 0) {
      toast.warning("No pending withdrawals selected.");
      return;
    }
    setBulkRejecting(true);
    try {
      await Promise.all(pending.map((w) => apiService.rejectAdminWithdrawal(w.id, "Bulk rejected")));
      toast.success(`Rejected ${pending.length} withdrawal(s).`);
      setSelectedIds(new Set());
      fetchWithdrawals(statusFilter);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bulk reject failed.";
      toast.error(msg);
    } finally {
      setBulkRejecting(false);
    }
  }, [filteredWithdrawals, selectedIds, statusFilter, fetchWithdrawals]);

  const fetchWithdrawals = useCallback(async (status: StatusTab) => {
    setLoading(true);
    try {
      const params = status === "all" ? "all" : status;
      const result = await apiService.listAdminFinanceWithdrawals(params);
      setWithdrawals(result.withdrawals || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load withdrawals.";
      if (msg.includes("404") || msg.includes("not found") || msg.includes("does not exist")) {
        toast.warning("Withdrawal management is not yet available. The backend endpoint may need to be deployed.");
      } else {
        toast.error(msg);
      }
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWithdrawals(statusFilter);
  }, [statusFilter, fetchWithdrawals]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      await apiService.approveAdminWithdrawal(approveTarget.id);
      toast.success("Withdrawal approved successfully.");
      setApproveTarget(null);
      fetchWithdrawals(statusFilter);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to approve withdrawal.";
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      await apiService.rejectAdminWithdrawal(rejectTarget.id, rejectReason.trim());
      toast.success("Withdrawal rejected.");
      setRejectTarget(null);
      setRejectReason("");
      fetchWithdrawals(statusFilter);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reject withdrawal.";
      toast.error(msg);
    } finally {
      setRejecting(false);
    }
  };

  const userLabel = (w: WithdrawalRequest): string =>
    w.user?.username || w.user?.email || w.userId?.slice(0, 8) || "—";

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Withdrawal Queue"
        description="Review and manage withdrawal requests from users."
      />

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === tab.value
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.value === "pending" && withdrawals.length > 0 && statusFilter === "all" && (
              <span className="ml-1.5 text-white/70">{withdrawals.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
            Clear Dates
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={filteredWithdrawals.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV ({filteredWithdrawals.length})
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5">
          <span className="text-xs font-bold text-indigo-700">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkApprove}
              disabled={bulkApproving}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {bulkApproving && <Loader2 className="h-3 w-3 animate-spin" />}
              Bulk Approve
            </button>
            <button
              onClick={handleBulkReject}
              disabled={bulkRejecting}
              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {bulkRejecting && <Loader2 className="h-3 w-3 animate-spin" />}
              Bulk Reject
            </button>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs font-semibold text-indigo-600 transition hover:text-indigo-800"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <EmptyState
          icon={<Banknote className="h-5 w-5" />}
          title="No withdrawals found"
          body={
            statusFilter === "pending"
              ? "All withdrawal requests have been processed."
              : `No ${statusFilter === "all" ? "" : statusFilter} withdrawals to display.`
          }
        />
      ) : (
        <Card padding={false}>
          <DataTable>
            <thead>
              <tr>
                <Th className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredWithdrawals.length && filteredWithdrawals.length > 0}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-gray-300 accent-indigo-600"
                  />
                </Th>
                <Th>User</Th>
                <Th>Amount</Th>
                <Th>Bank Name</Th>
                <Th>Account Number</Th>
                <Th>Account Name</Th>
                <Th>Status</Th>
                <Th>Date</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdrawals.map((w) => {
                const isPending = w.status === "pending";

                return (
                  <tr
                    key={w.id}
                    className={`transition ${
                      isPending
                        ? "bg-amber-50/40 hover:bg-amber-50/70"
                        : "hover:bg-gray-50"
                    } cursor-pointer`}
                    onClick={() => setDetailTarget(w)}
                  >
                    <Td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(w.id)}
                        onChange={() => toggleSelect(w.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5 rounded border-gray-300 accent-indigo-600"
                      />
                    </Td>
                    <Td>
                      <span className="font-semibold text-gray-900">
                        {userLabel(w)}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className={`font-bold ${
                          isPending ? "text-gray-900" : "text-gray-700"
                        }`}
                      >
                        {formatNaira(Number(w.amount || 0))}
                      </span>
                    </Td>
                    <Td className="text-gray-600">{w.bankName || "—"}</Td>
                    <Td className="font-mono text-gray-600">
                      {w.accountNumber || "—"}
                    </Td>
                    <Td className="text-gray-600">{w.accountName || "—"}</Td>
                    <Td>
                      <Badge variant={BADGE_VARIANT(w.status)}>
                        {statusLabel(w.status)}
                      </Badge>
                    </Td>
                    <Td className="text-xs text-gray-500">
                      {formatDate(w.createdAt)}
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isPending && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setApproveTarget(w);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.97]"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRejectTarget(w);
                                setRejectReason("");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 active:scale-[0.97]"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailTarget(w);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </Card>
      )}

      <ConfirmDialog
        open={approveTarget !== null}
        title="Approve Withdrawal"
        body={`Are you sure you want to approve ${formatNaira(Number(approveTarget?.amount || 0))} for ${userLabel(approveTarget!)}?`}
        confirmLabel="Approve"
        confirmVariant="primary"
        loading={approving}
        onConfirm={handleApprove}
        onCancel={() => setApproveTarget(null)}
      />

      {rejectTarget && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!rejecting) {
              setRejectTarget(null);
              setRejectReason("");
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">Reject Withdrawal</h3>
            <p className="mt-2 text-sm text-gray-600">
              You are about to reject {formatNaira(Number(rejectTarget.amount || 0))} for{" "}
              {userLabel(rejectTarget)}. Please provide a reason.
            </p>
            <div className="mt-4">
              <InputField
                label="Rejection Reason"
                value={rejectReason}
                onChange={setRejectReason}
                placeholder="e.g. Invalid bank details, insufficient funds..."
                rows={3}
                required
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                disabled={rejecting}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejecting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
              >
                {rejecting && <Loader2 className="h-4 w-4 animate-spin" />}
                {rejecting ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailTarget && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setDetailTarget(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Withdrawal Details</h3>
              <button
                onClick={() => setDetailTarget(null)}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  User Information
                </h4>
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-4 text-sm">
                  <div>
                    <span className="block text-[11px] font-semibold text-gray-400">Name</span>
                    <span className="font-semibold text-gray-900">
                      {detailTarget.user?.username || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-semibold text-gray-400">Email</span>
                    <span className="text-gray-700">
                      {detailTarget.user?.email || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-semibold text-gray-400">User ID</span>
                    <span className="font-mono text-xs text-gray-500">
                      {detailTarget.userId || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Withdrawal Details
                </h4>
                <div className="space-y-3 rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Amount</span>
                    <span className="text-lg font-black text-gray-900">
                      {formatNaira(Number(detailTarget.amount || 0))}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="block text-[11px] font-semibold text-gray-400">Bank</span>
                      <span className="text-gray-700">{detailTarget.bankName || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-gray-400">Account Number</span>
                      <span className="font-mono text-gray-700">{detailTarget.accountNumber || "—"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[11px] font-semibold text-gray-400">Account Name</span>
                      <span className="text-gray-700">{detailTarget.accountName || "—"}</span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[11px] font-semibold text-gray-400">Reference</span>
                    <span className="font-mono text-xs text-gray-500">
                      {detailTarget.reference || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-semibold text-gray-400">Review Tier</span>
                    <span className="text-xs text-gray-500">
                      {detailTarget.reviewTier || "Standard"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Timeline
                </h4>
                <div className="space-y-0 rounded-xl bg-gray-50 p-4">
                  <div className="relative flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                      <div className="w-px flex-1 bg-gray-200" />
                    </div>
                    <div className="pb-4 text-sm">
                      <span className="font-semibold text-gray-900">Created</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {formatDateTime(detailTarget.createdAt)}
                      </span>
                    </div>
                  </div>
                  {detailTarget.status === "pending" && (
                    <div className="relative flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold text-gray-900">Awaiting Review</span>
                        <span className="ml-2 text-xs text-gray-500">In queue</span>
                      </div>
                    </div>
                  )}
                  {(detailTarget.status === "completed" || detailTarget.status === "approved") && (
                    <div className="relative flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold text-gray-900">Approved</span>
                        <span className="ml-2 text-xs text-gray-500">
                          <Badge variant={BADGE_VARIANT(detailTarget.status)}>
                            {statusLabel(detailTarget.status)}
                          </Badge>
                        </span>
                      </div>
                    </div>
                  )}
                  {(detailTarget.status === "rejected" || detailTarget.status === "failed") && (
                    <div className="relative flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold text-gray-900">Rejected</span>
                        <span className="ml-2 text-xs text-gray-500">
                          <Badge variant={BADGE_VARIANT(detailTarget.status)}>
                            {statusLabel(detailTarget.status)}
                          </Badge>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setDetailTarget(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
