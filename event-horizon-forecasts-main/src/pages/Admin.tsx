import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { DelayedFlippeLoader } from "@/components/FlippeBrand";
import { useAuth } from "@/lib/auth";
import { normalizeCategory } from "@/lib/categories";
import {
  apiService,
  type AdminCreateMarketInput,
  type AdminMarket,
} from "@/lib/api";
import {
  ADMIN_MEDIA_MAX_BYTES,
  ADMIN_MEDIA_TYPES,
  type AdminUser,
  type DangerState,
  type MarketForm,
  type MarketStatusFilter,
  type ResolutionState,
} from "@/components/admin/types";
import { emptyForm } from "@/components/admin/types";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStats } from "@/components/admin/AdminStats";
import {
  MarketsView,
  ResolutionCenterView,
  ResolutionConfirmModal,
  DangerConfirmModal,
} from "@/components/admin/MarketManagement";
import MarketFormView from "@/components/admin/MarketForm";
import {
  UsersView,
  AddAdminView,
  AdminRolesErrorBoundary,
} from "@/components/admin/UserManagement";
import {
  FinanceView,
  TransactionsView,
} from "@/components/admin/FinanceManagement";
import {
  ReportsView,
  AdminSettingsView,
} from "@/components/admin/ReportsSettings";
import type {
  AdminRecord,
  AdminView,
  Analytics,
  DashboardMetrics,
  FinanceOverview,
  MarketForm as MarketFormType,
  ResolutionPreview,
} from "@/components/admin/types";
import {
  categoryLabel,
  dateTimeLocalToIso,
  getErrorMessage,
  isEndingSoon,
  isToday,
  koboToNaira,
  labelsForKind,
  marketKindFromLabels,
  marketVolume,
  metricValue,
  normalizeAdminList,
  toDateTimeLocal,
} from "@/components/admin/utils";

const Admin = () => {
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<AdminView>("dashboard");
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [financeOverview, setFinanceOverview] =
    useState<FinanceOverview | null>(null);
  const [depositQueue, setDepositQueue] = useState<any[]>([]);
  const [withdrawalQueue, setWithdrawalQueue] = useState<any[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MarketFormType>(emptyForm);
  const [editingMarket, setEditingMarket] = useState<AdminMarket | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MarketStatusFilter>("all");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [resolutionState, setResolutionState] =
    useState<ResolutionState | null>(null);
  const [resolutionSource, setResolutionSource] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolutionConfirmed, setResolutionConfirmed] = useState(false);
  const [dangerState, setDangerState] = useState<DangerState | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [financeBusyId, setFinanceBusyId] = useState<string | null>(null);
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [adminRolesLoading, setAdminRolesLoading] = useState(false);
  const [adminRolesError, setAdminRolesError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    if (!isAdmin) {
      navigate("/");
    }
  }, [authLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (view !== "add-admin") return;
  }, [view]);

  const loadData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const marketResult = await apiService.listAdminMarkets({
        status: "all",
        limit: 100,
      });
      setMarkets(marketResult.markets || []);

      if (isSuperAdmin) {
        setAdminRolesLoading(true);
        setAdminRolesError(null);
        const [
          analyticsResult,
          adminResult,
          userResult,
          transactionResult,
          overviewResult,
          depositResult,
          withdrawalResult,
          financeLedgerResult,
        ] = await Promise.allSettled([
          apiService.getAnalytics(),
          apiService.listAdmins(),
          apiService.listAdminUsers(),
          apiService.listAdminTransactions(),
          apiService.getAdminFinanceOverview(),
          apiService.listAdminFinanceDeposits("pending"),
          apiService.listAdminFinanceWithdrawals("pending"),
          apiService.listAdminFinanceTransactions({ status: "all" }),
        ]);

        if (analyticsResult.status === "fulfilled")
          setAnalytics(analyticsResult.value);
        if (adminResult.status === "fulfilled") {
          const adminList = normalizeAdminList(adminResult.value);
          setAdmins(adminList);
          setAdminRolesError(null);
        } else {
          const message = getErrorMessage(adminResult.reason);
          setAdmins([]);
          setAdminRolesError(message);
        }
        if (userResult.status === "fulfilled")
          setUsers(userResult.value.users as AdminUser[]);
        if (transactionResult.status === "fulfilled")
          setTransactions(transactionResult.value.transactions);
        if (overviewResult.status === "fulfilled")
          setFinanceOverview(overviewResult.value.overview || {});
        if (depositResult.status === "fulfilled")
          setDepositQueue(depositResult.value.deposits || []);
        if (withdrawalResult.status === "fulfilled")
          setWithdrawalQueue(withdrawalResult.value.withdrawals || []);
        if (financeLedgerResult.status === "fulfilled")
          setFinanceTransactions(
            financeLedgerResult.value.transactions || []
          );
        setAdminRolesLoading(false);
      } else {
        setAdminRolesLoading(false);
      }
    } catch (error) {
      console.error("Admin data load failed", error);
      toast.error("Could not load admin data.");
      setAdminRolesLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isSuperAdmin]);

  const visibleMarkets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return markets.filter((market) => {
      const searchable = [
        market.question,
        market.category,
        market.status,
        market.resolution_source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchable.includes(term);
      if (!matchesSearch) return false;

      if (statusFilter === "all") return true;
      if (statusFilter === "ending_soon")
        return market.status === "active" && isEndingSoon(market);
      if (statusFilter === "cancelled")
        return market.status === "cancelled" || market.status === "paused";
      return market.status === statusFilter;
    });
  }, [markets, search, statusFilter]);

  const dashboardMetrics = useMemo((): DashboardMetrics => {
    const liveMarkets = markets.filter(
      (market) => market.status === "active"
    );
    const pendingResolution = markets.filter(
      (market) =>
        market.status === "pending_resolution" || market.status === "closed"
    );
    const resolvedMarkets = markets.filter(
      (market) => market.status === "resolved"
    );
    const todayPredictions =
      metricValue(analytics?.predictionsToday) ||
      transactions.filter((tx) => isToday(tx.created_at)).length;
    const todayVolume =
      metricValue(financeOverview?.todayPredictionVolume) ||
      koboToNaira(metricValue(analytics?.todayVolume));
    const pendingPayouts =
      metricValue(financeOverview?.pendingPayouts) ||
      metricValue(analytics?.pendingPayouts);
    const totalWalletBalance = metricValue(
      financeOverview?.totalUserBalances
    );
    const activeMarketMoney = liveMarkets.reduce(
      (sum, market) => sum + marketVolume(market),
      0
    );

    return {
      liveMarkets: liveMarkets.length,
      pendingResolution: pendingResolution.length,
      resolvedMarkets: resolvedMarkets.length,
      totalUsers:
        metricValue(analytics?.totalUsers) || users.length,
      activeUsersToday: metricValue(analytics?.activeUsersToday),
      newUsersToday: users.filter((adminUser) =>
        isToday(adminUser.created_at)
      ).length,
      usersWithPredictions: metricValue(analytics?.totalForecasts),
      todayPredictions,
      todayVolume,
      pendingPayouts,
      totalWalletBalance,
      activeMarketMoney,
    };
  }, [analytics, financeOverview, markets, transactions, users]);

  const resetForm = () => {
    setEditingMarket(null);
    setForm(emptyForm);
  };

  const startEdit = (market: AdminMarket) => {
    const hasPredictions =
      Number(market.trade_count || 0) > 0 ||
      Number(market.participant_count || 0) > 0;

    if (hasPredictions && market.status !== "draft") {
      toast.error(
        "This market already has predictions. Edit is locked for safety."
      );
      return;
    }

    setEditingMarket(market);
    setForm({
      question: market.question || "",
      category: categoryLabel(market.category),
      market_type: marketKindFromLabels(
        market.yes_label,
        market.no_label
      ),
      yes_label: market.yes_label || "YES",
      no_label: market.no_label || "NO",
      yes_price: Number(market.yes_price ?? 50),
      no_price: Number(market.no_price ?? 50),
      close_date: toDateTimeLocal(
        market.close_date || market.closes_at
      ),
      trading_close_at: toDateTimeLocal(
        market.trading_close_at ||
          market.close_date ||
          market.closes_at
      ),
      resolution_source: market.resolution_source || "",
      rules: market.rules || market.description || "",
      image_url: market.image_url || "",
      video_url: market.video_url || "",
      status: market.status || "active",
      is_trending: Boolean(market.is_trending),
      min_stake: koboToNaira(
        market.min_position_smallest_unit || 10000
      ),
      max_stake: koboToNaira(
        market.max_position_smallest_unit || 10000000
      ),
      protected_market_enabled:
        market.protected_market_enabled !== false,
      activation_threshold: koboToNaira(
        market.activation_threshold_smallest_unit || 1000000
      ),
      activation_yes_min: koboToNaira(
        market.activation_yes_min_smallest_unit || 200000
      ),
      activation_no_min: koboToNaira(
        market.activation_no_min_smallest_unit || 200000
      ),
      activation_min_participants: Number(
        market.activation_min_participants || 5
      ),
      protected_max_stake: koboToNaira(
        market.protected_max_stake_smallest_unit || 100000
      ),
    });
    setView("create");
  };

  const updateForm = (
    field: keyof MarketFormType,
    value: string | number | boolean
  ) => {
    setForm((current) => {
      if (field === "market_type") {
        const labels = labelsForKind(value as any);
        return {
          ...current,
          market_type: value as string,
          yes_label: labels.yes,
          no_label: labels.no,
        };
      }

      if (field === "yes_price") {
        const yesPrice = Number(value);
        return {
          ...current,
          yes_price: yesPrice,
          no_price: Math.max(1, Math.min(99, 100 - yesPrice)),
        };
      }

      if (field === "no_price") {
        const noPrice = Number(value);
        return {
          ...current,
          no_price: noPrice,
          yes_price: Math.max(1, Math.min(99, 100 - noPrice)),
        };
      }

      return { ...current, [field]: value };
    });
  };

  const buildMarketPayload = (): AdminCreateMarketInput => {
    const closeDateIso = dateTimeLocalToIso(form.close_date);
    const tradingCloseIso = dateTimeLocalToIso(
      form.trading_close_at || form.close_date
    );
    const resolutionDateIso = closeDateIso
      ? new Date(
          new Date(closeDateIso).getTime() + 60_000
        ).toISOString()
      : closeDateIso;

    return {
      question: form.question.trim(),
      category: normalizeCategory(form.category),
      market_type: "binary",
      yes_label: form.yes_label,
      no_label: form.no_label,
      yes_price: Number(form.yes_price),
      no_price: Number(form.no_price),
      starting_yes_price: Number(form.yes_price),
      starting_no_price: Number(form.no_price),
      close_date: closeDateIso,
      end_date: closeDateIso,
      trading_close_at: tradingCloseIso,
      trading_close_time: tradingCloseIso,
      resolution_date: resolutionDateIso,
      resolution_source: form.resolution_source.trim(),
      resolution_instructions: form.rules.trim(),
      description: form.rules.trim(),
      image_url: form.image_url.trim() || undefined,
      video_url: form.video_url.trim() || undefined,
      status: form.status === "draft" ? "draft" : "active",
      is_trending: Boolean(form.is_trending),
      min_position_smallest_unit: Math.round(
        Number(form.min_stake) * 100
      ),
      max_position_smallest_unit: Math.round(
        Number(form.max_stake) * 100
      ),
      protected_market_enabled: Boolean(
        form.protected_market_enabled
      ),
      activation_threshold_smallest_unit: Math.round(
        Number(form.activation_threshold) * 100
      ),
      activation_yes_min_smallest_unit: Math.round(
        Number(form.activation_yes_min) * 100
      ),
      activation_no_min_smallest_unit: Math.round(
        Number(form.activation_no_min) * 100
      ),
      activation_min_participants: Number(
        form.activation_min_participants
      ),
      protected_max_stake_smallest_unit: Math.round(
        Number(form.protected_max_stake) * 100
      ),
      currency: "NGN",
    };
  };

  const validateMarket = (): string | null => {
    if (!form.question.trim()) return "Market question is required.";
    if (!form.category.trim()) return "Category is required.";
    if (!form.close_date)
      return "End date and time is required.";
    if (new Date(form.close_date).getTime() <= Date.now())
      return "End date must be in the future.";
    if (
      form.trading_close_at &&
      new Date(form.trading_close_at).getTime() <= Date.now()
    )
      return "Trading close time must be in the future.";
    if (
      form.trading_close_at &&
      new Date(form.trading_close_at).getTime() >
        new Date(form.close_date).getTime()
    )
      return "Trading close time must be before or equal to the market end time.";
    if (!form.rules.trim()) return "Rules are required.";
    if (!form.resolution_source.trim())
      return "Resolution source is required.";
    if (!form.image_url.trim() && !form.video_url.trim())
      return "Add an image or video before publishing.";
    if (
      !Number.isFinite(Number(form.yes_price)) ||
      !Number.isFinite(Number(form.no_price))
    )
      return "YES and NO prices must be valid numbers.";
    if (
      Number(form.yes_price) < 1 ||
      Number(form.no_price) < 1 ||
      Number(form.yes_price) > 99 ||
      Number(form.no_price) > 99
    )
      return "YES and NO prices must be between 1 and 99.";
    if (
      Math.round(Number(form.yes_price) + Number(form.no_price)) !== 100
    )
      return "YES and NO prices must add up to 100.";
    if (Number(form.min_stake) <= 0)
      return "Minimum stake must be above zero.";
    if (Number(form.max_stake) <= Number(form.min_stake))
      return "Maximum stake must be greater than minimum stake.";
    if (form.protected_market_enabled) {
      if (Number(form.activation_threshold) <= 0)
        return "Activation threshold must be above zero.";
      if (
        Number(form.activation_yes_min) <= 0 ||
        Number(form.activation_no_min) <= 0
      )
        return "YES and NO activation minimums must be above zero.";
      if (Number(form.activation_min_participants) < 1)
        return "Minimum participants must be at least 1.";
      if (Number(form.protected_max_stake) <= 0)
        return "Protected max stake must be above zero.";
    }
    return null;
  };

  const saveMarket = async () => {
    const validation = validateMarket();
    if (validation) {
      toast.error(validation);
      return;
    }

    if (
      form.status === "active" &&
      !window.confirm(
        "Publish this market now? It will become visible to users immediately."
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const payload = buildMarketPayload();
      if (editingMarket) {
        await apiService.updateAdminMarket(editingMarket.id, payload);
        toast.success("Market updated.");
      } else {
        await apiService.createAdminMarket(payload);
        toast.success("Market created.");
      }
      resetForm();
      setView("markets");
      await loadData();
    } catch (error) {
      console.error("Save market failed", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save market."
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadMedia = async (file: File) => {
    if (!ADMIN_MEDIA_TYPES.includes(file.type)) {
      toast.error(
        "Upload a JPEG, PNG, GIF, WebP, MP4, WebM, or MOV file."
      );
      return;
    }

    if (file.size > ADMIN_MEDIA_MAX_BYTES) {
      toast.error("Media file must be under 30MB.");
      return;
    }

    setSaving(true);
    try {
      const result = await apiService.uploadMarketMedia(file);
      if (file.type.startsWith("video/")) {
        updateForm("video_url", result.url);
      } else {
        updateForm("image_url", result.url);
      }
      toast.success("Media uploaded.");
    } catch (error) {
      console.error("Upload failed", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not upload media."
      );
    } finally {
      setSaving(false);
    }
  };

  const beginStatusAction = async (
    market: AdminMarket,
    status: string,
    outcome?: "YES" | "NO"
  ) => {
    if (status === "resolved" && outcome) {
      setSaving(true);
      try {
        const previewResponse =
          await apiService.previewAdminMarketResolution(
            market.id,
            outcome
          );
        setResolutionState({
          market,
          outcome,
          preview: previewResponse.preview,
        });
        setResolutionSource(market.resolution_source || "");
        setResolutionNote("");
        setResolutionConfirmed(false);
      } catch (error) {
        console.error("Resolution preview failed", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load resolution preview."
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (status === "closed") {
      setDangerState({ market, action: "close" });
      return;
    }

    if (status === "cancelled") {
      setDangerState({ market, action: "cancel" });
      return;
    }

    if (status === "refunded") {
      setDangerState({ market, action: "refund" });
      return;
    }

    if (status === "archived") {
      setDangerState({ market, action: "archive" });
      return;
    }

    await updateMarketStatus(market, status);
  };

  const updateMarketStatus = async (
    market: AdminMarket,
    status: string
  ) => {
    setSaving(true);
    try {
      await apiService.updateAdminMarketStatus(market.id, { status });
      toast.success(`Market moved to ${status}.`);
      await loadData();
    } catch (error) {
      console.error("Market status update failed", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not change market status."
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDangerAction = async () => {
    if (!dangerState) return;

    if (dangerState.action === "delete") {
      toast.error(
        "Delete requires payout-complete and dispute checks in the backend. Archive this market instead."
      );
      setDangerState(null);
      setDeleteText("");
      return;
    }

    const statusByAction: Record<string, string> = {
      close: "pending_resolution",
      cancel: "cancelled",
      refund: "refunded",
      archive: "archived",
    };

    await updateMarketStatus(
      dangerState.market,
      statusByAction[dangerState.action]
    );
    setDangerState(null);
  };

  const confirmResolution = async () => {
    if (!resolutionState || !resolutionConfirmed) return;
    if (!resolutionSource.trim()) {
      toast.error("Resolution source is required.");
      return;
    }

    setSaving(true);
    try {
      await apiService.resolveAdminMarket(
        resolutionState.market.id,
        resolutionState.outcome,
        {
          resolutionSource: resolutionSource.trim(),
          resolutionNote: resolutionNote.trim(),
        }
      );
      toast.success(
        `Market resolved as ${resolutionState.outcome}.`
      );
      setResolutionState(null);
      setResolutionConfirmed(false);
      setResolutionSource("");
      setResolutionNote("");
      await loadData();
    } catch (error) {
      console.error("Market resolution failed", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not resolve market."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleFinanceAction = async (
    kind: "deposit" | "withdrawal",
    id: string,
    action: "approve" | "reject"
  ) => {
    const label = `${kind}-${id}-${action}`;
    const reason =
      action === "reject"
        ? window.prompt(
            `Add a reason for rejecting this ${kind}. This will be visible in the user's history.`
          ) || ""
        : "";
    if (action === "reject" && !reason.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }
    setFinanceBusyId(label);
    try {
      if (kind === "deposit") {
        if (action === "approve")
          await apiService.approveAdminDeposit(id);
        else await apiService.rejectAdminDeposit(id, reason);
      } else if (action === "approve") {
        await apiService.approveAdminWithdrawal(
          id,
          "Marked paid by admin"
        );
      } else {
        await apiService.rejectAdminWithdrawal(id, reason);
      }
      toast.success(
        `${kind === "deposit" ? "Deposit" : "Withdrawal"} ${action}d.`
      );
      await loadData();
    } catch (error) {
      console.error("Finance action failed", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Finance action failed."
      );
    } finally {
      setFinanceBusyId(null);
    }
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error("Enter an email address.");
      return;
    }
    setSaving(true);
    try {
      await apiService.addAdmin(newAdminEmail.trim());
      toast.success("Admin role added.");
      setNewAdminEmail("");
      await loadData();
    } catch (error) {
      console.error("Add admin failed", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not add admin role."
      );
    } finally {
      setSaving(false);
    }
  };

  const removeAdmin = async (admin: AdminRecord) => {
    if (!admin.id) {
      toast.error(
        "Cannot remove admin because the user ID is missing."
      );
      return;
    }
    if (
      !window.confirm(
        `Remove admin access for ${admin.email}?`
      )
    )
      return;
    setSaving(true);
    try {
      await apiService.removeAdmin(admin.id);
      toast.success("Admin role removed.");
      await loadData();
    } catch (error) {
      console.error("Remove admin failed", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not remove admin role."
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] text-[#101828]">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white px-8 py-7 shadow-[0_18px_52px_rgba(16,24,40,0.08)]">
            <DelayedFlippeLoader active label="Loading operations console" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      <AdminLayout
        view={view}
        setView={setView}
        isSuperAdmin={isSuperAdmin}
        loading={loading}
        authLoading={authLoading}
        onRefresh={() => void loadData()}
        onCreateMarket={() => {
          resetForm();
          setView("create");
        }}
      >
        {view === "dashboard" && (
          <AdminStats
            metrics={dashboardMetrics}
            markets={markets}
            users={users}
            financeOverview={financeOverview}
            loading={loading}
          />
        )}
        {view === "markets" && (
          <MarketsView
            markets={visibleMarkets}
            allMarkets={markets}
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onEdit={startEdit}
            onStatus={beginStatusAction}
            saving={saving}
          />
        )}
        {view === "create" && (
          <MarketFormView
            form={form}
            editingMarket={editingMarket}
            saving={saving}
            onChange={updateForm}
            onMediaUpload={uploadMedia}
            onSave={saveMarket}
            onReset={resetForm}
          />
        )}
        {view === "resolution" && (
          <ResolutionCenterView
            markets={markets}
            onResolve={beginStatusAction}
            saving={saving}
          />
        )}
        {view === "finance" && (
          <FinanceView
            overview={financeOverview}
            deposits={depositQueue}
            withdrawals={withdrawalQueue}
            transactions={financeTransactions}
            busyId={financeBusyId}
            onAction={handleFinanceAction}
          />
        )}
        {view === "transactions" && (
          <TransactionsView
            transactions={
              financeTransactions.length
                ? financeTransactions
                : transactions
            }
            filter={transactionFilter}
            setFilter={setTransactionFilter}
            search={transactionSearch}
            setSearch={setTransactionSearch}
          />
        )}
        {view === "users" && (
          <UsersView
            users={users}
            search={userSearch}
            setSearch={setUserSearch}
          />
        )}
        {view === "add-admin" && (
          <AdminRolesErrorBoundary>
            <AddAdminView
              admins={admins}
              email={newAdminEmail}
              setEmail={setNewAdminEmail}
              onAdd={addAdmin}
              onRemove={removeAdmin}
              saving={saving}
              loading={adminRolesLoading}
              error={adminRolesError}
              canManage={Boolean(isSuperAdmin)}
            />
          </AdminRolesErrorBoundary>
        )}
        {view === "reports" && (
          <ReportsView
            markets={markets}
            transactions={
              financeTransactions.length
                ? financeTransactions
                : transactions
            }
            metrics={dashboardMetrics}
          />
        )}
        {view === "settings" && <AdminSettingsView />}
      </AdminLayout>

      {resolutionState && (
        <ResolutionConfirmModal
          state={resolutionState}
          source={resolutionSource}
          note={resolutionNote}
          confirmed={resolutionConfirmed}
          saving={saving}
          setSource={setResolutionSource}
          setNote={setResolutionNote}
          setConfirmed={setResolutionConfirmed}
          onClose={() => setResolutionState(null)}
          onConfirm={confirmResolution}
        />
      )}

      {dangerState && (
        <DangerConfirmModal
          state={dangerState}
          deleteText={deleteText}
          saving={saving}
          setDeleteText={setDeleteText}
          onClose={() => {
            setDangerState(null);
            setDeleteText("");
          }}
          onConfirm={confirmDangerAction}
        />
      )}
    </>
  );
};

export default Admin;
