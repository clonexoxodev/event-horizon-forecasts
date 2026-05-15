import { useState } from "react";
import { X, TrendingUp, TrendingDown, Copy, Check, Share2 } from "lucide-react";
import { Position, createPositionListing, generateShareableLink } from "@/lib/positions";
import { formatNaira } from "@/lib/markets";
import { toast } from "sonner";

type SellPositionModalProps = {
  position: Position;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const SellPositionModal = ({ position, isOpen, onClose, onSuccess }: SellPositionModalProps) => {
  const [askingPrice, setAskingPrice] = useState(position.currentValue.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listingCreated, setListingCreated] = useState(false);
  const [listingCode, setListingCode] = useState("");
  const [shareableLink, setShareableLink] = useState("");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const priceChange = position.currentPrice - position.entryPrice;
  const valueChange = position.currentValue - position.stake;
  const isProfit = valueChange > 0;

  const handleCreateListing = async () => {
    const price = parseFloat(askingPrice);
    
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid asking price");
      return;
    }

    if (price > position.currentValue * 1.5) {
      toast.error("Asking price seems too high. Maximum 50% above current value.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createPositionListing(position.id, price);
      
      if (result.success && result.listingCode) {
        const link = generateShareableLink(result.listingCode);
        setListingCode(result.listingCode);
        setShareableLink(link);
        setListingCreated(true);
        
        toast.success("Position listed successfully!", {
          description: "Your listing is now live and shareable",
        });
        
        onSuccess();
      } else {
        toast.error(result.error || "Failed to create listing");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setListingCreated(false);
    setListingCode("");
    setShareableLink("");
    setCopied(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50 animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 pointer-events-none">
        <div
          className="bg-off-white rounded-t-3xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto shadow-modal pointer-events-auto animate-fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle (mobile) */}
          <div className="md:hidden w-12 h-1 bg-graphite/20 rounded-full mx-auto mt-3 mb-2" />

          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple/10 grid place-items-center text-2xl">
                {position.marketIcon}
              </div>
              <div>
                <h2 className="text-lg font-bold text-charcoal">
                  {listingCreated ? "Listing Created!" : "Sell Position"}
                </h2>
                <p className="text-xs text-graphite mt-0.5">
                  {listingCreated ? "Share your listing" : "Create a listing to sell"}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg hover:bg-graphite/10 grid place-items-center transition-colors"
            >
              <X className="w-4 h-4 text-graphite" />
            </button>
          </div>

          {!listingCreated ? (
            <>
              {/* Market Info */}
              <div className="px-6 pb-4">
                <div className="bg-graphite/5 rounded-xl p-4 border border-graphite/10">
                  <p className="text-sm font-semibold text-charcoal line-clamp-2 mb-3">
                    {position.marketQuestion}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        position.side === "YES"
                          ? "bg-emerald-soft text-emerald"
                          : "bg-coral-soft text-coral"
                      }`}
                    >
                      {position.side}
                    </span>
                    <span className="text-xs text-graphite">
                      Entry: {position.entryPrice}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Info */}
              <div className="px-6 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-graphite/5 rounded-xl p-4 border border-graphite/10">
                    <p className="text-xs text-graphite font-medium mb-1">Entry Price</p>
                    <p className="text-lg font-bold text-charcoal">{position.entryPrice}%</p>
                  </div>
                  <div className="bg-graphite/5 rounded-xl p-4 border border-graphite/10">
                    <p className="text-xs text-graphite font-medium mb-1">Current Price</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-lg font-bold text-charcoal">{position.currentPrice}%</p>
                      {priceChange !== 0 && (
                        <span
                          className={`flex items-center text-xs font-bold ${
                            isProfit ? "text-emerald" : "text-coral"
                          }`}
                        >
                          {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {Math.abs(priceChange).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Value Info */}
              <div className="px-6 pb-4">
                <div className="bg-gradient-to-br from-purple/5 to-purple/10 rounded-xl p-4 border border-purple/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-graphite font-medium">Your Stake</span>
                    <span className="text-sm font-bold text-charcoal">{formatNaira(position.stake)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-graphite font-medium">Current Value</span>
                    <span className="text-sm font-bold text-charcoal">{formatNaira(position.currentValue)}</span>
                  </div>
                  <div className="h-px bg-graphite/10 my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-charcoal">Unrealized P&L</span>
                    <span
                      className={`text-base font-bold ${
                        isProfit ? "text-emerald" : "text-coral"
                      }`}
                    >
                      {isProfit ? "+" : ""}{formatNaira(valueChange)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Asking Price Input */}
              <div className="px-6 pb-6">
                <label className="block text-sm font-semibold text-charcoal mb-2">
                  Asking Price
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-graphite">
                    ₦
                  </span>
                  <input
                    type="number"
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-14 pl-10 pr-4 bg-white border-2 border-graphite/20 rounded-xl text-lg font-bold text-charcoal placeholder:text-graphite/40 focus:border-purple focus:outline-none focus:ring-4 focus:ring-purple/10 transition-all"
                  />
                </div>
                <p className="text-xs text-graphite mt-2">
                  Suggested: {formatNaira(position.currentValue)} (current value)
                </p>
              </div>

              {/* Create Listing Button */}
              <div className="px-6 pb-6">
                <button
                  onClick={handleCreateListing}
                  disabled={isSubmitting}
                  className="w-full h-12 bg-purple text-white rounded-xl font-bold text-sm hover:bg-purple/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Creating Listing..." : "Create Listing"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="px-6 pb-6">
                {/* Success Icon */}
                <div className="w-16 h-16 rounded-2xl bg-emerald/10 grid place-items-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald" />
                </div>

                {/* Listing Code */}
                <div className="bg-gradient-to-br from-purple/5 to-purple/10 rounded-xl p-5 border border-purple/20 mb-4">
                  <p className="text-xs text-graphite font-medium mb-2 text-center">Listing Code</p>
                  <p className="text-2xl font-bold text-center text-charcoal tracking-wider mb-1">
                    {listingCode}
                  </p>
                  <p className="text-xs text-graphite text-center">
                    Share this code with potential buyers
                  </p>
                </div>

                {/* Shareable Link */}
                <div className="bg-graphite/5 rounded-xl p-4 border border-graphite/10 mb-4">
                  <p className="text-xs text-graphite font-medium mb-2">Shareable Link</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareableLink}
                      readOnly
                      className="flex-1 h-10 px-3 bg-white border border-graphite/20 rounded-lg text-xs text-charcoal font-mono"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="h-10 px-4 bg-purple text-white rounded-lg font-semibold text-xs hover:bg-purple/90 transition-colors flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Share Button */}
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: "Check out my position",
                        text: `I'm selling my ${position.side} position on: ${position.marketQuestion}`,
                        url: shareableLink,
                      });
                    } else {
                      handleCopyLink();
                    }
                  }}
                  className="w-full h-12 bg-charcoal text-white rounded-xl font-bold text-sm hover:bg-charcoal/90 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share Listing
                </button>

                {/* Info */}
                <p className="text-xs text-graphite text-center mt-4">
                  Your position is now listed at {formatNaira(parseFloat(askingPrice))}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
