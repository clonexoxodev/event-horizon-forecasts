import { useState } from "react";
import { Camera, Save } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function EditProfile() {
  const { user } = useAuth();
  const [avatar, setAvatar] = useState<string>(() => localStorage.getItem("flippe_profile_image") || "");

  const handleImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      setAvatar(value);
      localStorage.setItem("flippe_profile_image", value);
      toast.success("Profile picture updated.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#050711] pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:py-8">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-violet-300">Edit profile</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Your prediction profile</h1>
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.055] p-5">
          <div className="mb-6 flex items-center gap-4">
            <div className="grid h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-3xl font-black">
              {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center">{user?.username?.charAt(0).toUpperCase() || "U"}</div>}
            </div>
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-sm font-black text-white">
              <Camera className="h-4 w-4 text-violet-300" />
              Change photo
              <input type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0])} className="hidden" />
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
