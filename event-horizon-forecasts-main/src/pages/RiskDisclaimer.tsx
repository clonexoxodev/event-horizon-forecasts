import { Link } from "react-router-dom";
import { AlertTriangle, Clock, Hand, Scale, ShieldAlert } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const cards = [
  ["Set a personal limit", "Decide the maximum you can afford before you start, and stop when you reach it.", Scale],
  ["Understand the rules", "Read the market question, close time, and resolution source before locking a position.", ShieldAlert],
  ["Do not chase losses", "A wrong position is not a reason to increase risk. Pause and step away.", Hand],
  ["Take breaks", "If markets feel stressful or urgent, stop using the platform for a while.", Clock],
];

export default function RiskDisclaimer() {
  return (
    <div className="app-bg min-h-screen pb-24 font-['Inter',sans-serif] text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <section className="rounded-3xl border border-[#E85D5D]/25 bg-[#E85D5D]/5 p-8">
          <div className="flex items-start gap-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#E85D5D]/10 text-[#E85D5D]">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E85D5D]">Responsible Use</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Predict carefully. Risk is real.</h1>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#E85D5D]/80">
                Positions can resolve against you. Final payout is not known until resolution, and active positions are not withdrawable cash.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(([title, body, Icon]) => (
            <article key={title as string} className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#667085]">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Use only spare money">
            <p>Do not use money needed for food, rent, bills, school fees, transport, medical needs, emergencies, or debt repayment.</p>
            <p>Flippe is for informed trading. It is not a source of guaranteed income.</p>
          </Panel>
          <Panel title="No payout is guaranteed early">
            <p>Any estimate before resolution is informational only and can change as the pool distribution and positions change.</p>
            <p>Final results and final payout are determined only when the market closes and resolves using the stated source.</p>
          </Panel>
          <Panel title="Markets can go against you">
            <p>If your position is wrong, it can settle at zero. Wrong outcomes are part of position markets.</p>
            <p>Take a break if you feel pressure to recover losses quickly.</p>
          </Panel>
          <Panel title="Use support when needed">
            <p>If a market feels unclear, a wallet action looks wrong, or you feel pressure to keep trading, pause and use Support.</p>
          </Panel>
        </section>

        <section className="mt-8 rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm text-center">
          <h2 className="text-xl font-bold">Need help or disagree with a market outcome?</h2>
          <p className="mt-2 text-sm text-[#667085]">Use Support to save dispute details or contact the team about account and wallet questions.</p>
          <Link to="/support" className="mt-5 inline-flex rounded-2xl bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA] hover:shadow-md">Open Support</Link>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
    <h2 className="text-lg font-bold">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#667085]">{children}</div>
  </section>
);
