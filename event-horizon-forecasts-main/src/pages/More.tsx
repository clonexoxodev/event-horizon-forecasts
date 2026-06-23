import {
  BookOpen,
  ChevronRight,
  CircleHelp,
  FileText,
  HelpCircle,
  Info,
  Loader2,
  LogOut,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";

export default function More() {
  const { user, logout, isAdmin, isSuperAdmin, isLoading } = useAuth();
  const adminPath = isSuperAdmin() ? "/super-admin" : "/admin";

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:py-8">
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">More</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight">Account and help</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#6B7280]">
                Manage your account, get support, and read the rules behind Flippe before public launch.
              </p>
            </div>
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8F7F4] px-4 py-3 text-sm">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#4F46E5]" />
              ) : user ? (
                <>
                  <div className="font-black">{user.username}</div>
                  <div className="mt-1 text-[#6B7280]">{formatNaira(user.balance)} available</div>
                </>
              ) : (
                <>
                  <div className="font-black">Browsing as guest</div>
                  <div className="mt-1 text-[#6B7280]">Log in to predict or use wallet features.</div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Group title="Account" description="Simple account controls for V1. Public profiles are intentionally hidden for now.">
            <MoreLink to="/settings" icon={Settings} title="Settings" subtitle="Notifications, privacy, security, and sign out." />
            <MoreLink to="/support" icon={HelpCircle} title="Support" subtitle="Help, disputes, contact, and account questions." />
          </Group>

          <Group title="Platform" description="Learn how Flippe markets work before locking a prediction.">
            <MoreLink to="/how-it-works" icon={BookOpen} title="How It Works" subtitle="A beginner-friendly guide to YES/NO markets." />
            <MoreLink to="/faq" icon={CircleHelp} title="FAQs" subtitle="Plain answers about Crowd View, pools, wallet, and resolution." />
            <MoreLink to="/about" icon={Info} title="About FLIPPE" subtitle="What Flippe is building and what it is not." />
          </Group>

          <Group title="Trust & Safety" description="Responsible use and draft legal information for pre-launch review.">
            <MoreLink to="/responsible-use" icon={ShieldAlert} title="Responsible Use" subtitle="Risk reminders and healthy usage guidance." />
            <MoreLink to="/privacy" icon={Shield} title="Privacy" subtitle="Draft notice for account, wallet, and market data." />
            <MoreLink to="/terms" icon={FileText} title="Terms" subtitle="Draft platform rules and market participation terms." />
          </Group>

          {(isAdmin() || isSuperAdmin()) && (
            <Group title="Internal" description="Separated operational tools for admins only.">
              <MoreLink to={adminPath} icon={ShieldCheck} title="Admin Panel" subtitle="Market operations, finance queues, and resolution." />
            </Group>
          )}
        </section>

        {user && (
          <button
            onClick={logout}
            className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-sm font-black text-red-600 transition hover:bg-red-100"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        )}
      </main>
      <MobileNav />
    </div>
  );
}

const Group = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
    <h2 className="text-sm font-black uppercase tracking-[0.16em] text-[#4F46E5]">{title}</h2>
    <p className="mt-1 min-h-10 text-sm text-[#6B7280]">{description}</p>
    <div className="mt-4 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">{children}</div>
  </section>
);

const MoreLink = ({ to, icon: Icon, title, subtitle }: { to: string; icon: any; title: string; subtitle: string }) => (
  <Link to={to} className="group flex min-h-20 items-center gap-3 border-b border-[#E5E7EB] p-4 transition last:border-b-0 hover:bg-[#F8F7F4]">
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#E5E7EB] bg-[#EEF2FF] text-[#4F46E5]">
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="font-black text-[#111827]">{title}</div>
      <div className="mt-1 text-sm text-[#6B7280]">{subtitle}</div>
    </div>
    <ChevronRight className="h-4 w-4 shrink-0 text-[#6B7280] transition group-hover:translate-x-0.5 group-hover:text-[#111827]" />
  </Link>
);
