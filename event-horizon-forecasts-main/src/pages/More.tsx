import { BookOpen, HelpCircle, Info, Loader2, LogOut, Shield, ShieldCheck, User, FileText, Settings, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";

export default function More() {
  const { user, logout, isAdmin, isSuperAdmin, isLoading } = useAuth();
  const adminPath = isSuperAdmin() ? "/super-admin" : "/admin";

  return (
    <div className="app-bg min-h-screen pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 lg:py-8">
        <section className="rounded-2xl border border-[#263241] bg-[#101720] p-5">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 overflow-hidden rounded-full border border-[#263241] bg-[#151E28] text-2xl font-black">
              {isLoading ? (
                <Loader2 className="m-auto h-6 w-6 animate-spin" />
              ) : user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center">{user?.username?.charAt(0).toUpperCase() || "F"}</div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black">{user ? user.username : "Welcome to Flippe"}</h1>
              <p className="mt-1 text-sm text-[#8B98A8]">{user ? `${formatNaira(user.balance)} available` : "Sign in to track your predictions."}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 space-y-4">
          <Group title="Account">
            <MoreLink to="/profile" icon={User} title="Profile" subtitle="Prediction history, photo, and stats." />
            <MoreLink to="/settings" icon={Settings} title="Settings" subtitle="Account preferences and app controls." />
            <MoreLink to="/support" icon={HelpCircle} title="Support" subtitle="Get help without leaving the app." />
          </Group>

          {(isAdmin() || isSuperAdmin()) && (
            <Group title="Internal">
              <MoreLink to={adminPath} icon={ShieldCheck} title="Admin Panel" subtitle="Separated market operations workspace." />
            </Group>
          )}

          <Group title="Trust">
            <MoreLink to="/risk-disclaimer" icon={AlertTriangle} title="Responsible Use" subtitle="Forecast responsibly and understand risk." />
            <MoreLink to="/privacy" icon={Shield} title="Privacy" subtitle="How data is handled." />
            <MoreLink to="/terms" icon={FileText} title="Terms" subtitle="Platform rules and usage terms." />
            <MoreLink to="/how-it-works" icon={BookOpen} title="How It Works" subtitle="Learn prediction markets in plain language." />
            <MoreLink to="/about" icon={Info} title="About" subtitle="What Flippe is building." />
          </Group>

          {user && (
            <button
              onClick={logout}
              className="flex h-14 w-full items-center justify-center rounded-2xl border border-red-400/25 bg-red-400/10 text-sm font-black text-red-200 transition hover:bg-red-400/20"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </button>
          )}
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">{title}</h2>
    <div className="overflow-hidden rounded-2xl border border-[#263241] bg-[#101720]">{children}</div>
  </section>
);

const MoreLink = ({ to, icon: Icon, title, subtitle }: { to: string; icon: any; title: string; subtitle: string }) => (
  <Link to={to} className="flex items-center gap-3 border-b border-[#263241] p-4 transition last:border-b-0 hover:bg-[#151E28]">
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#263241] bg-[#151E28] text-[#12B886]">
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <div className="font-black text-white">{title}</div>
      <div className="mt-1 line-clamp-1 text-sm text-[#8B98A8]">{subtitle}</div>
    </div>
  </Link>
);
