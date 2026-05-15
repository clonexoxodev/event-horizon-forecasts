import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MarketCard } from "@/components/MarketCard";
import { Footer } from "@/components/Footer";
import { fetchMarkets } from "@/lib/markets";
import { useMarketState } from "@/lib/market-state";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [category, setCategory] = useState("Trending");
  const [searchQuery, setSearchQuery] = useState("");
  const { markets, setMarkets } = useMarketState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets().then(data => {
      setMarkets(data);
      setLoading(false);
    });
  }, [setMarkets]);

  // Filter by category
  let filtered = category === "Trending"
    ? markets
    : markets.filter(m => m.category === category);

  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(m => 
      m.question.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query)
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white pb-20 md:pb-0">
      <Header />
      <CategoryTabs onChange={setCategory} />

      <main id="markets" className="flex-1 container py-6">
        {/* Search Bar */}
        <div className="mb-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-10 bg-graphite/5 border border-graphite/10 rounded-xl text-sm text-charcoal placeholder:text-graphite/60 focus:bg-white focus:border-purple/30 focus:outline-none focus:ring-4 focus:ring-purple/10 transition-fast"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-graphite/10 hover:bg-graphite/20 grid place-items-center transition-fast"
              >
                <X className="w-3 h-3 text-graphite" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-charcoal tracking-tight">
              {category === "Trending" ? "All Markets" : category}
            </h2>
            <p className="text-sm text-graphite mt-0.5">
              {loading ? "Loading..." : `${filtered.length} active market${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button 
            onClick={() => {
              toast("Coming soon", {
                description: "Advanced filtering is currently in development",
              });
            }}
            className="flex items-center gap-1.5 text-sm text-graphite hover:text-charcoal border border-graphite/20 rounded-xl px-4 py-2 hover:bg-graphite/5 transition-fast font-semibold"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-graphite/10 h-64 animate-shimmer" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m, i) => (
              <div key={m.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <MarketCard m={m} />
              </div>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-xl bg-graphite/5 grid place-items-center mb-3 text-2xl border border-graphite/10">🔍</div>
            <h3 className="font-semibold text-base text-charcoal">No results found</h3>
            <p className="text-[13px] text-graphite mt-1 max-w-sm">
              No markets match "{searchQuery}". Try different keywords or browse all markets.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 px-4 py-2 bg-purple text-white text-[13px] font-semibold rounded-lg hover:bg-purple/90 transition-colors duration-180"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-xl bg-graphite/5 grid place-items-center mb-3 text-2xl border border-graphite/10">🔍</div>
            <h3 className="font-semibold text-base text-charcoal">No markets yet</h3>
            <p className="text-[13px] text-graphite mt-1">
              No {category} markets are live right now. Check back soon.
            </p>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
};

export default Index;
