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
    <div className="app-bg min-h-screen pb-24 text-flippe-text md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 lg:py-8">
        {/* ── User Card ── */}
        <section className="surface rounded-3xl p-5">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-flippe-border bg-flippe-accent/10 text-lg font-black text-flippe-accent shadow-sm">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                user?.username?.charAt(0).toUpperCase() || "?"
              )}
            </div>
            <div className="min-w-0 flex-1">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-flippe-accent" />
              ) : user ? (
                <>
                  <div className="text-sm font-black text-flippe-text">
                    {user.name || user.username}
                  </div>
                  <div className="text-xs text-flippe-muted">
                    @{user.username}
                  </div>
                  <div className="mt-1 text-xs font-bold text-flippe-accent">
                    {formatNaira(user.balance)} available
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-black text-flippe-text">
                    Guest
                  </div>
                  <div className="text-xs text-flippe-muted">
                    Sign in to start arguing
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Navigation Groups ── */}
        <div className="mt-4 space-y-4">
          <Group title="Account">
            <Item
              to="/profile"
              icon={User}
              label="Profile"
              subtitle="View and edit your profile"
            />
            <Item
              to="/settings"
              icon={Shield}
              label="Settings"
              subtitle="Notifications, privacy, and security"
            />
            <Item
              to="/notifications"
              icon={Info}
              label="Notifications"
              subtitle="Your alerts and activity feed"
            />
          </Group>

          <Group title="Learn">
            <Item
              to="/how-it-works"
              icon={BookOpen}
              label="How It Works"
              subtitle="How arguments are settled"
            />
            <Item
              to="/faq"
              icon={HelpCircle}
              label="FAQ"
              subtitle="Common questions and answers"
            />
          </Group>

          <Group title="Support">
            <Item
              to="/support"
              icon={MessageSquare}
              label="Help Center"
              subtitle="Reach out for account or platform help"
            />
          </Group>

          <Group title="Legal">
            <Item
              to="/terms"
              icon={FileText}
              label="Terms of Service"
              subtitle="Platform rules and participation terms"
            />
            <Item
              to="/privacy"
              icon={Shield}
              label="Privacy Policy"
              subtitle="How your data is collected and used"
            />
            <Item
              to="/responsible-use"
              icon={ShieldAlert}
              label="Responsible Use"
              subtitle="Important risk information"
            />
          </Group>

          {(isAdmin() || isSuperAdmin()) && (
            <Group title="Internal">
              <Item
                to={adminPath}
                icon={ShieldCheck}
                label="Admin Panel"
                subtitle="Market operations and finance queues"
              />
            </Group>
          )}
        </div>

        {/* ── Logout ── */}
        {user && (
          <>
            <button
              onClick={() => setShowLogoutDialog(true)}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-coral/30 bg-coral/10 text-sm font-bold text-coral transition hover:bg-coral/15"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
            <AlertDialog
              open={showLogoutDialog}
              onOpenChange={setShowLogoutDialog}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out of FLIPPE?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be signed out and redirected to the login page.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Log out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {/* ── Version ── */}
        <p className="mt-6 pb-4 text-center text-[10px] font-bold uppercase tracking-widest text-flippe-muted">
          FLIPPE {APP_VERSION}
        </p>
      </main>
      <MobileNav />
    </div>
  );
}

const Group = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section>
    <h2 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
      {title}
    </h2>
    <nav
      role="navigation"
      aria-label={title}
      className="overflow-hidden rounded-2xl border border-flippe-border bg-flippe-surface"
    >
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
    className="group flex items-center gap-3 border-b border-flippe-border px-4 py-3.5 transition last:border-b-0 hover:bg-flippe-surface-2"
  >
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-flippe-surface-2 text-flippe-muted transition-colors group-hover:bg-flippe-accent/10 group-hover:text-flippe-accent">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-bold text-flippe-text">{label}</div>
      <div className="text-[11px] text-flippe-muted">{subtitle}</div>
    </div>
    <ChevronRight className="h-4 w-4 shrink-0 text-flippe-border transition group-hover:translate-x-0.5 group-hover:text-flippe-muted" />
  </Link>
);
