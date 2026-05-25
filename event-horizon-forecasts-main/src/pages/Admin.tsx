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
import { formatNaira } from "@/lib/markets";

type AdminView = "dashboard" | "markets" | "create" | "transactions" | "users" | "add-admin" | "reports" | "settings";
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
  startingProbability: 50,
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
const adminInputClass = "h-12 rounded-2xl border-white/10 bg-white/[0.055] text-white placeholder:text-slate-500 focus:border-violet-300";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMarket, setEditingMarket] = useState<AdminMarket | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newAdminEmail, setNewAdminEmail] = useState("");

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
        const [analyticsResponse, adminsResponse, usersResponse, transactionsResponse] = await Promise.allSettled([
          apiService.getAnalytics(),
          apiService.listAdmins(),
          apiService.listAdminUsers(),
          apiService.listAdminTransactions(),
        ]);

        if (analyticsResponse.status === "fulfilled") setAnalytics(analyticsResponse.value);
        if (adminsResponse.status === "fulfilled") setAdmins(adminsResponse.value.admins || []);
        if (usersResponse.status === "fulfilled") setUsers(usersResponse.value.users || []);
        if (transactionsResponse.status === "fulfilled") setTransactions(transactionsResponse.value.transactions || []);
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
      startingProbability: Number(market.yes_price || 50),
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
    if (!form.description.trim()) throw new Error("Description is required.");
    if (!form.endDateTime) throw new Error("End date and time is required.");
    if (!form.resolutionInstructions.trim()) throw new Error("Resolution instructions are required.");
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
    const yesPrice = Number(form.startingProbability);

    return {
      question: form.question.trim(),
      description: form.description.trim(),
      category: form.category,
      market_type: "binary",
      yes_label: labels.yes,
      no_label: labels.no,
      yes_price: yesPrice,
      no_price: 100 - yesPrice,
      close_date: closeDate.toISOString(),
      resolution_date: resolutionDate.toISOString(),
      resolution_source: form.resolutionSource.trim(),
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
      await apiService.updateAdminMarketStatus(market.id, {
        status,
        outcome,
        resolution_source: market.resolution_source || "Admin resolution",
      });
      toast.success("Market updated.");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Could not update market.");
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
    <div className="min-h-screen bg-[#050711] text-white">
      <div className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-[#070a14]/95 p-5 xl:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/20 text-violet-200">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl font-black">Flippe Admin</div>
            <div className="text-xs capitalize text-slate-500">{user.role.replace("_", " ")}</div>
          </div>
        </div>
        <AdminSidebar view={view} setView={setView} superAdmin={superAdmin} />
      </div>

      <main className="min-h-screen px-4 py-5 sm:px-6 xl:ml-72">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-violet-300">Admin</p>
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
          {view === "transactions" && <SuperOnly allowed={superAdmin}><TransactionsView transactions={transactions} /></SuperOnly>}
          {view === "users" && <SuperOnly allowed={superAdmin}><UsersView users={users} /></SuperOnly>}
          {view === "add-admin" && <SuperOnly allowed={superAdmin}><AddAdminView admins={admins} email={newAdminEmail} setEmail={setNewAdminEmail} onSubmit={addAdmin} onRemove={removeAdmin} /></SuperOnly>}
          {view === "reports" && <SuperOnly allowed={superAdmin}><ReportsView analytics={analytics} /></SuperOnly>}
          {view === "settings" && <SettingsView />}
        </div>
      </main>
    </div>
  );
};

const navItems: Array<{ view: AdminView; label: string; icon: any; superOnly?: boolean }> = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "markets", label: "Markets", icon: BarChart3 },
  { view: "create", label: "Create Market", icon: Plus },
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
            view === item.view ? "bg-violet-500/20 text-violet-100" : locked ? "text-slate-600 hover:bg-white/5" : "text-slate-400 hover:bg-white/5 hover:text-white"
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
    { label: "Markets", value: markets.length, tone: "violet" },
    { label: "Active", value: markets.filter((market) => market.status === "active").length, tone: "green" },
    { label: "Drafts", value: markets.filter((market) => market.status === "draft").length, tone: "slate" },
    { label: "Volume", value: formatNaira(markets.reduce((sum, market) => sum + Number(market.pool_amount_smallest_unit || 0) / 100, 0)), tone: "violet" },
  ];

  if (superAdmin && analytics) {
    stats.push({ label: "Users", value: analytics.totalUsers || 0, tone: "green" });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} loading={loading} />
      ))}
    </div>
  );
};

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
          <option value="paused">Paused</option>
          <option value="resolved">Resolved</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button onClick={reload} variant="outline" className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10">Refresh</Button>
        <Button onClick={goCreate} className="rounded-2xl bg-violet-500 font-black text-white hover:bg-violet-400"><Plus className="mr-2 h-4 w-4" />Create Market</Button>
      </div>
    </div>
    {loading ? (
      <div className="grid min-h-[240px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-violet-300" /></div>
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
                      {superAdmin && market.status !== "resolved" && (
                        <>
                          <IconAction onClick={() => onResolve(market, "resolved", "YES")} icon={CheckCircle} label="YES" tone="green" />
                          <IconAction onClick={() => onResolve(market, "resolved", "NO")} icon={XCircle} label="NO" tone="red" />
                        </>
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
}) => (
  <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
      <div className="grid gap-4">
        <Field label="Question"><Input value={form.question} onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))} placeholder="Will Nigeria win the AFCON 2026?" className={adminInputClass} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category"><Select value={form.category} onChange={(value) => setForm((prev) => ({ ...prev, category: value }))} options={categories} /></Field>
          <Field label="Market type"><Select value={form.marketKind} onChange={(value) => setForm((prev) => ({ ...prev, marketKind: value as MarketKind }))} options={["YES/NO", "UP/DOWN", "Bigger/Smaller"]} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starting probability"><Input type="number" min={1} max={99} value={form.startingProbability} onChange={(event) => setForm((prev) => ({ ...prev, startingProbability: Number(event.target.value) }))} className={adminInputClass} /></Field>
          <Field label="End date/time"><Input type="datetime-local" value={form.endDateTime} onChange={(event) => setForm((prev) => ({ ...prev, endDateTime: event.target.value }))} className={adminInputClass} /></Field>
        </div>
        <Field label="Description"><Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={5} placeholder="Explain this market in simple words." className={`${adminInputClass} min-h-32`} /></Field>
        <Field label="Resolution instructions"><Textarea value={form.resolutionInstructions} onChange={(event) => setForm((prev) => ({ ...prev, resolutionInstructions: event.target.value }))} rows={4} placeholder="Explain exactly how this market should be resolved." className={`${adminInputClass} min-h-28`} /></Field>
        <Field label="Resolution source"><Input value={form.resolutionSource} onChange={(event) => setForm((prev) => ({ ...prev, resolutionSource: event.target.value }))} placeholder="Official site, exchange, sports body, or news source" className={adminInputClass} /></Field>
      </div>
    </section>

    <aside className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
        <h2 className="mb-4 text-xl font-black">Money limits</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Field label="Minimum amount"><Input type="number" value={form.minAmount} onChange={(event) => setForm((prev) => ({ ...prev, minAmount: event.target.value }))} className={adminInputClass} /></Field>
          <Field label="Maximum amount"><Input type="number" value={form.maxAmount} onChange={(event) => setForm((prev) => ({ ...prev, maxAmount: event.target.value }))} className={adminInputClass} /></Field>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
        <h2 className="mb-4 text-xl font-black">Media</h2>
        <div className="grid gap-3">
          <MediaInput label="Image" accept="image/*" file={form.imageFile} existing={form.existingImageUrl} onChange={(file) => setForm((prev) => ({ ...prev, imageFile: file }))} />
          <MediaInput label="Short video" accept="video/mp4,video/webm,video/quicktime" file={form.videoFile} existing={form.existingVideoUrl} onChange={(file) => setForm((prev) => ({ ...prev, videoFile: file }))} />
          <p className="text-xs font-bold text-slate-500">A market must have at least one image or video.</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="font-black">Mark as trending</span>
            <input type="checkbox" checked={form.trending} onChange={(event) => setForm((prev) => ({ ...prev, trending: event.target.checked }))} className="h-5 w-5 accent-violet-500" />
          </label>
          <Field label="Status"><Select value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value as "draft" | "active" }))} options={["active", "draft"]} /></Field>
        </div>
      </section>

      <div className="flex gap-3">
        <Button type="button" onClick={onCancel} variant="outline" className="h-12 flex-1 rounded-2xl border-white/10 bg-white/5 font-black text-white hover:bg-white/10">Cancel</Button>
        <Button type="submit" disabled={saving} className="h-12 flex-1 rounded-2xl bg-violet-500 font-black text-white hover:bg-violet-400">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          {editing ? "Save" : "Create"}
        </Button>
      </div>
    </aside>
  </form>
);

const TransactionsView = ({ transactions }: { transactions: ApiTransaction[] }) => (
  <DataPanel title="Transactions" empty="No transactions yet.">
    {transactions.map((tx) => (
      <DataRow key={tx.id} title={tx.type.replace(/_/g, " ")} subtitle={tx.createdAt ? new Date(tx.createdAt).toLocaleString() : tx.status} value={`${tx.direction === "IN" ? "+" : "-"}${formatNaira(tx.amount)}`} />
    ))}
  </DataPanel>
);

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
      <Button className="h-12 rounded-2xl bg-violet-500 font-black text-white hover:bg-violet-400">Add Admin</Button>
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
      <StatCard label="Users" value={analytics?.totalUsers || 0} tone="violet" />
      <StatCard label="Predictions" value={analytics?.totalForecasts || 0} tone="green" />
      <StatCard label="Volume" value={formatNaira(Number(analytics?.totalVolume || 0) / 100)} tone="violet" />
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

const StatCard = ({ label, value, tone = "violet", loading = false }: { label: string; value: React.ReactNode; tone?: string; loading?: boolean }) => (
  <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
    <div className="text-sm font-bold text-slate-500">{label}</div>
    <div className={`mt-3 text-3xl font-black ${tone === "green" ? "text-emerald-300" : tone === "slate" ? "text-slate-300" : "text-violet-300"}`}>{loading ? "..." : value}</div>
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
    {value && <div className="shrink-0 text-sm font-black text-violet-300">{value}</div>}
  </div>
);

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="grid min-h-[220px] place-items-center rounded-3xl border border-dashed border-white/10 bg-[#0b1020]/70 text-center">
    <div>
      <Activity className="mx-auto mb-3 h-8 w-8 text-violet-300" />
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
  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]">
    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/20 text-violet-200">
      {label === "Image" ? <Image className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
    </div>
    <div className="min-w-0 flex-1">
      <div className="font-black">{label}</div>
      <div className="truncate text-xs text-slate-500">{file?.name || (existing ? "Current media saved" : "Choose file")}</div>
    </div>
    <input type="file" accept={accept} onChange={(event) => onChange(event.target.files?.[0] || null)} className="hidden" />
  </label>
);

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${
    status === "active" ? "bg-emerald-400/10 text-emerald-300" :
    status === "resolved" ? "bg-violet-400/10 text-violet-300" :
    status === "draft" ? "bg-slate-400/10 text-slate-300" :
    "bg-red-400/10 text-red-300"
  }`}>{status}</span>
);

const IconAction = ({ icon: Icon, label, onClick, disabled = false, tone = "violet" }: { icon: any; label: string; onClick: () => void; disabled?: boolean; tone?: "violet" | "green" | "red" }) => (
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
