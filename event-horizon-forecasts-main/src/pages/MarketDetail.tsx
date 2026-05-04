import { useParams, Link } from "react-router-dom";
import { Clock, ArrowLeft, TrendingUp, ExternalLink, Users, Share2, Bookmark } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { markets, formatNaira } from "@/lib/markets";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

const MarketDetail = () => {
  const { id } = useParams();
  const m = markets.find(x => x.id === id) ?? markets[0];
  const no = 100 - m.yesPercent;
  const { user, setAuthOpen } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);

  const onSide = () => { if (!user) setAuthOpen(true); };

  const traders = Math.floor(m.pool / 4200);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8 max-w-2xl">
        {/* Back */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-smooth mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-smooth" />
          Back to markets
        </Link>

        <div className="space-y-4">
          {/* Main card */}
          <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 space-y-6">
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary grid place-items-center text-3xl">
                  {m.icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                  {m.category}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setBookmarked(v => !v)}
                  className={`w-9 h-9 rounded-xl grid place-items-center transition-smooth border ${
                    bookmarked
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-primary" : ""}`} />
                </button>
                <button className="w-9 h-9 rounded-xl grid place-items-center border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h1 className="text-2xl font-extrabold leading-snug tracking-tight">{m.question}</h1>

            <p className="text-sm text-muted-foreground leading-relaxed">{m.description}</p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, label: "Pool size",   value: formatNaira(m.pool) },
                { icon: Users,      label: "Traders",     value: traders.toLocaleString() },
                { icon: Clock,      label: "Closes in",   value: m.closesIn },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-secondary/60 rounded-xl p-3.5 text-center">
                  <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                  <div className="font-bold text-base">{value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm font-bold mb-2.5">
                <span className="text-success flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  YES {m.yesPercent}%
                </span>
                <span className="text-danger flex items-center gap-1.5">
                  NO {no}%
                  <span className="w-2 h-2 rounded-full bg-danger" />
                </span>
              </div>
              <div className="h-3 rounded-full bg-danger-soft overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all duration-700"
                  style={{ width: `${m.yesPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                <span>{Math.round(traders * m.yesPercent / 100)} traders</span>
                <span>{Math.round(traders * no / 100)} traders</span>
              </div>
            </div>

            {/* Bet buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={onSide}
                className="h-13 bg-success hover:bg-success/90 text-white font-bold rounded-xl text-base shadow-sm"
              >
                YES — {m.yesPercent}%
              </Button>
              <Button
                onClick={onSide}
                className="h-13 bg-danger hover:bg-danger/90 text-white font-bold rounded-xl text-base shadow-sm"
              >
                NO — {no}%
              </Button>
            </div>

            {!user && (
              <p className="text-center text-xs text-muted-foreground">
                <button onClick={() => setAuthOpen(true)} className="text-primary font-semibold hover:underline">
                  Sign up free
                </button>{" "}
                to place a position on this market.
              </p>
            )}
          </div>

          {/* Source card */}
          <div className="bg-card rounded-2xl px-5 py-4 shadow-card border border-border/50 flex items-center justify-between text-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Resolution source</div>
              <a href="#" className="flex items-center gap-1.5 font-semibold hover:text-primary transition-smooth">
                {m.source} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-0.5">Market ID</div>
              <code className="text-xs font-mono bg-secondary px-2 py-0.5 rounded-lg">{m.id}</code>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MarketDetail;
