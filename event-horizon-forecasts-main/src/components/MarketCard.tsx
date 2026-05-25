import { Clock, MessageCircle, Play, TrendingUp, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Market, formatNaira } from "@/lib/markets";
import { useAuth } from "@/lib/auth";
import { useForecastSlip } from "@/lib/forecast-slip";

const categoryImages: Record<string, string> = {
  Sports: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=900&q=80",
  Music: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
  Entertainment: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
  Crypto: "https://images.unsplash.com/photo-1621504450181-5d356f61d307?auto=format&fit=crop&w=900&q=80",
  Cryptocurrency: "https://images.unsplash.com/photo-1621504450181-5d356f61d307?auto=format&fit=crop&w=900&q=80",
  Politics: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=80",
  Finance: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?auto=format&fit=crop&w=900&q=80",
  Technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
};

const marketImage = (market: Market) =>
  categoryImages[market.category] || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80";

export const MarketCard = ({ m, compact = false }: { m: Market; compact?: boolean }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openForecastSlip } = useForecastSlip();
  const isTrending = m.participants > 25 || m.totalPool > 10000;
  const comments = Math.max(8, Math.round((m.participants || 1) * 1.7));

  const handleSide = (event: React.MouseEvent, side: "YES" | "NO") => {
    event.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }

    openForecastSlip({
      marketId: m.id,
      marketQuestion: m.question,
      marketIcon: m.icon,
      side,
      currentPrice: side === "YES" ? m.yesPrice : m.noPrice,
    });
  };

  return (
    <Link
      to={`/market/${m.id}`}
      className="group block overflow-hidden rounded-3xl border border-white/10 bg-white/[0.055] shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-[0_22px_70px_rgba(109,40,217,0.25)]"
    >
      <div className={`relative ${compact ? "h-44" : "h-56"} overflow-hidden`}>
        <img
          src={marketImage(m)}
          alt=""
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a14] via-[#070a14]/45 to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-bold text-white backdrop-blur-xl">
            {m.category || "Market"}
          </span>
          {isTrending && (
            <span className="rounded-full border border-violet-300/30 bg-violet-500/30 px-3 py-1 text-xs font-bold text-violet-100">
              Trending
            </span>
          )}
        </div>
        <div className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-xl">
          <Play className="h-4 w-4 fill-current" />
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="line-clamp-2 text-lg font-extrabold leading-snug text-white">
            {m.question}
          </h3>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-bold">
            <span className="text-emerald-300">YES {m.yesPrice}%</span>
            <span className="text-red-300">{m.noPrice}% NO</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-red-500/25">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-300 transition-all duration-700"
              style={{ width: `${m.yesPrice}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={(event) => handleSide(event, "YES")}
            className="rounded-2xl bg-emerald-400 px-3 py-3 text-sm font-extrabold text-[#03130b] transition hover:bg-emerald-300 active:scale-[0.98]"
          >
            Predict YES
          </button>
          <button
            onClick={(event) => handleSide(event, "NO")}
            className="rounded-2xl bg-red-500 px-3 py-3 text-sm font-extrabold text-white transition hover:bg-red-400 active:scale-[0.98]"
          >
            Predict NO
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-violet-300" />
            {formatNaira(m.totalPool)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {m.closesIn || "Soon"}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" />
            {comments}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {m.participants}
          </span>
        </div>
      </div>
    </Link>
  );
};
