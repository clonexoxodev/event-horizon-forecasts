import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, CircleHelp } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const faqs = [
  {
    section: "Basics",
    items: [
      ["What is Flippe?", "Flippe is a pooled position market. Traders stop arguing and back YES or NO on public outcomes."],
      ["Is Flippe betting?", "Flippe is designed as a position market. It still involves financial risk, so traders should treat every order carefully and only use money they can afford to lose."],
      ["What kinds of markets can appear?", "Markets may cover public events in sports, crypto, politics, entertainment, economy, and other topics with clear resolution sources."],
    ],
  },
  {
    section: "Crowd View and positions",
    items: [
      ["How do YES and NO work?", "YES and NO show the Crowd View. If YES is 61, NO is 39. Together they always add up to 100."],
      ["Why do YES and NO always add up to 100?", "A market resolves to one of the two outcomes. The two prices are shown as opposite sides of the same position."],
      ["What happens when I back a side?", "Your wallet is debited, your order is recorded, and your stake joins the market pool for that side."],
      ["What are units?", "Units are a background calculation Flippe may use to settle markets fairly. The main idea is simple: you backed a side in a pool."],
      ["Why does the Crowd View change?", "Crowd View changes as other traders back YES or NO. It is not withdrawable money and it is not guaranteed profit."],
    ],
  },
  {
    section: "Payouts and resolution",
    items: [
      ["How is final payout calculated?", "If your side is correct, you receive your stake plus a share of the losing side's pool. The exact amount is finalized only after resolution."],
      ["Is any payout guaranteed before resolution?", "No. Anything shown before resolution is only informational. Final payout depends on the result and the final pool."],
      ["When do I receive winnings?", "Winnings are credited after the market closes and an admin resolves the outcome using the stated source."],
      ["How are markets resolved?", "Each market has rules and a resolution source. Admins use those rules to resolve YES, NO, or cancel/refund if the market cannot resolve fairly."],
      ["What happens if a market is cancelled?", "The platform should refund eligible stakes according to the market status and wallet ledger."],
      ["What if I disagree with a resolution?", "Use Support > Market disputes to save structured dispute details and keep the market, issue, description, and evidence organized."],
    ],
  },
  {
    section: "Wallet and safety",
    items: [
      ["How do deposits work?", "Deposits create a pending request. Wallet balance should only increase after admin approval or future payment-provider confirmation."],
      ["How do withdrawals work?", "Withdrawals create a request. Funds move out of available balance while the request is reviewed."],
      ["Can I withdraw money in active markets?", "No. Money committed to active positions is not available to withdraw until the market is resolved or refunded."],
      ["Why should I use Flippe responsibly?", "Positions involve risk. Do not use money needed for bills, school fees, rent, food, emergencies, or debt."],
    ],
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<string | null>("Basics-0");

  return (
    <div className="app-bg min-h-screen pb-24 font-['Inter',sans-serif] text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <div className="flex items-start gap-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5]">
              <CircleHelp className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5]">FAQs</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Questions before you trade</h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#667085]">
                Simple answers about Crowd View, market pools, wallet movement, and responsible use.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-6">
          {faqs.map((group) => (
            <div key={group.section} className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5]">{group.section}</h2>
              <div className="overflow-hidden rounded-2xl border border-[#E5E7EB]">
                {group.items.map(([question, answer], index) => {
                  const id = `${group.section}-${index}`;
                  const isOpen = open === id;
                  return (
                    <div key={question} className="border-b border-[#E5E7EB] last:border-b-0">
                      <button onClick={() => setOpen(isOpen ? null : id)} className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-[#F9FAFB]">
                        <span className="font-semibold text-[#101828]">{question}</span>
                        <ChevronDown className={`h-5 w-5 shrink-0 text-[#667085] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <p className="text-sm leading-relaxed text-[#667085]">{answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm text-center">
          <h2 className="text-xl font-bold">Still unsure?</h2>
          <p className="mt-2 text-sm text-[#667085]">Read the beginner guide or open Support before locking a position.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/how-it-works" className="rounded-2xl bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA] hover:shadow-md">How It Works</Link>
            <Link to="/support" className="rounded-2xl border border-[#E5E7EB] bg-white px-6 py-3 text-sm font-semibold text-[#101828] transition hover:border-[#4F46E5]/40 hover:bg-[#F9FAFB]">Support</Link>
          </div>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}
