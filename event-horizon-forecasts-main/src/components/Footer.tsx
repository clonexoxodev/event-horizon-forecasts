import { Link } from "react-router-dom";
import { Twitter, Linkedin, Send, Zap } from "lucide-react";

const sections = [
  {
    title: "Product",
    links: ["About", "How It Works", "Markets"],
  },
  {
    title: "Support",
    links: ["Help Center", "Contact"],
  },
  {
    title: "Legal",
    links: ["Terms of Service", "Privacy Policy", "Risk Disclaimer"],
  },
];

export const Footer = () => (
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
          {[Twitter, Linkedin, Send].map((Icon, i) => (
            <a
              key={i}
              href="#"
              className="w-8 h-8 rounded-xl border border-border grid place-items-center text-graphite hover:text-charcoal hover:border-charcoal/30 hover:bg-graphite/8 transition-fast"
            >
              <Icon className="w-3.5 h-3.5" />
            </a>
          ))}
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
              <li key={l}>
                <a href="#" className="text-sm text-graphite hover:text-charcoal transition-fast">
                  {l}
                </a>
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
