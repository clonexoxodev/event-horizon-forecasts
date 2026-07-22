import { Link } from "react-router-dom";
import { BarChart3, CheckCircle2, Clock, LockKeyhole, Search, WalletCards } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const steps = [
  ["Pick a market", "Browse live markets and read the question, category, rules, and closing time.", Search],
  ["Choose YES or NO", "YES and NO show the Crowd View. They always add up to 100.", BarChart3],
  ["Enter amount", "The order slip shows your stake, the total pool, the opposing pool, and participants.", WalletCards],
  ["Back your position", "Your wallet is debited and your order is saved. There is no cashout before resolution.", LockKeyhole],
  ["Track it", "My Positions shows your pick, amount backed, Crowd View, time left, and status.", Clock],
  ["Market resolves", "After the deadline, admins resolve using the stated source. The correct side shares the losing side's pool.", CheckCircle2],
];

export default function HowItWorks() {
  return (
    <div className="app-bg min-h-screen pb-24 font-['Inter',sans-serif] text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5]">How It Works</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">Trade live events in a few clear steps</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#667085]">
            Flippe keeps the flow simple: choose a market, pick YES or NO, back your position with money, then track the result until resolution.
          </p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {steps.map(([title, body, Icon], index) => (
            <article key={title as string} className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-[#667085]">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h2 className="mt-5 text-xl font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#667085]">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <InfoPanel title="How Crowd View moves">
            <p>YES and NO show what the crowd currently thinks based on real user activity. If more traders back YES, YES can rise and NO falls. If more traders back NO, NO can rise and YES falls.</p>
            <p>Crowd View helps people understand the market. It is not a guarantee of profit and it is not a cashout value.</p>
          </InfoPanel>
          <InfoPanel title="How final payout works">
            <p>When a market resolves, the correct side receives its stake plus a share of the losing side's pool. The final pool can change until the market closes.</p>
            <p>If your side loses, your position settles at zero. If the market is cancelled, eligible stakes should be refunded through the wallet ledger.</p>
          </InfoPanel>
        </section>

        <section className="mt-8 rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Simple example</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Example label="Crowd View" value="YES 60 / NO 40" />
            <Example label="You choose" value="Back YES with ₦600" />
            <Example label="Final payout" value="Calculated after resolution" />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-[#667085]">
            The amount you finally receive depends on the result and the final pool when the market closes.
          </p>
        </section>

        <section className="mt-8 rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm text-center">
          <h2 className="text-xl font-bold">Ready to browse markets?</h2>
          <p className="mt-2 text-sm text-[#667085]">Read each market rule before locking a position.</p>
          <Link to="/" className="mt-5 inline-flex rounded-2xl bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA] hover:shadow-md">Open markets</Link>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const InfoPanel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
    <h2 className="text-xl font-bold">{title}</h2>
    <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#667085]">{children}</div>
  </section>
);

const Example = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
    <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#667085]">{label}</div>
    <div className="mt-2 font-bold text-[#101828]">{value}</div>
  </div>
);
