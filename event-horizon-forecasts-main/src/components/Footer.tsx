import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { FlippeWordmark } from "@/components/FlippeBrand";

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
    <footer role="contentinfo" className="mt-20 hidden border-t border-[#E5E7EB]/60 bg-white text-[#101828] md:block">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm">
          <Link to="/" className="flex items-center gap-2 text-xl font-black">
            <FlippeWordmark tagline="Predict real-world outcomes" />
          </Link>
          <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">
            Predict on real-world outcomes with transparent markets and clear history.
          </p>
        </div>

        <h2 className="sr-only">Footer links</h2>
        <nav className="flex flex-wrap gap-x-5 gap-y-2.5" aria-label="Footer navigation">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="text-[13px] font-bold text-[#9CA3AF] transition-all duration-200 hover:text-[#4F46E5]"
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-[#E5E7EB]/40">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-6 py-4 text-[11px] text-[#D1D5DB] lg:flex-row lg:items-center lg:justify-between">
          <span>© 2026 Flippe Technologies Ltd. All rights reserved.</span>
          <span className="flex items-center gap-1.5 text-[#D1D5DB]">
            <ShieldCheck className="h-3 w-3" />
            Use only money you can afford to lose.
          </span>
        </div>
      </div>
    </footer>
  );
};
