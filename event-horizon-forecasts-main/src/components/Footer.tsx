import { Link } from "react-router-dom";
import { ShieldCheck, Zap } from "lucide-react";

const links = [
  { name: "About", path: "/about" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "Terms", path: "/terms" },
  { name: "Privacy", path: "/privacy" },
  { name: "Contact", path: "/contact" },
  { name: "Responsible Use", path: "/responsible-use" },
];

export const Footer = () => {
  return (
    <footer className="mt-16 hidden border-t border-white/10 bg-[#070a14] text-white md:block">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-md">
          <Link to="/" className="flex items-center gap-2 text-xl font-black">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-500/20 text-violet-200">F</span>
            Flippe
          </Link>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Predict real-world outcomes with simple markets, clear wallet history, and safer controls.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-3">
          {links.map((link) => (
            <Link key={link.path} to={link.path} className="text-sm font-bold text-slate-400 transition hover:text-white">
              {link.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-6 py-5 text-xs text-slate-500 lg:flex-row lg:items-center lg:justify-between">
          <span className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-violet-300" />
            © 2026 Flippe Technologies Ltd. All rights reserved.
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            Use only money you can afford to lose.
          </span>
        </div>
      </div>
    </footer>
  );
};
