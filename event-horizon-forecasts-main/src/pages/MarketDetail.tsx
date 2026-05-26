import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Award, Bookmark, Clock, Loader2, MessageCircle, Send, Share2, TrendingDown, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiService, { type ApiMarketComment, type ApiPosition } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMarketState } from "@/lib/market-state";
import { formatNaira, type Market } from "@/lib/markets";

const categoryImages: Record<string, string> = {
  Sports: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1300&q=80",
  Music: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1300&q=80",
  Entertainment: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1300&q=80",
  Crypto: "https://images.unsplash.com/photo-1621504450181-5d356f61d307?auto=format&fit=crop&w=1300&q=80",
  Cryptocurrency: "https://images.unsplash.com/photo-1621504450181-5d356f61d307?auto=format&fit=crop&w=1300&q=80",
  Politics: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1300&q=80",
  Finance: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?auto=format&fit=crop&w=1300&q=80",
  Technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1300&q=80",
};

type CommentItem = ApiMarketComment;
type PredictorItem = { user: string; winRate: number; badge: string };

const fallbackImage = (market?: Market) =>
  (market && categoryImages[market.category]) || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1300&q=80";

const marketMedia = (market: Market) => {
  const videoUrl = market.videoUrl || market.video_url || "";
  const imageUrl = market.imageUrl || market.image_url || fallbackImage(market);
  return videoUrl ? { type: "video" as const, src: videoUrl, poster: imageUrl } : { type: "image" as const, src: imageUrl, poster: imageUrl };
};

const predictors: PredictorItem[] = [];

const MarketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMarket, setMarkets } = useMarketState();
  const { user, refreshUser } = useAuth();
  const [market, setMarket] = useState<Market | null>(null);
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [selectedSide, setSelectedSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<CommentItem[]>([]);

  useEffect(() => {
    if (!id) return;

    const loadMarket = async () => {
      setLoading(true);
      try {
        const cachedMarket = getMarket(id);
        if (cachedMarket) {
          setMarket(cachedMarket);
        }

        const response = await apiService.getMarket(id);
        setMarket(response.market);
        setMarkets((prev) => {
          const exists = prev.some((item) => item.id === response.market.id);
          return exists
            ? prev.map((item) => (item.id === response.market.id ? response.market : item))
            : [...prev, response.market];
        });
      } catch (error: any) {
        toast.error(error.message || "Could not load market.");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadMarket();
  }, [getMarket, id, navigate, setMarkets]);

  useEffect(() => {
    if (!user || !id) return;

    const loadPositions = async () => {
      try {
        const response = await apiService.getPositions();
        setPositions(response.positions.filter((position) => position.marketId === id));
      } catch {
        setPositions([]);
      }
    };

    loadPositions();
  }, [id, user]);

  useEffect(() => {
    if (!id) return;

    const loadComments = async () => {
      try {
        const response = await apiService.getMarketComments(id);
        setComments(response.comments || []);
      } catch {
        setComments([]);
      }
    };

    loadComments();
  }, [id]);

  const numericAmount = Number.parseFloat(amount) || 0;
  const currentPrice = selectedSide === "YES" ? market?.yesPrice || 50 : market?.noPrice || 50;
  const potentialReturn = numericAmount > 0 ? numericAmount * (100 / Math.max(1, currentPrice)) : 0;
  const potentialProfit = Math.max(0, potentialReturn - numericAmount);
  const selectedPosition = positions[0];
  const priceChange = useMemo(() => {
    const history = market?.priceHistory || [];
    if (history.length < 2) return 0;
    return history[history.length - 1].yesPrice - history[0].yesPrice;
  }, [market]);

  const handlePredict = async () => {
    if (!market) return;

    if (!user) {
      navigate("/login");
      return;
    }

    if (numericAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiService.placePrediction(market.id, {
        side: selectedSide,
        amount: numericAmount,
        currency: "NGN",
      });

      setMarket(result.market);
      setMarkets((prev) => prev.map((item) => (item.id === result.market.id ? result.market : item)));
      setPositions((prev) => [result.position, ...prev]);
      setAmount("");
      await refreshUser();
      toast.success("Prediction saved.");
    } catch (error: any) {
      toast.error(error.message || "Server error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const response = await apiService.addMarketComment(market.id, comment.trim());
      setComments((prev) => [response.comment, ...prev]);
      setComment("");
      toast.success("Comment added.");
    } catch (error: any) {
      toast.error(error.message || "Could not save comment.");
    }
  };

  if (loading && !market) {
    return (
      <div className="min-h-screen bg-[#050711] text-white xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
        </main>
      </div>
    );
  }

  if (!market) return null;

  const isClosed = market.status !== "active";
  const media = marketMedia(market);

  return (
    <div className="min-h-screen bg-[#050711] pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:py-8">
        <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to markets
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <div className="relative min-h-[300px] overflow-hidden sm:min-h-[460px]">
                {media.type === "video" ? (
                  <video src={media.src} poster={media.poster} className="absolute inset-0 h-full w-full object-cover" muted playsInline loop preload="metadata" />
                ) : (
                  <img src={media.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050711] via-[#050711]/55 to-black/20" />
                <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-black text-white backdrop-blur-xl">
                      {market.category || "Market"}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${market.status === "active" ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200"}`}>
                      {market.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <IconButton active={bookmarked} onClick={() => setBookmarked((value) => !value)} icon={Bookmark} />
                    <IconButton onClick={() => toast("Sharing is coming soon.")} icon={Share2} />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                  <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-bold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-violet-300" />
                      {market.closesIn || "Soon"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-violet-300" />
                      {market.participants} people
                    </span>
                  </div>
                  <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                    {market.question}
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    {market.description || "Pick a side and follow the market as the price moves."}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:hidden">
              <PredictionPanel
                market={market}
                selectedSide={selectedSide}
                setSelectedSide={setSelectedSide}
                amount={amount}
                setAmount={setAmount}
                potentialReturn={potentialReturn}
                potentialProfit={potentialProfit}
                userBalance={user?.balance || 0}
                submitting={submitting}
                disabled={isClosed}
                onPredict={handlePredict}
              />
            </div>

            <PriceSection market={market} priceChange={priceChange} />
            <ChartSection market={market} />
            <YourPosition position={selectedPosition} selectedSide={selectedSide} amount={numericAmount} potentialReturn={potentialReturn} />
            <Discussion comments={comments} comment={comment} setComment={setComment} addComment={addComment} />
          </div>

          <aside className="hidden space-y-6 lg:sticky lg:top-24 lg:block lg:self-start">
            <PredictionPanel
              market={market}
              selectedSide={selectedSide}
              setSelectedSide={setSelectedSide}
              amount={amount}
              setAmount={setAmount}
              potentialReturn={potentialReturn}
              potentialProfit={potentialProfit}
              userBalance={user?.balance || 0}
              submitting={submitting}
              disabled={isClosed}
              onPredict={handlePredict}
            />
            <TopPredictors />
          </aside>
        </section>
      </main>
      <MobileNav />
    </div>
  );
};

const PriceSection = ({ market, priceChange }: { market: Market; priceChange: number }) => (
  <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-black">Price</h2>
        <p className="text-sm text-slate-500">Live probability and volume.</p>
      </div>
      <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${priceChange >= 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
        {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {priceChange >= 0 ? "+" : ""}
        {Math.round(priceChange)}%
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <PriceCard label="YES" value={market.yesPrice} tone="green" />
      <PriceCard label="NO" value={market.noPrice} tone="red" />
      <div className="rounded-3xl border border-white/10 bg-[#0b1020]/80 p-4">
        <div className="text-sm font-bold text-slate-500">Total volume</div>
        <div className="mt-3 text-2xl font-black text-white">{formatNaira(market.totalPool)}</div>
      </div>
    </div>
    <div className="mt-5 h-3 overflow-hidden rounded-full bg-red-500/25">
      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-300 transition-all duration-700" style={{ width: `${market.yesPrice}%` }} />
    </div>
  </section>
);

const PriceCard = ({ label, value, tone }: { label: string; value: number; tone: "green" | "red" }) => (
  <div className={`rounded-3xl border p-4 ${tone === "green" ? "border-emerald-300/20 bg-emerald-400/10" : "border-red-300/20 bg-red-400/10"}`}>
    <div className="text-sm font-bold text-slate-500">{label}</div>
    <div className={`mt-3 text-3xl font-black ${tone === "green" ? "text-emerald-300" : "text-red-300"}`}>{value}%</div>
  </div>
);

const ChartSection = ({ market }: { market: Market }) => {
  const history = market.priceHistory || [];
  const points = history.map((point, index) => {
    const x = history.length === 1 ? 0 : (index / (history.length - 1)) * 100;
    const y = 100 - point.yesPrice;
    return `${x},${y}`;
  });

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
      <div className="mb-4">
        <h2 className="text-xl font-black">Chart</h2>
        <p className="text-sm text-slate-500">YES price movement over time.</p>
      </div>
      {history.length < 2 ? (
        <div className="grid min-h-[240px] place-items-center rounded-3xl border border-dashed border-white/10 bg-[#0b1020]/70 text-center">
          <div>
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-400/10 text-violet-300">
              <TrendingUp className="h-7 w-7" />
            </div>
            <div className="font-black">No chart history yet</div>
            <p className="mt-1 text-sm text-slate-500">Price movement will appear after predictions are saved.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-[#0b1020]/80 p-4">
          <svg viewBox="0 0 100 100" className="h-64 w-full overflow-visible">
            <defs>
              <linearGradient id="chartGlow" x1="0" x2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            {[20, 40, 60, 80].map((line) => (
              <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
            ))}
            <polyline points={points.join(" ")} fill="none" stroke="url(#chartGlow)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          </svg>
        </div>
      )}
    </section>
  );
};

const PredictionPanel = ({
  market,
  selectedSide,
  setSelectedSide,
  amount,
  setAmount,
  potentialReturn,
  potentialProfit,
  userBalance,
  submitting,
  disabled,
  onPredict,
}: {
  market: Market;
  selectedSide: "YES" | "NO";
  setSelectedSide: (side: "YES" | "NO") => void;
  amount: string;
  setAmount: (amount: string) => void;
  potentialReturn: number;
  potentialProfit: number;
  userBalance: number;
  submitting: boolean;
  disabled: boolean;
  onPredict: () => void;
}) => {
  const numericAmount = Number.parseFloat(amount) || 0;
  const currentPrice = selectedSide === "YES" ? market.yesPrice : market.noPrice;
  const insufficient = numericAmount > userBalance;

  return (
    <section className="rounded-[2rem] border border-violet-300/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),rgba(9,13,25,0.96)_48%)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <h2 className="text-xl font-black">Predict</h2>
      <p className="mt-1 text-sm text-slate-400">Choose a side and amount.</p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <SideButton label="YES" value={market.yesPrice} active={selectedSide === "YES"} tone="green" onClick={() => setSelectedSide("YES")} />
        <SideButton label="NO" value={market.noPrice} active={selectedSide === "NO"} tone="red" onClick={() => setSelectedSide("NO")} />
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Amount</label>
        <Input
          type="number"
          placeholder="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={`h-12 rounded-2xl bg-white/[0.055] text-lg font-black text-white placeholder:text-slate-600 ${insufficient ? "border-red-300" : "border-white/10 focus:border-violet-300"}`}
        />
        {insufficient && (
          <div className="mt-2 flex items-center gap-2 text-xs font-bold text-red-300">
            <AlertCircle className="h-3.5 w-3.5" />
            Insufficient balance.
          </div>
        )}
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.055] p-4">
        <PanelRow label="Current price" value={`${currentPrice}%`} />
        <PanelRow label="Wallet balance" value={formatNaira(userBalance)} />
        <PanelRow label="Potential return" value={formatNaira(potentialReturn)} />
        <PanelRow label="Potential profit" value={`+${formatNaira(potentialProfit)}`} highlight />
      </div>

      <Button
        onClick={onPredict}
        disabled={submitting || disabled || numericAmount <= 0 || insufficient}
        className={`mt-5 h-12 w-full rounded-2xl text-base font-black text-white disabled:opacity-50 ${selectedSide === "YES" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-red-500 hover:bg-red-400"}`}
      >
        {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <TrendingUp className="mr-2 h-5 w-5" />}
        {disabled ? "Market closed" : `Confirm ${selectedSide}`}
      </Button>
    </section>
  );
};

const SideButton = ({ label, value, active, tone, onClick }: { label: string; value: number; active: boolean; tone: "green" | "red"; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`rounded-2xl border p-4 text-left transition ${
      active
        ? tone === "green"
          ? "border-emerald-300/40 bg-emerald-400/20"
          : "border-red-300/40 bg-red-400/20"
        : "border-white/10 bg-white/[0.055] hover:bg-white/10"
    }`}
  >
    <div className={`text-sm font-black ${tone === "green" ? "text-emerald-300" : "text-red-300"}`}>{label}</div>
    <div className="mt-1 text-2xl font-black text-white">{value}%</div>
  </button>
);

const YourPosition = ({ position, selectedSide, amount, potentialReturn }: { position?: ApiPosition; selectedSide: "YES" | "NO"; amount: number; potentialReturn: number }) => (
  <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
    <h2 className="text-xl font-black">Your position</h2>
    {position ? (
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Info label="Side" value={position.side} />
        <Info label="Amount" value={formatNaira(position.stake)} />
        <Info label="Current value" value={formatNaira(position.currentValue)} />
        <Info label="Status" value={position.marketStatus} />
      </div>
    ) : (
      <div className="mt-4 rounded-3xl border border-dashed border-white/10 bg-[#0b1020]/70 p-5">
        <p className="text-sm text-slate-400">No saved position yet.</p>
        {amount > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Info label="Selected side" value={selectedSide} />
            <Info label="Amount" value={formatNaira(amount)} />
            <Info label="Potential return" value={formatNaira(potentialReturn)} />
          </div>
        )}
      </div>
    )}
  </section>
);

const Discussion = ({ comments, comment, setComment, addComment }: { comments: CommentItem[]; comment: string; setComment: (value: string) => void; addComment: () => void }) => (
  <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-black">Discussion</h2>
        <p className="text-sm text-slate-500">Top comments first.</p>
      </div>
      <MessageCircle className="h-5 w-5 text-violet-300" />
    </div>
    <div className="flex gap-2">
      <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..." className="h-12 rounded-2xl border-white/10 bg-white/[0.055] text-white placeholder:text-slate-500" />
      <Button onClick={addComment} className="h-12 rounded-2xl bg-violet-500 px-4 text-white hover:bg-violet-400">
        <Send className="h-4 w-4" />
      </Button>
    </div>
    {comments.length === 0 ? (
      <div className="mt-4 rounded-3xl border border-dashed border-white/10 py-12 text-center">
        <MessageCircle className="mx-auto mb-3 h-7 w-7 text-violet-300" />
        <div className="font-black text-white">No comments yet</div>
        <p className="mt-1 text-sm text-slate-500">Start the discussion when you have a take.</p>
      </div>
    ) : (
      <ul className="mt-4 space-y-3">
        {[...comments].sort((a, b) => b.likes - a.likes).map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-[#0b1020]/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-black text-white">@{item.user}</div>
              <div className="text-xs font-bold text-violet-300">{item.likes} likes</div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const TopPredictors = () => (
  <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xl font-black">Top predictors</h2>
      <Award className="h-5 w-5 text-violet-300" />
    </div>
    {predictors.length === 0 ? (
      <div className="rounded-3xl border border-dashed border-white/10 bg-[#0b1020]/70 px-4 py-10 text-center">
        <Award className="mx-auto mb-3 h-7 w-7 text-violet-300" />
        <div className="font-black text-white">No top predictors yet</div>
        <p className="mt-1 text-sm text-slate-500">Leaders will appear after real market activity.</p>
      </div>
    ) : (
    <ul className="space-y-3">
      {predictors.map((predictor, index) => (
        <li key={predictor.user} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1020]/80 p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-sm font-black text-white">
              {predictor.user.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-black text-white">{predictor.user}</div>
              <div className="text-xs text-slate-500">{predictor.badge}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-emerald-300">{predictor.winRate}%</div>
            <div className="text-xs text-slate-500">#{index + 1}</div>
          </div>
        </li>
      ))}
    </ul>
    )}
  </section>
);

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-[#0b1020]/80 p-4">
    <div className="text-xs font-bold text-slate-500">{label}</div>
    <div className="mt-1 truncate text-sm font-black text-white">{value}</div>
  </div>
);

const PanelRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between border-b border-white/10 py-2 last:border-0">
    <span className="text-sm font-bold text-slate-400">{label}</span>
    <span className={`text-sm font-black ${highlight ? "text-emerald-300" : "text-white"}`}>{value}</span>
  </div>
);

const IconButton = ({ icon: Icon, onClick, active = false }: { icon: any; onClick: () => void; active?: boolean }) => (
  <button
    onClick={onClick}
    className={`grid h-10 w-10 place-items-center rounded-2xl border backdrop-blur-xl transition ${
      active ? "border-violet-300/40 bg-violet-400/20 text-violet-200" : "border-white/15 bg-black/35 text-white hover:bg-black/50"
    }`}
  >
    <Icon className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
  </button>
);

export default MarketDetail;
