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
    <div className="app-bg min-h-screen pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="rounded-2xl border border-red-400/25 bg-red-400/10 p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-red-400/25 bg-red-400/10 text-red-200">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-red-200">Responsible Use</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Forecast carefully. Risk is real.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-red-100/80">
                Predictions can resolve against you. Projected values are not guaranteed, and active positions are not withdrawable cash.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(([title, body, Icon]) => (
            <article key={title as string} className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#263241] bg-[#151E28] text-[#F2C94C]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-lg font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#8B98A8]">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <Panel title="Use only spare money">
            <p>Do not use money needed for food, rent, bills, school fees, transport, medical needs, emergencies, or debt repayment.</p>
            <p>FLIPPE is for informed forecasting. It is not a source of guaranteed income.</p>
          </Panel>
          <Panel title="Projected does not mean guaranteed">
            <p>Projected payout and projected value are estimates based on the current market state.</p>
            <p>Final results are determined only when the market closes and resolves using the stated source.</p>
          </Panel>
          <Panel title="Markets can go against you">
            <p>If your prediction is wrong, your position can settle at zero. Wrong outcomes are part of prediction markets.</p>
            <p>Take a break if you feel pressure to recover losses quickly.</p>
          </Panel>
          <Panel title="Before public launch">
            <p>Responsible-use tools such as account limits, cooling-off periods, and support escalation should be reviewed and strengthened before wide release.</p>
          </Panel>
        </section>

        <section className="mt-6 rounded-2xl border border-[#263241] bg-[#101720] p-5 text-center">
          <h2 className="text-xl font-black">Need help or disagree with a market outcome?</h2>
          <p className="mt-2 text-sm text-[#8B98A8]">Use Support to create a dispute draft or contact the team before public launch details are finalized.</p>
          <Link to="/support" className="mt-4 inline-flex rounded-2xl bg-[#12B886] px-5 py-3 text-sm font-black text-white hover:bg-[#0EA371]">Open Support</Link>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
    <h2 className="text-xl font-black">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-6 text-[#8B98A8]">{children}</div>
  </section>
);
