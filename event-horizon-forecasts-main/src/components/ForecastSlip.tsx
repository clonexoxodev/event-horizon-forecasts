import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, Loader2, X, RefreshCw, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { formatNaira, formatNairaPrice } from "@/lib/markets";
import { toast } from "sonner";
import type { ApiOrder } from "@/lib/api";

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

export const ForecastSlip = ({ selection, onClose, onConfirm, onOrderConfirm }: ForecastSlipProps) => {
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"form" | "submitting" | "success" | "error">("form");
  const [errorMessage, setErrorMessage] = useState("");
  const [orderResult, setOrderResult] = useState<{ order: ApiOrder; matched: number } | null>(null);
  const { user, setAuthOpen } = useAuth();
  const slipRef = useRef<HTMLDivElement>(null);
  const successTimerRef = useRef<number | null>(null);

  const isOrderBook = selection?.pricingModel === "orderbook";

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        handleClose();
      }
    },
    [loading]
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
    if (phase === "form") {
      setErrorMessage("");
    }
  }, [phase]);

  useEffect(() => {
    if (selection && isOrderBook) {
      const currentPrice = selection.side === "YES" ? selection.currentPrice : 100 - selection.currentPrice;
      setPrice(String(Math.round(currentPrice)));
    }
  }, [selection, isOrderBook]);

  if (!selection) return null;

  const numAmount = Number.parseFloat(amount) || 0;
  const numPrice = Number.parseFloat(price) || 0;
  const isPositiveSide = selection.side === "YES" || selection.side === "UP";
  const userBalance = user?.balance || 0;
  const lockedBalance = (user as any)?.lockedBalance || 0;
  const insufficientBalance = numAmount > userBalance;
  const estimatedShares = isOrderBook && numPrice > 0 ? Math.floor(numAmount / numPrice) : 0;
  const orderValue = numAmount;
  const remainingBalance = Math.max(0, userBalance - numAmount);

  const selectionMissingData = Boolean(
    !selection.marketId ||
      !selection.marketQuestion ||
      !selection.side ||
      !Number.isFinite(Number(selection.currentPrice))
  );

  const isFormValid = Boolean(
    user &&
      !loading &&
      numAmount > 0 &&
      !insufficientBalance &&
      !selectionMissingData &&
      (!isOrderBook || (numPrice > 0 && numPrice < 100))
  );

  function handleClose() {
    if (loading) return;
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
  }

  const handleConfirm = async () => {
    if (loading) return;
    if (selectionMissingData) {
      setErrorMessage("Market not available. Please go back and try again.");
      setPhase("error");
      return;
    }
    if (numAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (insufficientBalance) {
      toast.error("Insufficient balance. Add money to continue.");
      return;
    }
    if (isOrderBook && (numPrice <= 0 || numPrice >= 100)) {
      toast.error("Price must be between 1 and 99.");
      return;
    }

    setLoading(true);
    setPhase("submitting");
    setErrorMessage("");
    try {
      if (isOrderBook && onOrderConfirm) {
        const result = await onOrderConfirm({
          side: selection.side as "YES" | "NO",
          orderType,
          price: numPrice,
          quantity: numAmount,
        });
        setOrderResult(result);
        setPhase("success");
        const statusLabel = result.order.status === "filled"
          ? "Fully filled"
          : result.order.status === "partial"
            ? `Partially filled (${result.matched} matched)`
            : "Waiting to be matched";
        toast.success(`Order placed: ${statusLabel}`);
        successTimerRef.current = window.setTimeout(() => {
          handleClose();
        }, 6000);
      } else {
        await onConfirm(selection, numAmount);
        setPhase("success");
        toast.success("Prediction placed successfully.");
        successTimerRef.current = window.setTimeout(() => {
          handleClose();
        }, 4000);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Could not place order. Please try again.";
      setErrorMessage(msg);
      setPhase("error");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setPhase("form");
    setErrorMessage("");
  };

  const handleSuccessDismiss = () => {
    handleClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#111827]/35 backdrop-blur-sm"
        onClick={() => handleClose()}
        aria-hidden="true"
      />

      <div
        ref={slipRef}
        role="dialog"
        aria-modal="true"
        aria-label="Order slip"
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-2xl border border-[#E5E7EB] bg-white pb-[calc(90px+env(safe-area-inset-bottom))] shadow-[0_-24px_80px_rgba(17,24,39,0.16)] md:bottom-auto md:left-auto md:top-0 md:h-screen md:w-[460px] md:rounded-none md:border-l md:pb-0"
      >
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1 w-10 rounded-full bg-[#E5E7EB]" />
        </div>

        {phase === "success" ? (
          <SuccessState
            selection={selection}
            amount={numAmount}
            price={numPrice}
            orderResult={orderResult}
            isOrderBook={isOrderBook}
            onClose={handleSuccessDismiss}
          />
        ) : phase === "error" ? (
          <ErrorState
            message={errorMessage}
            selection={selection}
            amount={numAmount}
            onRetry={handleRetry}
            onClose={handleClose}
            loading={loading}
          />
        ) : selectionMissingData ? (
          <UnavailableState loading={loading} onClose={handleClose} />
        ) : (
          <div className="space-y-4 p-5 sm:p-6">
            <SlipHeader onClose={handleClose} loading={loading} isOrderBook={isOrderBook} />

            <div className={`rounded-2xl p-4 ${isPositiveSide ? "bg-[#12B886]/8" : "bg-[#E85D5D]/8"}`}>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-2xl shadow-sm">
                  {selection.marketIcon}
                </div>
                <div className="min-w-0">
                  <div className="line-clamp-3 text-sm font-black leading-snug text-[#111827]">
                    {selection.marketQuestion}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${isPositiveSide ? "bg-[#12B886]/12 text-[#047857]" : "bg-[#E85D5D]/12 text-[#B42318]"}`}>
                      {selection.side}
                    </span>
                    <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-bold text-[#6B7280]">
                      {formatNairaPrice(selection.currentPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {!user && (
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
                <div className="font-black text-[#111827]">Login to place an order</div>
                <p className="mt-1 text-sm text-[#6B7280]">Sign in to trade on this market.</p>
                <button onClick={() => { handleClose(); setAuthOpen(true); }} aria-label="Log in to place order" className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-black text-white hover:bg-[#4338CA]">
                  Continue
                </button>
              </div>
            )}

            {isOrderBook && (
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">
                  Order Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOrderType("BUY")}
                    disabled={loading}
                    className={`h-11 rounded-xl border text-sm font-black transition ${
                      orderType === "BUY"
                        ? "border-[#12B886]/45 bg-[#12B886]/18 text-[#047857]"
                        : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] hover:text-[#111827]"
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    onClick={() => setOrderType("SELL")}
                    disabled={loading}
                    className={`h-11 rounded-xl border text-sm font-black transition ${
                      orderType === "SELL"
                        ? "border-[#E85D5D]/45 bg-[#E85D5D]/18 text-[#B42318]"
                        : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] hover:text-[#111827]"
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>
            )}

            {isOrderBook && (
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">
                  Price per share
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#6B7280]">
                    NGN
                  </span>
                  <Input
                    type="number"
                    placeholder="0"
                    min="1"
                    max="99"
                    aria-label="Price per share"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    disabled={loading}
                    className="h-14 rounded-xl border-2 bg-[#F8F7F4] pl-14 text-xl font-black text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] border-[#E5E7EB]"
                  />
                </div>
                <p className="mt-1 text-[10px] font-bold text-[#9CA3AF]">Price between 1 and 99 kobo per share</p>
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">
                {isOrderBook ? "Amount (NGN)" : "Amount"}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#6B7280]">
                  NGN
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  aria-label="Order amount in Naira"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={loading}
                  className={`h-14 rounded-xl border-2 bg-[#F8F7F4] pl-14 text-xl font-black text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] ${
                    insufficientBalance && numAmount > 0 ? "border-[#E85D5D]" : "border-[#E5E7EB]"
                  }`}
                />
              </div>
              {insufficientBalance && numAmount > 0 && (
                <p className="mt-2 text-xs font-bold text-[#B42318]">Insufficient balance.</p>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 2000].map((value) => (
                <button
                  key={value}
                  onClick={() => setAmount(value.toString())}
                  aria-label={`Set amount to ${formatNaira(value).replace(".00", "")}`}
                  disabled={loading}
                  className={`h-11 rounded-xl border text-sm font-black transition ${
                    amount === value.toString()
                      ? isPositiveSide
                        ? "border-[#12B886]/45 bg-[#12B886]/18 text-[#047857]"
                        : "border-[#E85D5D]/45 bg-[#E85D5D]/18 text-[#B42318]"
                      : "border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  {formatNaira(value).replace(".00", "")}
                </button>
              ))}
            </div>

            <div className="border-y border-[#E5E7EB] py-3 space-y-2">
              <InfoCard label="Available Balance" value={user ? formatNaira(userBalance) : "Login required"} />
              {lockedBalance > 0 && (
                <InfoCard label="Locked in Orders" value={formatNaira(lockedBalance)} />
              )}
            </div>

            {isOrderBook && numAmount > 0 && numPrice > 0 && (
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8F7F4] p-4 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard label="Est. Shares" value={`${estimatedShares}`} />
                  <InfoCard label="Order Value" value={formatNaira(orderValue)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard label="Price/Share" value={formatNaira(numPrice)} />
                  <InfoCard label="Remaining Balance" value={formatNaira(remainingBalance)} />
                </div>
                <div className="mt-2 border-t border-[#E5E7EB] pt-2">
                  <InfoCard
                    label="Possible Outcome"
                    value={orderType === "BUY"
                      ? `Win ${estimatedShares} shares × 100k = ${formatNaira(estimatedShares * 100)}`
                      : `Sell ${estimatedShares} shares at ${formatNaira(numPrice)}`}
                  />
                </div>
              </div>
            )}

            {!isOrderBook && numAmount > 0 && (
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
                <p className="text-sm font-bold text-[#6B7280]">Market order — fills at current price</p>
              </div>
            )}

            <Button
              onClick={handleConfirm}
              disabled={!isFormValid}
              aria-disabled={!isFormValid}
              className={`h-12 w-full rounded-xl text-base font-bold text-white transition ${
                isPositiveSide
                  ? "bg-[#12B886] text-[#06100d] hover:bg-[#2dd4a0]"
                  : "bg-[#E85D5D] hover:bg-[#f07575]"
              } disabled:opacity-50`}
            >
              {phase === "submitting" ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Placing Order...
                </>
              ) : isOrderBook ? (
                <>Place {orderType} Order</>
              ) : (
                <>Confirm {selection.side}</>
              )}
            </Button>

            <button
              onClick={handleClose}
              disabled={loading}
              className="w-full text-sm font-bold text-[#6B7280] transition hover:text-[#111827] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const SlipHeader = ({ onClose, loading, isOrderBook }: { onClose: () => void; loading: boolean; isOrderBook: boolean }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7280]">
        {isOrderBook ? "Order slip" : "Prediction slip"}
      </p>
      <h2 className="mt-1 text-2xl font-black text-[#111827]">
        {isOrderBook ? "Place your order" : "Back your opinion"}
      </h2>
    </div>
    <button
      onClick={onClose}
      disabled={loading}
      aria-label="Close order slip"
      className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] transition hover:text-[#111827] disabled:opacity-50"
    >
      <X className="h-5 w-5" aria-hidden="true" />
    </button>
  </div>
);

const UnavailableState = ({ loading, onClose }: { loading: boolean; onClose: () => void }) => (
  <div className="space-y-5 p-5 sm:p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B42318]">Order slip</p>
        <h2 className="mt-1 text-2xl font-black text-[#111827]">Market not available</h2>
      </div>
      <button
        onClick={onClose}
        disabled={loading}
        aria-label="Close order slip"
        className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] transition hover:text-[#111827] disabled:opacity-50"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
    <div className="rounded-xl border border-[#E85D5D]/30 bg-[#E85D5D]/10 p-4 text-sm font-bold leading-relaxed text-[#B42318]">
      Market not available. Please go back and try again.
    </div>
  </div>
);

const SuccessState = ({
  selection,
  amount,
  price,
  orderResult,
  isOrderBook,
  onClose,
}: {
  selection: ForecastSelection;
  amount: number;
  price: number;
  orderResult: { order: ApiOrder; matched: number } | null;
  isOrderBook: boolean;
  onClose: () => void;
}) => {
  const isPositiveSide = selection.side === "YES" || selection.side === "UP";

  const statusLabel = orderResult
    ? orderResult.order.status === "filled"
      ? "Fully Filled"
      : orderResult.order.status === "partial"
        ? "Partially Filled"
        : orderResult.order.status === "waiting"
          ? "Waiting to Match"
          : orderResult.order.status === "pending"
            ? "Submitted"
            : orderResult.order.status.charAt(0).toUpperCase() + orderResult.order.status.slice(1)
    : "Placed";

  const statusColor = orderResult
    ? orderResult.order.status === "filled"
      ? "text-[#047857]"
      : orderResult.order.status === "partial"
        ? "text-[#D97706]"
        : "text-[#4F46E5]"
    : "text-[#047857]";

  const StatusIcon = orderResult
    ? orderResult.order.status === "filled"
      ? CheckCircle
      : orderResult.order.status === "partial"
        ? AlertCircle
        : Clock
    : CheckCircle;

  const estimatedShares = isOrderBook && price > 0 ? Math.floor(amount / price) : 0;

  return (
    <div className="grid min-h-[460px] place-items-center bg-white p-8 text-center">
      <div className="w-full max-w-sm">
        <div className={`mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full text-white shadow-[0_18px_44px_rgba(16,24,40,0.16)] ${isPositiveSide ? "bg-[#12B886]" : "bg-[#E85D5D]"}`}>
          <StatusIcon className="h-11 w-11" />
        </div>
        <h3 className="text-3xl font-black text-[#101828]">Order {statusLabel}</h3>
        <p className="mt-3 text-base font-bold text-[#101828]">
          {selection.side} order for {formatNaira(amount)}
        </p>
        {isOrderBook && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#F8F7F4] p-3 text-left">
            <InfoCard label="Shares" value={`${estimatedShares}`} />
            <InfoCard label="Price" value={formatNaira(price)} />
          </div>
        )}
        {orderResult && (
          <div className={`mt-3 text-sm font-bold ${statusColor}`}>
            {orderResult.order.status === "filled" && `All ${orderResult.matched} shares matched`}
            {orderResult.order.status === "partial" && `${orderResult.matched} of ${estimatedShares || amount} matched`}
            {orderResult.order.status === "waiting" && "Your order is in the order book waiting for a match"}
            {orderResult.order.status === "pending" && "Your order has been submitted"}
          </div>
        )}
        <div className="mt-7">
          <button
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-bold text-white transition hover:bg-[#4338CA]"
          >
            Continue Trading
          </button>
        </div>
      </div>
    </div>
  );
};

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
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B42318]">Order slip</p>
        <h2 className="mt-1 text-2xl font-black text-[#111827]">Something went wrong</h2>
      </div>
      <button
        onClick={onClose}
        disabled={loading}
        aria-label="Close order slip"
        className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] transition hover:text-[#111827] disabled:opacity-50"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
    <div className="rounded-xl border border-[#E85D5D]/30 bg-[#E85D5D]/10 p-4 text-sm font-bold leading-relaxed text-[#B42318]">
      {message}
    </div>
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-xl shadow-sm">
          {selection.marketIcon}
        </div>
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-bold text-[#111827]">{selection.marketQuestion}</div>
          <div className="mt-1 text-xs font-bold text-[#6B7280]">{selection.side} &middot; {formatNaira(amount)}</div>
        </div>
      </div>
    </div>
    <div className="grid gap-3">
      <button
        onClick={onRetry}
        disabled={loading}
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#4F46E5] text-sm font-bold text-white transition hover:bg-[#4338CA] disabled:opacity-50"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>
      <button
        onClick={onClose}
        disabled={loading}
        className="w-full text-sm font-bold text-[#6B7280] transition hover:text-[#111827] disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  </div>
);

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">{label}</div>
    <div className="mt-0.5 text-sm font-black text-[#111827]">{value}</div>
  </div>
);
