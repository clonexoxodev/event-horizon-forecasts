import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CircleHelp, ExternalLink, FileWarning, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";

const issueTypes = ["Wrong resolution", "Unclear rules", "Source disagreement", "Wallet/payout issue", "Other"];
const fieldClass = "w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#101828] outline-none transition placeholder:text-[#667085] focus:border-[#4F46E5]/60 focus:ring-2 focus:ring-[#4F46E5]/10";

export default function Support() {
  const [dispute, setDispute] = useState({ market: "", issue: issueTypes[0], description: "", evidence: "" });

  const submitDispute = (event: React.FormEvent) => {
    event.preventDefault();
    if (!dispute.market.trim() || !dispute.description.trim()) {
      toast.error("Add the market and describe the issue.");
      return;
    }
    window.localStorage.setItem("flippe_last_dispute_draft", JSON.stringify({ ...dispute, createdAt: new Date().toISOString() }));
    toast.info("Your dispute details were saved on this device.");
  };

  return (
    <div className="app-bg min-h-screen pb-24 font-['Inter',sans-serif] text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5]">Support</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Get help</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#667085]">
          Clear routes for market, wallet, dispute, and account questions.
        </p>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ActionLink to="/faq" icon={CircleHelp} title="FAQs" body="Read answers about Crowd View, pool predictions, payouts, and wallet flows." />
          <a href="#market-disputes" className="block">
            <ActionShell icon={FileWarning} title="Market disputes" body="Save structured dispute details for unclear outcomes." />
          </a>
          <ActionLink to="/contact" icon={Mail} title="Contact" body="Use the contact page for account and wallet questions." />
          <ActionLink to="/responsible-use" icon={ShieldAlert} title="Responsible Use" body="Read the risk reminders before backing a side." />
        </section>

        <section id="market-disputes" className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-bold">Market disputes</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#667085]">
              Use this when a market resolution looks wrong, unclear, or unsupported by the stated source. Flippe saves your dispute details locally so you can keep the information organized.
            </p>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="mb-0.5 h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-amber-800">Submitting below saves the details locally. It does not silently create a ticket.</p>
              </div>
            </div>
          </div>

          <form onSubmit={submitDispute} className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
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
              <button className="h-12 rounded-2xl bg-[#4F46E5] text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA] hover:shadow-md">
                Save dispute details
              </button>
            </div>
          </form>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const ActionLink = ({ to, icon, title, body }: { to: string; icon: any; title: string; body: string }) => (
  <Link to={to}>
    <ActionShell icon={icon} title={title} body={body} external />
  </Link>
);

const ActionShell = ({ icon: Icon, title, body, external = false }: { icon: any; title: string; body: string; external?: boolean }) => (
  <div className="h-full rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition hover:border-[#4F46E5]/40 hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5]">
        <Icon className="h-5 w-5" />
      </div>
      {external && <ExternalLink className="h-4 w-4 text-[#667085]" />}
    </div>
    <div className="mt-4 font-bold">{title}</div>
    <p className="mt-1 text-sm leading-relaxed text-[#667085]">{body}</p>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#667085]">{label}</span>
    {children}
  </label>
);
