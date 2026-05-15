import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Activity,
  Search,
  Filter,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNaira } from "@/lib/markets";
import { CreateMarketModal } from "@/components/admin/CreateMarketModal";
import { EditMarketModal } from "@/components/admin/EditMarketModal";
import { toast } from "sonner";

// Super admin emails
const SUPER_ADMIN_EMAILS = [
  "fehintoluwaolu@gmail.com",
  "oluwasinaayomifetuga@gmail.com"
];

type Market = {
  id: string;
  question: string;
  category: string;
  status: "draft" | "active" | "closed" | "resolved";
  yesPool: number;
  noPool: number;
  totalPool: number;
  participants: number;
  yesPrice: number;
  noPrice: number;
  closeTime: string;
  createdAt: string;
};

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  // Check if user is admin
  const isAdmin = user && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!isAdmin) {
      navigate("/");
      return;
    }

    // Load markets
    loadMarkets();
  }, [user, isAdmin, navigate]);

  const loadMarkets = async () => {
    setLoading(true);
    // TODO: Fetch from API
    // For now, use empty array
    setTimeout(() => {
      setMarkets([]);
      setLoading(false);
    }, 500);
  };

  const handleCreateMarket = async (marketData: any) => {
    // Show coming soon toast
    toast("Coming soon", {
      description: "Market creation is currently in development",
    });
    setCreateModalOpen(false);
  };

  const handleEditMarket = async (marketData: any) => {
    // Show coming soon toast
    toast("Coming soon", {
      description: "Market editing is currently in development",
    });
    setEditModalOpen(false);
    setSelectedMarket(null);
  };

  const handleDeleteMarket = async (marketId: string) => {
    toast("Coming soon", {
      description: "Market deletion is currently in development",
    });
  };

  const handleCloseMarket = async (marketId: string) => {
    toast("Coming soon", {
      description: "Market closing is currently in development",
    });
  };

  const handleResolveMarket = async (marketId: string, outcome: "YES" | "NO") => {
    toast("Coming soon", {
      description: "Market resolution is currently in development",
    });
  };

  const filteredMarkets = markets.filter(m => {
    const matchesSearch = m.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />
      <main className="flex-1 container max-w-7xl mx-auto py-10 px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-charcoal flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-purple/10 grid place-items-center text-purple">
              🛠️
            </span>
            Admin Dashboard
          </h1>
          <p className="text-graphite mt-2 text-sm">Manage markets, monitor activity, and control platform settings.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Markets", value: markets.length, color: "text-purple bg-purple/10" },
            { label: "Active", value: markets.filter(m => m.status === "active").length, color: "text-emerald bg-emerald-soft" },
            { label: "Closed", value: markets.filter(m => m.status === "closed").length, color: "text-amber-600 bg-amber-50" },
            { label: "Resolved", value: markets.filter(m => m.status === "resolved").length, color: "text-blue-600 bg-blue-50" },
          ].map((stat, i) => (
            <div key={stat.label} className="bg-off-white rounded-lg p-5 shadow-card border border-border/50 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="text-tiny text-graphite font-medium uppercase tracking-wide">{stat.label}</div>
              <div className={`text-3xl font-extrabold mt-2 tracking-tight ${stat.color.split(' ')[0]}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="bg-off-white rounded-lg p-4 shadow-card border border-border/50 mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex-1 flex gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite" />
                <Input
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-purple"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-purple hover:bg-purple/90 text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Market
            </Button>
          </div>
        </div>

        {/* Markets Table */}
        <div className="bg-off-white rounded-lg shadow-card border border-border/50 overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-lg bg-graphite/10 animate-shimmer" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          ) : filteredMarkets.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-graphite/10 grid place-items-center mx-auto mb-4 text-3xl">
                📊
              </div>
              <p className="text-sm font-semibold mb-1 text-charcoal">No markets found</p>
              <p className="text-xs text-graphite mb-4">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Create your first market to get started"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="bg-purple hover:bg-purple/90 text-white font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Market
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <table className="w-full">
                  <thead className="bg-graphite/5 border-b border-border/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-graphite">Market</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-graphite">Category</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-graphite">Status</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-graphite">Pool</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-graphite">Participants</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-graphite">Prices</th>
                      <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-graphite">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredMarkets.map((market, index) => (
                      <tr key={market.id} className="hover:bg-graphite/5 transition-fast animate-fade-up" style={{ animationDelay: `${index * 30}ms` }}>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-sm text-charcoal max-w-md truncate">{market.question}</div>
                          <div className="text-xs text-graphite mt-0.5">ID: {market.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-graphite/10 text-graphite">
                            {market.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            market.status === "active" ? "bg-emerald-soft text-emerald" :
                            market.status === "closed" ? "bg-amber-50 text-amber-600" :
                            market.status === "resolved" ? "bg-blue-50 text-blue-600" :
                            "bg-graphite/10 text-graphite"
                          }`}>
                            {market.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-charcoal">{formatNaira(market.totalPool)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-charcoal">{market.participants}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs space-y-0.5">
                            <div className="text-emerald font-semibold">YES: {market.yesPrice}%</div>
                            <div className="text-coral font-semibold">NO: {market.noPrice}%</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedMarket(market);
                                setEditModalOpen(true);
                              }}
                              className="p-2 rounded-lg hover:bg-graphite/10 text-graphite hover:text-charcoal transition-fast"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {market.status === "active" && (
                              <button
                                onClick={() => handleCloseMarket(market.id)}
                                className="p-2 rounded-lg hover:bg-amber-50 text-amber-600 transition-fast"
                                title="Close Market"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            {market.status === "closed" && (
                              <>
                                <button
                                  onClick={() => handleResolveMarket(market.id, "YES")}
                                  className="p-2 rounded-lg hover:bg-emerald-soft text-emerald transition-fast"
                                  title="Resolve as YES"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleResolveMarket(market.id, "NO")}
                                  className="p-2 rounded-lg hover:bg-coral-soft text-coral transition-fast"
                                  title="Resolve as NO"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteMarket(market.id)}
                              className="p-2 rounded-lg hover:bg-coral-soft text-coral transition-fast"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateMarketModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateMarket}
      />
      
      {selectedMarket && (
        <EditMarketModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedMarket(null);
          }}
          market={selectedMarket}
          onSubmit={handleEditMarket}
        />
      )}

      <Footer />
      <MobileNav />
    </div>
  );
};

export default Admin;
