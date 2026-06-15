import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Ban,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  Lock,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  ShieldPlus,
  Trash2,
  Upload,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  apiService,
  type AdminCreateMarketInput,
  type AdminMarket,
  type ApiTransaction,
  type DepositRequest,
  type UserRole,
  type WithdrawalRequest,
} from "@/lib/api";
import {
  ADMIN_MARKET_CATEGORIES,
  getCategoryLabel,
  normalizeCategory,
} from "@/lib/categories";
import { formatNaira } from "@/lib/markets";

type AdminView =
  | "dashboard"
  | "markets"
  | "create"
  | "resolution"
  | "finance"
  | "transactions"
  | "users"
  | "add-admin"
  | "reports"
  | "settings";

type MarketKind = "YES/NO" | "UP/DOWN" | "Bigger/Smaller";
type MarketStatusFilter =
  | "all"
  | "active"
  | "ending_soon"
  | "pending_resolution"
  | "resolved"
  | "cancelled"
  | "archived";

type AdminUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  created_at?: string;
  last_login_at?: string;
  last_active_at?: string;
  status?: string;
  wallet_balance?: number;
  active_positions?: number;
  total_predictions?: number;
  total_volume?: number;
};

type AdminRecord = AdminUser & {
  isPrimary?: boolean;
  added_by?: string;
  added_at?: string;
};

type Analytics = Awaited<ReturnType<typeof apiService.getAnalytics>>;
type FinanceOverview = Record<string, number>;
type FinanceTransaction = ApiTransaction;
type ResolutionPreview = Awaited<
  ReturnType<typeof apiService.previewAdminMarketResolution>
>["preview"];

type ResolutionState = {
  market: AdminMarket;
  outcome: "YES" | "NO";
  preview: ResolutionPreview | null;
};

type DangerAction = "close" | "cancel" | "archive" | "delete";

type DangerState = {
  market: AdminMarket;
  action: DangerAction;
};

const emptyForm = {
  question: "",
  category: "Sports",
  market_type: "binary",
  yes_label: "YES",
  no_label: "NO",
  yes_price: 50,
  no_price: 50,
  close_date: "",
  trading_close_at: "",
  resolution_source: "",
  rules: "",
  image_url: "",
  video_url: "",
  status: "active",
  is_trending: false,
  min_stake: 100,
  max_stake: 100000,
};

const navItems: Array<{
  id: AdminView;
  label: string;
  hint: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    hint: "Platform health",
    icon: LayoutDashboard,
  },
  { id: "markets", label: "Markets", hint: "Operate markets", icon: BarChart3 },
  { id: "create", label: "Create Market", hint: "Publish safely", icon: Plus },
  {
    id: "resolution",
    label: "Resolution",
    hint: "Settle outcomes",
    icon: CheckCircle,
  },
  { id: "finance", label: "Finance", hint: "Deposits and withdrawals", icon: Wallet },
  {
    id: "transactions",
    label: "Transactions",
    hint: "Ledger search",
    icon: ReceiptText,
  },
  { id: "users", label: "Users", hint: "Account visibility", icon: Users },
  { id: "add-admin", label: "Admin Roles", hint: "Access control", icon: ShieldPlus },
  { id: "reports", label: "Reports", hint: "Operational reports", icon: FileText },
  { id: "settings", label: "Settings", hint: "Platform controls", icon: SettingsIcon },
];

const koboToNaira = (value?: number | null) => Number(value || 0) / 100;

const marketVolume = (market: AdminMarket) =>
  koboToNaira(
    market.total_volume_smallest_unit ??
      market.pool_amount_smallest_unit ??
      market.total_pool_smallest_unit ??
      0
  );

const formatDate = (value?: string | null) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatShortDate = (value?: string | null) => {
  if (!value) return "Not tracked";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not tracked";
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusText = (status?: string | null) => {
  if (!status) return "Draft";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const statusClasses = (status?: string | null) => {
  switch (status) {
    case "active":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "pending_resolution":
    case "closed":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "resolved":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "cancelled":
    case "archived":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
};

const categoryLabel = (category?: string | null) =>
  getCategoryLabel(normalizeCategory(category || "Other"));

const isEndingSoon = (market: AdminMarket) => {
  const closeDate = new Date(market.close_date || market.closes_at || "");
  if (Number.isNaN(closeDate.getTime())) return false;
  const diff = closeDate.getTime() - Date.now();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
};

const marketKindFromLabels = (yes?: string | null, no?: string | null): MarketKind => {
  const y = (yes || "").toLowerCase();
  const n = (no || "").toLowerCase();
  if (y === "up" || n === "down") return "UP/DOWN";
  if (y === "bigger" || n === "smaller") return "Bigger/Smaller";
  return "YES/NO";
};

const labelsForKind = (kind: MarketKind) => {
  if (kind === "UP/DOWN") return { yes: "UP", no: "DOWN" };
  if (kind === "Bigger/Smaller") return { yes: "BIGGER", no: "SMALLER" };
  return { yes: "YES", no: "NO" };
};

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

const metricValue = (value: number | undefined | null) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

const isToday = (value?: string | null) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const requestUserLabel = (item: DepositRequest | WithdrawalRequest) =>
  item.user?.email ||
  item.user?.username ||
  item.userId ||
  "Unknown user";

const txDate = (tx: ApiTransaction | FinanceTransaction) =>
  (tx as any).createdAt || (tx as any).created_at || "";

const txUserLabel = (tx: ApiTransaction | FinanceTransaction) =>
  (tx as any).userEmail ||
  (tx as any).userUsername ||
  (tx as any).user_email ||
  (tx as any).user?.email ||
  (tx as any).userId ||
  (tx as any).user_id ||
  "Unknown";

const txReference = (tx: ApiTransaction | FinanceTransaction) =>
  (tx as any).reference || (tx as any).referenceId || (tx as any).reference_id || "-";

const txMarketLabel = (tx: ApiTransaction | FinanceTransaction) =>
  (tx as any).marketQuestion ||
  (tx as any).market_question ||
  (tx as any).metadata?.marketQuestion ||
  (tx as any).metadata?.market_question ||
  (tx as any).marketId ||
  (tx as any).market_id ||
  "-";

const Admin = () => {
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<AdminView>("dashboard");
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [financeOverview, setFinanceOverview] =
    useState<FinanceOverview | null>(null);
  const [depositQueue, setDepositQueue] = useState<DepositRequest[]>([]);
  const [withdrawalQueue, setWithdrawalQueue] = useState<WithdrawalRequest[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<
    FinanceTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingMarket, setEditingMarket] = useState<AdminMarket | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MarketStatusFilter>("all");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [resolutionState, setResolutionState] = useState<ResolutionState | null>(
    null
  );
  const [resolutionSource, setResolutionSource] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolutionConfirmed, setResolutionConfirmed] = useState(false);
  const [dangerState, setDangerState] = useState<DangerState | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [financeBusyId, setFinanceBusyId] = useState<string | null>(null);
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

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
        if (adminResult.status === "fulfilled")
          setAdmins(adminResult.value as AdminRecord[]);
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
          setFinanceTransactions(financeLedgerResult.value.transactions || []);
      }
    } catch (error) {
      console.error("Admin data load failed", error);
      toast.error("Could not load admin data.");
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

  const dashboardMetrics = useMemo(() => {
    const liveMarkets = markets.filter((market) => market.status === "active");
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
    const totalWalletBalance = metricValue(financeOverview?.totalUserBalances);
    const activeMarketMoney = liveMarkets.reduce(
      (sum, market) => sum + marketVolume(market),
      0
    );

    return {
      liveMarkets: liveMarkets.length,
      pendingResolution: pendingResolution.length,
      resolvedMarkets: resolvedMarkets.length,
      totalUsers: metricValue(analytics?.totalUsers) || users.length,
      activeUsersToday: metricValue(analytics?.activeUsersToday),
      newUsersToday: users.filter((adminUser) => isToday(adminUser.created_at))
        .length,
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
      market_type: marketKindFromLabels(market.yes_label, market.no_label),
      yes_label: market.yes_label || "YES",
      no_label: market.no_label || "NO",
      yes_price: Number(market.yes_price ?? 50),
      no_price: Number(market.no_price ?? 50),
      close_date: toDateTimeLocal(market.close_date || market.closes_at),
      trading_close_at: toDateTimeLocal(market.trading_close_at || market.close_date || market.closes_at),
      resolution_source: market.resolution_source || "",
      rules: market.rules || market.description || "",
      image_url: market.image_url || "",
      video_url: market.video_url || "",
      status: market.status || "active",
      is_trending: Boolean(market.is_trending),
      min_stake: koboToNaira(market.min_position_smallest_unit || 10000),
      max_stake: koboToNaira(market.max_position_smallest_unit || 10000000),
    });
    setView("create");
  };

  const updateForm = (
    field: keyof typeof emptyForm,
    value: string | number | boolean
  ) => {
    setForm((current) => {
      if (field === "market_type") {
        const labels = labelsForKind(value as MarketKind);
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

  const buildMarketPayload = (): AdminCreateMarketInput => ({
    question: form.question.trim(),
    category: normalizeCategory(form.category),
    market_type: form.market_type,
    yes_label: form.yes_label,
    no_label: form.no_label,
    yes_price: Number(form.yes_price),
    no_price: Number(form.no_price),
    close_date: form.close_date,
    trading_close_at: form.trading_close_at || form.close_date,
    resolution_date: form.close_date ? new Date(new Date(form.close_date).getTime() + 60_000).toISOString() : form.close_date,
    resolution_source: form.resolution_source.trim(),
    rules: form.rules.trim(),
    description: form.rules.trim(),
    image_url: form.image_url.trim() || undefined,
    video_url: form.video_url.trim() || undefined,
    status: form.status,
    is_trending: Boolean(form.is_trending),
    min_position_smallest_unit: Math.round(Number(form.min_stake) * 100),
    max_position_smallest_unit: Math.round(Number(form.max_stake) * 100),
  });

  const validateMarket = () => {
    if (!form.question.trim()) return "Market question is required.";
    if (!form.category.trim()) return "Category is required.";
    if (!form.close_date) return "End date and time is required.";
    if (new Date(form.close_date).getTime() <= Date.now())
      return "End date must be in the future.";
    if (form.trading_close_at && new Date(form.trading_close_at).getTime() <= Date.now())
      return "Trading close time must be in the future.";
    if (form.trading_close_at && new Date(form.trading_close_at).getTime() > new Date(form.close_date).getTime())
      return "Trading close time must be before or equal to the market end time.";
    if (!form.rules.trim()) return "Rules are required.";
    if (!form.resolution_source.trim())
      return "Resolution source is required.";
    if (!form.image_url.trim() && !form.video_url.trim())
      return "Add an image or video before publishing.";
    if (Number(form.yes_price) + Number(form.no_price) !== 100)
      return "YES and NO prices must add up to 100.";
    if (Number(form.min_stake) <= 0) return "Minimum stake must be above zero.";
    if (Number(form.max_stake) < Number(form.min_stake))
      return "Maximum stake must be greater than minimum stake.";
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
        error instanceof Error ? error.message : "Could not save market."
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadMedia = async (file: File) => {
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
      toast.error("Could not upload media.");
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
        const previewResponse = await apiService.previewAdminMarketResolution(
          market.id,
          outcome
        );
        setResolutionState({ market, outcome, preview: previewResponse.preview });
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

    if (status === "archived") {
      setDangerState({ market, action: "archive" });
      return;
    }

    await updateMarketStatus(market, status);
  };

  const updateMarketStatus = async (market: AdminMarket, status: string) => {
    setSaving(true);
    try {
      await apiService.updateAdminMarketStatus(market.id, { status });
      toast.success(`Market moved to ${statusText(status)}.`);
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

    const statusByAction: Record<Exclude<DangerAction, "delete">, string> = {
      close: "pending_resolution",
      cancel: "cancelled",
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
      toast.success(`Market resolved as ${resolutionState.outcome}.`);
      setResolutionState(null);
      setResolutionConfirmed(false);
      setResolutionSource("");
      setResolutionNote("");
      await loadData();
    } catch (error) {
      console.error("Market resolution failed", error);
      toast.error(
        error instanceof Error ? error.message : "Could not resolve market."
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
    setFinanceBusyId(label);
    try {
      if (kind === "deposit") {
        if (action === "approve") await apiService.approveAdminDeposit(id);
        else await apiService.rejectAdminDeposit(id);
      } else if (action === "approve") {
        await apiService.approveAdminWithdrawal(id);
      } else {
        await apiService.rejectAdminWithdrawal(id);
      }
      toast.success(`${kind === "deposit" ? "Deposit" : "Withdrawal"} ${action}d.`);
      await loadData();
    } catch (error) {
      console.error("Finance action failed", error);
      toast.error(
        error instanceof Error ? error.message : "Finance action failed."
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
        error instanceof Error ? error.message : "Could not add admin role."
      );
    } finally {
      setSaving(false);
    }
  };

  const removeAdmin = async (email: string) => {
    if (!window.confirm(`Remove admin access for ${email}?`)) return;
    setSaving(true);
    try {
      await apiService.removeAdmin(email);
      toast.success("Admin role removed.");
      await loadData();
    } catch (error) {
      console.error("Remove admin failed", error);
      toast.error(
        error instanceof Error ? error.message : "Could not remove admin role."
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#080C10] text-[#F5F7FA]">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center">
          <div className="flex items-center gap-3 rounded-xl border border-[#263241] bg-[#101720] px-5 py-4 text-sm text-[#8B98A8]">
            <Loader2 className="h-5 w-5 animate-spin text-[#12B886]" />
            Loading operations console
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#080C10] text-[#F5F7FA]">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-[#263241] bg-[#0B1118] px-5 py-6 xl:block">
        <div className="flex h-full min-h-0 flex-col">
          <div className="mb-8 flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#12B886] text-[#080C10]">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">Flippe Admin</p>
              <p className="text-sm text-[#8B98A8]">
                {isSuperAdmin ? "Super admin console" : "Admin console"}
              </p>
            </div>
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-color:#263241_transparent]">
            {navItems
              .filter((item) => isSuperAdmin || item.id !== "add-admin")
              .map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={classNames(
                      "group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition",
                      active
                        ? "bg-[#151E28] text-white shadow-[inset_3px_0_0_#12B886]"
                        : "text-[#8B98A8] hover:bg-[#101720] hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block text-xs text-[#64748B]">{item.hint}</span>
                    </span>
                    {active && <ChevronRight className="h-4 w-4 text-[#12B886]" />}
                  </button>
                );
              })}
          </nav>
        </div>
      </aside>

      <div className="xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-[#263241] bg-[#080C10]/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#12B886]">
                Operations
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {navItems.find((item) => item.id === view)?.label || "Dashboard"}
              </h1>
              <p className="mt-1 text-sm text-[#8B98A8]">
                Real platform controls for markets, users, finance, and risk.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-[#263241] bg-[#101720] text-[#F5F7FA] hover:bg-[#151E28]"
                onClick={() => void loadData()}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button
                className="bg-[#12B886] text-[#08100D] hover:bg-[#00A878]"
                onClick={() => {
                  resetForm();
                  setView("create");
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Market
              </Button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto xl:hidden">
            {navItems
              .filter((item) => isSuperAdmin || item.id !== "add-admin")
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={classNames(
                    "whitespace-nowrap rounded-full border px-4 py-2 text-sm",
                    view === item.id
                      ? "border-[#12B886] bg-[#12B886] text-[#08100D]"
                      : "border-[#263241] bg-[#101720] text-[#8B98A8]"
                  )}
                >
                  {item.label}
                </button>
              ))}
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          {view === "dashboard" && (
            <DashboardView
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
            <CreateMarketView
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
              transactions={financeTransactions.length ? financeTransactions : transactions}
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
            <AddAdminView
              admins={admins}
              email={newAdminEmail}
              setEmail={setNewAdminEmail}
              onAdd={addAdmin}
              onRemove={removeAdmin}
              saving={saving}
            />
          )}
          {view === "reports" && (
            <ReportsView
              markets={markets}
              transactions={financeTransactions.length ? financeTransactions : transactions}
              metrics={dashboardMetrics}
            />
          )}
          {view === "settings" && <AdminSettingsView />}
        </main>
      </div>

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
    </div>
  );
};

const ShellCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={classNames(
      "rounded-xl border border-[#263241] bg-[#101720] shadow-sm",
      className
    )}
  >
    {children}
  </section>
);

const SectionHeader = ({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 border-b border-[#263241] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#12B886]">
          {eyebrow}
        </p>
      )}
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-sm text-[#8B98A8]">{description}</p>}
    </div>
    {action}
  </div>
);

const MetricCard = ({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
  icon: typeof Activity;
}) => {
  const tones = {
    neutral: "bg-[#151E28] text-[#8B98A8]",
    green: "bg-emerald-500/10 text-emerald-300",
    amber: "bg-amber-500/10 text-amber-300",
    red: "bg-red-500/10 text-red-300",
    blue: "bg-sky-500/10 text-sky-300",
  };

  return (
    <div className="rounded-xl border border-[#263241] bg-[#101720] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#8B98A8]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={classNames("rounded-lg p-2", tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-[#64748B]">{hint}</p>}
    </div>
  );
};

const Badge = ({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) => (
  <span
    className={classNames(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
      tone === "green" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      tone === "amber" && "border-amber-500/30 bg-amber-500/10 text-amber-300",
      tone === "red" && "border-red-500/30 bg-red-500/10 text-red-300",
      tone === "blue" && "border-sky-500/30 bg-sky-500/10 text-sky-300",
      tone === "neutral" && "border-[#263241] bg-[#151E28] text-[#8B98A8]"
    )}
  >
    {children}
  </span>
);

const DashboardView = ({
  metrics,
  markets,
  users,
  financeOverview,
  loading,
}: {
  metrics: ReturnType<typeof Admin> extends JSX.Element ? never : {
    liveMarkets: number;
    pendingResolution: number;
    resolvedMarkets: number;
    totalUsers: number;
    activeUsersToday: number;
    newUsersToday: number;
    usersWithPredictions: number;
    todayPredictions: number;
    todayVolume: number;
    pendingPayouts: number;
    totalWalletBalance: number;
    activeMarketMoney: number;
  };
  markets: AdminMarket[];
  users: AdminUser[];
  financeOverview: FinanceOverview | null;
  loading: boolean;
}) => {
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Live markets" value={metrics.liveMarkets} icon={Activity} tone="green" />
        <MetricCard label="Pending resolution" value={metrics.pendingResolution} icon={Clock} tone="amber" />
        <MetricCard label="Resolved markets" value={metrics.resolvedMarkets} icon={CheckCircle} tone="blue" />
        <MetricCard label="Total users" value={metrics.totalUsers} icon={Users} />
        <MetricCard label="Today active users" value={metrics.activeUsersToday} icon={Activity} hint="Real prediction activity today. Login tracking needs user_activity_logs." />
        <MetricCard label="Today predictions" value={metrics.todayPredictions} icon={BarChart3} />
        <MetricCard label="Today volume" value={formatNaira(metrics.todayVolume)} icon={ReceiptText} tone="green" />
        <MetricCard label="Pending payouts" value={metrics.pendingPayouts} icon={AlertTriangle} tone="amber" hint="Count from current backend. Exact payout liability needs payout_records." />
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
          <div className="border-t border-[#263241] p-5">
            <h3 className="mb-3 text-sm font-semibold text-[#F5F7FA]">
              Most active users
            </h3>
            {mostActiveUsers.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-[#64748B]">
                    <tr>
                      <th className="py-3">User</th>
                      <th>Predictions</th>
                      <th>Volume</th>
                      <th>Last login</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263241]">
                    {mostActiveUsers.map((adminUser) => (
                      <tr key={adminUser.id}>
                        <td className="py-3">
                          <p className="font-medium">{adminUser.username || "User"}</p>
                          <p className="text-xs text-[#8B98A8]">{adminUser.email}</p>
                        </td>
                        <td>{metricValue(adminUser.total_predictions)}</td>
                        <td>{formatNaira(metricValue(adminUser.total_volume))}</td>
                        <td className="text-[#8B98A8]">
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
            <div className="rounded-lg border border-[#263241] bg-[#0B1118] p-4">
              <p className="text-sm font-semibold">Finance snapshot</p>
              <div className="mt-3 grid gap-2 text-sm text-[#8B98A8]">
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
            {loading && <p className="text-sm text-[#8B98A8]">Refreshing data...</p>}
          </div>
        </ShellCard>
      </div>
    </div>
  );
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
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-sm font-semibold">{title}</h3>
      <span className="text-xs text-[#64748B]">{markets.length}</span>
    </div>
    {markets.length ? (
      <div className="space-y-2">
        {markets.map((market) => (
          <Link
            key={market.id}
            to={`/market/${market.id}`}
            className="block rounded-lg border border-[#263241] bg-[#0B1118] p-3 transition hover:border-[#12B886]/50"
          >
            <p className="line-clamp-2 text-sm font-medium">{market.question}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-[#8B98A8]">
              <span>{categoryLabel(market.category)}</span>
              <span>{formatDate(market.close_date || market.closes_at)}</span>
            </div>
          </Link>
        ))}
      </div>
    ) : (
      <p className="rounded-lg border border-dashed border-[#263241] px-3 py-4 text-sm text-[#8B98A8]">
        {empty}
      </p>
    )}
  </div>
);

const MarketsView = ({
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
      label: "Live markets",
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
      label: "Pending resolution",
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
      id: "cancelled",
      label: "Cancelled",
      count: allMarkets.filter((market) => market.status === "cancelled").length,
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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search markets..."
              className="border-[#263241] bg-[#0B1118] pl-9 text-white"
            />
          </div>
        }
      />
      <div className="flex gap-2 overflow-x-auto border-b border-[#263241] px-5 py-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={classNames(
              "whitespace-nowrap rounded-full border px-3 py-2 text-sm transition",
              statusFilter === tab.id
                ? "border-[#12B886] bg-[#12B886] text-[#08100D]"
                : "border-[#263241] bg-[#0B1118] text-[#8B98A8] hover:text-white"
            )}
          >
            {tab.label} <span className="ml-1 opacity-70">{tab.count}</span>
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="border-b border-[#263241] text-xs uppercase tracking-wide text-[#64748B]">
            <tr>
              <th className="px-5 py-4">Market</th>
              <th>Status</th>
              <th>Prices</th>
              <th>Volume</th>
              <th>Trades</th>
              <th>Participants</th>
              <th>End time</th>
              <th>Resolution</th>
              <th className="pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#263241]">
            {markets.map((market) => (
              <tr key={market.id} className="align-top">
                <td className="px-5 py-4">
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
                  <div className="text-emerald-300">
                    {market.yes_label || "YES"} {Number(market.yes_price ?? 50)}%
                  </div>
                  <div className="text-red-300">
                    {market.no_label || "NO"} {Number(market.no_price ?? 50)}%
                  </div>
                </td>
                <td className="py-4">{formatNaira(marketVolume(market))}</td>
                <td className="py-4">{Number(market.trade_count || 0)}</td>
                <td className="py-4">{Number(market.participant_count || 0)}</td>
                <td className="py-4 text-[#8B98A8]">
                  {formatDate(market.close_date || market.closes_at)}
                </td>
                <td className="py-4 text-[#8B98A8]">
                  {market.winning_outcome || market.resolved_outcome || "Not resolved"}
                </td>
                <td className="py-4 pr-5">
                  <div className="flex justify-end gap-2">
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
                      </>
                    )}
                    {market.status !== "resolved" &&
                      market.status !== "archived" && (
                        <ActionButton
                          label="Cancel market"
                          icon={Ban}
                          tone="red"
                          onClick={() => onStatus(market, "cancelled")}
                          disabled={saving}
                        />
                      )}
                    {market.status === "resolved" && (
                      <ActionButton
                        label="Archive market"
                        icon={Archive}
                        onClick={() => onStatus(market, "archived")}
                        disabled={saving}
                      />
                    )}
                    {(market.status === "resolved" ||
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

type ActionButtonProps = {
  label: string;
  icon: typeof Eye;
  tone?: "neutral" | "green" | "red";
  disabled?: boolean;
  onClick?: () => void;
  as?: typeof Link;
  to?: string;
};

const ActionButton = ({
  label,
  icon: Icon,
  tone = "neutral",
  disabled,
  onClick,
  as,
  to,
}: ActionButtonProps) => {
  const classes = classNames(
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition",
    tone === "green" &&
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    tone === "red" &&
      "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
    tone === "neutral" &&
      "border-[#263241] bg-[#151E28] text-[#8B98A8] hover:bg-[#1B2633] hover:text-white",
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

const CreateMarketView = ({
  form,
  editingMarket,
  saving,
  onChange,
  onMediaUpload,
  onSave,
  onReset,
}: {
  form: typeof emptyForm;
  editingMarket: AdminMarket | null;
  saving: boolean;
  onChange: (field: keyof typeof emptyForm, value: string | number | boolean) => void;
  onMediaUpload: (file: File) => void;
  onSave: () => void;
  onReset: () => void;
}) => {
  const priceSum = Number(form.yes_price) + Number(form.no_price);
  const hasMedia = Boolean(form.image_url || form.video_url);
  const ready =
    form.question.trim() &&
    form.category &&
    form.close_date &&
    form.rules.trim() &&
    form.resolution_source.trim() &&
    hasMedia &&
    priceSum === 100;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <ShellCard>
        <SectionHeader
          eyebrow={editingMarket ? "Edit market" : "Create market"}
          title="Market details"
          description="Keep the market specific, resolvable, and easy for users to understand."
        />
        <div className="space-y-5 p-5">
          <Field label="Market question" required>
            <Input
              value={form.question}
              onChange={(event) => onChange("question", event.target.value)}
              placeholder="Will Nigeria qualify for the 2026 World Cup?"
              className="border-[#263241] bg-[#0B1118] text-white"
            />
          </Field>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Category" required>
              <select
                value={normalizeCategory(form.category)}
                onChange={(event) => onChange("category", event.target.value)}
                className="h-10 w-full rounded-md border border-[#263241] bg-[#0B1118] px-3 text-sm text-white"
              >
                {ADMIN_MARKET_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Market type">
              <select
                value={form.market_type}
                onChange={(event) =>
                  onChange("market_type", event.target.value as MarketKind)
                }
                className="h-10 w-full rounded-md border border-[#263241] bg-[#0B1118] px-3 text-sm text-white"
              >
                <option>YES/NO</option>
                <option>UP/DOWN</option>
                <option>Bigger/Smaller</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <Field label="End date/time" required>
              <Input
                type="datetime-local"
                value={form.close_date}
                onChange={(event) => onChange("close_date", event.target.value)}
                className="border-[#263241] bg-[#0B1118] text-white"
              />
            </Field>
            <Field label="Trading close time">
              <Input
                type="datetime-local"
                value={form.trading_close_at}
                onChange={(event) => onChange("trading_close_at", event.target.value)}
                className="border-[#263241] bg-[#0B1118] text-white"
              />
              <p className="mt-1 text-xs text-[#8B98A8]">Leave blank to close predictions at market end.</p>
            </Field>
            <Field label="Starting YES price">
              <Input
                type="number"
                min={1}
                max={99}
                value={form.yes_price}
                onChange={(event) => onChange("yes_price", Number(event.target.value))}
                className="border-[#263241] bg-[#0B1118] text-white"
              />
            </Field>
            <Field label="Starting NO price">
              <Input
                type="number"
                min={1}
                max={99}
                value={form.no_price}
                onChange={(event) => onChange("no_price", Number(event.target.value))}
                className="border-[#263241] bg-[#0B1118] text-white"
              />
            </Field>
          </div>

          <div
            className={classNames(
              "rounded-lg border px-4 py-3 text-sm",
              priceSum === 100
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            )}
          >
            YES + NO = {priceSum}. Prices must always equal 100.
          </div>

          <Field label="Rules / resolution condition" required>
            <Textarea
              value={form.rules}
              onChange={(event) => onChange("rules", event.target.value)}
              placeholder="Explain exactly what must happen for YES to win and what source will be used."
              className="min-h-32 border-[#263241] bg-[#0B1118] text-white"
            />
          </Field>

          <Field label="Resolution source" required>
            <Input
              value={form.resolution_source}
              onChange={(event) => onChange("resolution_source", event.target.value)}
              placeholder="Official FIFA report, exchange rate source, public announcement..."
              className="border-[#263241] bg-[#0B1118] text-white"
            />
          </Field>
        </div>
      </ShellCard>

      <div className="space-y-6">
        <ShellCard>
          <SectionHeader title="Controls" description="Limits, media, status, and safety." />
          <div className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Minimum stake">
                <Input
                  type="number"
                  value={form.min_stake}
                  onChange={(event) => onChange("min_stake", Number(event.target.value))}
                  className="border-[#263241] bg-[#0B1118] text-white"
                />
              </Field>
              <Field label="Maximum stake">
                <Input
                  type="number"
                  value={form.max_stake}
                  onChange={(event) => onChange("max_stake", Number(event.target.value))}
                  className="border-[#263241] bg-[#0B1118] text-white"
                />
              </Field>
            </div>

            <Field label="Media upload" required>
              <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#263241] bg-[#0B1118] px-4 py-6 text-sm text-[#8B98A8] transition hover:border-[#12B886]/60 hover:text-white">
                <Upload className="mr-2 h-4 w-4" />
                Upload image or video
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onMediaUpload(file);
                  }}
                />
              </label>
            </Field>

            {(form.image_url || form.video_url) && (
              <div className="overflow-hidden rounded-lg border border-[#263241] bg-[#0B1118]">
                {form.video_url ? (
                  <video src={form.video_url} controls className="h-48 w-full object-cover" />
                ) : (
                  <img src={form.image_url} alt="" className="h-48 w-full object-cover" />
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(event) => onChange("status", event.target.value)}
                  className="h-10 w-full rounded-md border border-[#263241] bg-[#0B1118] px-3 text-sm text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </Field>
              <Field label="Trending">
                <label className="flex h-10 items-center gap-2 rounded-md border border-[#263241] bg-[#0B1118] px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_trending}
                    onChange={(event) => onChange("is_trending", event.target.checked)}
                  />
                  Mark as trending
                </label>
              </Field>
            </div>
          </div>
        </ShellCard>

        <ShellCard>
          <SectionHeader title="User preview" description="Approximate market card before publishing." />
          <div className="p-5">
            <div className="overflow-hidden rounded-xl border border-[#263241] bg-[#0B1118]">
              <div className="flex h-44 items-center justify-center bg-[#151E28]">
                {form.image_url ? (
                  <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#64748B]">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-sm">Media preview</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Badge>{categoryLabel(form.category)}</Badge>
                  <Badge tone={form.status === "active" ? "green" : "neutral"}>
                    {statusText(form.status)}
                  </Badge>
                </div>
                <p className="font-semibold leading-snug">
                  {form.question || "Market question appears here"}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-sm font-semibold text-emerald-300">
                    {form.yes_label} {form.yes_price}
                  </div>
                  <div className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm font-semibold text-red-300">
                    {form.no_label} {form.no_price}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ShellCard>

        <ShellCard>
          <SectionHeader title="Safety checklist" />
          <div className="space-y-2 p-5 text-sm">
            <ChecklistItem ok={Boolean(form.question.trim())}>Question is clear</ChecklistItem>
            <ChecklistItem ok={Boolean(form.close_date)}>End date is set</ChecklistItem>
            <ChecklistItem ok={priceSum === 100}>Prices add up to 100</ChecklistItem>
            <ChecklistItem ok={Boolean(form.rules.trim())}>Rules are written</ChecklistItem>
            <ChecklistItem ok={Boolean(form.resolution_source.trim())}>Resolution source is set</ChecklistItem>
            <ChecklistItem ok={hasMedia}>Media is attached</ChecklistItem>
          </div>
          <div className="border-t border-[#263241] p-5">
            <Button
              className="w-full bg-[#12B886] text-[#08100D] hover:bg-[#00A878]"
              onClick={onSave}
              disabled={saving || !ready}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingMarket ? "Save market" : "Review and publish"}
            </Button>
            {editingMarket && (
              <Button
                variant="ghost"
                className="mt-2 w-full text-[#8B98A8] hover:bg-[#151E28] hover:text-white"
                onClick={onReset}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </ShellCard>
      </div>
    </div>
  );
};

const Field = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-[#D7DEE8]">
      {label}
      {required && <span className="ml-1 text-red-300">*</span>}
    </span>
    {children}
  </label>
);

const ChecklistItem = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    {ok ? (
      <CheckCircle className="h-4 w-4 text-emerald-300" />
    ) : (
      <XCircle className="h-4 w-4 text-[#64748B]" />
    )}
    <span className={ok ? "text-[#D7DEE8]" : "text-[#64748B]"}>{children}</span>
  </div>
);

const ResolutionCenterView = ({
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
      <div className="divide-y divide-[#263241]">
        {pendingMarkets.map((market) => (
          <div
            key={market.id}
            className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_320px]"
          >
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge>{categoryLabel(market.category)}</Badge>
                <Badge tone="amber">{statusText(market.status)}</Badge>
              </div>
              <h3 className="text-lg font-semibold">{market.question}</h3>
              <p className="mt-2 text-sm text-[#8B98A8]">
                Rules: {market.rules || market.description || "No rules provided."}
              </p>
              <p className="mt-1 text-sm text-[#8B98A8]">
                Source: {market.resolution_source || "Not set"}
              </p>
            </div>
            <div className="rounded-lg border border-[#263241] bg-[#0B1118] p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="YES stake" value={formatNaira(koboToNaira(market.yes_pool_smallest_unit || 0))} />
                <Stat label="NO stake" value={formatNaira(koboToNaira(market.no_pool_smallest_unit || 0))} />
                <Stat label="Volume" value={formatNaira(marketVolume(market))} />
                <Stat label="Trades" value={Number(market.trade_count || 0)} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                  disabled={saving}
                  onClick={() => onResolve(market, "resolved", "YES")}
                >
                  YES won
                </Button>
                <Button
                  className="bg-red-600 text-white hover:bg-red-500"
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

const FinanceView = ({
  overview,
  deposits,
  withdrawals,
  transactions,
  busyId,
  onAction,
}: {
  overview: FinanceOverview | null;
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  transactions: FinanceTransaction[];
  busyId: string | null;
  onAction: (
    kind: "deposit" | "withdrawal",
    id: string,
    action: "approve" | "reject"
  ) => void;
}) => (
  <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total deposits" value={formatNaira(metricValue(overview?.totalDeposits))} icon={Wallet} tone="green" />
      <MetricCard label="Total withdrawals" value={formatNaira(metricValue(overview?.totalWithdrawals))} icon={ReceiptText} />
      <MetricCard label="Prediction volume" value={formatNaira(metricValue(overview?.totalPredictionVolume))} icon={BarChart3} />
      <MetricCard label="Pending payouts" value={metricValue(overview?.pendingPayouts)} icon={Clock} tone="amber" hint="Count from backend until payout_records exists." />
      <MetricCard label="Wallet balances" value={formatNaira(metricValue(overview?.totalUserBalances))} icon={Users} />
      <MetricCard label="Pending deposits" value={metricValue(overview?.pendingDeposits)} icon={AlertTriangle} tone="amber" />
      <MetricCard label="Pending withdrawals" value={metricValue(overview?.pendingWithdrawals)} icon={AlertTriangle} tone="amber" />
      <MetricCard label="Today withdrawals" value={formatNaira(metricValue(overview?.todayWithdrawals))} icon={Activity} />
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <FinanceQueue
        title="Deposit queue"
        kind="deposit"
        items={deposits}
        busyId={busyId}
        onAction={onAction}
      />
      <FinanceQueue
        title="Withdrawal queue"
        kind="withdrawal"
        items={withdrawals}
        busyId={busyId}
        onAction={onAction}
      />
    </div>

    <TransactionsView
      transactions={transactions}
      filter="all"
      setFilter={() => undefined}
      search=""
      setSearch={() => undefined}
      compact
    />
  </div>
);

const FinanceQueue = ({
  title,
  kind,
  items,
  busyId,
  onAction,
}: {
  title: string;
  kind: "deposit" | "withdrawal";
  items: Array<DepositRequest | WithdrawalRequest>;
  busyId: string | null;
  onAction: (
    kind: "deposit" | "withdrawal",
    id: string,
    action: "approve" | "reject"
  ) => void;
}) => (
  <ShellCard>
    <SectionHeader title={title} description="Approve only after operational verification." />
    <div className="divide-y divide-[#263241]">
      {items.map((item) => {
        const busyApprove = busyId === `${kind}-${item.id}-approve`;
        const busyReject = busyId === `${kind}-${item.id}-reject`;
        return (
          <div key={item.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{formatNaira(Number(item.amount || 0))}</p>
                <p className="text-sm text-[#8B98A8]">
                  {requestUserLabel(item)}
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  Reference: {item.reference || "Not set"}
                </p>
                {"bankName" in item && (
                  <p className="mt-1 text-xs text-[#64748B]">
                    {item.bankName} - {item.accountNumber} - {item.accountName}
                  </p>
                )}
              </div>
              <Badge tone={item.status === "pending" ? "amber" : "neutral"}>
                {item.status}
              </Badge>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                className="bg-[#12B886] text-[#08100D] hover:bg-[#00A878]"
                disabled={item.status !== "pending" || Boolean(busyId)}
                onClick={() => onAction(kind, item.id, "approve")}
              >
                {busyApprove && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                disabled={item.status !== "pending" || Boolean(busyId)}
                onClick={() => onAction(kind, item.id, "reject")}
              >
                {busyReject && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reject
              </Button>
            </div>
          </div>
        );
      })}
      {!items.length && (
        <EmptyState title={`No ${kind}s pending`} body="Queue is clear." />
      )}
    </div>
  </ShellCard>
);

const TransactionsView = ({
  transactions,
  filter,
  setFilter,
  search,
  setSearch,
  compact,
}: {
  transactions: Array<ApiTransaction | FinanceTransaction>;
  filter: string;
  setFilter: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  compact?: boolean;
}) => {
  const term = search.trim().toLowerCase();
  const filtered = transactions.filter((tx) => {
    const matchesFilter =
      filter === "all" || tx.type === filter || tx.status === filter;
    if (!matchesFilter) return false;
    if (!term) return true;
    return [
      tx.type,
      tx.status,
      tx.description,
      txUserLabel(tx),
      txReference(tx),
      txMarketLabel(tx),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  const filters = ["all", "deposit", "withdrawal", "prediction", "payout", "refund", "completed", "pending"];

  return (
    <ShellCard>
      <SectionHeader
        eyebrow={compact ? undefined : "Ledger"}
        title={compact ? "Recent ledger" : "Transactions"}
        description="Searchable money movement and operational transaction history."
        action={
          !compact && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <div className="relative sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ledger..."
                  className="border-[#263241] bg-[#0B1118] pl-9 text-white"
                />
              </div>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="h-10 rounded-md border border-[#263241] bg-[#0B1118] px-3 text-sm text-white"
              >
                {filters.map((item) => (
                  <option key={item} value={item}>
                    {statusText(item)}
                  </option>
                ))}
              </select>
            </div>
          )
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-[#263241] text-xs uppercase tracking-wide text-[#64748B]">
            <tr>
              <th className="px-5 py-4">Type</th>
              <th>User</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Reference</th>
              <th>Market</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#263241]">
            {filtered.slice(0, compact ? 10 : 100).map((tx) => (
              <tr key={tx.id}>
                <td className="px-5 py-4 font-medium">{statusText(tx.type)}</td>
                <td className="text-[#8B98A8]">{txUserLabel(tx)}</td>
                <td>{formatNaira(Number(tx.amount || 0))}</td>
                <td>
                  <Badge tone={tx.status === "completed" ? "green" : tx.status === "pending" ? "amber" : "neutral"}>
                    {tx.status}
                  </Badge>
                </td>
                <td className="text-[#8B98A8]">{txReference(tx)}</td>
                <td className="max-w-[240px] truncate text-[#8B98A8]">
                  {txMarketLabel(tx)}
                </td>
                <td className="text-[#8B98A8]">{formatDate(txDate(tx))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <EmptyState title="No transactions found" body="No records match this filter." />}
      </div>
    </ShellCard>
  );
};

const UsersView = ({
  users,
  search,
  setSearch,
}: {
  users: AdminUser[];
  search: string;
  setSearch: (value: string) => void;
}) => {
  const filtered = users.filter((adminUser) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [adminUser.username, adminUser.email, adminUser.role]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  return (
    <ShellCard>
      <SectionHeader
        eyebrow="Users"
        title="User management"
        description="Operational user visibility. Suspension and last-login tracking need backend support."
        action={
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users..."
              className="border-[#263241] bg-[#0B1118] pl-9 text-white"
            />
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-[#263241] text-xs uppercase tracking-wide text-[#64748B]">
            <tr>
              <th className="px-5 py-4">User</th>
              <th>Wallet balance</th>
              <th>Active positions</th>
              <th>Predictions</th>
              <th>Last active</th>
              <th>Joined</th>
              <th>Status</th>
              <th className="pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#263241]">
            {filtered.map((adminUser) => (
              <tr key={adminUser.id}>
                <td className="px-5 py-4">
                  <p className="font-medium">{adminUser.username || "User"}</p>
                  <p className="text-xs text-[#8B98A8]">{adminUser.email}</p>
                </td>
                <td>{formatNaira(metricValue(adminUser.wallet_balance))}</td>
                <td>{metricValue(adminUser.active_positions)}</td>
                <td>{metricValue(adminUser.total_predictions)}</td>
                <td className="text-[#8B98A8]">
                  {formatShortDate(adminUser.last_active_at || adminUser.last_login_at)}
                </td>
                <td className="text-[#8B98A8]">{formatShortDate(adminUser.created_at)}</td>
                <td>
                  <Badge tone={adminUser.status === "suspended" ? "red" : "green"}>
                    {adminUser.status || "Active"}
                  </Badge>
                </td>
                <td className="pr-5">
                  <div className="flex justify-end gap-2">
                    <ActionButton label="View wallet history - needs backend user ledger route" icon={Wallet} disabled />
                    <ActionButton label="View prediction history - needs backend user position route" icon={BarChart3} disabled />
                    <ActionButton label="Suspend user - needs account status endpoint" icon={Ban} tone="red" disabled />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <EmptyState title="No users found" body="No user records match this search." />}
      </div>
    </ShellCard>
  );
};

const AddAdminView = ({
  admins,
  email,
  setEmail,
  onAdd,
  onRemove,
  saving,
}: {
  admins: AdminRecord[];
  email: string;
  setEmail: (value: string) => void;
  onAdd: () => void;
  onRemove: (email: string) => void;
  saving: boolean;
}) => (
  <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
    <ShellCard>
      <SectionHeader
        eyebrow="Access control"
        title="Add admin"
        description="Grant admin access by verified email."
      />
      <div className="space-y-4 p-5">
        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.com"
          className="border-[#263241] bg-[#0B1118] text-white"
        />
        <Button
          className="w-full bg-[#12B886] text-[#08100D] hover:bg-[#00A878]"
          onClick={onAdd}
          disabled={saving}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add admin role
        </Button>
        <p className="text-xs text-[#64748B]">
          TODO: store added_by and added_at in an admin role audit table for full traceability.
        </p>
      </div>
    </ShellCard>

    <ShellCard>
      <SectionHeader title="Current admins" description="Remove access carefully." />
      <div className="divide-y divide-[#263241]">
        {admins.map((admin) => (
          <div key={admin.id || admin.email} className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="font-medium">{admin.username || admin.email}</p>
              <p className="text-sm text-[#8B98A8]">{admin.email}</p>
              <p className="mt-1 text-xs text-[#64748B]">
                Added: {formatShortDate(admin.added_at || admin.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={admin.role === "super_admin" ? "blue" : "neutral"}>
                {statusText(admin.role)}
              </Badge>
              <Button
                variant="outline"
                className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                onClick={() => onRemove(admin.email)}
                disabled={saving || admin.role === "super_admin"}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        {!admins.length && <EmptyState title="No admins listed" body="Admin role records were not returned by the backend." />}
      </div>
    </ShellCard>
  </div>
);

const ReportsView = ({
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
      volume: categoryMarkets.reduce((sum, market) => sum + marketVolume(market), 0),
    };
  }).filter((item) => item.markets > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Daily volume" value={formatNaira(metrics.todayVolume)} icon={BarChart3} />
        <MetricCard label="User growth" value={metrics.totalUsers} icon={Users} />
        <MetricCard label="Pending resolutions" value={metrics.pendingResolution} icon={Clock} tone="amber" />
        <MetricCard label="Resolved markets" value={metrics.resolvedMarkets} icon={CheckCircle} tone="blue" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ShellCard>
          <SectionHeader title="Category performance" description="Market count and volume by category." />
          <div className="divide-y divide-[#263241]">
            {categoryPerformance.map((category) => (
              <div key={category.label} className="flex items-center justify-between p-5">
                <div>
                  <p className="font-medium">{category.label}</p>
                  <p className="text-sm text-[#8B98A8]">{category.markets} markets</p>
                </div>
                <p className="font-semibold">{formatNaira(category.volume)}</p>
              </div>
            ))}
            {!categoryPerformance.length && <EmptyState title="No category report yet" body="Create markets to populate category performance." />}
          </div>
        </ShellCard>
        <ShellCard>
          <SectionHeader title="Payout history" description="Completed payout transactions from the ledger." />
          <div className="divide-y divide-[#263241]">
            {transactions
              .filter((tx) => tx.type === "payout" || tx.type === "market_payout")
              .slice(0, 8)
              .map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-5">
                  <div>
                    <p className="font-medium">{tx.market_question || "Market payout"}</p>
                    <p className="text-sm text-[#8B98A8]">{formatDate(tx.created_at)}</p>
                  </div>
                  <p className="font-semibold">{formatNaira(Number(tx.amount || 0))}</p>
                </div>
              ))}
            {!transactions.some((tx) => tx.type === "payout" || tx.type === "market_payout") && (
              <EmptyState title="No payout records yet" body="Resolved market payouts will appear here." />
            )}
          </div>
        </ShellCard>
      </div>
    </div>
  );
};

const AdminSettingsView = () => (
  <div className="grid gap-6 xl:grid-cols-2">
    <ShellCard>
      <SectionHeader
        eyebrow="Platform settings"
        title="Operational controls"
        description="These controls are disabled until backend platform settings exist."
      />
      <div className="space-y-4 p-5">
        <DisabledSetting label="Platform status" value="Online" />
        <DisabledSetting label="Maintenance mode" value="Coming soon" />
        <DisabledSetting label="Minimum prediction amount" value="Needs platform_settings table" />
        <DisabledSetting label="Maximum prediction amount" value="Needs platform_settings table" />
        <DisabledSetting label="Market creation rules" value="Needs backend config" />
      </div>
    </ShellCard>
    <ShellCard>
      <SectionHeader title="Support and safety" description="Launch readiness placeholders." />
      <div className="space-y-4 p-5">
        <DisabledSetting label="Support contact" value="Add before public launch" />
        <DisabledSetting label="Dispute escalation SLA" value="Coming soon" />
        <DisabledSetting label="Risk review rules" value="Coming soon" />
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          TODO: add a platform_settings table with key/value rows for maintenance mode,
          prediction limits, support contact, and market creation rules.
        </p>
      </div>
    </ShellCard>
  </div>
);

const DisabledSetting = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border border-[#263241] bg-[#0B1118] p-4">
    <div>
      <p className="font-medium">{label}</p>
      <p className="text-sm text-[#8B98A8]">{value}</p>
    </div>
    <Badge>Disabled</Badge>
  </div>
);

const ResolutionConfirmModal = ({
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
}: {
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
}) => {
  const summary = state.preview;
  const positions = state.preview?.positions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[#263241] bg-[#101720] shadow-2xl">
        <SectionHeader
          eyebrow="Final confirmation"
          title={`Resolve as ${state.outcome}`}
          description="This action settles positions and can trigger wallet payouts."
          action={
            <Button variant="ghost" onClick={onClose} className="text-[#8B98A8]">
              Close
            </Button>
          }
        />
        <div className="space-y-5 p-5">
          <div className="rounded-lg border border-[#263241] bg-[#0B1118] p-4">
            <p className="text-sm text-[#8B98A8]">Market</p>
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
                className="border-[#263241] bg-[#0B1118] text-white"
                placeholder="Official source URL or name"
              />
            </Field>
            <Field label="Resolution note">
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="border-[#263241] bg-[#0B1118] text-white"
                placeholder="Internal note"
              />
            </Field>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#263241]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#0B1118] text-xs uppercase tracking-wide text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th>Side</th>
                  <th>Stake</th>
                  <th>Payout</th>
                  <th>Profit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263241]">
                {positions.slice(0, 40).map((position) => (
                  <tr key={position.id}>
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

          <label className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
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
            <Button variant="outline" className="border-[#263241] bg-[#0B1118] text-white" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-[#12B886] text-[#08100D] hover:bg-[#00A878]"
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

const DangerConfirmModal = ({
  state,
  deleteText,
  saving,
  setDeleteText,
  onClose,
  onConfirm,
}: {
  state: DangerState;
  deleteText: string;
  saving: boolean;
  setDeleteText: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  const isDelete = state.action === "delete";
  const actionText = statusText(state.action);
  const canConfirm = !isDelete || deleteText === "DELETE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-[#263241] bg-[#101720] shadow-2xl">
        <SectionHeader
          eyebrow="Safety confirmation"
          title={`${actionText} market`}
          description="Dangerous admin actions require explicit confirmation."
        />
        <div className="space-y-5 p-5">
          <div className="rounded-lg border border-[#263241] bg-[#0B1118] p-4">
            <p className="text-sm text-[#8B98A8]">Market</p>
            <p className="mt-1 font-semibold">{state.market.question}</p>
          </div>
          <p className="text-sm text-[#D7DEE8]">
            {state.action === "close" &&
              "Closing moves the market to pending resolution and disables new predictions."}
            {state.action === "cancel" &&
              "Cancelling should only happen when the market cannot be fairly resolved."}
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
                className="border-[#263241] bg-[#0B1118] text-white"
              />
            </Field>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" className="border-[#263241] bg-[#0B1118] text-white" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-500"
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

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-lg border border-[#263241] bg-[#0B1118] p-3">
    <p className="text-xs text-[#64748B]">{label}</p>
    <p className="mt-1 font-semibold">{value}</p>
  </div>
);

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="p-8 text-center">
    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#263241] bg-[#0B1118] text-[#64748B]">
      <FileText className="h-5 w-5" />
    </div>
    <p className="font-semibold">{title}</p>
    <p className="mt-1 text-sm text-[#8B98A8]">{body}</p>
  </div>
);

export default Admin;
