import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MarketCard } from "@/components/MarketCard";
import { Footer } from "@/components/Footer";
import { fetchMarkets, Market } from "@/lib/markets";
import { SlidersHorizontal } from "lucide-react";

const Index = () => {
  const [category, setCategory] = useState("Trending");
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets().then(data => {
      setAllMarkets(data);
      setLoading(false);
    });
  }, []);

  const filtered = category === "Trending"
    ? allMarkets
    : allMarkets.filter(m => m.category === category);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CategoryTabs onChange={setCategory} />

      <main id="markets" className="flex-1 container py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-charcoal tracking-tight">
              {category === "Trending" ? "All Markets" : category}
            </h2>
            <p className="text-[13px] text-graphite mt-0.5">
              {loading ? "Loading..." : `${filtered.length} active market${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button className="flex items-center gap-1.5 text-[13px] text-graphite hover:text-charcoal border border-border/40 rounded-lg px-3 py-2 hover:bg-graphite/5 transition-fast font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border/40 h-64 animate-shimmer" />
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
    </div>
  );
};

export default Index;
