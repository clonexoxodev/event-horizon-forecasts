import {
  BarChart3,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";

import {
  ADMIN_MARKET_CATEGORIES,
  normalizeCategory,
} from "@/lib/categories";
import type { AdminMarket } from "@/lib/api";
import { formatNaira } from "@/lib/markets";
import type { ApiTransaction } from "@/lib/api";
import type { DashboardMetrics, FinanceTransaction } from "./types";
import { ShellCard, SectionHeader, Badge, EmptyState, MetricCard } from "./ui";
import { categoryLabel, formatDate, marketVolume } from "./utils";

export const ReportsView = ({
  markets,
  transactions,
  metrics,
}: {
  markets: AdminMarket[];
  transactions: Array<ApiTransaction | FinanceTransaction>;
  metrics: {
    todayVolume: number;
    totalUsers: number;
    pendingResolution: number;
    resolvedMarkets: number;
  };
}) => {
  const categoryPerformance = ADMIN_MARKET_CATEGORIES.map((category) => {
    const categoryMarkets = markets.filter(
      (market) => normalizeCategory(market.category || "") === category.value
    );
    return {
      label: category.label,
      markets: categoryMarkets.length,
      volume: categoryMarkets.reduce(
        (sum, market) => sum + marketVolume(market),
        0
      ),
    };
  }).filter((item) => item.markets > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Daily volume" value={formatNaira(metrics.todayVolume)} icon={BarChart3} />
        <MetricCard label="User growth" value={metrics.totalUsers} icon={Users} />
        <MetricCard label="Pending resolutions" value={metrics.pendingResolution} icon={Clock} tone="amber" />
        <MetricCard label="Resolved markets" value={metrics.resolvedMarkets} icon={CheckCircle} tone="blue" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ShellCard>
          <SectionHeader
            title="Category performance"
            description="Market count and volume by category."
          />
          <div className="divide-y divide-[#E5E7EB]">
            {categoryPerformance.map((category) => (
              <div
                key={category.label}
                className="flex items-center justify-between p-6 hover:bg-[#F8F7F4]"
              >
                <div>
                  <p className="font-medium">{category.label}</p>
                  <p className="text-sm text-[#667085]">
                    {category.markets} markets
                  </p>
                </div>
                <p className="font-semibold">{formatNaira(category.volume)}</p>
              </div>
            ))}
            {!categoryPerformance.length && (
              <EmptyState
                title="No category report yet"
                body="Create markets to populate category performance."
              />
            )}
          </div>
        </ShellCard>
        <ShellCard>
          <SectionHeader
            title="Payout history"
            description="Completed payout transactions from the ledger."
          />
          <div className="divide-y divide-[#E5E7EB]">
            {transactions
              .filter(
                (tx) => tx.type === "payout" || tx.type === "market_payout"
              )
              .slice(0, 8)
              .map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-6 hover:bg-[#F8F7F4]"
                >
                  <div>
                    <p className="font-medium">
                      {tx.market_question || "Market payout"}
                    </p>
                    <p className="text-sm text-[#667085]">
                      {formatDate(tx.created_at)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatNaira(Number(tx.amount || 0))}
                  </p>
                </div>
              ))}
            {!transactions.some(
              (tx) => tx.type === "payout" || tx.type === "market_payout"
            ) && (
              <EmptyState
                title="No payout records yet"
                body="Resolved market payouts will appear here."
              />
            )}
          </div>
        </ShellCard>
      </div>
    </div>
  );
};

const DisabledSetting = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E5E7EB] bg-white p-4">
    <div>
      <p className="font-medium">{label}</p>
      <p className="text-sm text-[#667085]">{value}</p>
    </div>
    <Badge>Disabled</Badge>
  </div>
);

export const AdminSettingsView = () => (
  <div className="grid gap-6 xl:grid-cols-2">
    <ShellCard>
      <SectionHeader
        eyebrow="Platform settings"
        title="Operational controls"
        description="These controls are disabled until backend platform settings exist."
      />
      <div className="space-y-3 p-6">
        <DisabledSetting label="Platform status" value="Online" />
        <DisabledSetting label="Maintenance mode" value="Coming soon" />
        <DisabledSetting
          label="Minimum prediction amount"
          value="Needs platform_settings table"
        />
        <DisabledSetting
          label="Maximum prediction amount"
          value="Needs platform_settings table"
        />
        <DisabledSetting
          label="Market creation rules"
          value="Needs backend config"
        />
      </div>
    </ShellCard>
    <ShellCard>
      <SectionHeader
        title="Support and safety"
        description="Launch readiness placeholders."
      />
      <div className="space-y-3 p-6">
        <DisabledSetting
          label="Support contact"
          value="Add before public launch"
        />
        <DisabledSetting
          label="Dispute escalation SLA"
          value="Coming soon"
        />
        <DisabledSetting label="Risk review rules" value="Coming soon" />
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800">
          TODO: add a platform_settings table with key/value rows for
          maintenance mode, prediction limits, support contact, and market
          creation rules.
        </p>
      </div>
    </ShellCard>
  </div>
);
