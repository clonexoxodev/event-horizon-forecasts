import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { Target, Users, TrendingUp, Shield } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-20 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-charcoal mb-6">
            About Flippe
          </h1>
          <p className="text-xl text-graphite leading-relaxed">
            Flippe is a simple, transparent platform for forecasting real-world outcomes and earning from accuracy.
          </p>
        </section>

        {/* Mission Section */}
        <section className="bg-off-white/50 py-16">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold text-charcoal mb-6">Our Mission</h2>
            <p className="text-lg text-graphite leading-relaxed mb-4">
              We believe that collective intelligence can predict the future better than any single expert. 
              Flippe harnesses the wisdom of crowds to create accurate forecasts on real-world events.
            </p>
            <p className="text-lg text-graphite leading-relaxed">
              Our platform makes forecasting accessible, transparent, and rewarding for everyone who participates.
            </p>
          </div>
        </section>

        {/* Values Section */}
        <section className="container py-16 max-w-4xl">
          <h2 className="text-3xl font-bold text-charcoal mb-10">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-off-white rounded-2xl p-8 border border-graphite/10">
              <div className="w-12 h-12 rounded-xl bg-purple/10 grid place-items-center mb-4">
                <Target className="w-6 h-6 text-purple" />
              </div>
              <h3 className="text-xl font-bold text-charcoal mb-3">Accuracy First</h3>
              <p className="text-graphite leading-relaxed">
                We reward accurate forecasts and use proven mechanisms to aggregate predictions effectively.
              </p>
            </div>

            <div className="bg-off-white rounded-2xl p-8 border border-graphite/10">
              <div className="w-12 h-12 rounded-xl bg-emerald/10 grid place-items-center mb-4">
                <Shield className="w-6 h-6 text-emerald" />
              </div>
              <h3 className="text-xl font-bold text-charcoal mb-3">Transparency</h3>
              <p className="text-graphite leading-relaxed">
                All markets, rules, and resolution criteria are clear and publicly visible before you forecast.
              </p>
            </div>

            <div className="bg-off-white rounded-2xl p-8 border border-graphite/10">
              <div className="w-12 h-12 rounded-xl bg-coral/10 grid place-items-center mb-4">
                <Users className="w-6 h-6 text-coral" />
              </div>
              <h3 className="text-xl font-bold text-charcoal mb-3">Community</h3>
              <p className="text-graphite leading-relaxed">
                We're building a community of thoughtful forecasters who learn from each other.
              </p>
            </div>

            <div className="bg-off-white rounded-2xl p-8 border border-graphite/10">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 grid place-items-center mb-4">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-charcoal mb-3">Fair Markets</h3>
              <p className="text-graphite leading-relaxed">
                Our automated market maker ensures fair pricing and liquidity for all participants.
              </p>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="bg-off-white/50 py-16">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold text-charcoal mb-6">Our Team</h2>
            <p className="text-lg text-graphite leading-relaxed">
              Flippe is built by a team of engineers, designers, and forecasting enthusiasts who believe 
              in the power of prediction markets to surface truth and create value.
            </p>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="container py-16 max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-charcoal mb-4">Get in Touch</h2>
          <p className="text-lg text-graphite mb-8">
            Have questions or feedback? We'd love to hear from you.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-purple text-white font-semibold hover:bg-purple/90 transition-fast"
          >
            Contact Us
          </a>
        </section>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
