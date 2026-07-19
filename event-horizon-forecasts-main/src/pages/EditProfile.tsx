import { useState } from "react";
import { Camera, Save, Loader as Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import apiService from "@/lib/api";
import { toast } from "sonner";

export default function EditProfile() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || user?.username || "");
  const [username, setUsername] = useState(user?.username || "");

  const handleImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      await apiService.uploadProfilePicture(file);
      await refreshUser();
      toast.success("Profile picture updated.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not save profile picture.";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await apiService.updateProfile({ name, username });
      await refreshUser();
      toast.success("Profile saved.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not save profile.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4">
          <DelayedFlippeLoader active label="Restoring your profile" />
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-2xl font-black">Log in to edit your profile</h2>
          <p className="mt-2 text-sm text-[#667085]">Your profile will appear here after your session restores.</p>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:py-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#667085]">Edit profile</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Your prediction profile</h1>
        <section className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <div className="mb-6 flex items-center gap-4">
            <div className="grid h-20 w-20 overflow-hidden rounded-full border border-[#E5E7EB] bg-[#F3F4F6] text-3xl font-black">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center">{user?.username?.charAt(0).toUpperCase() || "U"}</div>}
            </div>
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] px-4 text-sm font-bold text-[#101828]">
              <Camera className="h-4 w-4 text-[#12B886]" />
              {uploading ? "Saving..." : "Change photo"}
              <input type="file" accept="image/*" disabled={uploading} onChange={(event) => handleImage(event.target.files?.[0])} className="hidden" />
            </label>
          </div>
          <div className="space-y-4">
            <Field label="Display name" value={name} onChange={setName} id="display-name" />
            <Field label="Username" value={username} onChange={setUsername} id="username" />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 h-12 w-full rounded-xl bg-[#12B886] font-black text-[#06100d] hover:bg-[#2dd4a0] disabled:opacity-60"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const Field = ({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
}) => (
  <label htmlFor={id} className="block">
    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#667085]">{label}</span>
    <Input
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-xl border-[#E5E7EB] bg-[#F3F4F6] text-[#101828] placeholder:text-[#9CA3AF]"
    />
  </label>
);
