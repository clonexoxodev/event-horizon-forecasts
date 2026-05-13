import { useParams, Link, useNavigate } from "react-router-dom";
import { Clock, ArrowLeft, TrendingUp, ExternalLink, Users, Share2, Bookmark } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { PredictionModal } from "@/components/PredictionModal";
import { markets, formatNaira } from "@/lib/markets";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

const MarketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const m = markets.find(x => x.id === id) ?? markets[0];
  const no = 100 - m.yesPercent;
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);
  const [predictionModalOpen, setPredictionModalOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState<"YES" | "NO">("YES");
  const [activeSide, setActiveSide] = useState<"YES" | "NO" | null>(null);

  const handleBet = (side: "YES" | "NO") => {
    if (!user) {
      navigate("/signup");
      return;
    }
    
    // Visual feedback: activate the button
    setActiveSide(side);
    setSelectedSide(side);
    
    // Small delay for visual feedback before opening modal
    setTimeout(() => {
      setPredictionModalOpen(true);
    }, 150);
  };

  const handleModalClose = () => {
    setPredictionModalOpen(false);
    // Reset active state after modal closes
    setTimeout(() => {
      setActiveSide(null);
    }, 300);
  };

  const traders = Math.floor(m.pool / 4200);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8 max-w-2xl">
        {/* Back */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-graphite hover:text-charcoal transition-fast mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-fast" />
          Back to markets
        </Link>

        <div className="space-y-4">
          {/* Main card */}
          <div className="bg-off-white rounded-2xl p-6 shadow-card border border-graphite/10 space-y-6">
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-graphite/10 grid place-items-center text-3xl">
                  {m.icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-graphite/10 text-graphite border border-graphite/20">
                  {m.category}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setBookmarked(v => !v)}
                  className={`w-9 h-9 rounded-xl grid place-items-center transition-fast border ${
                    bookmarked
                      ? "bg-purple/10 border-purple/30 text-purple"
                      : "border-graphite/20 text-graphite hover:text-charcoal hover:bg-graphite/5"
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-purple" : ""}`} />
                </button>
                <button className="w-9 h-9 rounded-xl grid place-items-center border border-graphite/20 text-graphite hover:text-charcoal hover:bg-graphite/5 transition-fast">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h1 className="text-2xl font-extrabold leading-snug tracking-tight text-charcoal">{m.question}</h1>

            <p className="text-sm text-graphite leading-relaxed">{m.description}</p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, label: "Pool size",   value: formatNaira(m.pool) },
                { icon: Users,      label: "Traders",     value: traders.toLocaleString() },
                { icon: Clock,      label: "Closes in",   value: m.closesIn },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-graphite/5 rounded-xl p-3.5 text-center border border-graphite/10">
                  <Icon className="w-4 h-4 text-graphite mx-auto mb-1.5" />
                  <div className="font-bold text-base text-charcoal">{value}</div>
                  <div className="text-xs text-graphite mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm font-bold mb-2.5">
                <span className="text-emerald flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald" />
                  YES {m.yesPercent}%
                </span>
                <span className="text-coral flex items-center gap-1.5">
                  NO {no}%
                  <span className="w-2 h-2 rounded-full bg-coral" />
                </span>
              </div>
              <div className="h-3 rounded-full bg-coral-soft overflow-hidden">
                <div
                  className="h-full bg-emerald rounded-full transition-all duration-700"
                  style={{ width: `${m.yesPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-graphite mt-1.5">
                <span>{Math.round(traders * m.yesPercent / 100)} traders</span>
                <span>{Math.round(traders * no / 100)} traders</span>
              </div>
            </div>

            {/* Bet buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleBet("YES")}
                disabled={activeSide === "YES"}
                className={`h-13 font-bold rounded-xl text-base shadow-sm transition-all duration-300 relative overflow-hidden group ${
                  activeSide === "YES"
                    ? "bg-emerald scale-[0.98] shadow-lg ring-2 ring-emerald/50 ring-offset-2"
                    : "bg-emerald hover:bg-emerald/90 hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98]"
                } text-white`}
              >
                <span className={`flex items-center justify-center gap-2 ${activeSide === "YES" ? "animate-pulse" : ""}`}>
                  {activeSide === "YES" && (
                    <span className="w-2 h-2 rounded-full bg-white animate-ping absolute" />
                  )}
                  <TrendingUp className="w-4 h-4" />
                  YES — {m.yesPercent}%
                </span>
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </Button>
              <Button
                onClick={() => handleBet("NO")}
                disabled={activeSide === "NO"}
                className={`h-13 font-bold rounded-xl text-base shadow-sm transition-all duration-300 relative overflow-hidden group ${
                  activeSide === "NO"
                    ? "bg-coral scale-[0.98] shadow-lg ring-2 ring-coral/50 ring-offset-2"
                    : "bg-coral hover:bg-coral/90 hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98]"
                } text-white`}
              >
                <span className={`flex items-center justify-center gap-2 ${activeSide === "NO" ? "animate-pulse" : ""}`}>
                  {activeSide === "NO" && (
                    <span className="w-2 h-2 rounded-full bg-white animate-ping absolute" />
                  )}
                  <TrendingUp className="w-4 h-4 rotate-180" />
                  NO — {no}%
                </span>
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </Button>
            </div>

            {!user && (
              <p className="text-center text-xs text-graphite">
                <Link to="/signup" className="text-purple font-semibold hover:underline transition-fast">
                  Sign up free
                </Link>{" "}
                to place a position on this market.
              </p>
            )}
          </div>

          {/* Source card */}
          <div className="bg-off-white rounded-2xl px-5 py-4 shadow-card border border-graphite/10 flex items-center justify-between text-sm">
            <div>
              <div className="text-xs text-graphite mb-0.5">Resolution source</div>
              <a href="#" className="flex items-center gap-1.5 font-semibold text-charcoal hover:text-purple transition-fast">
                {m.source} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="text-right">
              <div className="text-xs text-graphite mb-0.5">Market ID</div>
              <code className="text-xs font-mono bg-graphite/10 text-charcoal px-2 py-0.5 rounded-lg border border-graphite/20">{m.id}</code>
            </div>
          </div>
        </div>
      </main>

      {/* Prediction Modal */}
      <PredictionModal
        open={predictionModalOpen}
        onClose={handleModalClose}
        market={{
          id: m.id,
          question: m.question,
          icon: m.icon,
          yesPercent: m.yesPercent,
        }}
        side={selectedSide}
      />

      <Footer />
    </div>
  );
};

export default MarketDetail;
