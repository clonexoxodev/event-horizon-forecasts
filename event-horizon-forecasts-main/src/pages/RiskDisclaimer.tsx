import { Link } from "react-router-dom";
import { AlertTriangle, Clock, Hand, Scale, ShieldAlert } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const cards = [
  ["Set a personal limit", "Decide the maximum you can afford before you start, and stop when you reach it.", Scale],
  ["Understand the rules", "Read the market question, close time, and resolution source before locking a prediction.", ShieldAlert],
  ["Do not chase losses", "A wrong prediction is not a reason to increase risk. Pause and step away.", Hand],
  ["Take breaks", "If prediction markets feel stressful or urgent, stop using the platform for a while.", Clock],
];

export default function RiskDisclaimer() {
  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="rounded-2xl border border-red-400/25 bg-red-400/10 p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-red-200 bg-red-50 text-red-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-red-700">Responsible Use</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Forecast carefully. Risk is real.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-red-800">
                Predictions can resolve against you. Final payout is not known until resolution, and active predictions are not withdrawable cash.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(([title, body, Icon]) => (
            <article key={title as string} className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] text-[#F2C94C]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-lg font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#667085]">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <Panel title="Use only spare money">
            <p>Do not use money needed for food, rent, bills, school fees, transport, medical needs, emergencies, or debt repayment.</p>
            <p>FLIPPE is for informed forecasting. It is not a source of guaranteed income.</p>
          </Panel>
          <Panel title="No payout is guaranteed early">
            <p>Any estimate before resolution is informational only and can change as the market pool changes.</p>
            <p>Final results and final payout are determined only when the market closes and resolves using the stated source.</p>
          </Panel>
          <Panel title="Markets can go against you">
            <p>If your prediction is wrong, it can settle at zero. Wrong outcomes are part of prediction markets.</p>
            <p>Take a break if you feel pressure to recover losses quickly.</p>
          </Panel>
          <Panel title="Use support when needed">
            <p>If a market feels unclear, a wallet action looks wrong, or you feel pressure to keep predicting, pause and use Support.</p>
          </Panel>
        </section>

        <section className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-5 text-center">
          <h2 className="text-xl font-black">Need help or disagree with a market outcome?</h2>
          <p className="mt-2 text-sm text-[#667085]">Use Support to save dispute details or contact the team about account and wallet questions.</p>
          <Link to="/support" className="mt-4 inline-flex rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-black text-white hover:bg-[#4338CA]">Open Support</Link>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
    <h2 className="text-xl font-black">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-6 text-[#667085]">{children}</div>
  </section>
);
