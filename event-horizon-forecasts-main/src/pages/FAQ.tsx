import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, CircleHelp } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const faqs = [
  {
    section: "Basics",
    items: [
      ["What is FLIPPE?", "FLIPPE is a pooled opinion market. People stop arguing and back YES or NO on public outcomes."],
      ["Is FLIPPE betting?", "FLIPPE is designed as a forecasting market. It still involves financial risk, so users should treat every prediction carefully and only use money they can afford to lose."],
      ["What kinds of markets can appear?", "Markets may cover public events in sports, crypto, politics, entertainment, economy, and other topics with clear resolution sources."],
    ],
  },
  {
    section: "Crowd View and predictions",
    items: [
      ["How do YES and NO work?", "YES and NO show the Crowd View. If YES is 61, NO is 39. Together they always add up to 100."],
      ["Why do YES and NO always add up to 100?", "A market resolves to one of the two outcomes. The two prices are shown as opposite sides of the same forecast."],
      ["What happens when I back a side?", "Your wallet is debited, your prediction is recorded, and your stake joins the market pool for that side."],
      ["What are units?", "Units are a background calculation FLIPPE may use to settle markets fairly. The main idea is simple: you backed a side in a pool."],
      ["Why does the Crowd View change?", "Crowd View changes as other users back YES or NO. It is not withdrawable money and it is not guaranteed profit."],
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
      ["What if I disagree with a resolution?", "Use Support > Market disputes to create a structured dispute draft. A real dispute queue should be connected before public launch."],
    ],
  },
  {
    section: "Wallet and safety",
    items: [
      ["How do deposits work?", "Deposits create a pending request. Wallet balance should only increase after admin approval or future payment-provider confirmation."],
      ["How do withdrawals work?", "Withdrawals create a request. Funds move out of available balance while the request is reviewed."],
      ["Can I withdraw money in active markets?", "No. Money committed to active predictions is not available to withdraw until the market is resolved or refunded."],
      ["Why should I use FLIPPE responsibly?", "Predictions involve risk. Do not use money needed for bills, school fees, rent, food, emergencies, or debt."],
    ],
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<string | null>("Basics-0");

  return (
    <div className="app-bg min-h-screen pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#263241] bg-[#151E28] text-[#12B886]">
              <CircleHelp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#12B886]">FAQs</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Questions before you predict</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8B98A8]">
                Simple answers about Crowd View, market pools, wallet movement, and responsible use.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-5">
          {faqs.map((group) => (
            <div key={group.section} className="rounded-2xl border border-[#263241] bg-[#101720] p-4">
              <h2 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-[#12B886]">{group.section}</h2>
              <div className="overflow-hidden rounded-2xl border border-[#263241] bg-[#0D131A]">
                {group.items.map(([question, answer], index) => {
                  const id = `${group.section}-${index}`;
                  const isOpen = open === id;
                  return (
                    <div key={question} className="border-b border-[#263241] last:border-b-0">
                      <button onClick={() => setOpen(isOpen ? null : id)} className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-[#151E28]">
                        <span className="font-black text-white">{question}</span>
                        <ChevronDown className={`h-5 w-5 shrink-0 text-[#8B98A8] transition ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && <p className="px-4 pb-4 text-sm leading-6 text-[#8B98A8]">{answer}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-[#263241] bg-[#101720] p-5 text-center">
          <h2 className="text-xl font-black">Still unsure?</h2>
          <p className="mt-2 text-sm text-[#8B98A8]">Read the beginner guide or open Support before locking a prediction.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/how-it-works" className="rounded-2xl bg-[#12B886] px-5 py-3 text-sm font-black text-white hover:bg-[#0EA371]">How It Works</Link>
            <Link to="/support" className="rounded-2xl border border-[#263241] bg-[#151E28] px-5 py-3 text-sm font-black text-white hover:border-[#12B886]/40">Support</Link>
          </div>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}
