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
      answer: "Flippe is a prediction market platform where you can forecast real-world events and earn from your accuracy. We use automated market makers to create fair, liquid markets on politics, sports, crypto, and more.",
    },
    {
      question: "How do I make money on Flippe?",
      answer: "You earn by making accurate forecasts. Buy YES or NO shares based on your prediction. When the market resolves, winning shares pay out ₦100 each. The difference between your purchase price and the payout is your profit.",
    },
    {
      question: "How are markets resolved?",
      answer: "Every market has clear resolution criteria stated upfront. Markets resolve based on objective, verifiable sources (like official election results, sports scores, or price data from exchanges). The resolution source is always specified before the market opens.",
    },
    {
      question: "What is an Automated Market Maker (AMM)?",
      answer: "An AMM is a system that automatically sets prices based on supply and demand. When you buy shares, the price moves up. When you sell, it moves down. This ensures fair pricing and instant liquidity without needing a traditional order book.",
    },
    {
      question: "Can I sell my shares before the market closes?",
      answer: "Yes! You can buy and sell shares anytime before the market closes. The AMM provides instant liquidity, so you can exit your position whenever you want.",
    },
    {
      question: "What happens if I'm wrong?",
      answer: "If your forecast is incorrect, your shares pay out ₦0. You lose the amount you paid for the shares. This is why it's important to only use funds you can afford to lose.",
    },
    {
      question: "How do prices work?",
      answer: "YES and NO shares always sum to ₦100. If YES is at ₦65, NO is at ₦35. Prices reflect the crowd's collective forecast. A YES price of ₦65 means the market thinks there's a 65% chance the event will happen.",
    },
    {
      question: "Is Flippe legal?",
      answer: "Flippe operates as a forecasting platform. We comply with all applicable laws and regulations. However, you must be 18+ to participate.",
    },
    {
      question: "How do I add funds to my wallet?",
      answer: "Go to your Wallet page and click 'Add Funds'. You can deposit using bank transfer, card, or other supported payment methods. Funds are credited instantly.",
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
