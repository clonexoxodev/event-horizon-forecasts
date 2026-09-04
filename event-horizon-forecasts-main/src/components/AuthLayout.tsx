import { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { FlippeSymbol, FlippeWordmark } from "@/components/FlippeBrand";

type AuthLayoutProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  benefits?: string[];
};

export const AuthLayout = ({
  children,
  eyebrow = "Real-world prediction pools",
  title = "Predict real-world events.",
  benefits = ["Build your forecasting record", "Track your streak and score", "Follow markets as they move"],
}: AuthLayoutProps) => (
  <div className="app-bg relative min-h-screen overflow-hidden text-[#101828]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(79,70,229,0.16),transparent_24rem)]" />
    <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[#4F46E5]/18 to-transparent" />
    <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#4F46E5]/10 blur-3xl" />
    <div className="pointer-events-none absolute -right-24 bottom-12 h-72 w-72 rounded-full bg-white/70 blur-3xl" />

    <main className="relative z-10 grid min-h-screen items-center gap-12 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:px-14">
      <section className="hidden min-h-[680px] flex-col justify-between rounded-[2rem] border border-[#E5E7EB] bg-white/82 p-12 shadow-[0_32px_100px_rgba(16,24,40,0.10)] backdrop-blur lg:flex">
        <FlippeWordmark size="lg" tagline={eyebrow} />

        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 scale-150 rounded-full bg-[#4F46E5]/16 blur-3xl" />
            <FlippeSymbol size="hero" className="relative z-10" />
            <p className="mt-5 text-sm font-semibold text-[#667085]">Many possibilities. One reality.</p>
          </div>
          <div className="mt-12 max-w-xl">
            <h1 className="text-5xl font-black leading-tight tracking-tight text-[#101828]">{title}</h1>
            <p className="mt-4 text-lg font-semibold text-[#667085]">
              Choose a market, pick YES or NO, and follow how the crowd moves before resolution.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <CheckCircle2 className="mb-3 h-5 w-5 text-[#4F46E5]" />
              <p className="text-sm font-bold text-[#101828]">{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
        <div className="mb-10 flex lg:hidden">
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 scale-125 rounded-full bg-[#4F46E5]/16 blur-2xl" />
            <FlippeWordmark size="xl" tagline="Many possibilities. One reality." />
          </div>
        </div>
        {children}
      </section>
    </main>
  </div>
);
