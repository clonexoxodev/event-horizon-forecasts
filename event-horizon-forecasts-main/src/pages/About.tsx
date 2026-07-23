import { Link } from "react-router-dom";
import { BarChart3, CheckCircle2, Shield, Target } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const principles = [
  ["Simple", "Markets should be understandable in seconds: question, YES/NO Crowd View, amount backed, price, and status.", Target],
  ["Transparent", "Rules, resolution source, wallet movement, and market status should be visible before traders participate.", Shield],
  ["Self-settling", "Flippe's design settles from matched market positions, not from hidden company-funded promises.", BarChart3],
  ["Responsible", "Final payout is only known after resolution. Traders should size positions carefully and never treat outcomes as guaranteed income.", CheckCircle2],
];

export default function About() {
  return (
    <div className="app-bg min-h-screen pb-24 font-['Inter',sans-serif] text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5]">About Flippe</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">Stop arguing. Back your opinion.</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#667085]">
            Flippe is a prediction exchange where traders back YES or NO on real-world questions. Final payout is calculated after market resolution.
          </p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {principles.map(([title, body, Icon]) => (
            <article key={title as string} className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-xl font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#667085]">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="What Flippe is">
            <p>A platform for taking positions on outcomes of public events.</p>
            <p>A wallet-linked experience where traders pick a side, track open positions, and wait for resolution.</p>
            <p>A product designed to make market rules, pool predictions, Crowd View, and resolution status easier to understand.</p>
          </Panel>
          <Panel title="What Flippe is not">
            <p>Flippe should not be treated as guaranteed income or financial advice.</p>
            <p>There is no withdrawable profit before market resolution unless a real cashout feature is explicitly available.</p>
            <p>Traders should never participate with money needed for bills, food, rent, school fees, emergencies, or debt.</p>
          </Panel>
        </section>

        <section className="mt-8 rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Flippe V1</h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#667085]">
            Flippe V1 focuses on clear YES/NO markets, wallet-backed positions, transparent rules, responsible use, and admin-led resolution.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/how-it-works" className="rounded-2xl bg-[#4F46E5] px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA] hover:shadow-md">Learn how it works</Link>
            <Link to="/responsible-use" className="rounded-2xl border border-[#E5E7EB] bg-white px-6 py-3 text-center text-sm font-semibold text-[#101828] transition hover:border-[#4F46E5]/40 hover:bg-[#F9FAFB]">Responsible use</Link>
          </div>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
    <h2 className="text-xl font-bold">{title}</h2>
    <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#667085]">{children}</div>
  </section>
);
