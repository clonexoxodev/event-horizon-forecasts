import { useEffect, useState } from "react";
import {
  Bell,
  ChevronRight,
  ExternalLink,
  Info,
  Lock,
  Mail,
  Shield,
  User,
} from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";

const SETTINGS_KEY = "flippe_local_preferences";

type Preferences = {
  pushNotifications: boolean;
  marketUpdates: boolean;
  walletAlerts: boolean;
  resolutionAlerts: boolean;
  emailNotifications: boolean;
};

const defaultPreferences: Preferences = {
  pushNotifications: true,
  marketUpdates: true,
  walletAlerts: true,
  resolutionAlerts: true,
  emailNotifications: false,
};

export default function Settings() {
  const { user } = useAuth();
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SETTINGS_KEY);
      if (saved)
        setPreferences({ ...defaultPreferences, ...JSON.parse(saved) });
    } catch {
      setPreferences(defaultPreferences);
    }
  }, []);

  const updatePreference = (key: keyof Preferences, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Manage your account, preferences, and security.
          </p>
        </div>

        <div className="space-y-4">
          {/* ── Account ── */}
          <Card>
            <CardHeader icon={User} title="Account" />
            <div className="space-y-2">
              <InfoRow
                icon={Mail}
                label="Email"
                value={user?.email || "Not signed in"}
              />
              <InfoRow
                icon={User}
                label="Username"
                value={`@${user?.username || "guest"}`}
              />
              <InfoRow
                icon={User}
                label="Display name"
                value={user?.name || user?.username || "Guest"}
              />
            </div>
          </Card>

          {/* ── Security ── */}
          <Card>
            <CardHeader icon={Lock} title="Security" />
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 opacity-50 cursor-not-allowed">
                <Lock className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#111827]">
                    Change password
                  </div>
                  <div className="mt-0.5 text-xs text-[#9CA3AF]">
                    Coming soon
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 opacity-50 cursor-not-allowed">
                <Shield className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#111827]">
                    Two-factor authentication
                  </div>
                  <div className="mt-0.5 text-xs text-[#9CA3AF]">
                    Coming soon
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Notifications ── */}
          <Card>
            <CardHeader icon={Bell} title="Notifications" />
            <div className="space-y-2">
              <Toggle
                label="Push notifications"
                description="Receive push notifications on this device."
                checked={preferences.pushNotifications}
                onChange={(value) =>
                  updatePreference("pushNotifications", value)
                }
              />
              <Toggle
                label="Market updates"
                description="New prices, market status changes, and activity reminders."
                checked={preferences.marketUpdates}
                onChange={(value) =>
                  updatePreference("marketUpdates", value)
                }
              />
              <Toggle
                label="Wallet alerts"
                description="Deposit, withdrawal, and payout updates."
                checked={preferences.walletAlerts}
                onChange={(value) =>
                  updatePreference("walletAlerts", value)
                }
              />
              <Toggle
                label="Resolution alerts"
                description="Market ended, pending resolution, resolved, or cancelled."
                checked={preferences.resolutionAlerts}
                onChange={(value) =>
                  updatePreference("resolutionAlerts", value)
                }
              />
              <Toggle
                label="Email notifications"
                description="Receive summary emails about your account activity."
                checked={preferences.emailNotifications}
                onChange={(value) =>
                  updatePreference("emailNotifications", value)
                }
              />
            </div>
          </Card>

          {/* ── About ── */}
          <Card>
            <CardHeader icon={Info} title="About" />
            <div className="space-y-2">
              <InfoRow icon={Info} label="App version" value="Flippe v1.0.0" />
              <LinkRow
                icon={ExternalLink}
                label="Terms of service"
                description="Platform rules and market participation terms."
                href="/terms"
              />
              <LinkRow
                icon={ExternalLink}
                label="Privacy policy"
                description="How your account, wallet, and market data are handled."
                href="/privacy"
              />
              <LinkRow
                icon={ExternalLink}
                label="Risk disclaimer"
                description="Important information about prediction pool risks."
                href="/responsible-use"
              />
            </div>
          </Card>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
    {children}
  </section>
);

const CardHeader = ({
  icon: Icon,
  title,
}: {
  icon: any;
  title: string;
}) => (
  <div className="mb-4 flex items-center gap-3">
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
      <Icon className="h-4 w-4" />
    </div>
    <h2 className="text-lg font-bold">{title}</h2>
  </div>
);

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
    <Icon className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
    <div className="min-w-0 flex-1">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold text-[#111827]">
        {value}
      </div>
    </div>
  </div>
);

const Toggle = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => (
  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 transition hover:bg-[#F3F4F6]">
    <div className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-[#111827]">
        {label}
      </span>
      <span className="mt-0.5 block text-xs text-[#9CA3AF]">
        {description}
      </span>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
        checked ? "bg-[#4F46E5]" : "bg-[#D1D5DB]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        } mt-0.5`}
      />
    </button>
  </label>
);

const LinkRow = ({
  icon: Icon,
  label,
  description,
  onClick,
  href,
}: {
  icon: any;
  label: string;
  description: string;
  onClick?: () => void;
  href?: string;
}) => {
  const content = (
    <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 transition hover:bg-[#F3F4F6]">
      <Icon className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[#111827]">{label}</div>
        <div className="mt-0.5 text-xs text-[#9CA3AF]">{description}</div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#D1D5DB]" />
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
};
