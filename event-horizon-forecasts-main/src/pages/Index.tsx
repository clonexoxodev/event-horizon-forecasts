import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { MarketCard } from "@/components/MarketCard";
import { fetchMarkets } from "@/lib/markets";
import { useMarketState } from "@/lib/market-state";
import { Flame, Search, Trophy, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";

const chips = ["For You", "Trending", "Sports", "Music", "Crypto", "Politics"];

const Index = () => {
  const { user } = useAuth();
  const [category, setCategory] = useState("For You");
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

    if (category !== "For You" && category !== "Trending") {
      next = next.filter((market) => market.category === category);
    }

    if (category === "Trending") {
      next.sort((a, b) => (b.participants + b.totalPool) - (a.participants + a.totalPool));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      next = next.filter((market) =>
        market.question.toLowerCase().includes(query) ||
        market.category.toLowerCase().includes(query)
      );
    }

    return next;
  }, [markets, category, searchQuery]);

  return (
    <div className="min-h-screen bg-[#050711] pb-20 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto grid max-w-[1320px] gap-6 px-4 py-5 lg:grid-cols-[1fr_340px] lg:px-6">
        <section className="min-w-0">
          <div className="mb-5 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-200">
                  <Flame className="h-3.5 w-3.5" />
                  Live markets
                </p>
                <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                  Predict what happens next.
                </h1>
                <p className="mt-2 max-w-xl text-sm text-slate-400 sm:text-base">
                  Pick a side. Back your call. Climb the board.
                </p>
              </div>
              <div className="hidden rounded-3xl border border-white/10 bg-black/25 p-4 text-right md:block">
                <div className="text-xs text-slate-400">Balance</div>
                <div className="text-2xl font-black text-emerald-300">
                  {formatNaira(user?.balance || 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="sticky top-[65px] z-20 mb-5 space-y-3 bg-[#050711]/85 py-2 backdrop-blur-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search markets..."
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400/50"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setCategory(chip)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                    category === chip
                      ? "bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.35)]"
                      : "border border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-[390px] animate-pulse rounded-3xl border border-white/10 bg-white/5" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((market, index) => (
                <div key={market.id} className="animate-fade-up" style={{ animationDelay: `${index * 35}ms` }}>
                  <MarketCard m={market} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/20 text-2xl">
                <Flame className="h-7 w-7 text-violet-200" />
              </div>
              <h3 className="text-lg font-black">No markets yet</h3>
              <p className="mt-1 text-sm text-slate-400">Add active markets in the backend to fill this feed.</p>
            </div>
          )}
        </section>

        <aside className="hidden space-y-4 lg:block">
          <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
              <Trophy className="h-5 w-5 text-yellow-300" />
              Top Predictors
            </h2>
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-center">
              <Trophy className="mx-auto mb-3 h-7 w-7 text-violet-300" />
              <div className="font-black text-white">No leaderboard yet</div>
              <p className="mt-1 text-sm text-slate-500">Top predictors will appear after real results.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
              <Wallet className="h-5 w-5 text-violet-300" />
              My Overview
            </h2>
            <div className="rounded-2xl bg-black/20 p-4">
              <div className="text-xs text-slate-500">Balance</div>
              <div className="text-3xl font-black text-white">{formatNaira(user?.balance || 0)}</div>
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
                Monthly stats will appear after your real activity.
              </div>
            </div>
          </div>
        </aside>
      </main>
      <MobileNav />
    </div>
  );
};

export default Index;
