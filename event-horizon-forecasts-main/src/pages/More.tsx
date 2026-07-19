import {
  BookOpen,
  ChevronRight,
  FileText,
  HelpCircle,
  Info,
  Loader2,
  LogOut,
  MessageSquare,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

const APP_VERSION = "v1.0.0";

export default function More() {
  const { user, logout, isAdmin, isSuperAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const adminPath = isSuperAdmin() ? "/super-admin" : "/admin";
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 lg:py-8">
        {/* Header Card */}
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4F46E5]">More</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Account & help</h1>
              <p className="mt-2 max-w-xl text-sm text-[#6B7280]">
                Manage your account, get support, and review platform rules.
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#4F46E5]" />
              ) : user ? (
                <>
                  <div className="font-bold text-[#111827]">@{user.username}</div>
                  <div className="mt-1 text-xs text-[#6B7280]">{formatNaira(user.balance)} available</div>
                </>
              ) : (
                <>
                  <div className="font-bold text-[#111827]">Browsing as guest</div>
                  <div className="mt-1 text-xs text-[#6B7280]">Sign in to predict or use wallet features.</div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Navigation Groups */}
        <div className="mt-5 space-y-5">
          <Group title="Account">
            <Item to="/profile" icon={User} label="Profile" subtitle="View and edit your profile" />
            <Item to="/settings" icon={Shield} label="Settings" subtitle="Notifications, privacy, and security" />
            <Item to="/notifications" icon={Info} label="Notifications" subtitle="Your alerts and activity feed" />
          </Group>

          <Group title="Learn">
            <Item to="/about" icon={BookOpen} label="How It Works" subtitle="Understand pooled prediction markets" />
            <Item to="/faq" icon={HelpCircle} label="FAQ" subtitle="Common questions and answers" />
          </Group>

          <Group title="Legal">
            <Item to="/terms" icon={FileText} label="Terms of Service" subtitle="Platform rules and participation terms" />
            <Item to="/privacy" icon={Shield} label="Privacy Policy" subtitle="How your data is collected and used" />
            <Item to="/responsible-use" icon={ShieldAlert} label="Risk Disclaimer" subtitle="Important risk information" />
          </Group>

          <Group title="Support">
            <Item to="/support" icon={MessageSquare} label="Contact Us" subtitle="Reach out for account or platform help" />
          </Group>

          {(isAdmin() || isSuperAdmin()) && (
            <Group title="Internal">
              <Item to={adminPath} icon={ShieldCheck} label="Admin Panel" subtitle="Market operations and finance queues" />
            </Group>
          )}
        </div>

        {/* Logout */}
        {user && (
          <>
            <button
              onClick={() => setShowLogoutDialog(true)}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 text-sm font-bold text-red-600 transition hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out of Flippe?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be signed out and redirected to the login page.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-red-600 text-white hover:bg-red-700">
                    Log out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {/* Version */}
        <p className="mt-6 pb-4 text-center text-xs text-[#9CA3AF]">FLIPPE {APP_VERSION}</p>
      </main>
      <MobileNav />
    </div>
  );
}

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="mb-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">{title}</h2>
    <nav role="navigation" aria-label={title} className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
      {children}
    </nav>
  </section>
);

const Item = ({
  to,
  icon: Icon,
  label,
  subtitle,
}: {
  to: string;
  icon: any;
  label: string;
  subtitle: string;
}) => (
  <Link
    to={to}
    className="group flex items-center gap-3 border-b border-[#E5E7EB] px-4 py-3.5 transition last:border-b-0 hover:bg-[#F3F4F6]"
  >
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-bold text-[#111827]">{label}</div>
      <div className="mt-0.5 text-xs text-[#6B7280]">{subtitle}</div>
    </div>
    <ChevronRight className="h-4 w-4 shrink-0 text-[#D1D5DB] transition group-hover:translate-x-0.5 group-hover:text-[#111827]" />
  </Link>
);
