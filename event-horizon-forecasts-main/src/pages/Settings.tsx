import { useEffect, useState } from "react";
import { Bell, Eye, Lock, LogOut, Shield, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";

const SETTINGS_KEY = "flippe_local_preferences";

type Preferences = {
  marketUpdates: boolean;
  walletAlerts: boolean;
  resolutionAlerts: boolean;
  publicActivity: boolean;
  publicEarnings: boolean;
};

const defaultPreferences: Preferences = {
  marketUpdates: true,
  walletAlerts: true,
  resolutionAlerts: true,
  publicActivity: false,
  publicEarnings: false,
};

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SETTINGS_KEY);
      if (saved) setPreferences({ ...defaultPreferences, ...JSON.parse(saved) });
    } catch {
      setPreferences(defaultPreferences);
    }
  }, []);

  const updatePreference = (key: keyof Preferences, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    toast.success("Preference saved on this device.");
  };

  const handleSignOut = async () => {
    if (!window.confirm("Sign out of Flippe?")) return;
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#4F46E5]">Settings</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Account controls</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#667085]">Keep preferences clear and safe for Flippe V1.</p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Panel icon={User} title="Account">
            <InfoRow label="Username" value={user?.username || "Guest"} />
            <InfoRow label="Email" value={user?.email || "Not signed in"} />
            <p className="rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] p-4 text-sm text-[#667085]">
              Public profile editing is paused for V1. Your username is still used for wallet, My Predictions, and admin records.
            </p>
          </Panel>

          <Panel icon={Bell} title="Notifications">
            <Toggle label="Market updates" body="New prices, market status changes, and activity reminders." checked={preferences.marketUpdates} onChange={(value) => updatePreference("marketUpdates", value)} />
            <Toggle label="Wallet alerts" body="Deposit, withdrawal, stake, refund, and payout updates." checked={preferences.walletAlerts} onChange={(value) => updatePreference("walletAlerts", value)} />
            <Toggle label="Resolution alerts" body="Market ended, pending resolution, resolved, or cancelled." checked={preferences.resolutionAlerts} onChange={(value) => updatePreference("resolutionAlerts", value)} />
          </Panel>

          <Panel icon={Eye} title="Privacy">
            <Toggle label="Show activity publicly" body="Default is off while public profiles are paused." checked={preferences.publicActivity} onChange={(value) => updatePreference("publicActivity", value)} />
            <Toggle label="Show winnings publicly" body="Default is off. Only resolved results should ever be shown publicly." checked={preferences.publicEarnings} onChange={(value) => updatePreference("publicEarnings", value)} />
          </Panel>

          <Panel icon={Lock} title="Security">
            <button
              onClick={handleSignOut}
              className="flex h-12 w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-sm font-black text-red-700 transition hover:bg-red-100"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </button>
          </Panel>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

const Panel = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
    <div className="mb-4 flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] text-[#4F46E5]">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-black">{title}</h2>
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] p-4">
    <div className="text-xs font-black uppercase tracking-[0.16em] text-[#667085]">{label}</div>
    <div className="mt-1 break-words font-black text-[#101828]">{value}</div>
  </div>
);

const Toggle = ({ label, body, checked, onChange }: { label: string; body: string; checked: boolean; onChange: (value: boolean) => void }) => (
  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] p-4">
    <span>
      <span className="block font-black text-[#101828]">{label}</span>
      <span className="mt-1 block text-sm text-[#667085]">{body}</span>
    </span>
    <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-[#4F46E5]" : "bg-[#334155]"}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="sr-only" />
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
    </span>
  </label>
);
