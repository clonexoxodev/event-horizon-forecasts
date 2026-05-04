import { Link } from "react-router-dom";
import { Twitter, Linkedin, Send, Zap } from "lucide-react";

const sections = [
  {
    title: "Product",
    links: ["Markets", "How It Works", "Leaderboard", "Pricing"],
  },
  {
    title: "Support",
    links: ["Help Center", "FAQs", "Contact Support"],
  },
  {
    title: "Legal",
    links: ["Terms of Service", "Privacy Policy", "Risk Disclaimer"],
  },
];

export const Footer = () => (
  <footer className="border-t border-border/60 bg-card/50 mt-20">
    <div className="container py-14 grid grid-cols-2 md:grid-cols-5 gap-10">
      <div className="col-span-2 max-w-xs">
        <Link to="/" className="font-bold text-lg tracking-tight flex items-center gap-1">
          Flippe<span className="text-primary">.</span>
        </Link>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          A simple, transparent platform for forecasting real-world outcomes and earning from accuracy.
        </p>
        <div className="flex items-center gap-2 mt-5">
          {[Twitter, Linkedin, Send].map((Icon, i) => (
            <a
              key={i}
              href="#"
              className="w-8 h-8 rounded-xl border border-border grid place-items-center text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-secondary transition-smooth"
            >
              <Icon className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>

        {/* Live indicator */}
        <div className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
            All systems operational
          </span>
        </div>
      </div>

      {sections.map(s => (
        <div key={s.title}>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
            {s.title}
          </h4>
          <ul className="space-y-2.5">
            {s.links.map(l => (
              <li key={l}>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    <div className="border-t border-border/60">
      <div className="container py-5 flex flex-col sm:flex-row gap-2 justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-primary" />
          © 2026 Flippe Technologies Ltd. All rights reserved.
        </span>
        <span>Participation involves risk. Only use funds you can afford to lose.</span>
      </div>
    </div>
  </footer>
);
