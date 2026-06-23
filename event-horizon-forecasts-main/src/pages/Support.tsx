import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CircleHelp, ExternalLink, FileWarning, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const issueTypes = ["Wrong resolution", "Unclear rules", "Source disagreement", "Wallet/payout issue", "Other"];
const fieldClass = "w-full rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-3 text-sm text-[#101828] outline-none transition placeholder:text-[#667085] focus:border-[#4F46E5]/60";

export default function Support() {
  const [showChat, setShowChat] = useState(false);
  const [dispute, setDispute] = useState({ market: "", issue: issueTypes[0], description: "", evidence: "" });

  const submitDispute = (event: React.FormEvent) => {
    event.preventDefault();
    if (!dispute.market.trim() || !dispute.description.trim()) {
      toast.error("Add the market and describe the issue.");
      return;
    }
    window.localStorage.setItem("flippe_last_dispute_draft", JSON.stringify({ ...dispute, createdAt: new Date().toISOString() }));
    toast.info("Dispute submission will be enabled before public launch. Your draft was saved on this device.");
  };

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#4F46E5]">Support</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Get help</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#667085]">
          Clear routes for market, wallet, dispute, and account questions. Nothing here pretends to submit to a backend that does not exist yet.
        </p>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionCard icon={MessageCircle} title="Chat with support" body="Live support is not available yet." onClick={() => setShowChat(true)} />
          <ActionLink to="/faq" icon={CircleHelp} title="FAQs" body="Read answers about Crowd View, pools, payouts, and wallet flows." />
          <a href="#market-disputes" className="block">
            <ActionShell icon={FileWarning} title="Market disputes" body="Create a structured dispute draft for unclear outcomes." />
          </a>
          <ActionLink to="/contact" icon={Mail} title="Contact" body="Official contact details will be added before public launch." />
        </section>

        {showChat && (
          <section className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] text-[#4F46E5]">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black">Support coming soon</h2>
                <p className="mt-2 text-sm leading-6 text-[#667085]">
                  Live support is not available yet. For now, use Contact for account questions or Market disputes for resolution concerns.
                </p>
                <button onClick={() => setShowChat(false)} className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-2 text-sm font-black hover:border-[#4F46E5]/40">
                  Close
                </button>
              </div>
            </div>
          </section>
        )}

        <section id="market-disputes" className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <ShieldCheck className="h-8 w-8 text-[#4F46E5]" />
            <h2 className="mt-4 text-2xl font-black">Market disputes</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Use this when a market resolution looks wrong, unclear, or unsupported by the stated source. A real backend dispute queue should be connected before public launch.
            </p>
            <div className="mt-4 rounded-2xl border border-[#F2C94C]/30 bg-[#F2C94C]/10 p-4 text-sm text-[#F2C94C]">
              <AlertCircle className="mb-2 h-5 w-5" />
              Submitting below saves a draft locally and shows a clear coming-soon message. It does not silently create a ticket.
            </div>
          </div>

          <form onSubmit={submitDispute} className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <div className="grid gap-4">
              <Field label="Market">
                <input value={dispute.market} onChange={(event) => setDispute((prev) => ({ ...prev, market: event.target.value }))} placeholder="Market title or market URL" className={fieldClass} />
              </Field>
              <Field label="Issue type">
                <select value={dispute.issue} onChange={(event) => setDispute((prev) => ({ ...prev, issue: event.target.value }))} className={fieldClass}>
                  {issueTypes.map((issue) => <option key={issue} value={issue}>{issue}</option>)}
                </select>
              </Field>
              <Field label="Description">
                <textarea value={dispute.description} onChange={(event) => setDispute((prev) => ({ ...prev, description: event.target.value }))} rows={5} placeholder="Explain what happened and why you disagree." className={`${fieldClass} min-h-32 resize-none`} />
              </Field>
              <Field label="Evidence/source link">
                <input value={dispute.evidence} onChange={(event) => setDispute((prev) => ({ ...prev, evidence: event.target.value }))} placeholder="Official source, article, result page, transaction reference..." className={fieldClass} />
              </Field>
              <button className="h-12 rounded-2xl bg-[#4F46E5] text-sm font-black text-white transition hover:bg-[#4338CA]">
                Save dispute draft
              </button>
            </div>
          </form>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const ActionCard = ({ icon: Icon, title, body, onClick }: { icon: any; title: string; body: string; onClick: () => void }) => (
  <button onClick={onClick} className="text-left">
    <ActionShell icon={Icon} title={title} body={body} />
  </button>
);

const ActionLink = ({ to, icon, title, body }: { to: string; icon: any; title: string; body: string }) => (
  <Link to={to}>
    <ActionShell icon={icon} title={title} body={body} external />
  </Link>
);

const ActionShell = ({ icon: Icon, title, body, external = false }: { icon: any; title: string; body: string; external?: boolean }) => (
  <div className="h-full rounded-2xl border border-[#E5E7EB] bg-white p-4 transition hover:border-[#4F46E5]/40 hover:bg-[#F3F4F6]">
    <div className="flex items-start justify-between gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] text-[#4F46E5]">
        <Icon className="h-5 w-5" />
      </div>
      {external && <ExternalLink className="h-4 w-4 text-[#667085]" />}
    </div>
    <div className="mt-4 font-black">{title}</div>
    <p className="mt-1 text-sm leading-6 text-[#667085]">{body}</p>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#667085]">{label}</span>
    {children}
  </label>
);
