import { useEffect, useMemo, useState } from "react";
import { Flame, Radio, Search, UserCircle, Wallet, Zap } from "lucide-react";
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
  const [pulseIndex, setPulseIndex] = useState(0);

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
    const timer = window.setInterval(() => setPulseIndex((value) => value + 1), 3500);
    return () => window.clearInterval(timer);
  }, []);

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
  const activeMarkets = filtered.filter(isLiveMarket);
  const pulseMarket = activeMarkets.length ? activeMarkets[pulseIndex % activeMarkets.length] : null;
  const recentActivity = pulseMarket
    ? `${Math.max(0, Number(pulseMarket.tradeCount || 0))} trades · ${pulseMarket.question}`
    : "Live markets are warming up";

  return (
    <div className="min-h-screen bg-[#050711] pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-[900px] px-4 py-4 sm:px-6">
        <section className="mb-4 flex items-center justify-between gap-3 md:hidden">
          <div>
            <div className="text-2xl font-black tracking-tight">Flippe</div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-violet-200/70">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
              {liveCount} live markets
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-black">
              <Wallet className="mr-1 inline h-3.5 w-3.5 text-violet-300" />
              {formatNaira(user?.balance || 0)}
            </button>
            <NotificationBell />
            <button className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white">
              {user?.username?.charAt(0).toUpperCase() || <UserCircle className="h-5 w-5" />}
            </button>
          </div>
        </section>

        {pulseMarket && (
        <Link to={`/market/${pulseMarket.id}`} className="mb-4 grid grid-cols-[1fr_auto] items-center gap-3 rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.24),rgba(255,255,255,0.045)_45%)] p-3 transition hover:border-violet-300/30">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Live pulse
            </div>
            <div className="mt-1 truncate text-sm font-black text-white">{recentActivity}</div>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#050711] shadow-[0_0_30px_rgba(255,255,255,0.16)]">
            <Zap className="h-5 w-5 fill-current" />
          </div>
        </Link>
        )}

        <section className="sticky top-0 z-30 mb-4 space-y-3 border-b border-white/10 bg-[#050711]/94 py-2 backdrop-blur-2xl md:top-[65px]" data-now={now}>
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
        </section>

        <section className="mb-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">For you</h1>
              <p className="mt-1 text-xs font-bold text-slate-500">Fast markets, live prices, one-tap predictions.</p>
            </div>
          </div>
        </section>

        {isLoadingMarkets && markets.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-56 animate-pulse rounded-[1.35rem] border border-white/10 bg-white/[0.055]" />
            ))}
          </div>
        ) : marketError && filtered.length === 0 ? (
          <div className="rounded-[1.35rem] border border-amber-300/20 bg-amber-400/10 p-10 text-center">
            <Flame className="mx-auto mb-3 h-8 w-8 text-amber-200" />
            <h3 className="text-lg font-black">Could not load markets</h3>
            <p className="mt-1 text-sm text-amber-100/70">{marketError}</p>
            <button
              onClick={() => loadMarkets({ force: true })}
              className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#050711]"
            >
              Retry
            </button>
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
