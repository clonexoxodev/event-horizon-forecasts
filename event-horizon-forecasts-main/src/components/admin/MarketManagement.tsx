import { type MouseEvent, type FocusEvent } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  Ban,
  BarChart3,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  Image as ImageIcon,
  Loader2,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminMarket } from "@/lib/api";
import { formatNaira } from "@/lib/markets";
import {
  ADMIN_MARKET_CATEGORIES,
  getCategoryLabel,
  normalizeCategory,
} from "@/lib/categories";
import type {
  AdminUser,
  DashboardMetrics,
  DangerAction,
  DangerState,
  FinanceOverview,
  MarketForm,
  MarketStatusFilter,
  ResolutionPreview,
  ResolutionState,
} from "./types";
import { ShellCard, SectionHeader, Badge, EmptyState, MetricCard, Field, Stat } from "./ui";
import {
  categoryLabel,
  classNames,
  formatDate,
  formatShortDate,
  isEndingSoon,
  marketVolume,
  metricValue,
  statusClasses,
  statusText,
} from "./utils";

const ActionButton = ({
  label,
  icon: Icon,
  tone = "neutral",
  disabled,
  onClick,
  as,
  to,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "green" | "red";
  disabled?: boolean;
  onClick?: () => void;
  as?: typeof Link;
  to?: string;
}) => {
  const classes = classNames(
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
    tone === "green" &&
      "border-[#C7D2FE] bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#4338CA]/20",
    tone === "red" &&
      "border-red-500/30 bg-red-500/10 text-[#E85D5D] hover:bg-red-500/20",
    tone === "neutral" &&
      "border-[#E5E7EB] bg-[#F3F4F6] text-[#667085] hover:bg-[#E5E7EB] hover:text-[#101828]",
    disabled && "cursor-not-allowed opacity-40"
  );

  if (as === Link && to) {
    return (
      <Link className={classes} to={to} title={label}>
        <Icon className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <button className={classes} onClick={onClick} disabled={disabled} title={label}>
      <Icon className="h-4 w-4" />
    </button>
  );
};

export const MarketsView = ({
  markets,
  allMarkets,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onEdit,
  onStatus,
  saving,
}: {
  markets: AdminMarket[];
  allMarkets: AdminMarket[];
  search: string;
  setSearch: (value: string) => void;
  statusFilter: MarketStatusFilter;
  setStatusFilter: (value: MarketStatusFilter) => void;
  onEdit: (market: AdminMarket) => void;
  onStatus: (
    market: AdminMarket,
    status: string,
    outcome?: "YES" | "NO"
  ) => void;
  saving: boolean;
}) => {
  const tabs: Array<{ id: MarketStatusFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: allMarkets.length },
    {
      id: "active",
      label: "Live",
      count: allMarkets.filter((market) => market.status === "active").length,
    },
    {
      id: "ending_soon",
      label: "Ending soon",
      count: allMarkets.filter(
        (market) => market.status === "active" && isEndingSoon(market)
      ).length,
    },
    {
      id: "pending_resolution",
      label: "Pending",
      count: allMarkets.filter(
        (market) =>
          market.status === "pending_resolution" || market.status === "closed"
      ).length,
    },
    {
      id: "resolved",
      label: "Resolved",
      count: allMarkets.filter((market) => market.status === "resolved").length,
    },
    {
      id: "refunded",
      label: "Refunded",
      count: allMarkets.filter((market) => market.status === "refunded").length,
    },
    {
      id: "cancelled",
      label: "Cancelled",
      count: allMarkets.filter(
        (market) => market.status === "cancelled"
      ).length,
    },
    {
      id: "archived",
      label: "Archived",
      count: allMarkets.filter((market) => market.status === "archived").length,
    },
  ];

  return (
    <ShellCard>
      <SectionHeader
        eyebrow="Market operations"
        title="Markets"
        description="Review live, ending, pending, resolved, and archived markets with safe actions."
        action={
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search markets..."
              className="border-[#E5E7EB] bg-white pl-9 text-[#101828]"
            />
          </div>
        }
      />
      <div className="flex gap-2 overflow-x-auto border-b border-[#E5E7EB] px-6 py-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={classNames(
              "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition",
              statusFilter === tab.id
                ? "border-[#4F46E5] bg-[#4F46E5] text-[#FFFFFF]"
                : "border-[#E5E7EB] bg-white text-[#667085] hover:text-[#101828]"
            )}
          >
            {tab.label} <span className="ml-1 opacity-70">{tab.count}</span>
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="border-b border-[#E5E7EB] text-xs uppercase tracking-wide text-[#667085]">
            <tr>
              <th className="px-6 py-4">Market</th>
              <th>Status</th>
              <th>Prices</th>
              <th>Volume</th>
              <th>Trades</th>
              <th>Participants</th>
              <th>End time</th>
              <th>Resolution</th>
              <th className="pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {markets.map((market) => (
              <tr key={market.id} className="align-top hover:bg-[#F8F7F4]">
                <td className="px-6 py-4">
                  <p className="max-w-[360px] font-semibold leading-snug">
                    {market.question}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge>{categoryLabel(market.category)}</Badge>
                    {market.is_trending && <Badge tone="green">Trending</Badge>}
                  </div>
                </td>
                <td className="py-4">
                  <span
                    className={classNames(
                      "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                      statusClasses(market.status)
                    )}
                  >
                    {statusText(market.status)}
                  </span>
                </td>
                <td className="py-4">
                  <div className="text-[#4F46E5]">
                    {market.yes_label || "YES"} {Number(market.yes_price ?? 50)}%
                  </div>
                  <div className="text-[#E85D5D]">
                    {market.no_label || "NO"} {Number(market.no_price ?? 50)}%
                  </div>
                </td>
                <td className="py-4">{formatNaira(marketVolume(market))}</td>
                <td className="py-4">{Number(market.trade_count || 0)}</td>
                <td className="py-4">{Number(market.participant_count || 0)}</td>
                <td className="py-4 text-[#667085]">
                  {formatDate(market.close_date || market.closes_at)}
                </td>
                <td className="py-4 text-[#667085]">
                  {market.winning_outcome || market.resolved_outcome || "Not resolved"}
                </td>
                <td className="py-4 pr-6">
                  <div className="flex justify-end gap-1.5">
                    <ActionButton as={Link} to={`/market/${market.id}`} label="View market" icon={Eye} />
                    <ActionButton
                      label="Edit market"
                      icon={Edit}
                      onClick={() => onEdit(market)}
                      disabled={
                        Number(market.trade_count || 0) > 0 &&
                        market.status !== "draft"
                      }
                    />
                    {market.status === "active" && (
                      <ActionButton
                        label="Close market"
                        icon={Clock}
                        onClick={() => onStatus(market, "closed")}
                        disabled={saving}
                      />
                    )}
                    {(market.status === "pending_resolution" ||
                      market.status === "closed") && (
                      <>
                        <ActionButton
                          label="Resolve YES"
                          icon={CheckCircle}
                          tone="green"
                          onClick={() => onStatus(market, "resolved", "YES")}
                          disabled={saving}
                        />
                        <ActionButton
                          label="Resolve NO"
                          icon={XCircle}
                          tone="red"
                          onClick={() => onStatus(market, "resolved", "NO")}
                          disabled={saving}
                        />
                        <ActionButton
                          label="Refund protection"
                          icon={ShieldCheck}
                          onClick={() => onStatus(market, "refunded")}
                          disabled={saving}
                        />
                      </>
                    )}
                    {market.status !== "resolved" &&
                      market.status !== "refunded" &&
                      market.status !== "archived" && (
                        <ActionButton
                          label="Cancel market"
                          icon={Ban}
                          tone="red"
                          onClick={() => onStatus(market, "cancelled")}
                          disabled={saving}
                        />
                      )}
                    {(market.status === "resolved" || market.status === "refunded") && (
                      <ActionButton
                        label="Archive market"
                        icon={Archive}
                        onClick={() => onStatus(market, "archived")}
                        disabled={saving}
                      />
                    )}
                    {(market.status === "resolved" ||
                      market.status === "refunded" ||
                      market.status === "archived") && (
                      <ActionButton
                        label="Delete market - needs backend safety checks"
                        icon={Trash2}
                        tone="red"
                        disabled
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!markets.length && (
          <EmptyState
            title="No markets found"
            body="Change the filter or create a new market."
          />
        )}
      </div>
    </ShellCard>
  );
};

export const ResolutionCenterView = ({
  markets,
  onResolve,
  saving,
}: {
  markets: AdminMarket[];
  onResolve: (
    market: AdminMarket,
    status: string,
    outcome?: "YES" | "NO"
  ) => void;
  saving: boolean;
}) => {
  const pendingMarkets = markets.filter(
    (market) =>
      market.status === "pending_resolution" || market.status === "closed"
  );

  return (
    <ShellCard>
      <SectionHeader
        eyebrow="Resolution center"
        title="Markets waiting for settlement"
        description="Resolve only after checking the official source and payout preview."
      />
      <div className="divide-y divide-[#E5E7EB]">
        {pendingMarkets.map((market) => (
          <div
            key={market.id}
            className="grid gap-4 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px]"
          >
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge>{categoryLabel(market.category)}</Badge>
                <Badge tone="amber">{statusText(market.status)}</Badge>
              </div>
              <h3 className="text-lg font-semibold">{market.question}</h3>
              <p className="mt-2 text-sm text-[#667085]">
                Rules: {market.rules || market.description || "No rules provided."}
              </p>
              <p className="mt-1 text-sm text-[#667085]">
                Source: {market.resolution_source || "Not set"}
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="YES stake" value={formatNaira(metricValue(market.yes_pool_smallest_unit || 0))} />
                <Stat label="NO stake" value={formatNaira(metricValue(market.no_pool_smallest_unit || 0))} />
                <Stat label="Volume" value={formatNaira(marketVolume(market))} />
                <Stat label="Trades" value={Number(market.trade_count || 0)} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  className="bg-[#4F46E5] text-white hover:bg-[#4338CA]"
                  disabled={saving}
                  onClick={() => onResolve(market, "resolved", "YES")}
                >
                  YES won
                </Button>
                <Button
                  className="bg-[#E85D5D] text-white hover:bg-[#D14D4D]"
                  disabled={saving}
                  onClick={() => onResolve(market, "resolved", "NO")}
                >
                  NO won
                </Button>
              </div>
            </div>
          </div>
        ))}
        {!pendingMarkets.length && (
          <EmptyState
            title="No markets need resolution"
            body="Closed markets will appear here before payout."
          />
        )}
      </div>
    </ShellCard>
  );
};

export type ResolutionConfirmModalProps = {
  state: ResolutionState;
  source: string;
  note: string;
  confirmed: boolean;
  saving: boolean;
  setSource: (value: string) => void;
  setNote: (value: string) => void;
  setConfirmed: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export const ResolutionConfirmModal = ({
  state,
  source,
  note,
  confirmed,
  saving,
  setSource,
  setNote,
  setConfirmed,
  onClose,
  onConfirm,
}: ResolutionConfirmModalProps) => {
  const summary = state.preview;
  const positions = state.preview?.positions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
        <SectionHeader
          eyebrow="Final confirmation"
          title={`Resolve as ${state.outcome}`}
          description="This action settles positions and can trigger wallet payouts."
          action={
            <Button variant="ghost" onClick={onClose} className="text-[#667085]">
              Close
            </Button>
          }
        />
        <div className="space-y-5 p-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-sm text-[#667085]">Market</p>
            <p className="mt-1 font-semibold">{state.market.question}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="YES stake" value={formatNaira(Number(summary?.totalYesStake || 0))} />
            <Stat label="NO stake" value={formatNaira(Number(summary?.totalNoStake || 0))} />
            <Stat label="Winning stake" value={formatNaira(Number(summary?.totalWinningStake || 0))} />
            <Stat label="Winning shares" value={Number(summary?.totalWinningShares || 0).toFixed(2)} />
            <Stat label="Winners" value={Number(summary?.totalWinners || 0)} />
            <Stat label="Losers" value={Number(summary?.totalLosers || 0)} />
            <Stat label="Estimated payout" value={formatNaira(Number(summary?.totalPayout || 0))} />
            <Stat label="Platform fee" value={formatNaira(Number(summary?.platformFee || 0))} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Resolution source" required>
              <Input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="border-[#E5E7EB] bg-white text-[#101828]"
                placeholder="Official source URL or name"
              />
            </Field>
            <Field label="Resolution note">
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="border-[#E5E7EB] bg-white text-[#101828]"
                placeholder="Internal note"
              />
            </Field>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white text-xs uppercase tracking-wide text-[#667085]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th>Side</th>
                  <th>Stake</th>
                  <th>Payout</th>
                  <th>Profit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {positions.slice(0, 40).map((position) => (
                  <tr key={position.id} className="hover:bg-[#F8F7F4]">
                    <td className="px-4 py-3">
                      {position.username || position.email || position.user_id || "User"}
                    </td>
                    <td>{position.side}</td>
                    <td>{formatNaira(Number(position.stake || 0))}</td>
                    <td>{formatNaira(Number(position.payout || 0))}</td>
                    <td>{formatNaira(Number(position.profit || 0))}</td>
                    <td>
                      <Badge tone={position.side === state.outcome ? "green" : "red"}>
                        {position.side === state.outcome ? "Winner" : "Lost"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1"
            />
            <span>
              I have checked the resolution source and understand that this can
              settle wallets and should not be run twice.
            </span>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" className="border-[#E5E7EB] bg-white text-[#101828]" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-[#4F46E5] text-[#FFFFFF] hover:bg-[#4338CA]"
              onClick={onConfirm}
              disabled={!confirmed || !source.trim() || saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalize resolution
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export type DangerConfirmModalProps = {
  state: DangerState;
  deleteText: string;
  saving: boolean;
  setDeleteText: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export const DangerConfirmModal = ({
  state,
  deleteText,
  saving,
  setDeleteText,
  onClose,
  onConfirm,
}: DangerConfirmModalProps) => {
  const isDelete = state.action === "delete";
  const actionText = statusText(state.action);
  const canConfirm = !isDelete || deleteText === "DELETE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
        <SectionHeader
          eyebrow="Safety confirmation"
          title={`${actionText} market`}
          description="Dangerous admin actions require explicit confirmation."
        />
        <div className="space-y-5 p-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-sm text-[#667085]">Market</p>
            <p className="mt-1 font-semibold">{state.market.question}</p>
          </div>
          <p className="text-sm text-[#344054]">
            {state.action === "close" &&
              "Closing moves the market to pending resolution and disables new predictions."}
            {state.action === "cancel" &&
              "Cancelling should only happen when the market cannot be fairly resolved."}
            {state.action === "refund" &&
              "Refund protection returns eligible stakes because the market did not reach enough activity before close."}
            {state.action === "archive" &&
              "Archiving removes the market from active operations while preserving records."}
            {state.action === "delete" &&
              "Delete is disabled until backend safety checks verify payouts and disputes."}
          </p>
          {isDelete && (
            <Field label='Type "DELETE" to continue'>
              <Input
                value={deleteText}
                onChange={(event) => setDeleteText(event.target.value)}
                className="border-[#E5E7EB] bg-white text-[#101828]"
              />
            </Field>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" className="border-[#E5E7EB] bg-white text-[#101828]" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-[#E85D5D] text-white hover:bg-[#D14D4D]"
              disabled={!canConfirm || saving}
              onClick={onConfirm}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
