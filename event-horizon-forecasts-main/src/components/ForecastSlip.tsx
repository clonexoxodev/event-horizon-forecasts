import { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import { toast } from "sonner";

type OrderStatus =
  | "submitted"
  | "waiting"
  | "partial"
  | "filled"
  | "cancelled"
  | "expired"
  | "refunded";

type OrderResult = {
  id: string;
  status: OrderStatus;
  filled_quantity: number;
  total_quantity: number;
  price: number;
  amount: number;
  side: "YES" | "NO";
  market_id: string;
};

const QUICK_AMOUNTS = [500, 1000, 5000, 10000];

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; message: (f: number, t: number) => string; icon: typeof Clock; color: string; bg: string }
> = {
  submitted: {
    label: "Looking for a match",
    message: () => "Looking for a matching trader...",
    icon: Loader2,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  waiting: {
    label: "Waiting",
    message: (f, t) => `Your order is waiting. ${f} of ${t} shares filled.`,
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  partial: {
    label: "Partially Filled",
    message: (f, t) => `Partially matched. ${f} of ${t} shares filled.`,
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  filled: {
    label: "Matched",
    message: () => "Order matched! View in Positions.",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  cancelled: {
    label: "Cancelled",
    message: () => "Order cancelled. Funds returned to wallet.",
    icon: X,
    color: "text-gray-500",
    bg: "bg-gray-50",
  },
  expired: {
    label: "Expired",
    message: () => "Order expired. Funds returned to wallet.",
    icon: Clock,
    color: "text-gray-400",
    bg: "bg-gray-50",
  },
  refunded: {
    label: "Refunded",
    message: () => "Market cancelled. Full refund issued.",
    icon: RefreshCw,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
};

export const ForecastSlip = ({
  selection,
  onClose,
  onConfirm,
  onOrderConfirm,
}: {
  selection: {
    marketId: string;
    marketQuestion: string;
    side: "YES" | "NO";
    marketIcon?: string;
    currentPrice?: number;
  } | null;
  onClose: () => void;
  onConfirm: (
    selection: { marketId: string; marketQuestion: string; side: "YES" | "NO"; marketIcon?: string },
    amount: number
  ) => Promise<void>;
  onOrderConfirm: (params: {
    side: "YES" | "NO";
    orderType: "BUY" | "SELL";
    price: number;
    quantity: number;
  }) => Promise<any>;
}) => {
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [phase, setPhase] = useState<"form" | "submitting" | "success">("form");
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [isLimit, setIsLimit] = useState(false);
  const { user } = useAuth();

  const numAmount = parseFloat(amount) || 0;
  const numPrice = parseFloat(price) || 0;
  const balance = user?.balance ?? 0;
  const locked = user?.lockedBalance ?? 0;
  const remaining = Math.max(0, balance - numAmount);
  const insufficient = numAmount > balance;
  const effectivePrice = isLimit ? numPrice : selection?.currentPrice ?? 0;
  const displayShares = effectivePrice > 0 ? Math.floor(numAmount / effectivePrice) : 0;

  const isValid = useMemo(() => {
    if (!user || numAmount <= 0 || insufficient) return false;
    if (isLimit && (numPrice <= 0 || numPrice >= 100)) return false;
    return true;
  }, [user, numAmount, insufficient, isLimit, numPrice]);

  useEffect(() => {
    setAmount(""); setPrice(""); setOrderType("BUY"); setIsLimit(false);
    setPhase("form"); setOrderResult(null);
  }, [selection?.marketId, selection?.side]);

  const handleClose = useCallback(() => {
    setAmount(""); setPrice(""); setOrderType("BUY"); setIsLimit(false);
    setPhase("form"); setOrderResult(null); onClose();
  }, [onClose]);

  const handlePlaceOrder = async () => {
    if (!selection || !isValid) return;
    setPhase("submitting");
    try {
      const result = await onOrderConfirm({
        side: selection.side,
        orderType,
        price: effectivePrice,
        quantity: numAmount,
      });
      setOrderResult({
        id: result?.id ?? Date.now().toString(),
        status: "submitted",
        filled_quantity: 0,
        total_quantity: displayShares || Math.floor(numAmount / effectivePrice),
        price: effectivePrice,
        amount: numAmount,
        side: selection.side,
        market_id: selection.marketId,
      });
      setPhase("success");
      toast.success("Order submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
      setPhase("form");
    }
  };

  if (!selection) return null;
  const posSide = selection.side === "YES";
  const accent = posSide ? "#12B886" : "#E85D5D";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Place order"
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-gray-200 bg-white shadow-2xl md:bottom-auto md:left-auto md:top-0 md:h-screen md:w-[420px] md:rounded-none md:border-l md:border-t-0"
      >
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        {phase === "form" && (
          <FormPhase
            selection={selection} orderType={orderType} setOrderType={setOrderType}
            amount={amount} setAmount={setAmount} price={price} setPrice={setPrice}
            isLimit={isLimit} setIsLimit={setIsLimit} effectivePrice={effectivePrice}
            displayShares={displayShares} numAmount={numAmount} balance={balance}
            locked={locked} remaining={remaining} insufficient={insufficient}
            isValid={isValid} onPlaceOrder={handlePlaceOrder} onClose={handleClose}
          />
        )}
        {phase === "submitting" && <SubmittingPhase />}
        {phase === "success" && orderResult && (
          <SuccessPhase order={orderResult} marketQuestion={selection.marketQuestion} onDone={handleClose} />
        )}
      </div>
    </>
  );
};

function FormPhase({
  selection, orderType, setOrderType, amount, setAmount, price, setPrice,
  isLimit, setIsLimit, effectivePrice, displayShares, numAmount, balance,
  locked, remaining, insufficient, isValid, onPlaceOrder, onClose,
}: {
  selection: { marketId: string; marketQuestion: string; side: "YES" | "NO"; marketIcon?: string; currentPrice?: number };
  orderType: "BUY" | "SELL"; setOrderType: (v: "BUY" | "SELL") => void;
  amount: string; setAmount: (v: string) => void;
  price: string; setPrice: (v: string) => void;
  isLimit: boolean; setIsLimit: (v: boolean) => void;
  effectivePrice: number; displayShares: number; numAmount: number;
  balance: number; locked: number; remaining: number; insufficient: boolean;
  isValid: boolean; onPlaceOrder: () => void; onClose: () => void;
}) {
  const posSide = selection.side === "YES";
  const accent = posSide ? "#12B886" : "#E85D5D";
  const cost = isLimit ? displayShares * effectivePrice : numAmount;

  return (
    <div className="flex flex-col p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Place Order</p>
          <h2 className="mt-1 text-2xl font-black text-gray-900">{isLimit ? "Limit Order" : "Market Order"}</h2>
        </div>
        <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Market card */}
      <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: `${accent}33`, backgroundColor: `${accent}08` }}>
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-2xl shadow-sm">
            {selection.marketIcon ?? "📈"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">{selection.marketQuestion}</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                style={{ backgroundColor: `${accent}18`, color: posSide ? "#047857" : "#B42318" }}>
                {selection.side}
              </span>
              {selection.currentPrice != null && (
                <span className="text-xs font-bold text-gray-400">{formatNaira(selection.currentPrice)}/share</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order type toggle */}
      <div className="mt-4">
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Order Type</label>
        <div className="grid grid-cols-2 gap-2">
          {(["Market", "Limit"] as const).map((label) => {
            const active = label === "Limit" ? isLimit : !isLimit;
            return (
              <button key={label} onClick={() => setIsLimit(label === "Limit")}
                className={`h-11 rounded-xl border-2 text-sm font-bold transition ${active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Limit price */}
      {isLimit && (
        <div className="mt-4">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Price per share</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₦</span>
            <input type="number" min={1} max={99} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0"
              className="h-14 w-full rounded-xl border-2 border-gray-200 bg-white pl-9 pr-4 text-xl font-black text-gray-900 placeholder:text-gray-300 focus:border-gray-900 focus:outline-none" />
          </div>
          <p className="mt-1.5 text-[10px] font-bold text-gray-400">Set between ₦1 and ₦99 per share</p>
        </div>
      )}

      {/* Amount */}
      <div className="mt-4">
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₦</span>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
            className={`h-14 w-full rounded-xl border-2 bg-white pl-9 pr-4 text-xl font-black text-gray-900 placeholder:text-gray-300 focus:border-gray-900 focus:outline-none ${insufficient ? "border-red-400" : "border-gray-200"}`} />
        </div>
        {insufficient && <p className="mt-1.5 text-[10px] font-bold text-red-500">Insufficient balance</p>}
      </div>

      {/* Quick amounts */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((v) => (
          <button key={v} onClick={() => setAmount(String(v))}
            className={`h-9 rounded-lg border-2 text-xs font-bold transition ${amount === String(v) ? "border-gray-900 bg-gray-900 text-white" : v > balance ? "cursor-not-allowed border-gray-100 bg-white text-gray-300" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>
            {formatNaira(v).replace(".00", "")}
          </button>
        ))}
      </div>

      {/* Wallet */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Wallet</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Available</span>
            <span className="text-sm font-black text-gray-900">{formatNaira(balance)}</span>
          </div>
          {locked > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">Locked</span>
              <span className="text-sm font-black text-amber-600">{formatNaira(locked)}</span>
            </div>
          )}
          {numAmount > 0 && (
            <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">Remaining</span>
              <span className={`text-sm font-black ${remaining <= 0 ? "text-red-500" : "text-emerald-600"}`}>{formatNaira(remaining)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Order preview */}
      {numAmount > 0 && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Estimated Shares</span>
            <span className="text-sm font-black text-gray-900">{displayShares || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Cost</span>
            <span className="text-sm font-black text-gray-900">{formatNaira(cost || numAmount)}</span>
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-xs font-bold text-gray-400 leading-relaxed">
        Your order will be matched with another trader. This may take a few minutes.
      </p>

      <button onClick={handlePlaceOrder} disabled={!isValid}
        className="mt-4 h-14 w-full rounded-xl text-sm font-black uppercase tracking-wider text-white transition disabled:opacity-40"
        style={{ backgroundColor: isValid ? accent : undefined, boxShadow: isValid ? `0 4px 14px ${accent}33` : undefined }}>
        Place {isLimit ? "Limit" : "Market"} Order
      </button>
      <button onClick={onClose} className="mt-3 w-full text-sm font-bold text-gray-400 transition hover:text-gray-900">Cancel</button>
    </div>
  );
}

function SubmittingPhase() {
  return (
    <div className="grid min-h-[500px] place-items-center p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-gray-900 text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-900">Placing Order</h3>
          <p className="mt-2 text-sm font-bold text-gray-500">Submitting your order to the order book...</p>
        </div>
      </div>
    </div>
  );
}

function SuccessPhase({
  order, marketQuestion, onDone,
}: {
  order: OrderResult; marketQuestion: string; onDone: () => void;
}) {
  const cfg = STATUS_CONFIG[order.status];
  const Icon = cfg.icon;
  const isSpinning = order.status === "submitted";
  const progress = order.total_quantity > 0 ? Math.round((order.filled_quantity / order.total_quantity) * 100) : 0;

  return (
    <div className="flex flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Order Status</p>
          <h2 className="mt-1 text-2xl font-black text-gray-900">Order Submitted</h2>
        </div>
        <button onClick={onDone} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <div className={`grid h-20 w-20 place-items-center rounded-full ${cfg.bg} ${cfg.color}`}>
          <Icon className={`h-10 w-10 ${isSpinning ? "animate-spin" : ""}`} />
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${cfg.bg} ${cfg.color}`}>
          {isSpinning && <Loader2 className="h-3 w-3 animate-spin" />}
          {cfg.label}
        </span>
        <p className="text-center text-sm font-bold text-gray-500">
          {cfg.message(order.filled_quantity, order.total_quantity)}
        </p>
      </div>

      {(order.status === "waiting" || order.status === "partial") && (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-center text-[10px] font-bold text-gray-400">
            {order.filled_quantity} / {order.total_quantity} shares
          </p>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Order Details</p>
        <div className="space-y-2.5">
          {([["Market", marketQuestion], ["Side", order.side], ["Amount", formatNaira(order.amount)],
            ["Price", `${formatNaira(order.price)}/share`],
            ["Status", order.status.charAt(0).toUpperCase() + order.status.slice(1)]] as const).map(([l, v]) => (
            <div key={l} className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400">{l}</span>
              <span className="text-sm font-black text-gray-900">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-center text-xs font-bold text-gray-400">
          Once matched, this position will appear in your Positions tab.
        </p>
        <p className="text-center text-xs font-bold text-gray-400">
          If no match is found before the market closes, your funds will be refunded.
        </p>
      </div>

      <button onClick={onDone}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-gray-900 text-sm font-black text-white transition hover:bg-gray-800">
        Done
      </button>
    </div>
  );
}
