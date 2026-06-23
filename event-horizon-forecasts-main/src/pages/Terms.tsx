import { Link } from "react-router-dom";
import { AlertTriangle, FileText } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const terms = [
  ["Eligibility", "Users should be legally eligible to use prediction market products in their location. Age and identity requirements should be reviewed before launch."],
  ["Account responsibility", "Users are responsible for keeping login details secure and for activity performed through their account."],
  ["Wallet and balances", "Wallet balances, pending deposits, withdrawals, prediction stakes, payouts, refunds, and adjustments should be recorded in the transaction ledger."],
  ["Market participation", "Users should read the market question, rules, close time, and resolution source before locking a prediction."],
  ["Market resolution", "Markets resolve using the stated source and rules. If the market cannot resolve fairly, cancellation and refund logic may apply."],
  ["Disputes", "Users can raise a dispute if a market appears incorrectly resolved, unclear, or unsupported by the stated source."],
  ["Prohibited activity", "Market manipulation, fraud, abuse, multiple-account misuse, automated abuse, and attempts to bypass limits are not allowed."],
  ["No guaranteed profit", "Any payout estimate before resolution is informational only. FLIPPE does not guarantee profit or income."],
  ["Platform changes", "Features, supported markets, deposit/withdrawal methods, and operational rules may change as the product develops."],
  ["Contact details", "Official legal and support contact details should be added before public launch."],
];

export default function Terms() {
  return (
    <div className="app-bg min-h-screen pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#263241] bg-[#151E28] text-[#4F46E5]">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#4F46E5]">Terms</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Draft terms of use</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8B98A8]">
                This is a draft terms page and should be reviewed legally before public launch. It gives users a clear view of the rules expected in the MVP.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#F2C94C]/30 bg-[#F2C94C]/10 p-5 text-[#F2C94C]">
          <AlertTriangle className="h-6 w-6" />
          <p className="mt-3 text-sm leading-6">
            FLIPPE is a pre-launch product. These terms are informational until reviewed and finalized by qualified legal counsel.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {terms.map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
              <h2 className="text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#8B98A8]">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-[#263241] bg-[#101720] p-5">
          <h2 className="text-xl font-black">Before locking a prediction</h2>
          <p className="mt-2 text-sm leading-6 text-[#8B98A8]">
            By participating in a market, a user should understand that predictions involve risk, early estimates are not guaranteed, and final payout depends on market resolution and the final pool.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link to="/responsible-use" className="rounded-2xl bg-[#4F46E5] px-5 py-3 text-center text-sm font-black text-white hover:bg-[#4338CA]">Responsible Use</Link>
            <Link to="/support" className="rounded-2xl border border-[#263241] bg-[#151E28] px-5 py-3 text-center text-sm font-black text-white hover:border-[#4F46E5]/40">Support</Link>
          </div>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}
