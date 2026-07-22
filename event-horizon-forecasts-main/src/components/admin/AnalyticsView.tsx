import { useEffect, useState } from "react";
import {
  Users,
  TrendingUp,
  Activity,
  DollarSign,
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { apiService } from "@/lib/api";
import { toast } from "sonner";
import { Card, MetricCard, Badge, SectionHeader, SkeletonCard } from "./ui";
import {
  classNames,
  formatNaira,
  formatDateTime,
  formatRelativeTime,
} from "./utils";
import type { PlatformStats } from "./types";

export function AnalyticsView() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStats = async () => {
    try {
      const res = await apiService.getPlatformStats();
      if (res?.stats) {
        setStats(res.stats);
        setLastRefresh(new Date());
      }
    } catch (err) {
      toast.error("Failed to fetch platform stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Platform Analytics"
          description="Live platform statistics with auto-refresh"
        />
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <RefreshCw className="h-3 w-3" />
          <span>Last updated {formatRelativeTime(lastRefresh.toISOString())}</span>
        </div>
      </div>

      {loading ? (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={`r1-${i}`} />
            ))}
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={`r2-${i}`} />
            ))}
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={`r3-${i}`} />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<Users className="h-4 w-4" />}
              label="Total Users"
              value={(stats?.totalUsers ?? 0).toLocaleString()}
              sub="Registered accounts"
              tone="blue"
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Active Markets"
              value={(stats?.activeMarkets ?? 0).toLocaleString()}
              sub="Currently trading"
              tone="green"
            />
            <MetricCard
              icon={<Activity className="h-4 w-4" />}
              label="Today's Trades"
              value={(stats?.todaysTrades ?? 0).toLocaleString()}
              sub="Positions placed today"
              tone="indigo"
            />
            <MetricCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Today's Volume"
              value={formatNaira(stats?.todaysVolume ?? 0)}
              sub="Total traded today"
              tone="amber"
            />
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<ArrowUpRight className="h-4 w-4" />}
              label="Today's Deposits"
              value={formatNaira(stats?.todaysDeposits ?? 0)}
              sub="Funds deposited today"
              tone="green"
            />
            <MetricCard
              icon={<ArrowDownRight className="h-4 w-4" />}
              label="Today's Withdrawals"
              value={formatNaira(stats?.todaysWithdrawals ?? 0)}
              sub="Funds withdrawn today"
              tone="red"
            />
            <MetricCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Platform Revenue"
              value={formatNaira(stats?.platformRevenue ?? 0)}
              sub="Total revenue earned"
              tone="blue"
            />
            <MetricCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Pending Settlements"
              value={(stats?.pendingSettlements ?? 0).toLocaleString()}
              sub="Awaiting resolution"
              tone="amber"
            />
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<Clock className="h-4 w-4" />}
              label="Avg Settlement Time"
              value={`${stats?.avgSettlementTime ?? 0}s`}
              sub="Average time to settle"
              tone="neutral"
            />
            <MetricCard
              icon={<Activity className="h-4 w-4" />}
              label="Failed Settlements"
              value={(stats?.failedSettlements ?? 0).toLocaleString()}
              sub="Requires attention"
              tone="red"
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Wallet Balances"
              value={formatNaira(stats?.walletBalances ?? 0)}
              sub="Total user wallet funds"
              tone="green"
            />
            <MetricCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Locked Balances"
              value={formatNaira(stats?.lockedBalances ?? 0)}
              sub="Funds locked in positions"
              tone="amber"
            />
          </div>

          <Card>
            <SectionHeader
              title="Recent Activity"
              description="Latest audit log entries"
            />
            <div className="divide-y divide-gray-50">
              {(stats as any)?.recentActivity?.slice(0, 10).length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400">
                  No recent activity
                </div>
              )}
              {(stats as any)?.recentActivity?.slice(0, 10).map(
                (entry: any) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50/50"
                  >
                    <Badge
                      variant={
                        entry.action?.includes("failed") ||
                        entry.action?.includes("rejected") ||
                        entry.action?.includes("deleted")
                          ? "danger"
                          : entry.action?.includes("created") ||
                            entry.action?.includes("approved") ||
                            entry.action?.includes("resolved")
                          ? "success"
                          : entry.action?.includes("updated") ||
                            entry.action?.includes("changed")
                          ? "info"
                          : "default"
                      }
                    >
                      {entry.action?.replace(/_/g, " ") ?? "activity"}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-700 truncate block">
                        {entry.targetLabel || entry.targetId || "—"}
                      </span>
                      {entry.actorEmail && (
                        <span className="text-[11px] text-gray-400">
                          by {entry.actorEmail}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-gray-400">
                      {formatRelativeTime(
                        entry.createdAt || entry.created_at
                      )}
                    </span>
                  </div>
                )
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
