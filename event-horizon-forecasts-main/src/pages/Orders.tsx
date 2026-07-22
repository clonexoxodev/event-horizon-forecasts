import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  Loader2,
  XCircle,
  CheckCircle,
  AlertCircle,
  Send,
  ChevronRight,
  Info,
  X,
  Layers,
} from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import apiService, { type ApiOrder } from "@/lib/api";
import { formatNaira } from "@/lib/markets";
import { toast } from "sonner";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";
import { AnimatedNumber } from "@/components/AnimatedNumber";

type OrderTab = "pending" | "filled" | "cancelled";

const DISMISS_KEY = "orders_info_dismissed";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "text-[#D97706]", bg: "bg-[#FEF3C7]", icon: <Clock className="h-3 w-3" /> },
  waiting: { label: "Waiting", color: "text-[#2563EB]", bg: "bg-[#DBEAFE]", icon: <Clock className="h-3 w-3" /> },
  partial: { label: "Partially Filled", color: "text-[#7C3AED]", bg: "bg-[#EDE9FE]", icon: <Send className="h-3 w-3" /> },
  filled: { label: "Filled", color: "text-[#047857]", bg: "bg-[#D1FAE5]", icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", color: "text-[#6B7280]", bg: "bg-[#F3F4F6]", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "Expired", color: "text-[#6B7280]", bg: "bg-[#F3F4F6]", icon: <AlertCircle className="h-3 w-3" /> },
  refunded: { label: "Refunded", color: "text-[#B45309]", bg: "bg-[#FEF3C7]", icon: <AlertCircle className="h-3 w-3" /> },
};

const Orders = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [allOrders, setAllOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderTab>("pending");
  const [infoDismissed, setInfoDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "true"; } catch { return false; }
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    let mounted = true;
    const loadOrders = async () => {
      try {
        const positionsRes = await apiService.getPositions();
        const positions = positionsRes.positions || [];
        const allOrdersList: ApiOrder[] = [];
        for (const pos of positions) {
          try {
            const res = await apiService.getUserOrders(pos.marketId);
            allOrdersList.push(...(res.orders || []));
          } catch { /* best-effort */ }
        }
        if (!mounted) return;
        setAllOrders(allOrdersList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch { /* best-effort */ }
      if (mounted) setLoading(false);
    };
    loadOrders();
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") loadOrders();
    }, 30000);
    return () => { mounted = false; window.clearInterval(refresh); };
  }, [authLoading, user]);

  const pendingOrders = useMemo(
    () => allOrders.filter((o) => ["waiting", "partial", "pending"].includes(o.status)),
    [allOrders]
  );
  const filledOrders = useMemo(() => allOrders.filter((o) => o.status === "filled"), [allOrders]);
  const cancelledOrders = useMemo(
    () => allOrders.filter((o) => ["cancelled", "expired", "refunded"].includes(o.status)),
    [allOrders]
  );

  const currentOrders = activeTab === "pending" ? pendingOrders : activeTab === "filled" ? filledOrders : cancelledOrders;

  const cancelOrderHandler = async (orderId: string, marketId: string) => {
    try {
      await apiService.cancelOrder(marketId, orderId);
      setAllOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "cancelled" as const } : o));
      toast.success("Order cancelled.");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel order.");
    }
  };

  const dismissInfo = () => {
    setInfoDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "true"); } catch { /* ignore */ }
  };

  if (authLoading) {
    return <DelayedFlippeLoader active label="Loading orders..." />;
  }

  if (!user) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 text-center">
          <div>
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5]">
              <Layers className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-black tracking-tight">Track your orders</h1>
            <p className="mt-1.5 text-sm text-[#9CA3AF]">Log in to see your pending and past orders.</p>
            <Link
              to="/login"
              className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#4F46E5] px-5 text-sm font-bold text-white hover:bg-[#4338CA]"
            >
              Log in
            </Link>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight">Orders</h1>
            {pendingOrders.length > 0 && (
              <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#4F46E5] px-2 text-[11px] font-bold text-white">
                <AnimatedNumber value={pendingOrders.length} />
              </span>
            )}
          </div>
        </div>

        {/* Info Card */}
        {!infoDismissed && (
          <div className="mb-5 rounded-2xl border border-[#4F46E5]/20 bg-[#4F46E5]/5 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#4F46E5]/10 text-[#4F46E5]">
                <Info className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#111827]">How orders work</h3>
                <ol className="mt-1.5 space-y-1 text-xs text-[#6B7280]">
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4F46E5]" />
                    You submit an order (BUY or SELL at your price)
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4F46E5]" />
                    We match it with another trader
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4F46E5]" />
                    Once matched, it becomes a Position
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4F46E5]" />
                    If the market closes before matching, your order is cancelled or refunded
                  </li>
                </ol>
              </div>
              <button onClick={dismissInfo} className="shrink-0 rounded-lg p-1 text-[#9CA3AF] transition hover:bg-[#F3F4F6] hover:text-[#6B7280]">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl bg-[#F3F4F6] p-1">
          {(["pending", "filled", "cancelled"] as OrderTab[]).map((tab) => {
            const count = tab === "pending" ? pendingOrders.length : tab === "filled" ? filledOrders.length : cancelledOrders.length;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                  isActive ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {tab === "pending" ? "Pending" : tab === "filled" ? "Filled" : "Cancelled"}
                {count > 0 && (
                  <span className={`ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] ${
                    isActive ? "bg-[#4F46E5] text-white" : "bg-[#D1D5DB] text-[#6B7280]"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid min-h-[200px] place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
          </div>
        ) : currentOrders.length === 0 ? (
          <EmptyOrders tab={activeTab} />
        ) : (
          <div className="grid gap-2.5">
            {currentOrders.map((order) => (
              <OrderRow key={order.id} order={order} onCancel={cancelOrderHandler} />
            ))}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
};

const EmptyOrders = ({ tab }: { tab: OrderTab }) => {
  const config = {
    pending: {
      icon: <Clock className="h-5 w-5 text-[#4F46E5]" />,
      title: "No pending orders",
      body: "When you place an order, it appears here while waiting to be matched.",
    },
    filled: {
      icon: <CheckCircle className="h-5 w-5 text-[#047857]" />,
      title: "No filled orders yet",
      body: "Once your orders are matched, they'll show up here.",
    },
    cancelled: {
      icon: <XCircle className="h-5 w-5 text-[#6B7280]" />,
      title: "No cancelled orders",
      body: "Cancelled or expired orders will appear here.",
    },
  };
  const { icon, title, body } = config[tab];

  return (
    <div className="grid min-h-[250px] place-items-center text-center">
      <div>
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#F3F4F6]">{icon}</div>
        <h3 className="text-sm font-bold text-[#111827]">{title}</h3>
        <p className="mt-1 text-xs text-[#9CA3AF]">{body}</p>
        {tab === "pending" && (
          <Link
            to="/"
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#4F46E5] px-4 text-xs font-bold text-white hover:bg-[#4338CA]"
          >
            Explore markets <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
};

const OrderRow = ({
  order,
  onCancel,
}: {
  order: ApiOrder;
  onCancel: (orderId: string, marketId: string) => void;
}) => {
  const st = statusConfig[order.status] || statusConfig.pending;
  const canCancel = ["waiting", "partial", "pending"].includes(order.status);
  const totalAmount = order.locked_amount || order.price * order.quantity;
  const fillPercent = order.quantity > 0 ? Math.round((order.filled_quantity / order.quantity) * 100) : 0;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:shadow-md">
      {/* Top row: status badges + cancel */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${st.bg} ${st.color}`}>
            {st.icon}
            {st.label}
          </span>
          <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-bold ${
            order.order_type === "BUY" ? "bg-[#12B886]/10 text-[#047857]" : "bg-[#E85D5D]/10 text-[#B42318]"
          }`}>
            {order.order_type}
          </span>
          <span className="inline-flex h-6 items-center rounded-full bg-[#F3F4F6] px-2.5 text-[10px] font-bold text-[#6B7280]">
            {order.side}
          </span>
        </div>
        {canCancel && (
          <button
            onClick={() => onCancel(order.id, order.market_id)}
            className="flex h-7 items-center gap-1 rounded-lg border border-[#E85D5D]/30 bg-[#E85D5D]/5 px-2.5 text-[10px] font-bold text-[#E85D5D] transition hover:bg-[#E85D5D]/10"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        )}
      </div>

      {/* Market link */}
      <Link
        to={`/market/${order.market_id}`}
        className="mt-2.5 flex items-center gap-1 text-xs font-bold text-[#4F46E5] transition hover:underline"
      >
        <span className="truncate">Market {order.market_id.slice(0, 8)}...</span>
        <ChevronRight className="h-3 w-3 shrink-0" />
      </Link>

      {/* Stats grid */}
      <div className="mt-2.5 grid grid-cols-4 gap-2">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Price</div>
          <div className="mt-0.5 text-xs font-bold text-[#111827]">{formatNaira(order.price)}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Qty</div>
          <div className="mt-0.5 text-xs font-bold text-[#111827]">{order.quantity}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Amount</div>
          <div className="mt-0.5 text-xs font-bold text-[#111827]">{formatNaira(totalAmount)}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">Filled</div>
          <div className="mt-0.5 text-xs font-bold text-[#111827]">
            {order.filled_quantity}/{order.quantity}
          </div>
        </div>
      </div>

      {/* Partial fill bar */}
      {order.filled_quantity > 0 && order.filled_quantity < order.quantity && (
        <div className="mt-2.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
            <div
              className="h-full rounded-full bg-[#7C3AED] transition-all"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] font-bold text-[#7C3AED]">{fillPercent}% filled</div>
        </div>
      )}

      {/* Refund info for cancelled/expired/refunded */}
      {["cancelled", "expired", "refunded"].includes(order.status) && order.locked_amount > 0 && (
        <div className="mt-2.5 rounded-lg bg-[#FEF3C7]/60 px-3 py-2">
          <div className="text-[10px] font-bold text-[#D97706]">
            Refund: {formatNaira(order.locked_amount)}
          </div>
        </div>
      )}

      {/* Time */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#9CA3AF]">
        <span>
          {order.status === "filled" && order.filled_at
            ? `Filled ${new Date(order.filled_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : order.status === "cancelled" && order.cancelled_at
            ? `Cancelled ${new Date(order.cancelled_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : `Submitted ${new Date(order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
        </span>
        {order.average_price && (
          <span className="font-bold text-[#111827]">Avg: {formatNaira(order.average_price)}</span>
        )}
      </div>
    </div>
  );
};

export default Orders;
