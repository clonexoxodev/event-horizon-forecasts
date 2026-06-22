import { Link } from "react-router-dom";
import { Database, EyeOff, Lock, Shield } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const sections = [
  ["Account information", "Username, email address, authentication status, role, and account timestamps may be stored so the platform can identify your account."],
  ["Wallet and activity data", "Wallet balances, deposit requests, withdrawal requests, transactions, stakes, payouts, refunds, and market activity may be stored in the ledger."],
  ["Market participation", "The platform may record market ID, selected side, stake, background units, Crowd View at entry, final status, and resolution outcome."],
  ["Device and usage data", "The app may collect technical data such as browser, device type, timestamps, session behavior, and error logs to improve reliability."],
];

export default function Privacy() {
  return (
    <div className="app-bg min-h-screen pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#263241] bg-[#151E28] text-[#12B886]">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#12B886]">Privacy</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Draft privacy notice</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8B98A8]">
                This is a pre-launch privacy notice and should be reviewed before public launch. It explains the kinds of data FLIPPE may need to run markets and wallet flows.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {sections.map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
              <Database className="h-6 w-6 text-[#12B886]" />
              <h2 className="mt-4 text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#8B98A8]">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <Panel icon={Lock} title="How data may be used">
            <p>To keep users logged in, show wallet balances, place predictions, process deposits and withdrawals, resolve markets, prevent abuse, and improve app reliability.</p>
            <p>Financial ledger records may need to be retained for accounting, dispute, security, or legal reasons.</p>
          </Panel>
          <Panel icon={EyeOff} title="Public and private activity">
            <p>Public profile features are paused for V1. Activity and earnings visibility should default to private unless a user clearly opts in later.</p>
            <p>Admins may still need access to market, wallet, and transaction records to operate the platform safely.</p>
          </Panel>
          <Panel icon={Shield} title="Security">
            <p>Access tokens, account data, and wallet actions should be handled by backend APIs. The frontend must not directly update wallet balances.</p>
            <p>No system can promise perfect security, so public-launch review should include security and privacy checks.</p>
          </Panel>
          <Panel icon={Database} title="Contact details">
            <p>Official privacy contact details will be added before public launch. For now, users can use the Contact or Support pages.</p>
            <Link to="/contact" className="mt-3 inline-flex rounded-xl border border-[#263241] bg-[#151E28] px-4 py-2 text-sm font-black text-white hover:border-[#12B886]/40">Contact</Link>
          </Panel>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const Panel = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
    <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#263241] bg-[#151E28] text-[#12B886]">
      <Icon className="h-5 w-5" />
    </div>
    <h2 className="mt-4 text-xl font-black">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-6 text-[#8B98A8]">{children}</div>
  </section>
);
