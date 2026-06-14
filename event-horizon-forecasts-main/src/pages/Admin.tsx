import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  CheckCircle,
  Edit,
  FileText,
  Image,
  LayoutDashboard,
  Loader2,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Shield,
  ShieldPlus,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import apiService, { type AdminCreateMarketInput, type AdminMarket, type ApiTransaction, type UserRole } from "@/lib/api";
import type { DepositRequest, WithdrawalRequest } from "@/lib/api";
import { formatNaira } from "@/lib/markets";

type AdminView = "dashboard" | "markets" | "create" | "resolution" | "finance" | "transactions" | "users" | "add-admin" | "reports" | "settings";
type MarketKind = "YES/NO" | "UP/DOWN" | "Bigger/Smaller";

type AdminUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  created_at?: string;
};

type AdminRecord = AdminUser & { isPrimary?: boolean };

const emptyForm = {
  question: "",
  category: "Sports",
  marketKind: "YES/NO" as MarketKind,
  startingYesPrice: "50",
  startingNoPrice: "50",
  endDateTime: "",
  description: "",
  minAmount: "100",
  maxAmount: "100000",
  resolutionSource: "",
  resolutionInstructions: "",
  status: "active" as "draft" | "active",
  trending: false,
  imageFile: null as File | null,
  videoFile: null as File | null,
  existingImageUrl: "",
  existingVideoUrl: "",
};

const categories = ["Sports", "Music", "Crypto", "Politics", "Entertainment", "Finance", "Technology", "Other"];
const adminInputClass = "h-12 rounded-2xl border-white/10 bg-white/[0.055] text-white placeholder:text-slate-500 focus:border-emerald-300";

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isSuperAdmin, isLoading } = useAuth();
  const superAdmin = isSuperAdmin();
  const admin = isAdmin();
  const [view, setView] = useState<AdminView>("dashboard");
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [financeOverview, setFinanceOverview] = useState<Record<string, number> | null>(null);
  const [depositQueue, setDepositQueue] = useState<DepositRequest[]>([]);
  const [withdrawalQueue, setWithdrawalQueue] = useState<WithdrawalRequest[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<ApiTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMarket, setEditingMarket] = useState<AdminMarket | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [resolutionPreview, setResolutionPreview] = useState<{ market: AdminMarket; outcome: "YES" | "NO"; summary: any } | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate("/login");
    if (!isLoading && user && !admin) navigate("/");
  }, [admin, isLoading, navigate, user]);

  const loadData = async () => {
    if (!user || !admin) return;

    setLoading(true);
    try {
      const marketResponse = await apiService.listAdminMarkets({
        status: statusFilter,
        search,
      });
      setMarkets(marketResponse.markets || []);

      if (superAdmin) {
        const [analyticsResponse, adminsResponse, usersResponse, transactionsResponse, financeOverviewResponse, depositsResponse, withdrawalsResponse, financeTransactionsResponse] = await Promise.allSettled([
          apiService.getAnalytics(),
          apiService.listAdmins(),
          apiService.listAdminUsers(),
          apiService.listAdminTransactions(),
          apiService.getAdminFinanceOverview(),
          apiService.listAdminFinanceDeposits("pending"),
          apiService.listAdminFinanceWithdrawals("pending"),
          apiService.listAdminFinanceTransactions(),
        ]);

        if (analyticsResponse.status === "fulfilled") setAnalytics(analyticsResponse.value);
        if (adminsResponse.status === "fulfilled") setAdmins(adminsResponse.value.admins || []);
        if (usersResponse.status === "fulfilled") setUsers(usersResponse.value.users || []);
        if (transactionsResponse.status === "fulfilled") setTransactions(transactionsResponse.value.transactions || []);
        if (financeOverviewResponse.status === "fulfilled") setFinanceOverview(financeOverviewResponse.value.overview || null);
        if (depositsResponse.status === "fulfilled") setDepositQueue(depositsResponse.value.deposits || []);
        if (withdrawalsResponse.status === "fulfilled") setWithdrawalQueue(withdrawalsResponse.value.withdrawals || []);
        if (financeTransactionsResponse.status === "fulfilled") setFinanceTransactions(financeTransactionsResponse.value.transactions || []);
      }
    } catch (error: any) {
      toast.error(error.message || "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, admin, superAdmin]);

  const visibleMarkets = useMemo(() => {
    return markets.filter((market) => {
      const matchesSearch = market.question.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || market.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [markets, search, statusFilter]);

  const resetForm = () => {
    setEditingMarket(null);
    setForm(emptyForm);
  };

  const startEdit = (market: AdminMarket) => {
    const canEdit = superAdmin || market.created_by === user?.id;
    if (!canEdit) {
      toast.error("Admins can only edit markets they created.");
      return;
    }

    setEditingMarket(market);
    setView("create");
    setForm({
      ...emptyForm,
      question: market.question,
      category: market.category,
      marketKind: labelsToKind(market.yes_label, market.no_label),
      startingYesPrice: String(Number(market.starting_yes_price || market.yes_price || 50)),
      startingNoPrice: String(Number(market.starting_no_price || market.no_price || 50)),
      endDateTime: toDatetimeLocal(market.close_date),
      description: market.description || "",
      minAmount: String(Number(market.min_position_smallest_unit || 0) / 100 || 100),
      maxAmount: String(Number(market.max_position_smallest_unit || 0) / 100 || 100000),
      resolutionSource: market.resolution_source || "",
      resolutionInstructions: market.resolution_instructions || "",
      status: market.status === "draft" ? "draft" : "active",
      trending: Boolean(market.is_trending),
      existingImageUrl: market.image_url || "",
      existingVideoUrl: market.video_url || "",
    });
  };

  const buildMarketPayload = async (): Promise<AdminCreateMarketInput> => {
    if (!form.question.trim()) throw new Error("Question is required.");
    if (!form.endDateTime) throw new Error("End date and time is required.");
    if (new Date(form.endDateTime).getTime() <= Date.now()) throw new Error("End date must be in the future.");
    if (!form.resolutionInstructions.trim()) throw new Error("Rules are required.");
    if (!form.resolutionSource.trim()) throw new Error("Resolution source is required.");
    if (!form.imageFile && !form.videoFile && !form.existingImageUrl && !form.existingVideoUrl) {
      throw new Error("Add an image or a short video.");
    }

    let imageUrl = form.existingImageUrl;
    let videoUrl = form.existingVideoUrl;

    if (form.imageFile) {
      const upload = await apiService.uploadAdminMarketMedia(form.imageFile, "image");
      imageUrl = upload.url;
    }

    if (form.videoFile) {
      const upload = await apiService.uploadAdminMarketMedia(form.videoFile, "video");
      videoUrl = upload.url;
    }

    const labels = labelsForKind(form.marketKind);
    const closeDate = new Date(form.endDateTime);
    const resolutionDate = new Date(closeDate.getTime() + 24 * 60 * 60 * 1000);
    const description = form.description.trim() || form.question.trim();
    const resolutionSource = form.resolutionSource.trim();
    const startingYesPrice = Number(form.startingYesPrice || 0);
    const startingNoPrice = Number(form.startingNoPrice || 0);
    if (!Number.isFinite(startingYesPrice) || !Number.isFinite(startingNoPrice) || startingYesPrice < 1 || startingNoPrice < 1 || Math.round(startingYesPrice + startingNoPrice) !== 100) {
      throw new Error("Starting YES and NO prices must add up to 100.");
    }

    return {
      question: form.question.trim(),
      description,
      category: form.category,
      market_type: "binary",
      yes_label: labels.yes,
      no_label: labels.no,
      yes_price: startingYesPrice,
      no_price: startingNoPrice,
      starting_yes_price: startingYesPrice,
      starting_no_price: startingNoPrice,
      close_date: closeDate.toISOString(),
      resolution_date: resolutionDate.toISOString(),
      resolution_source: resolutionSource,
      resolution_instructions: form.resolutionInstructions.trim(),
      status: form.status,
      currency: "NGN",
      image_url: imageUrl || undefined,
      video_url: videoUrl || undefined,
      is_trending: form.trending,
      min_position_smallest_unit: Math.round(Number(form.minAmount || 0) * 100),
      max_position_smallest_unit: Math.round(Number(form.maxAmount || 0) * 100),
    };
  };

  const saveMarket = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = await buildMarketPayload();
      if (editingMarket) {
        await apiService.updateAdminMarket(editingMarket.id, payload);
        toast.success("Market updated.");
      } else {
        if (payload.status === "active") {
          const confirmed = window.confirm(`Confirm market publish\n\n${payload.question}\n\nStarting prices: YES ${payload.starting_yes_price} / NO ${payload.starting_no_price}\n\nUsers will buy YES/NO shares at the live sentiment price. Publish now?`);
          if (!confirmed) return;
        }
        await apiService.createAdminMarket(payload);
        toast.success("Market created.");
      }
      resetForm();
      setView("markets");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Could not save market.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (market: AdminMarket, status: string, outcome?: "YES" | "NO" | "INVALID") => {
    try {
      if (status === "resolved") {
        if (outcome !== "YES" && outcome !== "NO") {
          toast.error("Choose YES or NO before resolving.");
          return;
        }
        setResolving(true);
        const previewResponse = await apiService.previewAdminMarketResolution(market.id, outcome);
        setResolutionPreview({ market, outcome, summary: previewResponse.preview });
        return;
      }
      if (status === "archived") {
        const confirmed = window.confirm("Archive this resolved market? It will disappear from live feeds but remain in admin history.");
        if (!confirmed) return;
      }
      if (status === "cancelled") {
        const confirmed = window.confirm(`Cancel this market and refund all user stakes?\n\n${market.question}\n\nThis should only be used when a market cannot resolve fairly.`);
        if (!confirmed) return;
      }
      await apiService.updateAdminMarketStatus(market.id, {
        status,
        outcome,
        resolution_source: market.resolution_source || "Admin resolution",
      });
      toast.success("Market updated.");
      await loadData();
    } catch (error: any) {
      console.error("Admin status action failed:", error);
      toast.error(error.message || "Could not update market.");
    } finally {
      setResolving(false);
    }
  };

  const confirmResolution = async () => {
    if (!resolutionPreview) return;
    setResolving(true);
    try {
      const result = await apiService.resolveAdminMarket(resolutionPreview.market.id, resolutionPreview.outcome);
      toast.success(result.alreadyResolved ? (result.message || "Market already resolved.") : "Market resolved and payouts recorded.");
      setResolutionPreview(null);
      await loadData();
    } catch (error: any) {
      console.error("Admin market resolution failed:", error);
      toast.error(error.message || "Could not resolve market.");
    } finally {
      setResolving(false);
    }
  };

  const handleFinanceAction = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Finance action failed.");
    }
  };

  const addAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newAdminEmail.trim()) return;

    try {
      await apiService.addAdmin(newAdminEmail.trim());
      toast.success("Admin added.");
      setNewAdminEmail("");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Could not add admin.");
    }
  };

  const removeAdmin = async (adminId: string) => {
    try {
      await apiService.removeAdmin(adminId);
      toast.success("Admin removed.");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Could not remove admin.");
    }
  };

  if (isLoading || !user || !admin) return null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080C10] text-white">
      <div className="fixed inset-y-0 left-0 hidden w-72 border-r border-[#263241] bg-[#0B1118]/95 p-5 xl:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400/12 text-emerald-300">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl font-black">Flippe Admin</div>
            <div className="text-xs capitalize text-slate-500">{user.role.replace("_", " ")}</div>
          </div>
        </div>
        <AdminSidebar view={view} setView={setView} superAdmin={superAdmin} />
      </div>

      <main className="min-h-screen min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 xl:ml-72">
        <div className="mx-auto min-w-0 max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">Admin</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">{titleForView(view)}</h1>
              <p className="mt-1 text-sm text-slate-400">Manage markets and platform controls.</p>
            </div>
            <div className="flex flex-wrap gap-2 xl:hidden">
              <AdminSidebar view={view} setView={setView} superAdmin={superAdmin} compact />
            </div>
          </div>

          {view === "dashboard" && <DashboardView analytics={analytics} markets={markets} loading={loading} superAdmin={superAdmin} />}
          {view === "markets" && (
            <MarketsView
              markets={visibleMarkets}
              loading={loading}
              search={search}
              statusFilter={statusFilter}
              setSearch={setSearch}
              setStatusFilter={setStatusFilter}
              reload={loadData}
              onEdit={startEdit}
              onResolve={changeStatus}
              superAdmin={superAdmin}
              currentUserId={user.id}
              goCreate={() => {
                resetForm();
                setView("create");
              }}
            />
          )}
          {view === "create" && (
            <CreateMarketView
              form={form}
              setForm={setForm}
              saving={saving}
              editing={Boolean(editingMarket)}
              onSubmit={saveMarket}
              onCancel={() => {
                resetForm();
                setView("markets");
              }}
            />
          )}
          {view === "resolution" && (
            <SuperOnly allowed={superAdmin}>
              <MarketsView
                markets={markets.filter((market) => ["closed", "pending_resolution"].includes(market.status))}
                loading={loading}
                search={search}
                statusFilter="all"
                setSearch={setSearch}
                setStatusFilter={setStatusFilter}
                reload={loadData}
                onEdit={startEdit}
                onResolve={changeStatus}
                superAdmin={superAdmin}
                currentUserId={user.id}
                goCreate={() => {
                  resetForm();
                  setView("create");
                }}
              />
            </SuperOnly>
          )}
          {view === "finance" && (
            <SuperOnly allowed={superAdmin}>
              <FinanceView
                overview={financeOverview}
                deposits={depositQueue}
                withdrawals={withdrawalQueue}
                transactions={financeTransactions}
                onApproveDeposit={(id) => handleFinanceAction(() => apiService.approveAdminDeposit(id), "Deposit approved.")}
                onRejectDeposit={(id) => handleFinanceAction(() => apiService.rejectAdminDeposit(id), "Deposit rejected.")}
                onApproveWithdrawal={(id) => handleFinanceAction(() => apiService.approveAdminWithdrawal(id), "Withdrawal marked paid.")}
                onRejectWithdrawal={(id) => handleFinanceAction(() => apiService.rejectAdminWithdrawal(id), "Withdrawal rejected and refunded.")}
              />
            </SuperOnly>
          )}
          {view === "transactions" && <SuperOnly allowed={superAdmin}><TransactionsView transactions={transactions} /></SuperOnly>}
          {view === "users" && <SuperOnly allowed={superAdmin}><UsersView users={users} /></SuperOnly>}
          {view === "add-admin" && <SuperOnly allowed={superAdmin}><AddAdminView admins={admins} email={newAdminEmail} setEmail={setNewAdminEmail} onSubmit={addAdmin} onRemove={removeAdmin} /></SuperOnly>}
          {view === "reports" && <SuperOnly allowed={superAdmin}><ReportsView analytics={analytics} /></SuperOnly>}
          {view === "settings" && <SettingsView />}
        </div>
      </main>
      {resolutionPreview && (
        <ResolutionConfirmModal
          market={resolutionPreview.market}
          outcome={resolutionPreview.outcome}
          summary={resolutionPreview.summary}
          loading={resolving}
          onCancel={() => setResolutionPreview(null)}
          onConfirm={confirmResolution}
        />
      )}
    </div>
  );
};

const navItems: Array<{ view: AdminView; label: string; icon: any; superOnly?: boolean }> = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "markets", label: "Markets", icon: BarChart3 },
  { view: "create", label: "Create Market", icon: Plus },
  { view: "resolution", label: "Resolution", icon: CheckCircle, superOnly: true },
  { view: "finance", label: "Finance", icon: ReceiptText, superOnly: true },
  { view: "transactions", label: "Transactions", icon: ReceiptText },
  { view: "users", label: "Users", icon: Users, superOnly: true },
  { view: "add-admin", label: "Add Admin", icon: ShieldPlus, superOnly: true },
  { view: "reports", label: "Reports", icon: FileText, superOnly: true },
  { view: "settings", label: "Settings", icon: Settings },
];

const AdminSidebar = ({ view, setView, superAdmin, compact = false }: { view: AdminView; setView: (view: AdminView) => void; superAdmin: boolean; compact?: boolean }) => (
  <nav className={compact ? "flex flex-wrap gap-2" : "space-y-1"}>
    {navItems.map((item) => {
      const locked = item.superOnly && !superAdmin;
      return (
        <button
          key={item.view}
          onClick={() => setView(item.view)}
          className={`${compact ? "rounded-xl px-3 py-2 text-xs" : "w-full rounded-2xl px-4 py-3 text-sm"} flex items-center gap-3 font-black transition ${
            view === item.view ? "bg-emerald-400/12 text-emerald-200" : locked ? "text-slate-600 hover:bg-white/5" : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
          {locked && <span className="ml-auto text-[10px] text-slate-600">Super</span>}
        </button>
      );
    })}
  </nav>
);

const DashboardView = ({ analytics, markets, loading, superAdmin }: { analytics: any; markets: AdminMarket[]; loading: boolean; superAdmin: boolean }) => {
  const stats = [
    { label: "Live markets", value: markets.filter((market) => market.status === "active").length, tone: "green" },
    { label: "Pending resolution", value: markets.filter((market) => ["closed", "pending_resolution"].includes(market.status)).length, tone: "amber" },
    { label: "Resolved markets", value: markets.filter((market) => market.status === "resolved").length, tone: "slate" },
    { label: "Today's volume", value: formatNaira(Number(analytics?.todayVolume || 0) / 100), tone: "slate" },
  ];

  if (superAdmin && analytics) {
    stats.push({ label: "Total users", value: analytics.totalUsers || 0, tone: "green" });
    stats.push({ label: "Today's active users", value: analytics.activeUsersToday || 0, tone: "green" });
    stats.push({ label: "Today's predictions", value: analytics.predictionsToday || 0, tone: "slate" });
    stats.push({ label: "Pending payouts", value: analytics.pendingPayouts || 0, tone: "amber" });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} loading={loading} />
      ))}
    </div>
  );
};

const ResolutionConfirmModal = ({ market, outcome, summary, loading, onCancel, onConfirm }: {
  market: AdminMarket;
  outcome: "YES" | "NO";
  summary: any;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#080d19] p-5 shadow-2xl">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Confirm settlement</p>
      <h2 className="mt-2 text-2xl font-black text-white">{market.question}</h2>
      <p className="mt-2 text-sm font-bold text-slate-400">
        You are about to resolve this market as <span className={outcome === "YES" ? "text-emerald-300" : "text-red-300"}>{outcome}</span>. Winners will be paid from their locked shares at purchase. This cannot be undone.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PreviewStat label="YES stake" value={formatNaira(summary?.totalYesStake || 0)} />
        <PreviewStat label="NO stake" value={formatNaira(summary?.totalNoStake || 0)} />
        <PreviewStat label="Winners" value={summary?.totalWinners || 0} />
        <PreviewStat label="Losers" value={summary?.totalLosers || 0} />
        <PreviewStat label="Total payout" value={formatNaira(summary?.totalPayout || 0)} highlight />
        <PreviewStat label="Platform fee" value={formatNaira(summary?.platformFee || 0)} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-black text-white">Locked-share payout preview</div>
        <div className="max-h-64 overflow-y-auto">
          {(summary?.positions || []).length === 0 ? (
            <div className="px-4 py-5 text-sm font-bold text-slate-500">No positions in this market yet.</div>
          ) : (
            summary.positions.map((position: any) => (
              <div key={position.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/10 px-4 py-3 text-sm last:border-0">
                <div>
                  <div className="font-black text-white">{position.username || position.userId}</div>
                  <div className="text-xs font-bold text-slate-500">
                    {position.side} · Stake {formatNaira(position.stake || 0)} · Entry ₦{Number(position.price || position.priceAtPurchase || 0).toFixed(1)} · Shares {Number(position.shares || position.sharesReceived || 0).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={position.status === "won" ? "font-black text-emerald-300" : "font-black text-red-300"}>{position.status}</div>
                  <div className="text-xs font-bold text-slate-400">Payout {formatNaira(position.payout || 0)}</div>
                  <div className={`text-xs font-bold ${Number(position.profit || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {Number(position.profit || 0) >= 0 ? "+" : ""}{formatNaira(position.profit || 0)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <Button type="button" onClick={onCancel} disabled={loading} variant="outline" className="h-12 flex-1 rounded-2xl border-white/10 bg-white/5 font-black text-white hover:bg-white/10">Cancel</Button>
        <Button type="button" onClick={onConfirm} disabled={loading} className="h-12 flex-1 rounded-2xl bg-emerald-500 font-black text-white hover:bg-emerald-400">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Resolve {outcome}
        </Button>
      </div>
    </div>
  </div>
);

const PreviewStat = ({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
    <div className="text-xs font-bold text-slate-500">{label}</div>
    <div className={`mt-1 text-xl font-black ${highlight ? "text-emerald-300" : "text-white"}`}>{value}</div>
  </div>
);

const MarketsView = ({ markets, loading, search, statusFilter, setSearch, setStatusFilter, reload, onEdit, onResolve, superAdmin, currentUserId, goCreate }: {
  markets: AdminMarket[];
  loading: boolean;
  search: string;
  statusFilter: string;
  setSearch: (value: string) => void;
  setStatusFilter: (value: string) => void;
  reload: () => void;
  onEdit: (market: AdminMarket) => void;
  onResolve: (market: AdminMarket, status: string, outcome?: "YES" | "NO" | "INVALID") => void;
  superAdmin: boolean;
  currentUserId: string;
  goCreate: () => void;
}) => (
  <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search markets..." className="h-12 rounded-2xl border-white/10 bg-white/[0.055] pl-11 text-white" />
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-[#0b1020] px-4 text-sm font-bold text-white">
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="pending_resolution">Pending resolution</option>
          <option value="cancelled">Cancelled</option>
          <option value="resolved">Resolved</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button onClick={reload} variant="outline" className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10">Refresh</Button>
        <Button onClick={goCreate} className="rounded-2xl bg-emerald-500 font-black text-white hover:bg-emerald-400"><Plus className="mr-2 h-4 w-4" />Create Market</Button>
      </div>
    </div>
    {loading ? (
      <div className="grid min-h-[240px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-300" /></div>
    ) : markets.length === 0 ? (
      <EmptyState title="No markets found" body="Create your first market or change your filters." />
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Prices</th>
              <th className="px-4 py-3">Volume</th>
              <th className="px-4 py-3">Ends</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {markets.map((market) => {
              const canEdit = superAdmin || market.created_by === currentUserId;
              return (
                <tr key={market.id} className="text-sm">
                  <td className="max-w-md px-4 py-4">
                    <div className="font-black text-white">{market.question}</div>
                    <div className="mt-1 text-xs text-slate-500">{market.category}</div>
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={market.status} /></td>
                  <td className="px-4 py-4">
                    <div className="font-black text-emerald-300">{market.yes_label || "YES"} {market.yes_price}%</div>
                    <div className="font-black text-red-300">{market.no_label || "NO"} {market.no_price}%</div>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{formatNaira(Number(market.pool_amount_smallest_unit || 0) / 100)}</td>
                  <td className="px-4 py-4 text-slate-400">{market.close_date ? new Date(market.close_date).toLocaleString() : "Not set"}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <IconAction disabled={!canEdit} onClick={() => onEdit(market)} icon={Edit} label="Edit" />
                      {superAdmin && (market.status === "closed" || market.status === "pending_resolution") && (
                        <>
                          <IconAction onClick={() => onResolve(market, "resolved", "YES")} icon={CheckCircle} label="YES" tone="green" />
                          <IconAction onClick={() => onResolve(market, "resolved", "NO")} icon={XCircle} label="NO" tone="red" />
                          <IconAction onClick={() => onResolve(market, "cancelled", "INVALID")} icon={XCircle} label="Cancel" />
                        </>
                      )}
                      {superAdmin && market.status === "resolved" && (
                        <IconAction onClick={() => onResolve(market, "archived")} icon={Shield} label="Archive" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const CreateMarketView = ({ form, setForm, saving, editing, onSubmit, onCancel }: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  saving: boolean;
  editing: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}) => {
  const yesPrice = Number(form.startingYesPrice || 50);
  const noPrice = Number(form.startingNoPrice || 50);
  const pricesValid = Number.isFinite(yesPrice) && Number.isFinite(noPrice) && Math.round(yesPrice + noPrice) === 100;

  return (
  <form onSubmit={onSubmit} className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
    <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
      <div className="mb-5">
        <h2 className="text-2xl font-black">Create a live forecast</h2>
        <p className="mt-1 text-sm text-slate-500">Keep it sharp. A user should understand the market in seconds.</p>
      </div>
      <div className="grid gap-4">
        <Field label="Question"><Input value={form.question} onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))} placeholder="Will Nigeria qualify for the 2026 World Cup?" className={adminInputClass} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category"><Select value={form.category} onChange={(value) => setForm((prev) => ({ ...prev, category: value }))} options={categories} /></Field>
          <Field label="Market type"><Select value={form.marketKind} onChange={(value) => setForm((prev) => ({ ...prev, marketKind: value as MarketKind }))} options={["YES/NO", "UP/DOWN", "Bigger/Smaller"]} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="End date"><Input type="datetime-local" value={form.endDateTime} onChange={(event) => setForm((prev) => ({ ...prev, endDateTime: event.target.value }))} className={adminInputClass} /></Field>
          <Field label="Starting YES price"><Input type="number" min={1} max={99} value={form.startingYesPrice} onChange={(event) => setForm((prev) => ({ ...prev, startingYesPrice: event.target.value, startingNoPrice: String(100 - Number(event.target.value || 0)) }))} className={adminInputClass} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starting NO price"><Input type="number" min={1} max={99} value={form.startingNoPrice} onChange={(event) => setForm((prev) => ({ ...prev, startingNoPrice: event.target.value, startingYesPrice: String(100 - Number(event.target.value || 0)) }))} className={adminInputClass} /></Field>
          <Field label="Price check"><div className={`flex h-12 items-center rounded-2xl border px-4 text-sm font-black ${pricesValid ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200" : "border-red-300/20 bg-red-400/10 text-red-200"}`}>YES {yesPrice || 0} / NO {noPrice || 0}</div></Field>
        </div>
        <Field label="Rules"><Textarea value={form.resolutionInstructions} onChange={(event) => setForm((prev) => ({ ...prev, resolutionInstructions: event.target.value }))} rows={3} placeholder="What exactly must happen for this market to resolve?" className={`${adminInputClass} min-h-24`} /></Field>
        <Field label="Resolution source"><Input value={form.resolutionSource} onChange={(event) => setForm((prev) => ({ ...prev, resolutionSource: event.target.value }))} placeholder="Official source, exchange, sports body, public result..." className={adminInputClass} /></Field>
      </div>
    </section>

    <aside className="min-w-0 space-y-6">
      <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
        <h2 className="mb-4 text-xl font-black">Money limits</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Field label="Minimum amount"><Input type="number" value={form.minAmount} onChange={(event) => setForm((prev) => ({ ...prev, minAmount: event.target.value }))} className={adminInputClass} /></Field>
          <Field label="Maximum amount"><Input type="number" value={form.maxAmount} onChange={(event) => setForm((prev) => ({ ...prev, maxAmount: event.target.value }))} className={adminInputClass} /></Field>
        </div>
      </section>

      <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
        <h2 className="mb-4 text-xl font-black">Media</h2>
        <div className="grid gap-3">
          <MediaInput label="Image" accept="image/*" file={form.imageFile} existing={form.existingImageUrl} onChange={(file) => setForm((prev) => ({ ...prev, imageFile: file }))} />
          <MediaInput label="Short video" accept="video/mp4,video/webm,video/quicktime" file={form.videoFile} existing={form.existingVideoUrl} onChange={(file) => setForm((prev) => ({ ...prev, videoFile: file }))} />
          <p className="text-xs font-bold text-slate-500">A market must have at least one image or video.</p>
        </div>
      </section>

      <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="font-black">Mark as trending</span>
            <input type="checkbox" checked={form.trending} onChange={(event) => setForm((prev) => ({ ...prev, trending: event.target.checked }))} className="h-5 w-5 accent-emerald-500" />
          </label>
          <Field label="Status"><Select value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value as "draft" | "active" }))} options={["active", "draft"]} /></Field>
        </div>
      </section>

      <section className="min-w-0 rounded-[2rem] border border-emerald-300/20 bg-emerald-400/10 p-5">
        <h2 className="mb-4 text-xl font-black">User preview</h2>
        <div className="rounded-3xl border border-white/10 bg-[#080d19] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-300">{form.category}</span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">Live</span>
          </div>
          <div className="line-clamp-3 text-lg font-black">{form.question || "Market question appears here"}</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-emerald-400/10 p-3 text-sm font-black text-emerald-200">YES {yesPrice || 0}</div>
            <div className="rounded-2xl bg-red-400/10 p-3 text-sm font-black text-red-200">NO {noPrice || 0}</div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Users buy YES/NO shares at the live sentiment price. Prices must always add up to 100.</p>
          <p className="mt-2 text-xs text-slate-500">This is how users will see the market. Confirm before publishing.</p>
        </div>
      </section>

      <div className="flex min-w-0 gap-3">
        <Button type="button" onClick={onCancel} variant="outline" className="h-12 flex-1 rounded-2xl border-white/10 bg-white/5 font-black text-white hover:bg-white/10">Cancel</Button>
        <Button type="submit" disabled={saving} className="h-12 flex-1 rounded-2xl bg-emerald-500 font-black text-white hover:bg-emerald-400">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          {editing ? "Save" : "Create"}
        </Button>
      </div>
    </aside>
  </form>
  );
};

const TransactionsView = ({ transactions }: { transactions: ApiTransaction[] }) => (
  <DataPanel title="Transactions" empty="No transactions yet.">
    {transactions.map((tx) => (
      <DataRow key={tx.id} title={tx.type.replace(/_/g, " ")} subtitle={tx.createdAt ? new Date(tx.createdAt).toLocaleString() : tx.status} value={`${tx.direction === "IN" ? "+" : "-"}${formatNaira(tx.amount)}`} />
    ))}
  </DataPanel>
);

const FinanceView = ({ overview, deposits, withdrawals, transactions, onApproveDeposit, onRejectDeposit, onApproveWithdrawal, onRejectWithdrawal }: {
  overview: Record<string, number> | null;
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  transactions: ApiTransaction[];
  onApproveDeposit: (id: string) => void;
  onRejectDeposit: (id: string) => void;
  onApproveWithdrawal: (id: string) => void;
  onRejectWithdrawal: (id: string) => void;
}) => (
  <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total user balances" value={formatNaira(overview?.totalUserBalances || 0)} tone="green" />
      <StatCard label="Pending deposits" value={overview?.pendingDeposits || 0} tone="amber" />
      <StatCard label="Pending withdrawals" value={overview?.pendingWithdrawals || 0} tone="amber" />
      <StatCard label="Today prediction volume" value={formatNaira(overview?.todayPredictionVolume || 0)} tone="slate" />
      <StatCard label="Total deposits" value={formatNaira(overview?.totalDeposits || 0)} tone="green" />
      <StatCard label="Total withdrawals" value={formatNaira(overview?.totalWithdrawals || 0)} tone="slate" />
      <StatCard label="Today deposits" value={formatNaira(overview?.todayDeposits || 0)} tone="green" />
      <StatCard label="Today withdrawals" value={formatNaira(overview?.todayWithdrawals || 0)} tone="slate" />
    </div>

    <section className="grid gap-5 xl:grid-cols-2">
      <FinanceQueue title="Deposit queue" empty="No pending deposits.">
        {deposits.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-[#0b1020]/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-black text-white">{item.user?.username || item.user?.email || "User"}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">{item.reference} · {new Date(item.createdAt).toLocaleString()}</div>
                <div className="mt-2 text-sm font-black text-emerald-300">{formatNaira(item.amount)}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => onApproveDeposit(item.id)} className="rounded-xl bg-emerald-500 font-black text-white hover:bg-emerald-400">Approve</Button>
                <Button onClick={() => onRejectDeposit(item.id)} variant="outline" className="rounded-xl border-red-300/20 bg-red-400/10 font-black text-red-200 hover:bg-red-400/20">Reject</Button>
              </div>
            </div>
            <p className="mt-3 text-xs font-bold text-slate-500">{item.paymentInstruction}</p>
          </div>
        ))}
      </FinanceQueue>

      <FinanceQueue title="Withdrawal queue" empty="No pending withdrawals.">
        {withdrawals.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-[#0b1020]/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-black text-white">{item.user?.username || item.user?.email || "User"}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">{item.reference} · {new Date(item.createdAt).toLocaleString()}</div>
                <div className="mt-2 text-sm font-black text-red-300">{formatNaira(item.amount)}</div>
                <div className="mt-2 text-xs font-bold text-slate-400">{item.bankName} · {item.accountNumber} · {item.accountName}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => onApproveWithdrawal(item.id)} className="rounded-xl bg-emerald-500 font-black text-white hover:bg-emerald-400">Paid</Button>
                <Button onClick={() => onRejectWithdrawal(item.id)} variant="outline" className="rounded-xl border-red-300/20 bg-red-400/10 font-black text-red-200 hover:bg-red-400/20">Reject</Button>
              </div>
            </div>
          </div>
        ))}
      </FinanceQueue>
    </section>

    <DataPanel title="Finance ledger" empty="No ledger records yet.">
      {transactions.slice(0, 80).map((tx) => (
        <DataRow key={tx.id} title={tx.type.replace(/_/g, " ")} subtitle={`${tx.reference || tx.status} · ${tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ""}`} value={`${tx.direction === "IN" ? "+" : tx.direction === "OUT" || tx.direction === "HOLD" ? "-" : ""}${formatNaira(tx.amount)}`} />
      ))}
    </DataPanel>
  </div>
);

const FinanceQueue = ({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) => {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      {Array.isArray(items) && items.length === 0 ? <EmptyState title={empty} body="Nothing needs review right now." /> : <div className="space-y-3">{children}</div>}
    </section>
  );
};

const UsersView = ({ users }: { users: AdminUser[] }) => (
  <DataPanel title="Users" empty="No users found.">
    {users.map((item) => (
      <DataRow key={item.id} title={item.username || item.email} subtitle={item.email} value={item.role.replace("_", " ")} />
    ))}
  </DataPanel>
);

const AddAdminView = ({ admins, email, setEmail, onSubmit, onRemove }: { admins: AdminRecord[]; email: string; setEmail: (value: string) => void; onSubmit: (event: React.FormEvent) => void; onRemove: (id: string) => void }) => (
  <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
    <form onSubmit={onSubmit} className="mb-6 flex gap-3">
      <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" className="h-12 rounded-2xl border-white/10 bg-white/[0.055] text-white" />
      <Button className="h-12 rounded-2xl bg-emerald-500 font-black text-white hover:bg-emerald-400">Add Admin</Button>
    </form>
    <div className="space-y-3">
      {admins.map((admin) => (
        <div key={admin.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0b1020]/80 p-4">
          <div>
            <div className="font-black">{admin.username || admin.email}</div>
            <div className="text-sm text-slate-500">{admin.email} · {admin.role.replace("_", " ")}</div>
          </div>
          {!admin.isPrimary && <Button onClick={() => onRemove(admin.id)} variant="outline" className="rounded-2xl border-red-300/20 bg-red-400/10 text-red-200 hover:bg-red-400/20">Remove</Button>}
        </div>
      ))}
    </div>
  </section>
);

const ReportsView = ({ analytics }: { analytics: any }) => (
  <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
    <h2 className="text-xl font-black">Reports</h2>
    <p className="mt-1 text-sm text-slate-500">Platform summary for super admins.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-3">
      <StatCard label="Users" value={analytics?.totalUsers || 0} tone="slate" />
      <StatCard label="Predictions" value={analytics?.totalForecasts || 0} tone="green" />
      <StatCard label="Volume" value={formatNaira(Number(analytics?.totalVolume || 0) / 100)} tone="slate" />
    </div>
  </section>
);

const SettingsView = () => (
  <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
    <h2 className="text-xl font-black">Settings</h2>
    <p className="mt-2 text-sm text-slate-400">Admin settings will live here as the product grows.</p>
  </section>
);

const SuperOnly = ({ allowed, children }: { allowed: boolean; children: React.ReactNode }) => (
  allowed ? <>{children}</> : <EmptyState title="Super admin only" body="This page is locked for admin accounts." />
);

const StatCard = ({ label, value, tone = "slate", loading = false }: { label: string; value: React.ReactNode; tone?: string; loading?: boolean }) => (
  <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
    <div className="text-sm font-bold text-slate-500">{label}</div>
    <div className={`mt-3 text-3xl font-black ${tone === "green" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : "text-slate-300"}`}>{loading ? "..." : value}</div>
  </div>
);

const DataPanel = ({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) => {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
      <h2 className="mb-5 text-xl font-black">{title}</h2>
      {Array.isArray(items) && items.length === 0 ? <EmptyState title={empty} body="Nothing to show yet." /> : <div className="space-y-3">{children}</div>}
    </section>
  );
};

const DataRow = ({ title, subtitle, value }: { title: string; subtitle?: string; value?: string }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1020]/80 p-4">
    <div className="min-w-0">
      <div className="truncate font-black capitalize">{title}</div>
      {subtitle && <div className="mt-1 truncate text-sm text-slate-500">{subtitle}</div>}
    </div>
    {value && <div className="shrink-0 text-sm font-black text-emerald-300">{value}</div>}
  </div>
);

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="grid min-h-[220px] place-items-center rounded-3xl border border-dashed border-white/10 bg-[#0b1020]/70 text-center">
    <div>
      <Activity className="mx-auto mb-3 h-8 w-8 text-emerald-300" />
      <div className="font-black">{title}</div>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
    {children}
  </label>
);

const Select = ({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) => (
  <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-2xl border border-white/10 bg-[#0b1020] px-4 text-sm font-bold text-white">
    {options.map((option) => <option key={option} value={option}>{option}</option>)}
  </select>
);

const MediaInput = ({ label, accept, file, existing, onChange }: { label: string; accept: string; file: File | null; existing: string; onChange: (file: File | null) => void }) => (
  <label className="flex min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]">
    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/12 text-emerald-300">
      {label === "Image" ? <Image className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
    </div>
    <div className="min-w-0 flex-1 overflow-hidden">
      <div className="font-black">{label}</div>
      <div title={file?.name || existing || ""} className="max-w-full truncate text-xs text-slate-500">
        {file?.name || (existing ? "Current media saved" : "Choose file")}
      </div>
    </div>
    <input type="file" accept={accept} onChange={(event) => onChange(event.target.files?.[0] || null)} className="hidden" />
  </label>
);

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${
    status === "active" ? "bg-emerald-400/10 text-emerald-300" :
    status === "resolved" ? "bg-slate-400/10 text-slate-300" :
    status === "draft" ? "bg-slate-400/10 text-slate-300" :
    "bg-red-400/10 text-red-300"
  }`}>{status}</span>
);

const IconAction = ({ icon: Icon, label, onClick, disabled = false, tone = "slate" }: { icon: any; label: string; onClick: () => void; disabled?: boolean; tone?: "slate" | "green" | "red" }) => (
  <button disabled={disabled} onClick={onClick} title={label} className={`grid h-9 w-9 place-items-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-35 ${
    tone === "green" ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300" :
    tone === "red" ? "border-red-300/20 bg-red-400/10 text-red-300" :
    "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
  }`}>
    <Icon className="h-4 w-4" />
  </button>
);

const labelsForKind = (kind: MarketKind) => {
  if (kind === "UP/DOWN") return { yes: "UP", no: "DOWN" };
  if (kind === "Bigger/Smaller") return { yes: "BIGGER", no: "SMALLER" };
  return { yes: "YES", no: "NO" };
};

const labelsToKind = (yes?: string, no?: string): MarketKind => {
  if (yes === "UP" || no === "DOWN") return "UP/DOWN";
  if (yes === "BIGGER" || no === "SMALLER") return "Bigger/Smaller";
  return "YES/NO";
};

const toDatetimeLocal = (date?: string) => {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const titleForView = (view: AdminView) => {
  const item = navItems.find((nav) => nav.view === view);
  return item?.label || "Admin";
};

export default Admin;
