import { HelpCircle, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

export default function Support() {
  return (
    <div className="app-bg min-h-screen pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8B98A8]">Support</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Get help</h1>
        <p className="mt-2 text-sm text-[#8B98A8]">Simple routes for wallet, market, and account questions.</p>
        <section className="mt-6 grid gap-3">
          <SupportCard icon={MessageCircle} title="Chat with support" body="Fast help for account and wallet issues." />
          <SupportCard icon={HelpCircle} title="FAQs" body="Answers about predictions, prices, and market resolution." />
          <SupportCard icon={ShieldCheck} title="Market disputes" body="Report unclear outcomes or resolution issues." />
          <SupportCard icon={Mail} title="Contact" body="Reach the Flippe team directly." />
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const SupportCard = ({ icon: Icon, title, body }: { icon: any; title: string; body: string }) => (
  <div className="rounded-2xl border border-[#263241] bg-[#101720] p-4">
    <div className="flex items-start gap-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#263241] bg-[#151E28] text-[#12B886]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-black text-white">{title}</div>
        <p className="mt-1 text-sm text-[#8B98A8]">{body}</p>
      </div>
    </div>
  </div>
);
