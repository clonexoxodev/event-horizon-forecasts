import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { Book, MessageCircle, FileText, HelpCircle } from "lucide-react";

export default function HelpCenter() {
  const resources = [
    {
      icon: Book,
      title: "Getting Started Guide",
      description: "Learn the basics of trading on Flippe",
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
    <div className="min-h-screen flex flex-col font-['Inter',sans-serif] bg-[#F9FAFB] pb-20 md:pb-0">
      <Header />
      <main className="flex-1">
        <section className="container py-20 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#111827] mb-6">
            Help Center
          </h1>
          <p className="text-xl text-[#667085] leading-relaxed">
            Find answers, guides, and support for using Flippe.
          </p>
        </section>

        <section className="container py-10 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            {resources.map((resource, index) => (
              <a
                key={index}
                href={resource.link}
                className="bg-white rounded-3xl p-8 border border-[#E5E7EB] shadow-sm hover:shadow-md hover:border-[#4F46E5]/30 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#4F46E5]/10 grid place-items-center mb-5">
                  <resource.icon className="w-6 h-6 text-[#4F46E5]" />
                </div>
                <h3 className="text-xl font-bold text-[#111827] mb-2">{resource.title}</h3>
                <p className="text-[#667085] text-sm leading-relaxed">{resource.description}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="bg-white/60 py-16">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold text-[#111827] mb-8">Popular Topics</h2>
            <div className="space-y-4">
              <a href="/how-it-works" className="block p-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm hover:border-[#4F46E5]/30 hover:shadow-md transition-all">
                <h3 className="font-semibold text-[#111827] mb-1">How do I make my first trade?</h3>
                <p className="text-sm text-[#667085]">Learn how to browse markets and place your first position.</p>
              </a>
              <a href="/faq" className="block p-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm hover:border-[#4F46E5]/30 hover:shadow-md transition-all">
                <h3 className="font-semibold text-[#111827] mb-1">How are markets resolved?</h3>
                <p className="text-sm text-[#667085]">Understand how we determine market outcomes.</p>
              </a>
              <a href="/faq" className="block p-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm hover:border-[#4F46E5]/30 hover:shadow-md transition-all">
                <h3 className="font-semibold text-[#111827] mb-1">How do I add funds to my wallet?</h3>
                <p className="text-sm text-[#667085]">Learn about depositing and withdrawing funds.</p>
              </a>
              <a href="/risk-disclaimer" className="block p-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm hover:border-[#4F46E5]/30 hover:shadow-md transition-all">
                <h3 className="font-semibold text-[#111827] mb-1">What are the risks?</h3>
                <p className="text-sm text-[#667085]">Understand the risks involved in trading.</p>
              </a>
            </div>
          </div>
        </section>

        <section className="container py-16 max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-[#111827] mb-4">Can't find what you're looking for?</h2>
          <p className="text-lg text-[#667085] mb-8">
            Our support team is ready to help you.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center px-8 py-3 rounded-2xl bg-[#4F46E5] text-white font-semibold shadow-sm hover:bg-[#4338CA] hover:shadow-md transition-all"
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
