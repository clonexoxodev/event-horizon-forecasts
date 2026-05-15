import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { Book, MessageCircle, FileText, HelpCircle } from "lucide-react";

export default function HelpCenter() {
  const resources = [
    {
      icon: Book,
      title: "Getting Started Guide",
      description: "Learn the basics of forecasting on Flippe",
      link: "/how-it-works",
    },
    {
      icon: HelpCircle,
      title: "FAQ",
      description: "Answers to common questions",
      link: "/faq",
    },
    {
      icon: FileText,
      title: "Terms & Policies",
      description: "Read our terms, privacy policy, and risk disclaimer",
      link: "/terms",
    },
    {
      icon: MessageCircle,
      title: "Contact Support",
      description: "Get help from our support team",
      link: "/contact",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-20 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-charcoal mb-6">
            Help Center
          </h1>
          <p className="text-xl text-graphite leading-relaxed">
            Find answers, guides, and support for using Flippe.
          </p>
        </section>

        {/* Resources */}
        <section className="container py-10 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            {resources.map((resource, index) => (
              <a
                key={index}
                href={resource.link}
                className="bg-off-white rounded-2xl p-8 border border-graphite/10 hover:border-purple/30 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-purple/10 grid place-items-center mb-4">
                  <resource.icon className="w-6 h-6 text-purple" />
                </div>
                <h3 className="text-xl font-bold text-charcoal mb-2">{resource.title}</h3>
                <p className="text-graphite">{resource.description}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Popular Topics */}
        <section className="bg-off-white/50 py-16">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold text-charcoal mb-8">Popular Topics</h2>
            <div className="space-y-4">
              <a href="/how-it-works" className="block p-4 bg-white rounded-xl border border-graphite/10 hover:border-purple/30 transition-fast">
                <h3 className="font-semibold text-charcoal mb-1">How do I make my first forecast?</h3>
                <p className="text-sm text-graphite">Learn how to browse markets and place your first forecast.</p>
              </a>
              <a href="/faq" className="block p-4 bg-white rounded-xl border border-graphite/10 hover:border-purple/30 transition-fast">
                <h3 className="font-semibold text-charcoal mb-1">How are markets resolved?</h3>
                <p className="text-sm text-graphite">Understand how we determine market outcomes.</p>
              </a>
              <a href="/faq" className="block p-4 bg-white rounded-xl border border-graphite/10 hover:border-purple/30 transition-fast">
                <h3 className="font-semibold text-charcoal mb-1">How do I add funds to my wallet?</h3>
                <p className="text-sm text-graphite">Learn about depositing and withdrawing funds.</p>
              </a>
              <a href="/risk-disclaimer" className="block p-4 bg-white rounded-xl border border-graphite/10 hover:border-purple/30 transition-fast">
                <h3 className="font-semibold text-charcoal mb-1">What are the risks?</h3>
                <p className="text-sm text-graphite">Understand the risks involved in forecasting.</p>
              </a>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="container py-16 max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-charcoal mb-4">Can't find what you're looking for?</h2>
          <p className="text-lg text-graphite mb-8">
            Our support team is ready to help you.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-purple text-white font-semibold hover:bg-purple/90 transition-fast"
          >
            Contact Support
          </a>
        </section>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
