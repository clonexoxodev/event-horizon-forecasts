import { useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Tag, Share2, Loader2 } from "lucide-react";
import { Position } from "@/lib/positions";
import { formatNaira } from "@/lib/markets";
import { Button } from "@/components/ui/button";

interface ListingCardProps {
  listing: Position;
  onPurchase: (positionId: string) => Promise<void>;
  onShare: (listingCode: string) => void;
  disabled?: boolean;
}

export const ListingCard = ({ listing, onPurchase, onShare, disabled = false }: ListingCardProps) => {
  const [purchasing, setPurchasing] = useState(false);

  const priceChange = listing.currentPrice - listing.entryPrice;
  const valueChange = listing.currentValue - listing.stake;
  const isProfit = valueChange > 0;
  const discount = listing.askingPrice && listing.askingPrice < listing.currentValue
    ? ((listing.currentValue - listing.askingPrice) / listing.currentValue) * 100
    : 0;

  const handlePurchase = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled || purchasing) return;
    
    setPurchasing(true);
    try {
      await onPurchase(listing.id);
    } finally {
      setPurchasing(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (listing.listingCode) {
      onShare(listing.listingCode);
    }
  };

  return (
    <Link
      to={`/listing/${listing.listingCode}`}
      className="group bg-off-white rounded-xl p-5 shadow-card hover:shadow-elevated transition-all border border-graphite/10 hover:border-graphite/20 hover:-translate-y-1 block"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-lg bg-white grid place-items-center text-2xl shadow-sm flex-shrink-0">
          {listing.marketIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                listing.side === "YES"
                  ? "bg-emerald-soft text-emerald"
                  : "bg-coral-soft text-coral"
              }`}
            >
              {listing.side}
            </span>
            {discount > 0 && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald/10 text-emerald">
                -{discount.toFixed(0)}%
              </span>
            )}
          </div>
          <h3 className="font-semibold text-sm text-charcoal line-clamp-2 leading-tight group-hover:text-purple transition-colors">
            {listing.marketQuestion}
          </h3>
        </div>
      </div>

      {/* Price Info */}
      <div className="bg-gradient-to-br from-purple/5 to-purple/10 rounded-xl p-3 border border-purple/20 mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-graphite font-medium">Asking Price</span>
          <span className="text-lg font-bold text-charcoal">
            {formatNaira(listing.askingPrice ?? 0)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-graphite font-medium">Current Value</span>
          <span className="text-sm font-semibold text-graphite">
            {formatNaira(listing.currentValue)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs mb-4">
        <div className="flex items-center gap-1 text-graphite">
          <Tag className="w-3 h-3" />
          <span className="font-mono">{listing.listingCode}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-graphite">Entry:</span>
          <span className="font-semibold text-charcoal">{listing.entryPrice}%</span>
          {priceChange !== 0 && (
            <>
              <span className="text-graphite">→</span>
              <span className="font-semibold text-charcoal">{listing.currentPrice}%</span>
              <span
                className={`flex items-center font-bold ${
                  isProfit ? "text-emerald" : "text-coral"
                }`}
              >
                {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(priceChange).toFixed(1)}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handlePurchase}
          disabled={disabled || purchasing}
          className="h-10 bg-purple hover:bg-purple/90 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {purchasing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Buying...
            </>
          ) : (
            "Buy Position"
          )}
        </Button>
        <Button
          onClick={handleShare}
          disabled={disabled}
          variant="outline"
          className="h-10 border-graphite/20 text-graphite hover:text-charcoal hover:bg-graphite/5 font-semibold rounded-xl transition-all"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>
    </Link>
  );
};
