import { useEffect, useMemo, useState } from "react";
import { Search, UserCircle, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { MarketCard } from "@/components/MarketCard";
import { getTrendingScore } from "@/lib/markets";
import { useMarketState } from "@/lib/market-state";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import { NotificationBell } from "@/components/NotificationBell";

const categories = ["Trending", "Sports", "Crypto", "Politics", "Finance", "Entertainment", "Music", "Global"];

const isLiveMarket = (market: { status?: string; closeTime?: string }) => {
  const hasEnded = market.closeTime ? new Date(market.closeTime).getTime() <= Date.now() : false;
  return market.status === "active" && !hasEnded;
};

const Index = () => {
  const { user } = useAuth();
  const [category, setCategory] = useState("Trending");
  const [searchQuery, setSearchQuery] = useState("");
  const { markets, loadMarkets, isLoadingMarkets, marketError } = useMarketState();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    loadMarkets().catch(() => {
      // The shared market state keeps the last successful list, so Home should not flash empty.
    });
  }, [loadMarkets]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMarkets({ force: true }).catch(() => {});
      }
    }, 15000);
    return () => window.clearInterval(refresh);
  }, [loadMarkets]);

  const filtered = useMemo(() => {
    let next = markets.filter(isLiveMarket);
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

  const liveCount = markets.filter(isLiveMarket).length;

  return (
    <div className="app-bg min-h-screen pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-[1320px] px-4 py-4 sm:px-6 lg:py-6">
        <section className="mb-4 flex items-center justify-between gap-3 md:hidden">
          <div>
            <div className="text-2xl font-black tracking-tight">Flippe</div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#8B98A8]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#12B886]" />
              {liveCount} live markets
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/wallet" className="rounded-xl border border-[#263241] bg-[#101720] px-3 py-2 text-xs font-black">
              <Wallet className="mr-1 inline h-3.5 w-3.5 text-[#12B886]" />
              {formatNaira(user?.balance || 0)}
            </Link>
            <NotificationBell />
            <Link to={user ? "/more" : "/login"} className="grid h-10 w-10 place-items-center rounded-full border border-[#263241] bg-[#151E28] text-white">
              {user?.username?.charAt(0).toUpperCase() || <UserCircle className="h-5 w-5" />}
            </Link>
          </div>
        </section>

        <section className="sticky top-0 z-30 mb-4 space-y-3 border-b border-[#263241] bg-[#080c10]/94 py-2 backdrop-blur-xl md:top-[65px]" data-now={now}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B98A8]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search markets or topics"
              className="h-12 w-full rounded-xl border border-[#263241] bg-[#101720] pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-[#8B98A8] focus:border-[#12B886]/70"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((chip) => (
              <button
                key={chip}
                onClick={() => setCategory(chip)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                  category === chip
                    ? "bg-[#12B886] text-[#06100d]"
                    : "border border-[#263241] bg-[#101720] text-[#8B98A8] hover:text-white"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-4">
          <h1 className="text-2xl font-black tracking-tight">Live markets</h1>
          <p className="mt-1 text-xs font-bold text-[#8B98A8]">
            Choose a market, pick YES or NO, and track how sentiment moves.
          </p>
        </section>

        {isLoadingMarkets && markets.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-64 rounded-2xl border border-[#263241] soft-shimmer" />
            ))}
          </div>
        ) : marketError && filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#F2C94C]/25 bg-[#F2C94C]/10 p-10 text-center">
            <h3 className="text-lg font-black">Could not load markets</h3>
            <p className="mt-1 text-sm text-amber-100/70">{marketError}</p>
            <button
              onClick={() => loadMarkets({ force: true })}
              className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#080c10]"
            >
              Retry
            </button>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((market, index) => (
              <div key={market.id} className="animate-fade-up" style={{ animationDelay: `${index * 30}ms` }}>
                <MarketCard m={market} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#263241] bg-[#101720]/60 p-10 text-center">
            <h3 className="text-lg font-black">No live markets found</h3>
            <p className="mt-1 text-sm text-[#8B98A8]">Try another category or search term.</p>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
};

export default Index;
