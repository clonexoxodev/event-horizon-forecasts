import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import { apiService } from "@/lib/api";
import {
  Card,
  SectionHeader,
  EmptyState,
  TabBar,
  SkeletonCard,
} from "./ui";
import { formatDateTime, statusLabel, classNames } from "./utils";
import { AUDIT_ACTION_LABELS } from "./types";

type AuditEntry = {
  id: string;
  action: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  details?: Record<string, unknown>;
  createdAt?: string;
  created_at?: string;
};

const ACTION_FILTERS = [
  { value: "", label: "All" },
  { value: "market_created", label: "Markets" },
  { value: "market_resolved", label: "Resolved" },
  { value: "withdrawal_approved", label: "Withdrawals" },
  { value: "deposit_approved", label: "Deposits" },
  { value: "admin_added", label: "Admin" },
  { value: "user_suspended", label: "Users" },
  { value: "admin_login", label: "Login" },
];

const PAGE_SIZE = 50;

const CollapsibleDetails = ({ details }: { details: Record<string, unknown> }) => {
  const [open, setOpen] = useState(false);

  if (!details || Object.keys(details).length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Details
      </button>
      {open && (
        <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-600">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
};

export const AuditLogView = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionFilter, setActionFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchEntries = async (action: string, currentOffset: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const params: { action?: string; limit?: number; offset?: number } = {
        limit: PAGE_SIZE,
        offset: currentOffset,
      };
      if (action) params.action = action;
      const res = await apiService.getAdminAuditLog(params);
      const newEntries = res.entries || [];
      setEntries((prev) => (append ? [...prev, ...newEntries] : newEntries));
      setTotal(res.total || 0);
      setHasMore(newEntries.length === PAGE_SIZE);
    } catch {
      if (!append) setEntries([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    fetchEntries(actionFilter, 0, false);
  }, [actionFilter]);

  const loadMore = () => {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    fetchEntries(actionFilter, nextOffset, true);
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Audit Log"
        description={`${total > 0 ? `${total} entries` : "Track all administrative actions and changes."}`}
      />

      <TabBar
        tabs={ACTION_FILTERS}
        active={actionFilter}
        onChange={(v) => setActionFilter(v)}
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="No audit entries found"
          body="No actions match the selected filter."
        />
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-gray-100">
            {entries.map((entry) => {
              const timestamp = entry.createdAt || entry.created_at;
              const actionLabel =
                AUDIT_ACTION_LABELS[entry.action] || statusLabel(entry.action);

              return (
                <div key={entry.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                          {actionLabel}
                        </span>
                        {entry.targetLabel && (
                          <span className="text-sm font-semibold text-gray-900 truncate max-w-[300px]">
                            {entry.targetLabel}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                        {entry.actorEmail && (
                          <>
                            <span className="font-medium text-gray-600">{entry.actorEmail}</span>
                            <span className="text-gray-300">·</span>
                          </>
                        )}
                        {entry.targetType && (
                          <>
                            <span>{statusLabel(entry.targetType)}</span>
                            <span className="text-gray-300">·</span>
                          </>
                        )}
                        <span>{formatDateTime(timestamp)}</span>
                      </div>
                      {entry.details && (
                        <CollapsibleDetails details={entry.details} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more entries"
                )}
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
