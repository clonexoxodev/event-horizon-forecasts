import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { UserPlus, Search, TrendingUp, Trophy } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: UserPlus,
      title: "Create an Account",
      description: "Sign up in seconds and get started with your free account. No credit card required.",
    },
    {
      icon: Search,
      title: "Browse Markets",
      description: "Explore prediction markets on politics, sports, crypto, and more. Each market has clear resolution criteria.",
    },
    {
      icon: TrendingUp,
      title: "Make Your Forecast",
      description: "Buy YES or NO shares based on your prediction. Prices reflect the crowd's collective forecast.",
    },
    {
      icon: Trophy,
      title: "Earn from Accuracy",
      description: "When the market resolves, correct forecasts earn payouts. The more accurate you are, the more you earn.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-20 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-charcoal mb-6">
            How Flippe Works
          </h1>
          <p className="text-xl text-graphite leading-relaxed">
            Forecast real-world events and earn from your accuracy in four simple steps.
          </p>
        </section>

        {/* Steps Section */}
        <section className="container py-10 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className="bg-off-white rounded-2xl p-8 border border-graphite/10 relative"
              >
                <div className="absolute -top-4 -left-4 w-10 h-10 rounded-xl bg-purple text-white font-bold grid place-items-center text-lg">
                  {index + 1}
                </div>
                <div className="w-14 h-14 rounded-xl bg-purple/10 grid place-items-center mb-4">
                  <step.icon className="w-7 h-7 text-purple" />
                </div>
                <h3 className="text-xl font-bold text-charcoal mb-3">{step.title}</h3>
                <p className="text-graphite leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How Pricing Works */}
        <section className="bg-off-white/50 py-16">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold text-charcoal mb-6">How Pricing Works</h2>
            <div className="space-y-4 text-graphite leading-relaxed">
              <p>
                Flippe uses an <strong>Automated Market Maker (AMM)</strong> to set prices dynamically based on supply and demand.
              </p>
              <p>
                <strong>YES</strong> and <strong>NO</strong> shares always sum to ₦100. If YES is trading at ₦65, NO is at ₦35.
              </p>
              <p>
                When you buy shares, the price moves slightly. The more you buy, the more the price increases. This ensures fair pricing for everyone.
              </p>
              <p>
                When a market resolves, winning shares pay out ₦100 each. Losing shares pay out ₦0.
              </p>
            </div>
          </div>
        </section>

        {/* Market Resolution */}
        <section className="container py-16 max-w-4xl">
          <h2 className="text-3xl font-bold text-charcoal mb-6">Market Resolution</h2>
          <div className="bg-off-white rounded-2xl p-8 border border-graphite/10">
            <p className="text-graphite leading-relaxed mb-4">
              Every market has clear <strong>resolution criteria</strong> stated upfront. Markets resolve based on objective, verifiable sources.
            </p>
            <p className="text-graphite leading-relaxed mb-4">
              For example: "Will Bitcoin reach $100k by Dec 31, 2024?" resolves YES if Bitcoin trades at or above $100,000 on CoinMarketCap by the deadline.
            </p>
            <p className="text-graphite leading-relaxed">
              Resolution sources are always specified before the market opens. This ensures transparency and fairness.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="container py-16 max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-charcoal mb-4">Ready to Start Forecasting?</h2>
          <p className="text-lg text-graphite mb-8">
            Join thousands of forecasters earning from their predictions.
          </p>
          <a
            href="/signup"
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-purple text-white font-semibold hover:bg-purple/90 transition-fast"
          >
            Get Started Free
          </a>
        </section>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
