import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "What is Flippe?",
      answer: "Flippe is a prediction market platform where you can forecast real-world events and participate in pool-safe YES/NO markets on politics, sports, crypto, and more.",
    },
    {
      question: "How do I make money on Flippe?",
      answer: "You earn by making accurate forecasts. Buy YES or NO shares based on your prediction. When the market resolves, the winning side splits the losing side's pool based on each winner's share of that side.",
    },
    {
      question: "How are markets resolved?",
      answer: "Every market has clear resolution criteria stated upfront. Markets resolve based on objective, verifiable sources (like official election results, sports scores, or price data from exchanges). The resolution source is always specified before the market opens.",
    },
    {
      question: "How does Flippe set prices?",
      answer: "Flippe prices are live sentiment indicators. They move based on actual YES and NO buying activity, and YES plus NO always adds up to 100.",
    },
    {
      question: "Can I cash out before the market closes?",
      answer: "Not in this MVP. Projected values are estimates based on the current pool and are only finalized when the market resolves.",
    },
    {
      question: "What happens if I'm wrong?",
      answer: "If your forecast is incorrect, your shares pay out ₦0. You lose the amount you paid for the shares. This is why it's important to only use funds you can afford to lose.",
    },
    {
      question: "How do prices work?",
      answer: "YES and NO prices always sum to 100. If YES is at 65, NO is at 35. Prices reflect the crowd's current sentiment and are used to calculate how many shares you receive.",
    },
    {
      question: "Is Flippe legal?",
      answer: "Flippe operates as a forecasting platform. We comply with all applicable laws and regulations. However, you must be 18+ to participate.",
    },
    {
      question: "How do I add funds to my wallet?",
      answer: "Go to your Wallet page and click 'Add Funds'. Deposit requests are credited after admin approval or future payment-provider confirmation.",
    },
    {
      question: "How do I withdraw my winnings?",
      answer: "Go to your Wallet page and click 'Withdraw'. Enter the amount and your bank details. Withdrawals are processed within 24 hours.",
    },
    {
      question: "What fees does Flippe charge?",
      answer: "Flippe charges a small fee on winning positions to cover platform costs. All fees are disclosed upfront before you make a forecast.",
    },
    {
      question: "Can I cancel a forecast?",
      answer: "You cannot cancel a forecast, but you can sell your shares at any time before the market closes. The price you receive depends on current market conditions.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-20 max-w-3xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-charcoal mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-graphite leading-relaxed">
            Everything you need to know about forecasting on Flippe.
          </p>
        </section>

        {/* FAQs */}
        <section className="container py-10 max-w-3xl">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-off-white rounded-2xl border border-graphite/10 overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-graphite/5 transition-fast"
                >
                  <span className="font-semibold text-charcoal pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-graphite shrink-0 transition-transform ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-5 text-graphite leading-relaxed animate-fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container py-16 max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-charcoal mb-4">Still have questions?</h2>
          <p className="text-graphite mb-8">
            Our support team is here to help.
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
