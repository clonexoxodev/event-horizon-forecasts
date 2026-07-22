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
    <div className="app-bg min-h-screen pb-24 font-['Inter',sans-serif] text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <div className="flex items-start gap-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5]">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5]">Privacy</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Privacy notice</h1>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#667085]">
                This page explains the account, wallet, and market data Flippe uses to run pooled position markets safely.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {sections.map(([title, body]) => (
            <article key={title} className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5]">
                <Database className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#667085]">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel icon={Lock} title="How data may be used">
            <p>To keep traders logged in, show wallet balances, place orders, process deposits and withdrawals, resolve markets, prevent abuse, and improve app reliability.</p>
            <p>Financial ledger records may need to be retained for accounting, dispute, security, or legal reasons.</p>
          </Panel>
          <Panel icon={EyeOff} title="Public and private activity">
            <p>Public profile features are not part of V1. Activity and earnings visibility default to private.</p>
            <p>Admins may still need access to market, wallet, and transaction records to operate the platform safely.</p>
          </Panel>
          <Panel icon={Shield} title="Security">
            <p>Access tokens, account data, and wallet actions should be handled by backend APIs. The frontend must not directly update wallet balances.</p>
            <p>No system can promise perfect security. Flippe should keep account, wallet, and admin access controls under regular review.</p>
          </Panel>
          <Panel icon={Database} title="Contact details">
            <p>Traders can use the Contact or Support pages for privacy and account questions.</p>
            <Link to="/contact" className="mt-4 inline-flex rounded-2xl border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-semibold text-[#101828] transition hover:border-[#4F46E5]/40 hover:bg-[#F9FAFB]">Contact</Link>
          </Panel>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const Panel = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5]">
      <Icon className="h-5 w-5" />
    </div>
    <h2 className="mt-4 text-lg font-bold">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#667085]">{children}</div>
  </section>
);
