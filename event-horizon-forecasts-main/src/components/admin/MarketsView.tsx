import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Loader2, Plus, Search } from "lucide-react";
import apiService, { type AdminMarket } from "@/lib/api";
import type { AdminView, MarketStatusFilter } from "./types";
import { MARKET_STATUS_OPTIONS } from "./types";
import { Card, DataTable, Th, Td, Badge, EmptyState, TabBar, SkeletonCard } from "./ui";
import {
  statusColor,
  statusLabel,
  formatNaira,
  formatCountdown,
  koboToNaira,
  classNames,
} from "./utils";

export const MarketsView = ({
  setView,
  setSelectedMarketId,
}: {
  setView: (v: AdminView) => void;
  setSelectedMarketId: (id: string) => void;
}) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MarketStatusFilter>("all");
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [allStatusCounts, setAllStatusCounts] = useState<Record<string, number>>({});

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

  const fetchMarkets = useCallback(async (status: MarketStatusFilter, q: string) => {
    setLoading(true);
    try {
      const params: { status?: string; search?: string } = {};
      if (status !== "all") params.status = status;
      if (q.trim()) params.search = q.trim();
      const result = await apiService.listAdminMarkets(params);
      setMarkets(result.markets || []);
    } catch {
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets(statusFilter, debouncedSearch);
  }, [statusFilter, debouncedSearch, fetchMarkets]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await apiService.listAdminMarkets({});
        if (cancelled) return;
        const all: AdminMarket[] = result.markets || [];
        const counts: Record<string, number> = { all: all.length };
        for (const m of all) {
          counts[m.status] = (counts[m.status] || 0) + 1;
        }
        setAllStatusCounts(counts);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const tabs = useMemo(
    () =>
      MARKET_STATUS_OPTIONS.map((opt) => ({
        value: opt.value,
        label: opt.label,
        count: allStatusCounts[opt.value],
      })),
    [allStatusCounts]
  );

  const statusBadgeVariant = (s: string): "default" | "success" | "warning" | "danger" | "info" | "muted" => {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <button
          onClick={() => setView("create-market")}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Create Market
        </button>
      </div>

      <TabBar tabs={tabs} active={statusFilter} onChange={(v) => setStatusFilter(v as MarketStatusFilter)} />

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
          body="Try adjusting your search or filter, or create a new market."
          action={
            <button
              onClick={() => setView("create-market")}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Create Market
            </button>
          }
        />
      ) : (
        <Card padding={false}>
          <DataTable>
            <thead>
              <tr>
                <Th>Question</Th>
                <Th>Status</Th>
                <Th>Pool</Th>
                <Th>Volume</Th>
                <Th className="text-right">Participants</Th>
                <Th>Countdown</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => {
                const pool = koboToNaira(m.pool_amount_smallest_unit || 0);
                const volume = koboToNaira(m.total_volume_smallest_unit || 0);

                return (
                  <tr
                    key={m.id}
                    className="cursor-pointer transition hover:bg-gray-50"
                    onClick={() => {
                      setSelectedMarketId(m.id);
                      setView("market-detail");
                    }}
                  >
                    <Td className="max-w-[320px]">
                      <p className="line-clamp-2 font-semibold text-gray-900">
                        {m.question}
                      </p>
                    </Td>
                    <Td>
                      <Badge variant={statusBadgeVariant(m.status)}>
                        {statusLabel(m.status)}
                      </Badge>
                    </Td>
                    <Td>{formatNaira(pool)}</Td>
                    <Td>{formatNaira(volume)}</Td>
                    <Td className="text-right">{m.participant_count ?? 0}</Td>
                    <Td>
                      <span
                        className={classNames(
                          "text-sm",
                          m.status === "active" ? "text-gray-700" : "text-gray-400"
                        )}
                      >
                        {m.status === "active"
                          ? formatCountdown(m.trading_close_at || m.close_date)
                          : "—"}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMarketId(m.id);
                          setView("market-detail");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </Card>
      )}
    </div>
  );
};
