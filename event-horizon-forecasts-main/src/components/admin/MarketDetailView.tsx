import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Edit3,
  FileText,
  Gavel,
  Hash,
  Loader2,
  Pencil,
  RefreshCcw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

import { apiService, type AdminMarket } from "@/lib/api";
import type { ResolutionPreview } from "./types";
import {
  koboToNaira,
  formatNaira,
  formatDate,
  formatCountdown,
  statusLabel,
  statusColor,
  isEndingSoon,
  getErrorMessage,
} from "./utils";
import {
  Card,
  Badge,
  SectionHeader,
  EmptyState,
  ConfirmDialog,
  SkeletonCard,
  SelectField,
} from "./ui";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "archived", label: "Archived" },
];

const DESTRUCTIVE_STATUSES = new Set(["cancelled", "archived"]);

const RESOLVABLE_STATUSES = new Set(["closed", "pending_resolution"]);

const InfoRow = ({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`flex items-baseline justify-between gap-4 py-2 ${className}`}>
    <span className="text-xs font-semibold text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-900 text-right">{children}</span>
  </div>
);

export const MarketDetailView = ({
  marketId,
  onBack,
  onEdit,
}: {
  marketId: string;
  onBack: () => void;
  onEdit?: (marketId: string) => void;
}) => {
  const [market, setMarket] = useState<AdminMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [preview, setPreview] = useState<ResolutionPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState<"YES" | "NO" | null>(null);
  const [resolving, setResolving] = useState<"YES" | "NO" | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"YES" | "NO" | "REFUND" | "status" | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<"YES" | "NO" | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchMarket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getAdminMarket(marketId);
      if (!response.market) {
        setError("Market not found.");
      } else {
        setMarket(response.market);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const canResolve = market ? RESOLVABLE_STATUSES.has(market.status) : false;
  const isProtected = market?.protected_market_enabled || false;
  const activationState = market?.activation_state;

  const yesPercent = market ? Number(market.yes_price ?? 50) : 0;
  const noPercent = market ? Number(market.no_price ?? 50) : 0;

  const poolKobo = useMemo(
    () => koboToNaira(market?.pool_amount_smallest_unit || 0),
    [market]
  );
  const volumeKobo = useMemo(
    () => koboToNaira(market?.total_volume_smallest_unit || 0),
    [market]
  );

  const activationProgress = useMemo(() => {
    if (!market || !isProtected) return null;
    const threshold = koboToNaira(market.activation_threshold_smallest_unit || 0);
    const current = poolKobo;
    const percent = threshold > 0 ? Math.min(100, Math.round((current / threshold) * 100)) : 0;
    const minParticipants = market.activation_min_participants || 0;
    const currentParticipants = market.participant_count || 0;
    const participantsMet = currentParticipants >= minParticipants;
    const poolMet = percent >= 100;
    return { threshold, current, percent, minParticipants, currentParticipants, participantsMet, poolMet };
  }, [market, isProtected, poolKobo]);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
  };

  const handlePreview = async (outcome: "YES" | "NO") => {
    setPreviewLoading(outcome);
    setPreview(null);
    try {
      const result = await apiService.previewAdminMarketResolution(marketId, outcome);
      setPreview(result as ResolutionPreview);
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err));
    } finally {
      setPreviewLoading(null);
    }
  };

  const handleResolveClick = (outcome: "YES" | "NO") => {
    setPendingOutcome(outcome);
    setConfirmType(outcome);
    setConfirmOpen(true);
  };

  const handleRefundClick = () => {
    setConfirmType("REFUND");
    setConfirmOpen(true);
  };

  const handleStatusChange = (newStatus: string) => {
    if (DESTRUCTIVE_STATUSES.has(newStatus)) {
      setPendingStatus(newStatus);
      setConfirmType("status");
      setConfirmOpen(true);
    } else {
      applyStatusChange(newStatus);
    }
  };

  const applyStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await apiService.updateAdminMarketStatus(marketId, { status: newStatus });
      setMarket((prev) => (prev ? { ...prev, status: newStatus as AdminMarket["status"] } : prev));
      showToast("success", `Market status updated to ${statusLabel(newStatus)}`);
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err));
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
      setConfirmType(null);
      setPendingStatus(null);
    }
  };

  const executeResolve = async () => {
    if (!pendingOutcome) return;
    setActionLoading(true);
    setResolving(pendingOutcome);
    try {
      const result = await apiService.resolveAdminMarket(marketId, pendingOutcome);
      setMarket(result.market || market);
      setPreview(null);
      showToast("success", result.message || `Market resolved as ${pendingOutcome}`);
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err));
    } finally {
      setActionLoading(false);
      setResolving(null);
      setConfirmOpen(false);
      setConfirmType(null);
      setPendingOutcome(null);
    }
  };

  const executeRefund = async () => {
    setActionLoading(true);
    setRefundLoading(true);
    try {
      const result = await apiService.refundAdminMarket(marketId);
      setMarket(result.market || market);
      setPreview(null);
      showToast("success", "All eligible stakes have been refunded.");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err));
    } finally {
      setActionLoading(false);
      setRefundLoading(false);
      setConfirmOpen(false);
      setConfirmType(null);
    }
  };

  const handleConfirm = () => {
    if (confirmType === "YES" || confirmType === "NO") {
      executeResolve();
    } else if (confirmType === "REFUND") {
      executeRefund();
    } else if (confirmType === "status" && pendingStatus) {
      applyStatusChange(pendingStatus);
    }
  };

  const handleConfirmCancel = () => {
    setConfirmOpen(false);
    setConfirmType(null);
    setPendingOutcome(null);
    setPendingStatus(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Markets
        </button>
        <SkeletonCard />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Markets
        </button>
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Unable to load market"
          body={error || "Market not found."}
          action={
            <button
              onClick={fetchMarket}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 active:scale-[0.98]"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>
          }
        />
      </div>
    );
  }

  const confirmTitle =
    confirmType === "YES"
      ? "Resolve Market as YES"
      : confirmType === "NO"
        ? "Resolve Market as NO"
        : confirmType === "REFUND"
          ? "Refund All Eligible Stakes"
          : "Change Market Status";

  const confirmBody =
    confirmType === "YES" || confirmType === "NO"
      ? `This will settle the market in favor of ${confirmType}. All YES holders ${confirmType === "NO" ? "will lose" : "will be paid out"}. This action cannot be undone.`
      : confirmType === "REFUND"
        ? "This will refund all eligible stakes back to participants. This action cannot be undone."
        : `Are you sure you want to change the market status to "${statusLabel(pendingStatus || "")}"? This may affect market visibility.`;

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-[70] rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg transition-all ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="mr-2 inline h-4 w-4" />
          ) : (
            <XCircle className="mr-2 inline h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}

      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Markets
      </button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Badge>{market.category}</Badge>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${statusColor(market.status)}`}
              >
                {statusLabel(market.status)}
              </span>
              {market.is_trending && <Badge>Trending</Badge>}
              {isProtected && (
                <Badge>
                  <ShieldCheck className="mr-1 inline h-3 w-3" />
                  Protected
                </Badge>
              )}
            </div>

            <h1 className="text-xl font-black leading-snug text-gray-900 lg:text-2xl">
              {market.question}
            </h1>

            {market.description && (
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                {market.description}
              </p>
            )}

            <div className="mt-5 divide-y divide-gray-100 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-3">
                <InfoRow label="Created">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {formatDate(market.created_at)}
                  </span>
                </InfoRow>
                <InfoRow label="Close date">
                  {formatDate(market.trading_close_at || market.close_date)}
                </InfoRow>
                <InfoRow label="Time left">
                  {formatCountdown(market.trading_close_at || market.close_date)}
                </InfoRow>
                <InfoRow label="Pool">{formatNaira(poolKobo)}</InfoRow>
                <InfoRow label="Volume">{formatNaira(volumeKobo)}</InfoRow>
                <InfoRow label="YES%">{yesPercent}%</InfoRow>
                <InfoRow label="NO%">{noPercent}%</InfoRow>
                <InfoRow label="Participants">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {market.participant_count || 0}
                  </span>
                </InfoRow>
                <InfoRow label="Trades">
                  <span className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-gray-400" />
                    {market.trade_count || 0}
                  </span>
                </InfoRow>
              </div>
            </div>

            {(market.resolution_source || market.rules) && (
              <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                {market.resolution_source && (
                  <InfoRow label="Resolution source">
                    <span className="max-w-xs truncate" title={market.resolution_source}>
                      {market.resolution_source}
                    </span>
                  </InfoRow>
                )}
                {market.rules && (
                  <div className="py-2">
                    <span className="text-xs font-semibold text-gray-500">Rules</span>
                    <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">
                      {market.rules}
                    </p>
                  </div>
                )}
              </div>
            )}

            {market.winning_outcome && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700">
                <Gavel className="h-4 w-4" />
                Resolved: {market.winning_outcome}
              </div>
            )}
          </Card>

          {isProtected && activationProgress && (
            <Card>
              <SectionHeader
                title="Activation Progress"
                description="Protected market must meet thresholds before normal resolution."
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="text-xs font-semibold text-gray-500">Pool Target</div>
                  <div className="mt-1 text-lg font-black text-gray-900">
                    {activationProgress.percent}%
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {formatNaira(activationProgress.current)} / {formatNaira(activationProgress.threshold)}
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        activationProgress.poolMet ? "bg-emerald-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${activationProgress.percent}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="text-xs font-semibold text-gray-500">Participants</div>
                  <div className="mt-1 text-lg font-black text-gray-900">
                    {activationProgress.currentParticipants} / {activationProgress.minParticipants}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">minimum required</div>
                  <div className="mt-2">
                    {activationProgress.participantsMet ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <CheckCircle className="h-3.5 w-3.5" /> Met
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-600">Not yet met</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {canResolve && (
            <Card>
              <SectionHeader
                title="Resolution"
                description="Preview payout before finalizing. This action cannot be undone."
              />

              {isProtected &&
                activationProgress &&
                (!activationProgress.poolMet || !activationProgress.participantsMet) && (
                  <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>
                      This market has not reached activation requirements. Consider{" "}
                      <strong>REFUND</strong> instead of YES/NO resolution.
                    </span>
                  </div>
                )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handlePreview("YES")}
                  disabled={previewLoading !== null}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 active:scale-[0.98] disabled:opacity-50"
                >
                  {previewLoading === "YES" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Preview YES
                </button>
                <button
                  onClick={() => handlePreview("NO")}
                  disabled={previewLoading !== null}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 active:scale-[0.98] disabled:opacity-50"
                >
                  {previewLoading === "NO" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Preview NO
                </button>
                <button
                  onClick={handleRefundClick}
                  disabled={refundLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-100 active:scale-[0.98] disabled:opacity-50"
                >
                  {refundLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Refund
                </button>
              </div>

              {preview && (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
                      <div className="text-xs font-semibold text-gray-500">Winners</div>
                      <div className="mt-1 text-xl font-black text-emerald-600">
                        {preview.preview?.totalWinners || 0}
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
                      <div className="text-xs font-semibold text-gray-500">Losers</div>
                      <div className="mt-1 text-xl font-black text-red-500">
                        {preview.preview?.totalLosers || 0}
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
                      <div className="text-xs font-semibold text-gray-500">Total Payout</div>
                      <div className="mt-1 text-xl font-black text-gray-900">
                        {formatNaira(koboToNaira(preview.preview?.totalPayout || 0))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleResolveClick("YES")}
                      disabled={resolving !== null}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
                    >
                      {resolving === "YES" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Resolve YES
                    </button>
                    <button
                      onClick={() => handleResolveClick("NO")}
                      disabled={resolving !== null}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
                    >
                      {resolving === "NO" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Resolve NO
                    </button>
                  </div>

                  {preview.preview?.winners && preview.preview.winners.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-gray-100 bg-gray-50/80 uppercase tracking-wider text-gray-500">
                          <tr>
                            <th className="px-4 py-2.5">User</th>
                            <th>Side</th>
                            <th>Stake</th>
                            <th>Payout</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {preview.preview.winners.slice(0, 20).map((w, i) => (
                            <tr key={i} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2">{w.username || w.userId?.slice(0, 8) || "—"}</td>
                              <td>
                                <Badge
                                  variant={
                                    w.side === "YES"
                                      ? "info"
                                      : "danger"
                                  }
                                >
                                  {w.side}
                                </Badge>
                              </td>
                              <td>{formatNaira(koboToNaira(w.stake))}</td>
                              <td className="font-bold text-emerald-600">
                                {formatNaira(koboToNaira(w.payout))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {!canResolve && market.status === "resolved" && (
            <Card>
              <SectionHeader
                title="Resolution Complete"
                description="This market has already been resolved."
              />
              <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700">
                <Gavel className="h-4 w-4" />
                Winning outcome: {market.winning_outcome || market.outcome || "N/A"}
              </div>
              {market.resolution_date && (
                <p className="mt-2 text-xs text-gray-500">
                  Resolved on {formatDate(market.resolution_date)}
                </p>
              )}
            </Card>
          )}

          {market.status === "refunded" && (
            <Card>
              <SectionHeader
                title="Refund Complete"
                description="All eligible stakes have been returned to participants."
              />
              <div className="flex items-center gap-3 rounded-xl bg-purple-50 px-4 py-3 text-sm font-bold text-purple-700">
                <ShieldCheck className="h-4 w-4" />
                This market has been refunded.
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <SectionHeader title="Manage" />
            <div className="space-y-4">
              {onEdit && !isProtected && (
                <button
                  onClick={() => onEdit(marketId)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Market Details
                </button>
              )}
              <SelectField
                label="Market Status"
                value={market.status}
                onChange={handleStatusChange}
                options={STATUS_OPTIONS}
              />
              {actionLoading && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Updating...
                </div>
              )}
            </div>
          </Card>

          <Card>
            <SectionHeader title="Quick Info" />
            <div className="divide-y divide-gray-100">
              <InfoRow label="ID">
                <span className="max-w-[140px] truncate font-mono text-xs" title={market.id}>
                  {market.id}
                </span>
              </InfoRow>
              <InfoRow label="Type">{market.market_type || "binary"}</InfoRow>
              <InfoRow label="Currency">{market.currency || "NGN"}</InfoRow>
              <InfoRow label="YES label">{market.yes_label || "YES"}</InfoRow>
              <InfoRow label="NO label">{market.no_label || "NO"}</InfoRow>
              {market.min_position_smallest_unit && (
                <InfoRow label="Min stake">
                  {formatNaira(koboToNaira(market.min_position_smallest_unit))}
                </InfoRow>
              )}
              {market.max_position_smallest_unit && (
                <InfoRow label="Max stake">
                  {formatNaira(koboToNaira(market.max_position_smallest_unit))}
                </InfoRow>
              )}
              {market.seed_liquidity_yes_smallest_unit !== undefined && (
                <InfoRow label="Seed YES">
                  {formatNaira(koboToNaira(market.seed_liquidity_yes_smallest_unit))}
                </InfoRow>
              )}
              {market.seed_liquidity_no_smallest_unit !== undefined && (
                <InfoRow label="Seed NO">
                  {formatNaira(koboToNaira(market.seed_liquidity_no_smallest_unit))}
                </InfoRow>
              )}
              {market.created_by && (
                <InfoRow label="Created by">
                  <span className="max-w-[100px] truncate text-xs" title={market.created_by}>
                    {market.created_by.slice(0, 8)}...
                  </span>
                </InfoRow>
              )}
              <InfoRow label="Updated">{formatDate(market.updated_at)}</InfoRow>
            </div>
          </Card>

          {market.activation_state && (
            <Card>
              <SectionHeader title="Activation State" />
              <InfoRow label="State">
                <Badge
                  variant={
                    activationState === "live"
                      ? "success"
                      : activationState === "resolved"
                        ? "info"
                        : activationState === "refunded"
                          ? "warning"
                          : "default"
                  }
                >
                  {statusLabel(activationState)}
                </Badge>
              </InfoRow>
              {market.activated_at && (
                <InfoRow label="Activated">{formatDate(market.activated_at)}</InfoRow>
              )}
              {market.refunded_at && (
                <InfoRow label="Refunded">{formatDate(market.refunded_at)}</InfoRow>
              )}
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        body={confirmBody}
        confirmLabel={
          confirmType === "YES" || confirmType === "NO"
            ? `Resolve ${confirmType}`
            : confirmType === "REFUND"
              ? "Refund All"
              : "Update Status"
        }
        confirmVariant={
          confirmType === "REFUND"
            ? "warning"
            : confirmType === "YES"
              ? "primary"
              : "danger"
        }
        onConfirm={handleConfirm}
        onCancel={handleConfirmCancel}
        loading={actionLoading}
      />
    </div>
  );
};
