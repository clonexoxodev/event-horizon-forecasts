import { Link } from "react-router-dom";
import { TrendingUp, ShieldCheck, Users } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden border-b border-[#E5E7EB] bg-gradient-to-b from-[#F8F7F4] to-white">
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#12B886]/8 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-[#4F46E5]/6 blur-3xl" aria-hidden="true" />

      <div className="container relative mx-auto max-w-5xl px-4 py-16 text-center md:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#667085]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#12B886]" />
          Prediction markets for Africa
        </span>
        <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-[#101828] sm:text-5xl md:text-6xl">
          Trade opinions on the future.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-[#475467] sm:text-lg">
          FLIPPE turns real-world questions into markets you can back with confidence. Pick a side, stake your view, and earn when you're right. Every market is refund-protected until it goes live.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/markets"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-[#12B886] px-6 text-sm font-black text-[#06100d] shadow-sm transition hover:bg-[#2dd4a0] hover:shadow-md active:scale-[0.98]"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Explore markets
          </Link>
          <Link
            to="/how-it-works"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-6 text-sm font-black text-[#344054] transition hover:bg-[#F3F4F6] active:scale-[0.98]"
          >
            How it works
          </Link>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Refund Protected" body="Stakes return automatically if a market never goes live." />
          <Feature icon={<TrendingUp className="h-5 w-5" />} title="Live prices" body="Crowd View moves with every prediction, in real time." />
          <Feature icon={<Users className="h-5 w-5" />} title="Community intelligence" body="See where others stand before you back a side." />
        </div>
      </div>
    </section>
  );
};

const Feature = ({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) => (
  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 text-left shadow-sm">
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F3F4F6] text-[#12B886]">{icon}</div>
    <h3 className="mt-3 text-sm font-black text-[#101828]">{title}</h3>
    <p className="mt-1 text-xs font-medium leading-5 text-[#667085]">{body}</p>
  </div>
);
