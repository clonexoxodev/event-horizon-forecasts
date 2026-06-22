import { Link } from "react-router-dom";
import { BarChart3, CheckCircle2, Shield, Target } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const principles = [
  ["Simple", "Markets should be understandable in seconds: question, YES/NO Crowd View, amount backed, pool, and status.", Target],
  ["Transparent", "Rules, resolution source, wallet movement, and market status should be visible before users participate.", Shield],
  ["Pool-safe", "Flippe's MVP market design should settle from locked market stakes, not from hidden company-funded promises.", BarChart3],
  ["Responsible", "Final payout is only known after resolution. Users should forecast carefully and never treat predictions as guaranteed income.", CheckCircle2],
];

export default function About() {
  return (
    <div className="app-bg min-h-screen pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#12B886]">About FLIPPE</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Stop arguing. Back your opinion.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8B98A8]">
            FLIPPE is a pooled opinion market. Users forecast public outcomes by backing YES or NO, then the correct side receives a share of the losing side's pool after resolution.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {principles.map(([title, body, Icon]) => (
            <article key={title as string} className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#263241] bg-[#151E28] text-[#12B886]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#8B98A8]">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <Panel title="What FLIPPE is">
            <p>A platform for forecasting outcomes of public events.</p>
            <p>A wallet-linked experience where users back a side, track open predictions, and wait for resolution.</p>
            <p>A product designed to make market rules, pools, Crowd View, and resolution status easier to understand.</p>
          </Panel>
          <Panel title="What FLIPPE is not">
            <p>FLIPPE should not be treated as guaranteed income or financial advice.</p>
            <p>There is no withdrawable profit before market resolution unless a real cashout feature is explicitly available.</p>
            <p>Users should never participate with money needed for bills, food, rent, school fees, emergencies, or debt.</p>
          </Panel>
        </section>

        <section className="mt-6 rounded-2xl border border-[#263241] bg-[#101720] p-5">
          <h2 className="text-2xl font-black">Pre-launch note</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8B98A8]">
            FLIPPE is being prepared for MVP testing. Legal pages, contact details, dispute handling, and payment automation should be reviewed before public launch.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link to="/how-it-works" className="rounded-2xl bg-[#12B886] px-5 py-3 text-center text-sm font-black text-white hover:bg-[#0EA371]">Learn how it works</Link>
            <Link to="/responsible-use" className="rounded-2xl border border-[#263241] bg-[#151E28] px-5 py-3 text-center text-sm font-black text-white hover:border-[#12B886]/40">Responsible use</Link>
          </div>
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
