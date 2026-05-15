import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { Position, fetchListingByCode, purchaseListing } from "@/lib/positions";
import { formatNaira } from "@/lib/markets";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  AlertCircle,
  CheckCircle,
  Clock,
  User
} from "lucide-react";
import { toast } from "sonner";

export default function ListingDetail() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [listing, setListing] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (code) {
      loadListing();
    }
  }, [code]);

  const loadListing = async () => {
    if (!code) return;
    
    setLoading(true);
    const data = await fetchListingByCode(code);
    
    if (data) {
      setListing(data);
    } else {
      toast.error("Listing not found", {
        description: "This listing may have been sold or removed",
      });
    }
    
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!listing) return;

    // Check if user is trying to buy their own listing
    if (listing.userId === user.id) {
      toast.error("Cannot purchase your own listing");
      return;
    }

    setPurchasing(true);

    try {
      const result = await purchaseListing(listing.id, user.id);
      
      if (result.success) {
        toast.success("Position purchased successfully!", {
          description: "The position has been transferred to your portfolio",
        });
        
        // Redirect to portfolio after 2 seconds
        setTimeout(() => {
          navigate("/portfolio");
        }, 2000);
      } else {
        toast.error(result.error || "Failed to purchase listing");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setPurchasing(false);
      setShowConfirmModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
        <Header />
        <main className="flex-1 container py-20 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple/20 border-t-purple rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-graphite">Loading listing...</p>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
        <Header />
        <main className="flex-1 container py-20 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-coral/10 grid place-items-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-coral" />
            </div>
            <h2 className="text-2xl font-bold text-charcoal mb-2">Listing Not Found</h2>
            <p className="text-graphite mb-6">
              This listing may have been sold, cancelled, or the code is invalid.
            </p>
            <button
              onClick={() => navigate("/marketplace")}
              className="px-6 py-3 bg-purple text-white rounded-xl font-semibold hover:bg-purple/90 transition-colors"
            >
              Browse Marketplace
            </button>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  const priceChange = listing.currentPrice - listing.entryPrice;
  const valueChange = listing.currentValue - listing.stake;
  const isProfit = valueChange > 0;
  const discount = listing.askingPrice && listing.askingPrice < listing.currentValue
    ? ((listing.currentValue - listing.askingPrice) / listing.currentValue) * 100
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="flex-1 container py-8 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-graphite hover:text-charcoal mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Listing Header */}
            <div className="bg-off-white rounded-2xl p-6 shadow-card border border-graphite/10">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-white grid place-items-center text-3xl shadow-sm">
                  {listing.marketIcon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        listing.side === "YES"
                          ? "bg-emerald-soft text-emerald"
                          : "bg-coral-soft text-coral"
                      }`}
                    >
                      {listing.side} Position
                    </span>
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-purple/10 text-purple">
                      {listing.listingCode}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-charcoal leading-tight">
                    {listing.marketQuestion}
                  </h1>
                </div>
              </div>

              {discount > 0 && (
                <div className="bg-emerald/10 border border-emerald/20 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald shrink-0" />
                  <p className="text-sm font-semibold text-emerald">
                    {discount.toFixed(0)}% below current value - Great deal!
                  </p>
                </div>
              )}
            </div>

            {/* Position Details */}
            <div className="bg-off-white rounded-2xl p-6 shadow-card border border-graphite/10">
              <h2 className="font-bold text-base mb-4 text-charcoal">Position Details</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-graphite/5 rounded-xl p-4 border border-graphite/10">
                  <p className="text-xs text-graphite font-medium mb-1">Entry Price</p>
                  <p className="text-2xl font-bold text-charcoal">{listing.entryPrice}%</p>
                </div>
                <div className="bg-graphite/5 rounded-xl p-4 border border-graphite/10">
                  <p className="text-xs text-graphite font-medium mb-1">Current Price</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-charcoal">{listing.currentPrice}%</p>
                    {priceChange !== 0 && (
                      <span
                        className={`flex items-center text-sm font-bold ${
                          isProfit ? "text-emerald" : "text-coral"
                        }`}
                      >
                        {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {Math.abs(priceChange).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple/5 to-purple/10 rounded-xl p-4 border border-purple/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-graphite font-medium">Original Stake</span>
                  <span className="text-base font-bold text-charcoal">{formatNaira(listing.stake)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-graphite font-medium">Current Value</span>
                  <span className="text-base font-bold text-charcoal">{formatNaira(listing.currentValue)}</span>
                </div>
                <div className="h-px bg-graphite/10 my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-charcoal">Unrealized P&L</span>
                  <span
                    className={`text-lg font-bold ${
                      isProfit ? "text-emerald" : "text-coral"
                    }`}
                  >
                    {isProfit ? "+" : ""}{formatNaira(valueChange)}
                  </span>
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div className="bg-off-white rounded-2xl p-6 shadow-card border border-graphite/10">
              <h2 className="font-bold text-base mb-4 text-charcoal">Seller Information</h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple/10 grid place-items-center">
                  <User className="w-6 h-6 text-purple" />
                </div>
                <div>
                  <p className="font-semibold text-charcoal">Verified Seller</p>
                  <p className="text-xs text-graphite">Position listed {new Date(listing.listedAt || "").toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Card */}
          <div className="lg:col-span-1">
            <div className="bg-off-white rounded-2xl p-6 shadow-card border border-graphite/10 sticky top-24">
              <div className="mb-6">
                <p className="text-xs text-graphite font-medium mb-2">Asking Price</p>
                <p className="text-4xl font-bold text-charcoal mb-1">
                  {formatNaira(listing.askingPrice ?? 0)}
                </p>
                {discount > 0 && (
                  <p className="text-sm text-emerald font-semibold">
                    Save {formatNaira(listing.currentValue - (listing.askingPrice ?? 0))}
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={purchasing || (user && listing.userId === user.id)}
                className="w-full h-14 bg-purple text-white rounded-xl font-bold text-base hover:bg-purple/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
              >
                <ShoppingCart className="w-5 h-5" />
                {user && listing.userId === user.id ? "Your Listing" : "Purchase Position"}
              </button>

              <div className="space-y-2 text-xs text-graphite">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald" />
                  <span>Instant transfer to your portfolio</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald" />
                  <span>Secure transaction</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald" />
                  <span>Market closes {listing.marketStatus === "active" ? "soon" : "closed"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <MobileNav />

      {/* Confirm Purchase Modal */}
      {showConfirmModal && (
        <>
          <div
            className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50 animate-fade-in"
            onClick={() => setShowConfirmModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-off-white rounded-2xl w-full max-w-md p-6 shadow-modal pointer-events-auto animate-fade-up"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-charcoal mb-2">Confirm Purchase</h3>
              <p className="text-sm text-graphite mb-6">
                You are about to purchase this {listing.side} position for {formatNaira(listing.askingPrice ?? 0)}.
                This action cannot be undone.
              </p>

              <div className="bg-graphite/5 rounded-xl p-4 border border-graphite/10 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-graphite">Purchase Price</span>
                  <span className="text-base font-bold text-charcoal">{formatNaira(listing.askingPrice ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-graphite">Current Value</span>
                  <span className="text-base font-bold text-charcoal">{formatNaira(listing.currentValue)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={purchasing}
                  className="flex-1 h-12 bg-graphite/10 text-charcoal rounded-xl font-semibold hover:bg-graphite/20 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="flex-1 h-12 bg-purple text-white rounded-xl font-semibold hover:bg-purple/90 transition-colors disabled:opacity-50"
                >
                  {purchasing ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
