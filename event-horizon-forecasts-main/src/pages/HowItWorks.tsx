import { Link } from "react-router-dom";
import { BarChart3, CheckCircle2, Clock, LockKeyhole, Search, WalletCards } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const steps = [
  ["Pick a market", "Browse live markets and read the question, category, rules, and closing time.", Search],
  ["Choose YES or NO", "YES and NO prices show current sentiment. They always add up to 100.", BarChart3],
  ["Enter amount", "The prediction slip shows your current price, shares received, and projected payout if resolved now.", WalletCards],
  ["Lock prediction", "Your wallet is debited and your position is saved. You cannot treat projected profit as withdrawable cash.", LockKeyhole],
  ["Track it", "Portfolio shows entry price, current price, shares, stake, projected payout, and status.", Clock],
  ["Market resolves", "After the deadline, admins resolve using the stated source. Winning positions receive final payout.", CheckCircle2],
];

export default function HowItWorks() {
  return (
    <div className="app-bg min-h-screen pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#12B886]">How It Works</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Forecast live events in a few clear steps</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8B98A8]">
            FLIPPE keeps the flow simple: choose a market, pick a side, see your shares and projected payout, then track the result until resolution.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {steps.map(([title, body, Icon], index) => (
            <article key={title as string} className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#263241] bg-[#151E28] text-[#12B886]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-black text-[#8B98A8]">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h2 className="mt-5 text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#8B98A8]">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <InfoPanel title="How prices move">
            <p>YES and NO prices are sentiment indicators based on real user activity. If more users buy YES, YES can rise and NO falls. If more users buy NO, NO can rise and YES falls.</p>
            <p>Prices help calculate shares at the moment you lock a prediction. They are not a guarantee of profit.</p>
          </InfoPanel>
          <InfoPanel title="How final payout works">
            <p>When a market resolves, final payout is determined only by the resolved outcome and the market pool rules. Projected values shown before resolution are estimates.</p>
            <p>If your side loses, your position can settle at zero. If the market is cancelled, eligible stakes should be refunded through the wallet ledger.</p>
          </InfoPanel>
        </section>

        <section className="mt-6 rounded-2xl border border-[#263241] bg-[#101720] p-5">
          <h2 className="text-2xl font-black">Simple example</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Example label="Market price" value="YES 60 / NO 40" />
            <Example label="You choose" value="YES with ₦600" />
            <Example label="Shares shown" value="10 YES shares" />
          </div>
          <p className="mt-4 text-sm leading-6 text-[#8B98A8]">
            The app may show a projected payout if the market resolved now. That number can change until the market closes and is resolved.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-[#263241] bg-[#101720] p-5 text-center">
          <h2 className="text-xl font-black">Ready to browse markets?</h2>
          <p className="mt-2 text-sm text-[#8B98A8]">Read each market rule before locking a prediction.</p>
          <Link to="/" className="mt-4 inline-flex rounded-2xl bg-[#12B886] px-5 py-3 text-sm font-black text-white hover:bg-[#0EA371]">Open markets</Link>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const InfoPanel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
    <h2 className="text-xl font-black">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-6 text-[#8B98A8]">{children}</div>
  </section>
);

const Example = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-[#263241] bg-[#151E28] p-4">
    <div className="text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">{label}</div>
    <div className="mt-2 font-black text-white">{value}</div>
  </div>
);
