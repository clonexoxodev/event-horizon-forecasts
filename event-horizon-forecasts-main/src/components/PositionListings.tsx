import { useState, useEffect } from "react";
import { Position, fetchAllListings, purchaseListing, generateShareableLink } from "@/lib/positions";
import { ListingCard } from "@/components/ListingCard";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

interface PositionListingsProps {
  marketId: string;
  marketStatus: "active" | "closed" | "resolved";
}

export const PositionListings = ({ marketId, marketStatus }: PositionListingsProps) => {
  const [listings, setListings] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadListings();
  }, [marketId]);

  const loadListings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchAllListings(marketId);
      setListings(data);
    } catch (err) {
      console.error("Error loading listings:", err);
      setError("Failed to load listings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (positionId: string) => {
    if (!user) {
      toast.error("Please sign in to purchase positions");
      return;
    }

    // Find the listing to check price
    const listing = listings.find(l => l.id === positionId);
    if (!listing) {
      toast.error("Listing not found");
      return;
    }

    // Check if user has sufficient balance
    if (user.balance < (listing.askingPrice ?? 0)) {
      toast.error("Insufficient funds. Please add funds to your wallet.");
      return;
    }

    try {
      const result = await purchaseListing(positionId, user.id);
      
      if (result.success) {
        toast.success("Position purchased successfully!");
        // Re-fetch listings to remove the purchased one
        await loadListings();
      } else {
        toast.error(result.error || "Purchase failed. Please try again.");
      }
    } catch (err) {
      console.error("Purchase error:", err);
      toast.error("Purchase failed. Please try again.");
    }
  };

  const handleShare = (listingCode: string) => {
    const shareableUrl = generateShareableLink(listingCode);
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareableUrl).then(() => {
      toast.success("Link copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-charcoal">Position Listings</h2>
          <Loader2 className="w-5 h-5 text-graphite animate-spin" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-off-white rounded-xl p-5 border border-graphite/10 h-64 animate-pulse"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-graphite/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-graphite/10 rounded w-16" />
                  <div className="h-4 bg-graphite/10 rounded w-full" />
                  <div className="h-4 bg-graphite/10 rounded w-3/4" />
                </div>
              </div>
              <div className="h-20 bg-graphite/10 rounded-xl mb-4" />
              <div className="h-4 bg-graphite/10 rounded w-full mb-4" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 bg-graphite/10 rounded-xl" />
                <div className="h-10 bg-graphite/10 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-charcoal">Position Listings</h2>
        <div className="bg-coral-soft border border-coral/20 rounded-xl p-6 text-center">
          <p className="text-coral font-semibold mb-3">{error}</p>
          <button
            onClick={loadListings}
            className="px-4 py-2 bg-coral text-white rounded-lg font-semibold hover:bg-coral/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (listings.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-charcoal">Position Listings</h2>
        <div className="bg-off-white rounded-xl p-12 text-center border border-graphite/10">
          <div className="w-16 h-16 rounded-2xl bg-graphite/10 grid place-items-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-graphite" />
          </div>
          <h3 className="text-lg font-bold text-charcoal mb-2">No positions listed yet</h3>
          <p className="text-graphite text-sm">
            Be the first to list a position for this market!
          </p>
        </div>
      </div>
    );
  }

  // Listings grid
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-charcoal">Position Listings</h2>
        <span className="text-sm text-graphite">
          {listings.length} listing{listings.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onPurchase={handlePurchase}
            onShare={handleShare}
            disabled={!user || listing.userId === user?.id}
          />
        ))}
      </div>
    </div>
  );
};
