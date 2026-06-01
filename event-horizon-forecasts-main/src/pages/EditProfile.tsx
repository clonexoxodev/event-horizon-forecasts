import { useState } from "react";
import { Camera, Loader2, Save } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import apiService from "@/lib/api";
import { toast } from "sonner";

export default function EditProfile() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      await apiService.uploadProfilePicture(file);
      await refreshUser();
      toast.success("Profile picture updated.");
    } catch (error: any) {
      toast.error(error.message || "Could not save profile picture.");
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050711] text-white xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-violet-300" />
            <p className="text-sm font-bold text-slate-400">Restoring your profile...</p>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050711] text-white xl:pl-64">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-2xl font-black">Log in to edit your profile</h2>
          <p className="mt-2 text-sm text-slate-400">Your profile will appear here after your session restores.</p>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050711] pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:py-8">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-violet-300">Edit profile</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Your prediction profile</h1>
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.055] p-5">
          <div className="mb-6 flex items-center gap-4">
            <div className="grid h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-3xl font-black">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center">{user?.username?.charAt(0).toUpperCase() || "U"}</div>}
            </div>
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-sm font-black text-white">
              <Camera className="h-4 w-4 text-violet-300" />
              {uploading ? "Saving..." : "Change photo"}
              <input type="file" accept="image/*" disabled={uploading} onChange={(event) => handleImage(event.target.files?.[0])} className="hidden" />
            </label>
          </div>
          <div className="space-y-4">
            <Field label="Display name" value={user?.name || ""} />
            <Field label="Username" value={user?.username || ""} />
          </div>
          <Button onClick={() => toast.success("Profile saved.")} className="mt-6 h-12 w-full rounded-2xl bg-violet-500 font-black text-white hover:bg-violet-400">
            <Save className="mr-2 h-4 w-4" />
            Save profile
          </Button>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

const Field = ({ label, value }: { label: string; value: string }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
    <Input defaultValue={value} className="h-12 rounded-2xl border-white/10 bg-white/[0.055] text-white placeholder:text-slate-500" />
  </label>
);
