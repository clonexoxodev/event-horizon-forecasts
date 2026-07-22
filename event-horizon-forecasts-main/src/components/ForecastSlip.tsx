import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Shield,
  Ban,
  TrendingUp,
  Wallet,
  Lock,
  ChevronRight,
  CircleDot,
  PartyPopper,
  Ban as BanIcon,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { formatNaira, formatNairaPrice } from "@/lib/markets";
import { toast } from "sonner";
import type { ApiOrder } from "@/lib/api";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type ForecastSelection = {
  marketId: string;
  marketQuestion: string;
  marketIcon: string;
  side: "YES" | "NO" | "UP" | "DOWN";
  currentPrice: number;
  yesPool?: number;
  noPool?: number;
  totalYesShares?: number;
  totalNoShares?: number;
  participants?: number;
  minAmount?: number;
  maxAmount?: number;
  pricingModel?: "pool" | "orderbook";
};

type ForecastSlipProps = {
  selection: ForecastSelection | null;
  onClose: () => void;
  onConfirm: (selection: ForecastSelection, amount: number) => Promise<void>;
  onOrderConfirm?: (params: {
    side: "YES" | "NO";
    orderType: "BUY" | "SELL";
    price: number;
    quantity: number;
  }) => Promise<{ order: ApiOrder; matched: number }>;
};

type SlipPhase =
  | "form"
  | "submitting"
  | "orderSubmitted"
  | "orderPartial"
  | "orderFilled"
  | "orderWaiting"
  | "orderCancelled"
  | "orderRefunded"
  | "orderExpired"
  | "error";

/* -------------------------------------------------------------------------- */
/*                              Helpers & Constants                           */
/* -------------------------------------------------------------------------- */

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

const isPositiveSide = (side: string) => side === "YES" || side === "UP";

const sideColor = (side: string) =>
  isPositiveSide(side) ? "#12B886" : "#E85D5D";

const sideBg = (side: string) =>
  isPositiveSide(side) ? "bg-[#12B886]" : "bg-[#E85D5D]";

const sideBgLight = (side: string) =>
  isPositiveSide(side) ? "bg-[#12B886]/10" : "bg-[#E85D5D]/10";

const sideBorder = (side: string) =>
  isPositiveSide(side) ? "border-[#12B886]" : "border-[#E85D5D]";

const sideText = (side: string) =>
  isPositiveSide(side) ? "text-[#047857]" : "text-[#B42318]";

const sideShadow = (side: string) =>
  isPositiveSide(side)
    ? "shadow-[0_2px_8px_rgba(18,184,134,0.15)]"
    : "shadow-[0_2px_8px_rgba(232,93,93,0.15)]";

const statusConfig: Record<
  string,
  { label: string; icon: typeof Clock; color: string; bg: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-[#D97706]",
    bg: "bg-[#FEF3C7]",
  },
  waiting: {
    label: "In Order Book",
    icon: Timer,
    color: "text-[#4F46E5]",
    bg: "bg-[#EEF2FF]",
  },
  partial: {
    label: "Partially Filled",
    icon: AlertTriangle,
    color: "text-[#D97706]",
    bg: "bg-[#FEF3C7]",
  },
  filled: {
    label: "Fully Filled",
    icon: CheckCircle2,
    color: "text-[#047857]",
    bg: "bg-[#D1FAE5]",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    color: "text-[#6B7280]",
    bg: "bg-[#F3F4F6]",
  },
  refunded: {
    label: "Refunded",
    icon: RefreshCw,
    color: "text-[#4F46E5]",
    bg: "bg-[#EEF2FF]",
  },
  expired: {
    label: "Expired",
    icon: Clock,
    color: "text-[#9CA3AF]",
    bg: "bg-[#F9FAFB]",
  },
};

/* -------------------------------------------------------------------------- */
/*                                  Main Component                            */
/* -------------------------------------------------------------------------- */

export const ForecastSlip = ({
  selection,
  onClose,
  onConfirm,
  onOrderConfirm,
}: ForecastSlipProps) => {
  /* ---- State ---- */
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [phase, setPhase] = useState<SlipPhase>("form");
  const [errorMessage, setErrorMessage] = useState("");
  const [orderResult, setOrderResult] = useState<{
    order: ApiOrder;
    matched: number;
  } | null>(null);

  const { user, setAuthOpen } = useAuth();
  const slipRef = useRef<HTMLDivElement>(null);
  const successTimerRef = useRef<number | null>(null);

  const isOrderBook = selection?.pricingModel === "orderbook";
  const side = selection?.side ?? "YES";
  const posSide = isPositiveSide(side);
  const accent = sideColor(side);

  /* ---- Derived values ---- */
  const numAmount = Number.parseFloat(amount) || 0;
  const numPrice = Number.parseFloat(price) || 0;
  const userBalance = user?.balance ?? 0;
  const lockedBalance = user?.lockedBalance ?? 0;
  const insufficientBalance = numAmount > userBalance;
  const estimatedShares =
    isOrderBook && numPrice > 0 ? Math.floor(numAmount / numPrice) : 0;
  const orderValue = numAmount;
  const remainingBalance = Math.max(0, userBalance - numAmount);

  const selectionMissingData = Boolean(
    !selection?.marketId ||
      !selection?.marketQuestion ||
      !selection?.side ||
      !Number.isFinite(Number(selection?.currentPrice))
  );

  const isFormValid = Boolean(
    user &&
      phase === "form" &&
      numAmount > 0 &&
      !insufficientBalance &&
      !selectionMissingData &&
      (!isOrderBook || (numPrice > 0 && numPrice < 100))
  );

  const sidePrice = selection
    ? posSide
      ? selection.currentPrice
      : 100 - selection.currentPrice
    : 0;

  /* ---- Effects ---- */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && phase === "form") {
        handleClose();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selection && isOrderBook) {
      const cp = posSide
        ? selection.currentPrice
        : 100 - selection.currentPrice;
      setPrice(String(Math.round(cp)));
    }
  }, [selection, isOrderBook, posSide]);

  /* ---- Reset on selection change ---- */
  useEffect(() => {
    setAmount("");
    setOrderType("BUY");
    setPhase("form");
    setErrorMessage("");
    setOrderResult(null);
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, [selection?.marketId, selection?.side]);

  /* ---- Handlers ---- */
  const handleClose = useCallback(() => {
    if (phase === "submitting") return;
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setAmount("");
    setPrice("");
    setOrderType("BUY");
    setPhase("form");
    setErrorMessage("");
    setOrderResult(null);
    onClose();
  }, [phase, onClose]);

  const handleConfirm = async () => {
    if (!selection || selectionMissingData) {
      setErrorMessage("Market data is unavailable. Please go back and try again.");
      setPhase("error");
      return;
    }
    if (numAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (insufficientBalance) {
      toast.error("Insufficient balance. Add funds to continue.");
      return;
    }
    if (isOrderBook && (numPrice <= 0 || numPrice >= 100)) {
      toast.error("Price must be between ₦1 and ₦99.");
      return;
    }

    setPhase("submitting");

    try {
      if (isOrderBook && onOrderConfirm) {
        const result = await onOrderConfirm({
          side: side as "YES" | "NO",
          orderType,
          price: numPrice,
          quantity: numAmount,
        });
        setOrderResult(result);

        if (result.order.status === "filled") {
          setPhase("orderFilled");
        } else if (result.order.status === "partial") {
          setPhase("orderPartial");
        } else {
          setPhase("orderWaiting");
        }

        toast.success("Order placed successfully.");
      } else {
        await onConfirm(selection, numAmount);
        setPhase("orderFilled");
        toast.success("Order placed successfully.");
      }

      successTimerRef.current = window.setTimeout(() => {
        handleClose();
      }, 8000);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Could not place order. Please try again.";
      setErrorMessage(msg);
      setPhase("error");
      toast.error(msg);
    }
  };

  const handleRetry = () => {
    setPhase("form");
    setErrorMessage("");
  };

  const handleCancelOrder = () => {
    setPhase("orderCancelled");
    successTimerRef.current = window.setTimeout(() => {
      handleClose();
    }, 4000);
  };

  /* ---- Render ---- */
  if (!selection) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[#111827]/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={slipRef}
        role="dialog"
        aria-modal="true"
        aria-label="Order entry"
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl border border-[#E5E7EB] bg-white pb-[calc(90px+env(safe-area-inset-bottom))] shadow-[0_-32px_80px_rgba(17,24,39,0.18)] md:bottom-auto md:left-auto md:top-0 md:h-screen md:w-[460px] md:rounded-none md:border-l md:pb-0"
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1 w-10 rounded-full bg-[#E5E7EB]" />
        </div>

        {phase === "form" || phase === "submitting"
          ? selectionMissingData
            ? <UnavailableState loading={phase === "submitting"} onClose={handleClose} />
            : <FormState
                selection={selection}
                orderType={orderType}
                setOrderType={setOrderType}
                amount={amount}
                setAmount={setAmount}
                price={price}
                setPrice={setPrice}
                isOrderBook={isOrderBook}
                side={side}
                posSide={posSide}
                numAmount={numAmount}
                numPrice={numPrice}
                estimatedShares={estimatedShares}
                orderValue={orderValue}
                remainingBalance={remainingBalance}
                insufficientBalance={insufficientBalance}
                userBalance={userBalance}
                lockedBalance={lockedBalance}
                isFormValid={isFormValid}
                loading={phase === "submitting"}
                sidePrice={sidePrice}
                onConfirm={handleConfirm}
                onClose={handleClose}
                user={user}
                setAuthOpen={setAuthOpen}
              />
          : phase === "error"
            ? <ErrorState
                message={errorMessage}
                selection={selection}
                amount={numAmount}
                onRetry={handleRetry}
                onClose={handleClose}
                loading={false}
              />
            : <PostOrderState
                phase={phase}
                selection={selection}
                orderType={orderType}
                amount={numAmount}
                price={numPrice}
                estimatedShares={estimatedShares}
                orderResult={orderResult}
                isOrderBook={isOrderBook}
                onCancelOrder={handleCancelOrder}
                onClose={handleClose}
              />
        }
      </div>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*                              Form State                                    */
/* -------------------------------------------------------------------------- */

const FormState = ({
  selection,
  orderType,
  setOrderType,
  amount,
  setAmount,
  price,
  setPrice,
  isOrderBook,
  side,
  posSide,
  numAmount,
  numPrice,
  estimatedShares,
  orderValue,
  remainingBalance,
  insufficientBalance,
  userBalance,
  lockedBalance,
  isFormValid,
  loading,
  sidePrice,
  onConfirm,
  onClose,
  user,
  setAuthOpen,
}: {
  selection: ForecastSelection;
  orderType: "BUY" | "SELL";
  setOrderType: (t: "BUY" | "SELL") => void;
  amount: string;
  setAmount: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  isOrderBook: boolean;
  side: string;
  posSide: boolean;
  numAmount: number;
  numPrice: number;
  estimatedShares: number;
  orderValue: number;
  remainingBalance: number;
  insufficientBalance: boolean;
  userBalance: number;
  lockedBalance: number;
  isFormValid: boolean;
  loading: boolean;
  sidePrice: number;
  onConfirm: () => void;
  onClose: () => void;
  user: ReturnType<typeof useAuth>["user"];
  setAuthOpen: (v: boolean) => void;
}) => {
  const showOrderPreview = isOrderBook && numAmount > 0 && numPrice > 0;
  const showPoolPreview = !isOrderBook && numAmount > 0;

  return (
    <div className="space-y-4 p-5 sm:p-6">
      {/* ---- Header ---- */}
      <SlipHeader onClose={onClose} loading={loading} isOrderBook={isOrderBook} />

      {/* ---- Market Header Card ---- */}
      <MarketHeaderCard selection={selection} side={side} posSide={posSide} />

      {/* ---- Auth Gate ---- */}
      {!user && (
        <AuthGate onClose={onClose} setAuthOpen={setAuthOpen} />
      )}

      {/* ---- BUY / SELL Toggle (order book only) ---- */}
      {isOrderBook && (
        <OrderTypeToggle
          orderType={orderType}
          setOrderType={setOrderType}
          loading={loading}
          side={side}
        />
      )}

      {/* ---- Price per Share (order book only) ---- */}
      {isOrderBook && (
        <PriceInput
          price={price}
          setPrice={setPrice}
          loading={loading}
        />
      )}

      {/* ---- Amount Input ---- */}
      <AmountInput
        amount={amount}
        setAmount={setAmount}
        loading={loading}
        isOrderBook={isOrderBook}
        side={side}
        posSide={posSide}
        insufficientBalance={insufficientBalance}
      />

      {/* ---- Quick Select Buttons ---- */}
      <QuickAmountButtons
        amount={amount}
        setAmount={setAmount}
        loading={loading}
        posSide={posSide}
        userBalance={userBalance}
      />

      {/* ---- Wallet Card ---- */}
      <WalletCard
        userBalance={userBalance}
        lockedBalance={lockedBalance}
        numAmount={numAmount}
        remainingBalance={remainingBalance}
        loading={loading}
      />

      {/* ---- Order Preview (order book) ---- */}
      {showOrderPreview && (
        <OrderPreviewCard
          orderType={orderType}
          estimatedShares={estimatedShares}
          orderValue={orderValue}
          numPrice={numPrice}
          remainingBalance={remainingBalance}
          side={side}
        />
      )}

      {/* ---- Pool Market Note ---- */}
      {showPoolPreview && (
        <PoolMarketNote selection={selection} side={side} />
      )}

      {/* ---- Protected Market Section ---- */}
      {selection.yesPool !== undefined && selection.noPool !== undefined && (
        <ProtectedMarketSection
          yesPool={selection.yesPool}
          noPool={selection.noPool}
        />
      )}

      {/* ---- Submit Button ---- */}
      <Button
        onClick={onConfirm}
        disabled={!isFormValid}
        aria-disabled={!isFormValid}
        className={`h-14 w-full rounded-xl text-sm font-black uppercase tracking-wider text-white transition-all duration-200 ${
          posSide
            ? "bg-[#12B886] hover:bg-[#0EA371] hover:shadow-[0_4px_12px_rgba(18,184,134,0.3)]"
            : "bg-[#E85D5D] hover:bg-[#D54C4C] hover:shadow-[0_4px_12px_rgba(232,93,93,0.3)]"
        } disabled:opacity-40 disabled:shadow-none`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Placing Order...
          </span>
        ) : isOrderBook ? (
          `Place ${orderType} Order`
        ) : (
          `Trade ${side}`
        )}
      </Button>

      {/* ---- Cancel Link ---- */}
      <button
        onClick={onClose}
        disabled={loading}
        className="w-full text-sm font-bold text-[#6B7280] transition-colors duration-200 hover:text-[#111827] disabled:opacity-40"
      >
        Cancel
      </button>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              Post-Order States                             */
/* -------------------------------------------------------------------------- */

const PostOrderState = ({
  phase,
  selection,
  orderType,
  amount,
  price,
  estimatedShares,
  orderResult,
  isOrderBook,
  onCancelOrder,
  onClose,
}: {
  phase: SlipPhase;
  selection: ForecastSelection;
  orderType: "BUY" | "SELL";
  amount: number;
  price: number;
  estimatedShares: number;
  orderResult: { order: ApiOrder; matched: number } | null;
  isOrderBook: boolean;
  onCancelOrder: () => void;
  onClose: () => void;
}) => {
  const side = selection.side;
  const posSide = isPositiveSide(side);

  if (phase === "orderSubmitted") {
    return (
      <div className="grid min-h-[480px] place-items-center p-8 text-center">
        <div className="w-full max-w-sm">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-[#4F46E5] text-white shadow-[0_18px_44px_rgba(79,70,229,0.25)]">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>
          <h3 className="text-2xl font-black text-[#111827]">Order Submitted</h3>
          <p className="mt-3 text-sm font-bold text-[#6B7280]">
            Your order has been submitted and is being processed.
          </p>
          <OrderDetailsSummary
            side={side}
            orderType={orderType}
            amount={amount}
            price={price}
            estimatedShares={estimatedShares}
            isOrderBook={isOrderBook}
          />
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-[#4F46E5]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Looking for matching orders...
          </div>
        </div>
      </div>
    );
  }

  if (phase === "orderFilled") {
    const cfg = statusConfig.filled;
    const Icon = cfg.icon;
    const shares = orderResult?.matched || estimatedShares;

    return (
      <div className="grid min-h-[480px] place-items-center p-8 text-center">
        <div className="w-full max-w-sm">
          <div className="relative mx-auto mb-6">
            <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${sideBg(side)} text-white shadow-[0_18px_44px_rgba(16,24,40,0.16)]`}>
              <Icon className="h-10 w-10" />
            </div>
            <div className="absolute -top-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-[#FEF3C7] text-[#D97706]">
              <PartyPopper className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-[#111827]">All {shares} Shares Matched</h3>
          <p className="mt-2 text-sm font-bold text-[#6B7280]">
            Your {orderType.toLowerCase()} order has been fully filled.
          </p>
          <OrderDetailsSummary
            side={side}
            orderType={orderType}
            amount={amount}
            price={price}
            estimatedShares={estimatedShares}
            isOrderBook={isOrderBook}
          />
          <div className="mt-6">
            <button
              onClick={onClose}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-black text-white transition-colors duration-200 hover:bg-[#4338CA]"
            >
              Continue Trading
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "orderPartial") {
    const cfg = statusConfig.partial;
    const Icon = cfg.icon;
    const matched = orderResult?.matched ?? 0;

    return (
      <div className="grid min-h-[480px] place-items-center p-8 text-center">
        <div className="w-full max-w-sm">
          <div className={`mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full ${cfg.bg} ${cfg.color}`}>
            <Icon className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-black text-[#111827]">
            {matched} of {estimatedShares || "—"} Shares Matched
          </h3>
          <p className="mt-2 text-sm font-bold text-[#6B7280]">
            Your remaining order is in the order book waiting for a match.
          </p>
          <OrderDetailsSummary
            side={side}
            orderType={orderType}
            amount={amount}
            price={price}
            estimatedShares={estimatedShares}
            isOrderBook={isOrderBook}
          />
          <div className="mt-6 space-y-3">
            <button
              onClick={onClose}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-black text-white transition-colors duration-200 hover:bg-[#4338CA]"
            >
              Continue Trading
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "orderWaiting") {
    const cfg = statusConfig.waiting;
    const Icon = cfg.icon;

    return (
      <div className="grid min-h-[480px] place-items-center p-8 text-center">
        <div className="w-full max-w-sm">
          <div className={`mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full ${cfg.bg} ${cfg.color}`}>
            <Icon className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-black text-[#111827]">Order in Queue</h3>
          <p className="mt-2 text-sm font-bold text-[#6B7280]">
            Your order is waiting for a matching order.
          </p>
          <p className="mt-1 text-xs font-bold text-[#9CA3AF]">
            Your funds are securely locked while waiting. You may cancel at any time before matching.
          </p>
          <OrderDetailsSummary
            side={side}
            orderType={orderType}
            amount={amount}
            price={price}
            estimatedShares={estimatedShares}
            isOrderBook={isOrderBook}
          />
          <div className="mt-6 space-y-3">
            <button
              onClick={onCancelOrder}
              className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-[#E5E7EB] bg-white text-sm font-black text-[#111827] transition-colors duration-200 hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
            >
              Cancel Order
            </button>
            <button
              onClick={onClose}
              className="w-full text-sm font-bold text-[#6B7280] transition-colors duration-200 hover:text-[#111827]"
            >
              Continue Trading
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "orderCancelled") {
    return (
      <div className="grid min-h-[480px] place-items-center p-8 text-center">
        <div className="w-full max-w-sm">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-[#F3F4F6] text-[#6B7280]">
            <BanIcon className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-black text-[#111827]">Order Cancelled</h3>
          <p className="mt-3 text-sm font-bold text-[#6B7280]">
            Your locked funds have been returned to your balance.
          </p>
          <div className="mt-6">
            <button
              onClick={onClose}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-black text-white transition-colors duration-200 hover:bg-[#4338CA]"
            >
              Continue Trading
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "orderRefunded") {
    return (
      <div className="grid min-h-[480px] place-items-center p-8 text-center">
        <div className="w-full max-w-sm">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">
            <RefreshCw className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-black text-[#111827]">Order Refunded</h3>
          <p className="mt-3 text-sm font-bold text-[#6B7280]">
            Market was cancelled or did not activate. Full refund issued.
          </p>
          <div className="mt-6">
            <button
              onClick={onClose}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-black text-white transition-colors duration-200 hover:bg-[#4338CA]"
            >
              Continue Trading
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "orderExpired") {
    return (
      <div className="grid min-h-[480px] place-items-center p-8 text-center">
        <div className="w-full max-w-sm">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-[#F9FAFB] text-[#9CA3AF]">
            <Clock className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-black text-[#111827]">Order Expired</h3>
          <p className="mt-3 text-sm font-bold text-[#6B7280]">
            This order was not matched before the market closed.
          </p>
          <div className="mt-6">
            <button
              onClick={onClose}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-black text-white transition-colors duration-200 hover:bg-[#4338CA]"
            >
              Continue Trading
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

/* -------------------------------------------------------------------------- */
/*                              Sub-Components                                 */
/* -------------------------------------------------------------------------- */

const SlipHeader = ({
  onClose,
  loading,
  isOrderBook,
}: {
  onClose: () => void;
  loading: boolean;
  isOrderBook: boolean;
}) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9CA3AF]">
        Order Entry
      </p>
      <h2 className="mt-1 text-2xl font-black text-[#111827]">
        {isOrderBook ? "Place Your Order" : "Trade"}
      </h2>
    </div>
    <button
      onClick={onClose}
      disabled={loading}
      aria-label="Close order entry"
      className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] transition-colors duration-200 hover:bg-[#F3F4F6] hover:text-[#111827] disabled:opacity-40"
    >
      <X className="h-5 w-5" aria-hidden="true" />
    </button>
  </div>
);

const MarketHeaderCard = ({
  selection,
  side,
  posSide,
}: {
  selection: ForecastSelection;
  side: string;
  posSide: boolean;
}) => {
  const statusBadge = selection.pricingModel === "orderbook"
    ? { label: "Live", color: "text-[#047857]", bg: "bg-[#D1FAE5]" }
    : selection.yesPool !== undefined
      ? { label: "Protected", color: "text-[#D97706]", bg: "bg-[#FEF3C7]" }
      : { label: "Live", color: "text-[#047857]", bg: "bg-[#D1FAE5]" };

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors duration-200 ${
        posSide
          ? "border-[#12B886]/20 bg-[#12B886]/[0.05]"
          : "border-[#E85D5D]/20 bg-[#E85D5D]/[0.05]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-2xl shadow-sm">
          {selection.marketIcon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-black leading-snug text-[#111827]">
            {selection.marketQuestion}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {/* Side badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                posSide
                  ? "bg-[#12B886]/12 text-[#047857]"
                  : "bg-[#E85D5D]/12 text-[#B42318]"
              }`}
            >
              {posSide ? (
                <ArrowUpCircle className="h-3 w-3" />
              ) : (
                <ArrowDownCircle className="h-3 w-3" />
              )}
              {side}
            </span>

            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadge.bg} ${statusBadge.color}`}
            >
              <CircleDot className="h-2.5 w-2.5" />
              {statusBadge.label}
            </span>
          </div>
          {/* Large current price */}
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              Current
            </span>
            <span className="text-2xl font-black text-[#111827]">
              {formatNairaPrice(selection.currentPrice)}
            </span>
            <span className="text-xs font-bold text-[#9CA3AF]">/share</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AuthGate = ({
  onClose,
  setAuthOpen,
}: {
  onClose: () => void;
  setAuthOpen: (v: boolean) => void;
}) => (
  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-center">
    <p className="text-sm font-black text-[#111827]">Sign in to trade</p>
    <p className="mt-1 text-xs font-bold text-[#6B7280]">
      Log in to place orders on this market.
    </p>
    <button
      onClick={() => {
        onClose();
        setAuthOpen(true);
      }}
      className="mt-3 h-11 w-full rounded-xl bg-[#4F46E5] text-sm font-black text-white transition-colors duration-200 hover:bg-[#4338CA]"
    >
      Log In
    </button>
  </div>
);

const OrderTypeToggle = ({
  orderType,
  setOrderType,
  loading,
  side,
}: {
  orderType: "BUY" | "SELL";
  setOrderType: (t: "BUY" | "SELL") => void;
  loading: boolean;
  side: string;
}) => (
  <div>
    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">
      Order Side
    </label>
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => setOrderType("BUY")}
        disabled={loading}
        className={`flex h-12 items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-black transition-all duration-200 ${
          orderType === "BUY"
            ? `border-[#12B886] bg-[#12B886]/10 text-[#047857] ${sideShadow("YES")}`
            : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#D1D5DB] hover:text-[#111827]"
        }`}
      >
        <ArrowUpCircle className="h-4 w-4" />
        BUY
      </button>
      <button
        onClick={() => setOrderType("SELL")}
        disabled={loading}
        className={`flex h-12 items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-black transition-all duration-200 ${
          orderType === "SELL"
            ? `border-[#E85D5D] bg-[#E85D5D]/10 text-[#B42318] ${sideShadow("NO")}`
            : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#D1D5DB] hover:text-[#111827]"
        }`}
      >
        <ArrowDownCircle className="h-4 w-4" />
        SELL
      </button>
    </div>
  </div>
);

const PriceInput = ({
  price,
  setPrice,
  loading,
}: {
  price: string;
  setPrice: (v: string) => void;
  loading: boolean;
}) => (
  <div>
    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">
      Price per Share
    </label>
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#9CA3AF]">
        NGN
      </span>
      <Input
        type="number"
        placeholder="0"
        min="1"
        max="99"
        aria-label="Price per share"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        disabled={loading}
        className="h-14 rounded-xl border-2 border-[#E5E7EB] bg-white pl-14 text-xl font-black text-[#111828] placeholder:text-[#D1D5DB] focus:border-[#4F46E5] focus:ring-0"
      />
    </div>
    <p className="mt-1.5 text-[10px] font-bold text-[#9CA3AF]">
      Set price between NGN 1 and 99 per share
    </p>
  </div>
);

const AmountInput = ({
  amount,
  setAmount,
  loading,
  isOrderBook,
  side,
  posSide,
  insufficientBalance,
}: {
  amount: string;
  setAmount: (v: string) => void;
  loading: boolean;
  isOrderBook: boolean;
  side: string;
  posSide: boolean;
  insufficientBalance: boolean;
}) => (
  <div>
    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">
      {isOrderBook ? "Amount (NGN)" : "Trade Amount (NGN)"}
    </label>
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#9CA3AF]">
        NGN
      </span>
      <Input
        type="number"
        placeholder="0"
        aria-label="Order amount in Naira"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={loading}
        className={`h-14 rounded-xl border-2 bg-white pl-14 text-xl font-black text-[#111828] placeholder:text-[#D1D5DB] focus:border-[#4F46E5] focus:ring-0 transition-colors duration-200 ${
          insufficientBalance && Number.parseFloat(amount) > 0
            ? "border-[#E85D5D]"
            : "border-[#E5E7EB]"
        }`}
      />
    </div>
    {insufficientBalance && Number.parseFloat(amount) > 0 && (
      <p className="mt-1.5 text-[10px] font-bold text-[#B42318]">
        Insufficient balance
      </p>
    )}
  </div>
);

const QuickAmountButtons = ({
  amount,
  setAmount,
  loading,
  posSide,
  userBalance,
}: {
  amount: string;
  setAmount: (v: string) => void;
  loading: boolean;
  posSide: boolean;
  userBalance: number;
}) => (
  <div className="grid grid-cols-5 gap-2">
    {QUICK_AMOUNTS.map((value) => {
      const isSelected = amount === value.toString();
      const exceeds = value > userBalance;
      return (
        <button
          key={value}
          onClick={() => setAmount(value.toString())}
          aria-label={`Set amount to ${formatNaira(value).replace(".00", "")}`}
          disabled={loading}
          className={`h-10 rounded-xl border-2 text-[13px] font-black transition-all duration-200 ${
            isSelected
              ? posSide
                ? "border-[#12B886] bg-[#12B886]/10 text-[#047857]"
                : "border-[#E85D5D] bg-[#E85D5D]/10 text-[#B42318]"
              : exceeds
                ? "border-[#F3F4F6] bg-white text-[#D1D5DB] cursor-not-allowed"
                : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#D1D5DB] hover:text-[#111827]"
          }`}
        >
          {formatNaira(value).replace(".00", "")}
        </button>
      );
    })}
  </div>
);

const WalletCard = ({
  userBalance,
  lockedBalance,
  numAmount,
  remainingBalance,
  loading,
}: {
  userBalance: number;
  lockedBalance: number;
  numAmount: number;
  remainingBalance: number;
  loading: boolean;
}) => (
  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
    <div className="mb-3 flex items-center gap-1.5">
      <Wallet className="h-3.5 w-3.5 text-[#9CA3AF]" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
        Wallet
      </span>
    </div>
    <div className="space-y-2.5">
      {/* Available */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#6B7280]">Available Balance</span>
        <span className="text-sm font-black text-[#111827]">
          {formatNaira(userBalance)}
        </span>
      </div>
      {/* Locked */}
      {lockedBalance > 0 && (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs font-bold text-[#6B7280]">
            <Lock className="h-3 w-3" />
            Locked in Orders
          </span>
          <span className="text-sm font-black text-[#D97706]">
            {formatNaira(lockedBalance)}
          </span>
        </div>
      )}
      {/* Remaining after order */}
      {numAmount > 0 && !loading && (
        <div className="border-t border-[#E5E7EB] pt-2.5 flex items-center justify-between">
          <span className="text-xs font-bold text-[#6B7280]">Remaining After Order</span>
          <span
            className={`text-sm font-black ${
              remainingBalance <= 0 ? "text-[#E85D5D]" : "text-[#047857]"
            }`}
          >
            {formatNaira(remainingBalance)}
          </span>
        </div>
      )}
    </div>
  </div>
);

const OrderPreviewCard = ({
  orderType,
  estimatedShares,
  orderValue,
  numPrice,
  remainingBalance,
  side,
}: {
  orderType: "BUY" | "SELL";
  estimatedShares: number;
  orderValue: number;
  numPrice: number;
  remainingBalance: number;
  side: string;
}) => (
  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-3">
    <div className="flex items-center gap-1.5">
      <TrendingUp className="h-3.5 w-3.5 text-[#9CA3AF]" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
        Order Preview
      </span>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <InfoCard label="Est. Shares" value={`${estimatedShares}`} />
      <InfoCard label="Order Value" value={formatNaira(orderValue)} />
      <InfoCard label="Price / Share" value={formatNaira(numPrice)} />
      <InfoCard label="Remaining" value={formatNaira(remainingBalance)} />
    </div>

    {/* Possible outcome */}
    <div className="border-t border-[#E5E7EB] pt-3">
      {orderType === "BUY" ? (
        <div className="flex items-start gap-2">
          <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-[#12B886]/10 text-[#047857]">
            <TrendingUp className="h-3 w-3" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              Possible Outcome
            </p>
            <p className="mt-0.5 text-sm font-black text-[#047857]">
              Win {estimatedShares} shares = {formatNaira(estimatedShares * 100)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-[#E85D5D]/10 text-[#B42318]">
            <ArrowDownCircle className="h-3 w-3" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              Possible Outcome
            </p>
            <p className="mt-0.5 text-sm font-black text-[#B42318]">
              Receive {formatNaira(orderValue)} for {estimatedShares} shares
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
);

const PoolMarketNote = ({
  selection,
  side,
}: {
  selection: ForecastSelection;
  side: string;
}) => (
  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
    <div className="flex items-center gap-1.5 mb-2">
      <CircleDot className="h-3.5 w-3.5 text-[#9CA3AF]" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
        Order Type
      </span>
    </div>
    <p className="text-sm font-bold text-[#6B7280]">
      Market order — fills at current pool price
    </p>
    <div className="mt-2 flex items-center gap-2">
      <span className="text-xs font-bold text-[#9CA3AF]">Pool Price:</span>
      <span className="text-sm font-black text-[#111827]">
        {formatNairaPrice(selection.currentPrice)}
      </span>
      <span className="text-xs font-bold text-[#9CA3AF]">/share</span>
    </div>
  </div>
);

const ProtectedMarketSection = ({
  yesPool,
  noPool,
}: {
  yesPool: number;
  noPool: number;
}) => {
  const totalPool = yesPool + noPool;
  const activationThreshold = 10000;
  const progress = Math.min((totalPool / activationThreshold) * 100, 100);
  const isActivated = totalPool >= activationThreshold;

  return (
    <div className="rounded-2xl border border-[#FDE68A]/50 bg-[#FFFBEB] p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Shield className="h-3.5 w-3.5 text-[#D97706]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#D97706]">
          Protected Market
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-[#92400E]">
          <span>Activation Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#FEF3C7]">
          <div
            className="h-full rounded-full bg-[#D97706] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Pool stats */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#92400E]">
            Current Pool
          </p>
          <p className="text-sm font-black text-[#111827]">
            {formatNaira(totalPool)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#92400E]">
            Required
          </p>
          <p className="text-sm font-black text-[#111827]">
            {formatNaira(activationThreshold)}
          </p>
        </div>
      </div>

      {isActivated ? (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#047857]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Market is activated and trading is live.
        </div>
      ) : (
        <p className="mt-3 text-[11px] font-bold leading-relaxed text-[#92400E]">
          If this market does not reach activation before trading begins, all orders will be
          cancelled and funds fully refunded.
        </p>
      )}
    </div>
  );
};

const OrderDetailsSummary = ({
  side,
  orderType,
  amount,
  price,
  estimatedShares,
  isOrderBook,
}: {
  side: string;
  orderType: "BUY" | "SELL";
  amount: number;
  price: number;
  estimatedShares: number;
  isOrderBook: boolean;
}) => (
  <div className="mt-4 rounded-xl bg-[#F9FAFB] p-3 text-left">
    <div className="grid grid-cols-2 gap-3">
      <InfoCard
        label="Side"
        value={`${orderType} ${side}`}
      />
      <InfoCard label="Amount" value={formatNaira(amount)} />
      {isOrderBook && (
        <>
          <InfoCard label="Price" value={formatNaira(price)} />
          <InfoCard label="Est. Shares" value={`${estimatedShares}`} />
        </>
      )}
    </div>
  </div>
);

const UnavailableState = ({
  loading,
  onClose,
}: {
  loading: boolean;
  onClose: () => void;
}) => (
  <div className="space-y-5 p-5 sm:p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B42318]">
          Order Entry
        </p>
        <h2 className="mt-1 text-2xl font-black text-[#111827]">
          Market Unavailable
        </h2>
      </div>
      <button
        onClick={onClose}
        disabled={loading}
        aria-label="Close order entry"
        className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] transition-colors duration-200 hover:bg-[#F3F4F6] hover:text-[#111827] disabled:opacity-40"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
    <div className="rounded-xl border border-[#E85D5D]/30 bg-[#E85D5D]/[0.06] p-4 text-sm font-bold leading-relaxed text-[#B42318]">
      This market is currently unavailable. Please go back and try again.
    </div>
  </div>
);

const ErrorState = ({
  message,
  selection,
  amount,
  onRetry,
  onClose,
  loading,
}: {
  message: string;
  selection: ForecastSelection;
  amount: number;
  onRetry: () => void;
  onClose: () => void;
  loading: boolean;
}) => (
  <div className="space-y-5 p-5 sm:p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B42318]">
          Order Entry
        </p>
        <h2 className="mt-1 text-2xl font-black text-[#111827]">
          Something Went Wrong
        </h2>
      </div>
      <button
        onClick={onClose}
        disabled={loading}
        aria-label="Close order entry"
        className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] transition-colors duration-200 hover:bg-[#F3F4F6] hover:text-[#111827] disabled:opacity-40"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>

    <div className="rounded-xl border border-[#E85D5D]/30 bg-[#E85D5D]/[0.06] p-4 text-sm font-bold leading-relaxed text-[#B42318]">
      {message}
    </div>

    {/* Order context */}
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">
        Order Context
      </p>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-xl shadow-sm">
          {selection.marketIcon}
        </div>
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-bold text-[#111827]">
            {selection.marketQuestion}
          </div>
          <div className="mt-1 text-xs font-bold text-[#6B7280]">
            {selection.side} · {formatNaira(amount)}
          </div>
        </div>
      </div>
    </div>

    <div className="grid gap-3">
      <button
        onClick={onRetry}
        disabled={loading}
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#4F46E5] text-sm font-black text-white transition-colors duration-200 hover:bg-[#4338CA] disabled:opacity-40"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>
      <button
        onClick={onClose}
        disabled={loading}
        className="w-full text-sm font-bold text-[#6B7280] transition-colors duration-200 hover:text-[#111827] disabled:opacity-40"
      >
        Cancel
      </button>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                Shared InfoCard                             */
/* -------------------------------------------------------------------------- */

const InfoCard = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div>
    <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
      {label}
    </div>
    <div className="mt-0.5 text-sm font-black text-[#111827]">{value}</div>
  </div>
);
