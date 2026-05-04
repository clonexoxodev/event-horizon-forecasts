import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
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
      <Hero />
      <CategoryTabs onChange={setCategory} />

      <main id="markets" className="flex-1 container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold">
              {category === "Trending" ? "All Markets" : category}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading ? "Loading..." : `${filtered.length} active market${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-2 hover:bg-secondary transition-smooth">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl p-5 border border-border/50 h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((m, i) => (
              <div key={m.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <MarketCard m={m} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary grid place-items-center mb-4 text-3xl">🔍</div>
            <h3 className="font-semibold text-lg">No markets yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
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
