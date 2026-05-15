import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";

export default function Markets() {
  const navigate = useNavigate();

  const categories = [
    { name: "Politics", count: 24, emoji: "🏛️" },
    { name: "Sports", count: 18, emoji: "⚽" },
    { name: "Cryptocurrency", count: 32, emoji: "₿" },
    { name: "Technology", count: 15, emoji: "💻" },
    { name: "Entertainment", count: 12, emoji: "🎬" },
    { name: "Business", count: 20, emoji: "📈" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-20 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-charcoal mb-6">
            Explore Markets
          </h1>
          <p className="text-xl text-graphite leading-relaxed mb-8">
            Forecast on politics, sports, crypto, and more. All markets have clear resolution criteria.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-purple text-white font-semibold hover:bg-purple/90 transition-fast"
          >
            Browse All Markets
          </button>
        </section>

        {/* Categories */}
        <section className="container py-10 max-w-5xl">
          <h2 className="text-3xl font-bold text-charcoal mb-8">Market Categories</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => navigate("/dashboard")}
                className="bg-off-white rounded-2xl p-8 border border-graphite/10 hover:border-purple/30 hover:shadow-lg transition-all text-left"
              >
                <div className="text-4xl mb-4">{category.emoji}</div>
                <h3 className="text-xl font-bold text-charcoal mb-2">{category.name}</h3>
                <p className="text-graphite">{category.count} active markets</p>
              </button>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="bg-off-white/50 py-16">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold text-charcoal mb-8">Why Forecast on Flippe?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-graphite/10">
                <h3 className="font-bold text-charcoal mb-2">Clear Resolution</h3>
                <p className="text-sm text-graphite">Every market has objective resolution criteria stated upfront.</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-graphite/10">
                <h3 className="font-bold text-charcoal mb-2">Fair Pricing</h3>
                <p className="text-sm text-graphite">Automated market maker ensures fair prices for all participants.</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-graphite/10">
                <h3 className="font-bold text-charcoal mb-2">Instant Liquidity</h3>
                <p className="text-sm text-graphite">Buy and sell shares anytime before the market closes.</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-graphite/10">
                <h3 className="font-bold text-charcoal mb-2">Transparent Payouts</h3>
                <p className="text-sm text-graphite">Winning shares pay ₦100. Losing shares pay ₦0. Simple.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
