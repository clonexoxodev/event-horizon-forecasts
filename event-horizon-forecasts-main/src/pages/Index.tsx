import { useEffect, useMemo, useState } from "react";
import { Bell, Flame, Landmark, Search, UserCircle, Wallet } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { MarketCard } from "@/components/MarketCard";
import { fetchMarkets, getTrendingScore } from "@/lib/markets";
import { useMarketState } from "@/lib/market-state";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";

const categories = ["Trending", "Sports", "Crypto", "Politics", "Finance", "Entertainment", "Music", "Global"];

const Index = () => {
  const { user } = useAuth();
  const [category, setCategory] = useState("Trending");
  const [searchQuery, setSearchQuery] = useState("");
  const { markets, setMarkets } = useMarketState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets()
      .then(setMarkets)
      .finally(() => setLoading(false));
  }, [setMarkets]);

  const filtered = useMemo(() => {
    let next = [...markets];
    if (category !== "Trending" && category !== "Global") {
      next = next.filter((market) => market.category?.toLowerCase() === category.toLowerCase());
    }
    next.sort((a, b) => getTrendingScore(b) - getTrendingScore(a));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      next = next.filter((market) =>
        market.question.toLowerCase().includes(query) ||
        market.category.toLowerCase().includes(query)
      );
    }
    return next;
  }, [markets, category, searchQuery]);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return ["Nigeria World Cup", "Bitcoin", "Election", "Champions League"];
    return filtered.slice(0, 4).map((market) => market.question);
  }, [filtered, searchQuery]);

  return (
    <div className="min-h-screen bg-[#050711] pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-[900px] px-4 py-4 sm:px-6">
        <section className="mb-4 flex items-center justify-between gap-3 md:hidden">
          <div>
            <div className="text-2xl font-black tracking-tight">Flippe</div>
            <div className="text-xs font-bold text-violet-200/70">Live prediction markets</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-black">
              <Wallet className="mr-1 inline h-3.5 w-3.5 text-violet-300" />
              {formatNaira(user?.balance || 0)}
            </button>
            <button className="relative grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-slate-300">
              <Bell className="h-4 w-4" />
            </button>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white">
              {user?.username?.charAt(0).toUpperCase() || <UserCircle className="h-5 w-5" />}
            </button>
          </div>
        </section>

        <section className="sticky top-0 z-30 mb-4 space-y-3 border-b border-white/10 bg-[#050711]/94 py-2 backdrop-blur-2xl md:top-[65px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search markets or topics"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.07] pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-violet-300/50"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((chip) => (
              <button
                key={chip}
                onClick={() => setCategory(chip)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                  category === chip
                    ? "bg-white text-[#050711]"
                    : "border border-white/10 bg-white/[0.055] text-slate-400"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
          {(searchQuery || suggestions.length > 0) && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {suggestions.map((item) => (
                <button key={item} onClick={() => setSearchQuery(item)} className="shrink-0 rounded-full bg-violet-500/12 px-3 py-1.5 text-xs font-bold text-violet-100">
                  {item}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mb-4 rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black">Live market feed</h1>
              <p className="mt-1 text-xs font-bold text-slate-500">Public sentiment, prices, and time left.</p>
            </div>
            <Landmark className="h-5 w-5 text-violet-300" />
          </div>
        </section>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-56 animate-pulse rounded-[1.35rem] border border-white/10 bg-white/[0.055]" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((market, index) => (
              <div key={market.id} className="animate-fade-up" style={{ animationDelay: `${index * 30}ms` }}>
                <MarketCard m={market} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.035] p-10 text-center">
            <Flame className="mx-auto mb-3 h-8 w-8 text-violet-300" />
            <h3 className="text-lg font-black">No live markets found</h3>
            <p className="mt-1 text-sm text-slate-500">Try another category or search term.</p>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
};

export default Index;
