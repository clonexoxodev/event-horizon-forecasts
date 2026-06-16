import { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { FlippeLoader, FlippeWordmark } from "@/components/FlippeBrand";

type AuthLayoutProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  benefits?: string[];
};

export const AuthLayout = ({
  children,
  eyebrow = "Real-world prediction markets",
  title = "Predict real-world events.",
  benefits = ["Build your forecasting record", "Track your streak and score", "Follow markets as they move"],
}: AuthLayoutProps) => (
  <div className="app-bg relative min-h-screen overflow-hidden text-white">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(18,184,134,0.24),transparent_24rem)]" />
    <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-emerald-200/18 to-transparent" />
    <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
    <div className="pointer-events-none absolute -right-24 bottom-12 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

    <main className="relative z-10 grid min-h-screen items-center gap-12 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:px-14">
      <section className="hidden min-h-[680px] flex-col justify-between rounded-[2rem] border border-white/10 bg-[#101720]/44 p-12 shadow-[0_32px_100px_rgba(0,0,0,0.38)] lg:flex">
        <FlippeWordmark size="lg" tagline={eyebrow} />

        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 scale-150 rounded-full bg-[#12B886]/16 blur-3xl" />
            <FlippeLoader label="Many possibilities. One reality." />
          </div>
          <div className="mt-12 max-w-xl">
            <h1 className="text-5xl font-black leading-tight tracking-tight text-white">{title}</h1>
            <p className="mt-4 text-lg font-semibold text-[#8B98A8]">
              Choose a market, pick YES or NO, and follow how the crowd moves before resolution.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <CheckCircle2 className="mb-3 h-5 w-5 text-[#12B886]" />
              <p className="text-sm font-bold text-white">{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
        <div className="mb-10 flex lg:hidden">
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 scale-125 rounded-full bg-[#12B886]/16 blur-2xl" />
            <FlippeWordmark size="xl" tagline="Many possibilities. One reality." />
          </div>
        </div>
        {children}
      </section>
    </main>
  </div>
);
