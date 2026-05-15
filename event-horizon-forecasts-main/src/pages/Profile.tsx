import { useState } from "react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Lock, Bell, Globe, Shield } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-20 text-center">
          <h2 className="text-2xl font-bold mb-3">Sign in to view your profile</h2>
          <p className="text-muted-foreground">Manage your account settings.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const handleSave = () => {
    // Show coming soon toast
    toast("Coming soon", {
      description: "Profile editing is currently in development",
    });
    setEditing(false);
  };

  const settings = [
    {
      icon: Bell,
      title: "Notifications",
      description: "Manage your notification preferences",
      action: "Configure",
    },
    {
      icon: Globe,
      title: "Language & Region",
      description: "English (Nigeria)",
      action: "Change",
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Manage your privacy settings",
      action: "Manage",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />
      <main className="flex-1 container py-10 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Profile</h1>
          <p className="text-graphite mt-1 text-sm">Manage your account settings</p>
        </div>

        {/* Profile Info */}
        <div className="bg-off-white rounded-2xl p-6 shadow-card border border-graphite/10 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple to-purple/70 text-white grid place-items-center text-2xl font-bold shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-lg text-charcoal">{user.name}</h2>
              <p className="text-sm text-graphite">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-graphite uppercase tracking-wide mb-2 block">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-graphite" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!editing}
                  className="pl-9 h-11 rounded-xl border-graphite/20 focus:border-2 focus:border-purple transition-fast"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-graphite uppercase tracking-wide mb-2 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-graphite" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!editing}
                  className="pl-9 h-11 rounded-xl border-graphite/20 focus:border-2 focus:border-purple transition-fast"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editing ? (
                <>
                  <Button onClick={handleSave} className="flex-1 h-11 rounded-xl font-semibold bg-purple hover:bg-purple/90 transition-fast hover:scale-[1.02] active:scale-[0.98]">
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => setEditing(false)}
                    variant="outline"
                    className="flex-1 h-11 rounded-xl font-semibold border-graphite/20 text-charcoal hover:bg-graphite/5 transition-fast"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setEditing(true)}
                  variant="outline"
                  className="w-full h-11 rounded-xl font-semibold border-graphite/20 text-charcoal hover:bg-graphite/5 transition-fast"
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-off-white rounded-2xl p-6 shadow-card border border-graphite/10 mb-6">
          <h3 className="font-bold mb-4 text-charcoal">Security</h3>
          <button 
            onClick={() => {
              toast("Coming soon", {
                description: "Password change feature is currently in development",
              });
            }}
            className="flex items-center justify-between w-full p-4 rounded-xl hover:bg-graphite/5 transition-fast text-left border border-graphite/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple/10 text-purple grid place-items-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-charcoal">Change Password</div>
                <div className="text-xs text-graphite">Update your password</div>
              </div>
            </div>
            <span className="text-sm text-purple font-semibold">Change</span>
          </button>
        </div>

        {/* Settings */}
        <div className="bg-off-white rounded-2xl p-6 shadow-card border border-graphite/10 mb-6">
          <h3 className="font-bold mb-4 text-charcoal">Settings</h3>
          <ul className="space-y-2">
            {settings.map((setting) => (
              <li key={setting.title}>
                <button 
                  onClick={() => {
                    toast("Coming soon", {
                      description: `${setting.title} feature is currently in development`,
                    });
                  }}
                  className="flex items-center justify-between w-full p-4 rounded-xl hover:bg-graphite/5 transition-fast text-left border border-graphite/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-graphite/10 grid place-items-center">
                      <setting.icon className="w-5 h-5 text-graphite" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-charcoal">{setting.title}</div>
                      <div className="text-xs text-graphite">{setting.description}</div>
                    </div>
                  </div>
                  <span className="text-sm text-purple font-semibold">{setting.action}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Danger Zone */}
        <div className="bg-off-white rounded-2xl p-6 shadow-card border border-coral/20">
          <h3 className="font-bold text-coral mb-4">Danger Zone</h3>
          <Button
            onClick={logout}
            variant="outline"
            className="w-full h-11 rounded-xl font-semibold border-coral text-coral hover:bg-coral hover:text-white transition-fast"
          >
            Log Out
          </Button>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
