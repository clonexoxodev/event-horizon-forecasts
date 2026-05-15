import { Link, useNavigate } from "react-router-dom";
import { Twitter, Linkedin, Send, Zap } from "lucide-react";
import { toast } from "sonner";

const sections = [
  {
    title: "Product",
    links: [
      { name: "About", path: "/about", comingSoon: true },
      { name: "How It Works", path: "/how-it-works", comingSoon: true },
      { name: "Markets", path: "/" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "FAQ", path: "/faq", comingSoon: true },
      { name: "Help Center", path: "/help-center", comingSoon: true },
      { name: "Contact", path: "/contact", comingSoon: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Terms of Service", path: "/terms", comingSoon: true },
      { name: "Privacy Policy", path: "/privacy", comingSoon: true },
      { name: "Risk Disclaimer", path: "/risk-disclaimer", comingSoon: true },
    ],
  },
];

export const Footer = () => {
  const navigate = useNavigate();

  const handleLinkClick = (e: React.MouseEvent, link: { name: string; path: string; comingSoon?: boolean }) => {
    if (link.comingSoon) {
      e.preventDefault();
      toast("Coming soon", {
        description: `${link.name} page is currently in development`,
      });
    } else {
      navigate(link.path);
    }
  };

  const handleSocialClick = (platform: string) => {
    toast("Coming soon", {
      description: `Follow us on ${platform} - link coming soon`,
    });
  };

  return (
    <footer className="border-t border-border/60 bg-off-white/50 mt-20">
      <div className="container max-w-[1280px] mx-auto py-14 px-6 grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2 max-w-xs">
          <Link to="/" className="font-bold text-lg tracking-tight flex items-center gap-1 text-charcoal">
            Flippe<span className="text-purple">.</span>
          </Link>
          <p className="text-sm text-graphite mt-3 leading-relaxed">
            A simple, transparent platform for forecasting real-world outcomes and earning from accuracy.
          </p>
          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={() => handleSocialClick("Twitter")}
              className="w-8 h-8 rounded-xl border border-border grid place-items-center text-graphite hover:text-charcoal hover:border-charcoal/30 hover:bg-graphite/8 transition-fast"
            >
              <Twitter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSocialClick("LinkedIn")}
              className="w-8 h-8 rounded-xl border border-border grid place-items-center text-graphite hover:text-charcoal hover:border-charcoal/30 hover:bg-graphite/8 transition-fast"
            >
              <Linkedin className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSocialClick("Telegram")}
              className="w-8 h-8 rounded-xl border border-border grid place-items-center text-graphite hover:text-charcoal hover:border-charcoal/30 hover:bg-graphite/8 transition-fast"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live indicator */}
          <div className="mt-5 inline-flex items-center gap-2 text-xs text-graphite">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>

        {sections.map(s => (
          <div key={s.title}>
            <h4 className="text-tiny font-bold uppercase tracking-wide text-charcoal mb-4">
              {s.title}
            </h4>
            <ul className="space-y-2.5">
              {s.links.map(l => (
                <li key={l.name}>
                  <button
                    onClick={(e) => handleLinkClick(e, l)}
                    className="text-sm text-graphite hover:text-charcoal transition-fast text-left"
                  >
                    {l.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border/60">
        <div className="container max-w-[1280px] mx-auto px-6 py-5 flex flex-col sm:flex-row gap-2 justify-between text-xs text-graphite">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-purple" />
            © 2026 Flippe Technologies Ltd. All rights reserved.
          </span>
          <span>Participation involves risk. Only use funds you can afford to lose.</span>
        </div>
      </div>
    </footer>
  );
};
