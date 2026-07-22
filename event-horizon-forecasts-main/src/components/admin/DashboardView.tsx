import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Clock,
  Eye,
  Gavel,
  Inbox,
  Search,
  TrendingUp,
  Users,
  Wallet,
  AlertTriangle,
  Download,
  Activity,
  RefreshCw,
} from "lucide-react";
import { apiService } from "@/lib/api";
import type { AdminMarket, WithdrawalRequest } from "@/lib/api";
import type { AdminView } from "./types";
import {
  MetricCard,
  EmptyState,
  SkeletonCard,
  SectionHeader,
  Badge,
} from "./ui";
import {
  formatNaira,
  formatRelativeTime,
  marketVolume,
  statusLabel,
} from "./utils";

export const DashboardView = ({
  setView,
  setSelectedMarketId,
}: {
  setView: (v: AdminView) => void;
  setSelectedMarketId: (id: string) => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [pendingMarkets, setPendingMarkets] = useState<AdminMarket[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    try {
      const [statsRes, analyticsRes, marketsRes, withdrawalsRes] = await Promise.allSettled([
        apiService.getAdminDashboardStats(),
        apiService.getAnalytics(),
        apiService.listAdminMarkets({ status: "pending_resolution" }),
        apiService.listAdminFinanceWithdrawals("pending"),
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value.stats);
      if (analyticsRes.status === "fulfilled") setAnalytics(analyticsRes.value.data || analyticsRes.value);
      if (marketsRes.status === "fulfilled") setPendingMarkets(marketsRes.value.markets || []);
      if (withdrawalsRes.status === "fulfilled") setPendingWithdrawals(withdrawalsRes.value.withdrawals || []);
      setLastRefresh(new Date());
    } catch {
      // Silent fail for auto-refresh
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      await loadData();
      if (!cancelled) setLoading(false);
    };

    load();
    const interval = setInterval(() => { if (!cancelled) loadData(); }, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [loadData]);

  const s = stats || analytics || {};
  const totalUsers = s.totalUsers ?? 0;
  const activeMarkets = s.activeMarkets ?? 0;
  const pendingWithdrawalsCount = s.pendingWithdrawals ?? pendingWithdrawals.length;
  const pendingResolutionsCount = s.pendingResolutions ?? pendingMarkets.length;
  const todayVolume = s.todayVolume ?? s.todayPredictionVolume ?? 0;
  const totalVolume = s.totalVolume ?? 0;

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          {[
            { view: "analytics" as AdminView, icon: Activity, label: "Analytics" },
            { view: "search" as AdminView, icon: Search, label: "Search" },
            { view: "export" as AdminView, icon: Download, label: "Export" },
            { view: "risk-center" as AdminView, icon: AlertTriangle, label: "Risk" },
            { view: "system-health" as AdminView, icon: RefreshCw, label: "Health" },
          ].map(({ view: v, icon: Icon, label }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400">
            <RefreshCw className="h-3 w-3" />
            {formatRelativeTime(lastRefresh)}
          </span>
        </div>
      )}

      {loading ? (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              icon={<Users className="h-4 w-4" />}
              label="Total Users"
              value={totalUsers.toLocaleString()}
              tone="indigo"
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Active Markets"
              value={activeMarkets.toLocaleString()}
              tone="green"
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => setView("withdrawals")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setView("withdrawals");
                }
              }}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-gray-500">
                    Pending Withdrawals
                  </div>
                  <div className="mt-0.5 text-xl font-black text-gray-900">
                    {pendingWithdrawalsCount}
                  </div>
                  {pendingWithdrawalsCount > 0 && (
                    <div className="mt-0.5 text-[11px] font-medium text-amber-600">
                      Click to review
                    </div>
                  )}
                </div>
              </div>
            </div>
            <MetricCard
              icon={<Clock className="h-4 w-4" />}
              label="Pending Resolutions"
              value={pendingResolutionsCount.toLocaleString()}
              tone={pendingResolutionsCount > 0 ? "red" : "neutral"}
            />
            <MetricCard
              icon={<Wallet className="h-4 w-4" />}
              label="Today's Volume"
              value={formatNaira(todayVolume)}
              tone="blue"
            />
            <MetricCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Total Volume"
              value={formatNaira(totalVolume)}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <SectionHeader
                title="Pending Resolutions"
                description="Markets awaiting resolution"
                action={
                  pendingMarkets.length > 0 ? (
                    <button
                      onClick={() => setView("markets")}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
                    >
                      View all
                    </button>
                  ) : undefined
                }
              />

              {pendingMarkets.length === 0 ? (
                <EmptyState
                  icon={<Inbox className="h-5 w-5" />}
                  title="No pending resolutions"
                  body="All markets have been resolved."
                />
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <div className="divide-y divide-gray-50">
                    {pendingMarkets.slice(0, 5).map((market) => (
                      <div
                        key={market.id}
                        className="flex items-center gap-4 px-4 py-3 transition hover:bg-gray-50/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {market.question}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
                            <span className="truncate">{market.category}</span>
                            <span>·</span>
                            <span>{formatNaira(marketVolume(market))}</span>
                            <span>·</span>
                            <span>{market.participant_count ?? 0} participants</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedMarketId(market.id);
                            setView("market-detail");
                          }}
                          className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {pendingMarkets.length > 5 && (
                    <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 text-center">
                      <button
                        onClick={() => setView("markets")}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
                      >
                        +{pendingMarkets.length - 5} more
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <SectionHeader
                title="Recent Withdrawals"
                description="Pending withdrawal requests"
                action={
                  pendingWithdrawals.length > 0 ? (
                    <button
                      onClick={() => setView("withdrawals")}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
                    >
                      View all
                    </button>
                  ) : undefined
                }
              />

              {pendingWithdrawals.length === 0 ? (
                <EmptyState
                  icon={<Wallet className="h-5 w-5" />}
                  title="No pending withdrawals"
                  body="All withdrawal requests have been processed."
                />
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <div className="divide-y divide-gray-50">
                    {pendingWithdrawals.slice(0, 5).map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center gap-4 px-4 py-3 transition hover:bg-gray-50/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {w.user?.username || w.user?.email || "—"}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
                            <span className="font-semibold text-gray-600">
                              {formatNaira(w.amount)}
                            </span>
                            <span>·</span>
                            <span className="truncate">{w.bankName}</span>
                            <span>·</span>
                            <span className="font-mono">{w.accountNumber}</span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            w.status === "pending"
                              ? "warning"
                              : w.status === "approved" || w.status === "completed"
                              ? "success"
                              : w.status === "rejected" || w.status === "failed"
                              ? "danger"
                              : "default"
                          }
                        >
                          {statusLabel(w.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {pendingWithdrawals.length > 5 && (
                    <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 text-center">
                      <button
                        onClick={() => setView("withdrawals")}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
                      >
                        +{pendingWithdrawals.length - 5} more
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
