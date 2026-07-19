import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Lock,
  ReceiptText,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import type { AdminMarket } from "@/lib/api";
import { formatNaira } from "@/lib/markets";
import type { AdminUser, DashboardMetrics, FinanceOverview } from "./types";
import { ShellCard, SectionHeader, MetricCard, Badge, EmptyState } from "./ui";
import { categoryLabel, formatDate, formatShortDate, isEndingSoon, metricValue } from "./utils";

export type DashboardViewProps = {
  metrics: DashboardMetrics;
  markets: AdminMarket[];
  users: AdminUser[];
  financeOverview: FinanceOverview | null;
  loading: boolean;
};

const QueueList = ({
  title,
  markets,
  empty,
}: {
  title: string;
  markets: AdminMarket[];
  empty: string;
}) => (
  <div>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold">{title}</h3>
      <span className="text-xs text-[#667085]">{markets.length}</span>
    </div>
    {markets.length ? (
      <div className="space-y-2">
        {markets.map((market) => (
          <Link
            key={market.id}
            to={`/market/${market.id}`}
            className="block rounded-xl border border-[#E5E7EB] bg-white p-3.5 transition hover:border-[#4F46E5]/50 hover:shadow-sm"
          >
            <p className="line-clamp-2 text-sm font-medium">{market.question}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-[#667085]">
              <span>{categoryLabel(market.category)}</span>
              <span>{formatDate(market.close_date || market.closes_at)}</span>
            </div>
          </Link>
        ))}
      </div>
    ) : (
      <p className="rounded-xl border border-dashed border-[#E5E7EB] px-3 py-5 text-center text-sm text-[#667085]">
        {empty}
      </p>
    )}
  </div>
);

export const AdminStats = ({
  metrics,
  markets,
  users,
  financeOverview,
  loading,
}: DashboardViewProps) => {
  const endingSoon = markets
    .filter((market) => market.status === "active" && isEndingSoon(market))
    .slice(0, 5);
  const pending = markets
    .filter(
      (market) =>
        market.status === "pending_resolution" || market.status === "closed"
    )
    .slice(0, 5);
  const mostActiveUsers = [...users]
    .sort(
      (a, b) =>
        metricValue(b.total_predictions) - metricValue(a.total_predictions) ||
        metricValue(b.total_volume) - metricValue(a.total_volume)
    )
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Live markets" value={metrics.liveMarkets} icon={Activity} tone="green" />
        <MetricCard label="Pending resolution" value={metrics.pendingResolution} icon={Clock} tone="amber" />
        <MetricCard label="Resolved markets" value={metrics.resolvedMarkets} icon={CheckCircle} tone="blue" />
        <MetricCard label="Total users" value={metrics.totalUsers} icon={Users} />
        <MetricCard label="Today active users" value={metrics.activeUsersToday} icon={Activity} hint="Real prediction activity today." />
        <MetricCard label="Today predictions" value={metrics.todayPredictions} icon={BarChart3} />
        <MetricCard label="Today volume" value={formatNaira(metrics.todayVolume)} icon={ReceiptText} tone="green" />
        <MetricCard label="Pending payouts" value={metrics.pendingPayouts} icon={AlertTriangle} tone="amber" />
        <MetricCard label="Total wallet balance" value={formatNaira(metrics.totalWalletBalance)} icon={Wallet} />
        <MetricCard label="Money in active markets" value={formatNaira(metrics.activeMarketMoney)} icon={Lock} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ShellCard>
          <SectionHeader
            eyebrow="User activity"
            title="User analytics"
            description="Real values only. Last-login and returning-user reports need backend activity logs."
          />
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <MetricCard label="Users active today" value={metrics.activeUsersToday} icon={Activity} hint="Users with predictions today." />
            <MetricCard label="Users with predictions" value={metrics.usersWithPredictions} icon={Users} />
            <MetricCard label="New users today" value={metrics.newUsersToday} icon={ShieldCheck} />
          </div>
          <div className="border-t border-[#E5E7EB] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#101828]">
              Most active users
            </h3>
            {mostActiveUsers.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-[#667085]">
                    <tr>
                      <th className="py-3">User</th>
                      <th>Predictions</th>
                      <th>Volume</th>
                      <th>Last login</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {mostActiveUsers.map((adminUser) => (
                      <tr key={adminUser.id} className="hover:bg-[#F8F7F4]">
                        <td className="py-3.5">
                          <p className="font-medium">{adminUser.username || "User"}</p>
                          <p className="text-xs text-[#667085]">{adminUser.email}</p>
                        </td>
                        <td>{metricValue(adminUser.total_predictions)}</td>
                        <td>{formatNaira(metricValue(adminUser.total_volume))}</td>
                        <td className="text-[#667085]">
                          {formatShortDate(adminUser.last_login_at)}
                        </td>
                        <td>
                          <Badge tone={adminUser.status === "suspended" ? "red" : "green"}>
                            {adminUser.status || "Active"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No user activity data yet"
                body="Connect prediction-count and login activity fields to unlock this table."
              />
            )}
          </div>
        </ShellCard>

        <ShellCard>
          <SectionHeader
            eyebrow="Queues"
            title="Operational attention"
            description="Markets that need action from the team."
          />
          <div className="space-y-5 p-5">
            <QueueList
              title="Ending soon"
              empty="No active markets ending in the next 24 hours."
              markets={endingSoon}
            />
            <QueueList
              title="Needs resolution"
              empty="No markets waiting for resolution."
              markets={pending}
            />
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <p className="text-sm font-semibold">Finance snapshot</p>
              <div className="mt-3 grid gap-2.5 text-sm text-[#667085]">
                <div className="flex justify-between">
                  <span>Pending deposits</span>
                  <span>{metricValue(financeOverview?.pendingDeposits)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending withdrawals</span>
                  <span>{metricValue(financeOverview?.pendingWithdrawals)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Today deposits</span>
                  <span>{formatNaira(metricValue(financeOverview?.todayDeposits))}</span>
                </div>
              </div>
            </div>
            {loading && (
              <p className="text-sm text-[#667085]">Refreshing data...</p>
            )}
          </div>
        </ShellCard>
      </div>
    </div>
  );
};
