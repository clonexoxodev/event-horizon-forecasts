import { Link } from "react-router-dom";
import { AlertTriangle, FileText } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const terms = [
  ["Eligibility", "Traders must be legally eligible to use Flippe in their location and must follow any age, identity, and account requirements that apply."],
  ["Account responsibility", "Traders are responsible for keeping login details secure and for activity performed through their account."],
  ["Wallet and balances", "Wallet balances, pending deposits, withdrawals, position stakes, payouts, refunds, and adjustments should be recorded in the transaction ledger."],
  ["Market participation", "Traders should read the market question, rules, close time, and resolution source before locking a position."],
  ["Market resolution", "Markets resolve using the stated source and rules. If the market cannot resolve fairly, cancellation and refund logic may apply."],
  ["Disputes", "Traders can raise a dispute if a market appears incorrectly resolved, unclear, or unsupported by the stated source."],
  ["Prohibited activity", "Market manipulation, fraud, abuse, multiple-account misuse, automated abuse, and attempts to bypass limits are not allowed."],
  ["No guaranteed profit", "Any payout estimate before resolution is informational only. Flippe does not guarantee profit or income."],
  ["Platform changes", "Features, supported markets, deposit/withdrawal methods, and operational rules may change as the product develops."],
  ["Contact and support", "Traders can use Support for account questions, wallet questions, and market disputes."],
];

export default function Terms() {
  return (
    <div className="app-bg min-h-screen pb-24 font-['Inter',sans-serif] text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <div className="flex items-start gap-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5]">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5]">Terms</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Terms of use</h1>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#667085]">
                These terms explain the basic rules for using Flippe V1, backing YES or NO, wallet activity, market resolution, and disputes.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-600 shrink-0" />
            <p className="text-sm leading-relaxed text-amber-800">
              Flippe markets involve risk. Read each market question, rule, close time, and resolution source before backing a side.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {terms.map(([title, body]) => (
            <article key={title} className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#667085]">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold">Before locking a position</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#667085]">
            By participating in a market, a trader should understand that positions involve risk, early estimates are not guaranteed, and final payout depends on market resolution and the final pool.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link to="/responsible-use" className="rounded-2xl bg-[#4F46E5] px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA] hover:shadow-md">Responsible Use</Link>
            <Link to="/support" className="rounded-2xl border border-[#E5E7EB] bg-white px-6 py-3 text-center text-sm font-semibold text-[#101828] transition hover:border-[#4F46E5]/40 hover:bg-[#F9FAFB]">Support</Link>
          </div>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}
