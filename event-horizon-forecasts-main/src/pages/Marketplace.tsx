import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { Position, fetchAllListings } from "@/lib/positions";
import { formatNaira } from "@/lib/markets";
import { 
  Search, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Filter,
  Tag,
  Clock
} from "lucide-react";

export default function Marketplace() {
  const [listings, setListings] = useState<Position[]>([]);
  const [filteredListings, setFilteredListings] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sideFilter, setSideFilter] = useState<"ALL" | "YES" | "NO">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "price_low" | "price_high" | "value">("newest");

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [listings, searchQuery, sideFilter, sortBy]);

  const loadListings = async () => {
    setLoading(true);
    const data = await fetchAllListings();
    setListings(data);
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...listings];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.marketQuestion.toLowerCase().includes(query) ||
        l.listingCode?.toLowerCase().includes(query)
      );
    }

    // Side filter
    if (sideFilter !== "ALL") {
      filtered = filtered.filter(l => l.side === sideFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price_low":
          return (a.askingPrice ?? 0) - (b.askingPrice ?? 0);
        case "price_high":
          return (b.askingPrice ?? 0) - (a.askingPrice ?? 0);
        case "value":
          return b.currentValue - a.currentValue;
        case "newest":
        default:
          return new Date(b.listedAt || "").getTime() - new Date(a.listedAt || "").getTime();
      }
    });

    setFilteredListings(filtered);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />

      <main className="flex-1 container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-charcoal mb-2">
            Marketplace
          </h1>
          <p className="text-graphite text-sm">
            Buy and sell positions from other traders
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" />
            <input
              type="text"
              placeholder="Search by market or listing code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-10 pr-10 bg-off-white border border-graphite/20 rounded-xl text-sm text-charcoal placeholder:text-graphite/60 focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-graphite/10 hover:bg-graphite/20 grid place-items-center transition-colors"
              >
                <X className="w-3 h-3 text-graphite" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Side Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-graphite shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => setSideFilter("ALL")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    sideFilter === "ALL"
                      ? "bg-purple text-white"
                      : "bg-graphite/10 text-graphite hover:bg-graphite/20"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSideFilter("YES")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    sideFilter === "YES"
                      ? "bg-emerald text-white"
                      : "bg-emerald-soft text-emerald hover:bg-emerald/20"
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setSideFilter("NO")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    sideFilter === "NO"
                      ? "bg-coral text-white"
                      : "bg-coral-soft text-coral hover:bg-coral/20"
                  }`}
                >
                  NO
                </button>
              </div>
            </div>

            {/* Sort and Results */}
            <div className="flex items-center gap-3 sm:ml-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 sm:flex-none px-4 py-2 bg-off-white border border-graphite/20 rounded-lg text-sm font-medium text-charcoal focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/10"
              >
                <option value="newest">Newest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="value">Highest Value</option>
              </select>

              {/* Results Count */}
              <span className="text-sm text-graphite whitespace-nowrap">
                {filteredListings.length} listing{filteredListings.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-off-white rounded-xl p-5 border border-graphite/10 h-64 animate-shimmer" />
            ))}
          </div>
        ) : filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((listing) => {
              const priceChange = listing.currentPrice - listing.entryPrice;
              const valueChange = listing.currentValue - listing.stake;
              const isProfit = valueChange > 0;
              const discount = listing.askingPrice && listing.askingPrice < listing.currentValue
                ? ((listing.currentValue - listing.askingPrice) / listing.currentValue) * 100
                : 0;

              return (
                <Link
                  key={listing.id}
                  to={`/listing/${listing.listingCode}`}
                  className="group bg-off-white rounded-xl p-5 shadow-card hover:shadow-elevated transition-all border border-graphite/10 hover:border-graphite/20 hover:-translate-y-1"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-white grid place-items-center text-2xl shadow-sm">
                      {listing.marketIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
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
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-graphite">
                      <Tag className="w-3 h-3" />
                      <span className="font-mono">{listing.listingCode}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-graphite">Entry:</span>
                      <span className="font-semibold text-charcoal">{listing.entryPrice}%</span>
                      {priceChange !== 0 && (
                        <span
                          className={`flex items-center font-bold ${
                            isProfit ? "text-emerald" : "text-coral"
                          }`}
                        >
                          {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {Math.abs(priceChange).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-3 pt-3 border-t border-graphite/10 flex items-center justify-between text-xs text-graphite">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Listed {new Date(listing.listedAt || "").toLocaleDateString()}</span>
                    </div>
                    <span className="text-purple font-semibold group-hover:underline">
                      View Details →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-graphite/10 grid place-items-center mx-auto mb-4 text-4xl">
              🏪
            </div>
            <h3 className="text-xl font-bold text-charcoal mb-2">No listings found</h3>
            <p className="text-graphite mb-6">
              {searchQuery || sideFilter !== "ALL"
                ? "Try adjusting your filters"
                : "Be the first to list a position!"}
            </p>
            {(searchQuery || sideFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSideFilter("ALL");
                }}
                className="px-6 py-3 bg-purple text-white rounded-xl font-semibold hover:bg-purple/90 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
