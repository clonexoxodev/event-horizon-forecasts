import { Bell, Eye, Lock, LogOut, User } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";

export default function Settings() {
  const { logout } = useAuth();

  return (
    <div className="app-bg min-h-screen pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8B98A8]">Settings</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Account controls</h1>
        <section className="mt-6 overflow-hidden rounded-2xl border border-[#263241] bg-[#101720]">
          <SettingRow icon={User} title="Profile" body="Edit your display name, username, and bio." />
          <SettingRow icon={Bell} title="Notifications" body="Control market, wallet, and discussion alerts." />
          <SettingRow icon={Eye} title="Privacy" body="Choose what earnings and activity appear publicly." />
          <SettingRow icon={Lock} title="Security" body="Manage password and account protection." />
        </section>
        <button
          onClick={logout}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl border border-red-400/30 bg-red-400/10 text-sm font-black text-red-200 transition hover:bg-red-400/20"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </button>
      </main>
      <MobileNav />
    </div>
  );
}

const SettingRow = ({ icon: Icon, title, body }: { icon: any; title: string; body: string }) => (
  <div className="flex items-center gap-4 border-b border-[#263241] p-4 last:border-b-0">
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#263241] bg-[#151E28] text-[#12B886]">
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <div className="font-black text-white">{title}</div>
      <div className="mt-1 text-sm text-[#8B98A8]">{body}</div>
    </div>
  </div>
);
