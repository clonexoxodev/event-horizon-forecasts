import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";

const stats = [
  { icon: Users,     value: "50K+",   label: "Forecasters" },
  { icon: TrendingUp, value: "₦3.4M+", label: "Total pool" },
  { icon: Sparkles,  value: "1,200+", label: "Resolved" },
];

export const Hero = () => {
  const { setAuthOpen } = useAuth();

  return (
    <section className="bg-gradient-soft border-b border-border/60 overflow-hidden relative">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-primary/6 blur-3xl" />

      <div className="container relative py-16 md:py-24 text-center max-w-3xl">
        {/* Badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border shadow-card text-xs font-semibold text-muted-foreground mb-7">
          <Zap className="w-3.5 h-3.5 text-primary fill-primary" />
          Live markets · Real payouts · No jargon
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up delay-100 text-4xl md:text-[3.5rem] font-extrabold tracking-tight leading-[1.08]">
          Forecast real-world events.
          <br />
          <span className="text-gradient">Earn from accuracy.</span>
        </h1>

        {/* Sub */}
        <p className="animate-fade-up delay-200 mt-5 text-base md:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Take positions on events you understand and get rewarded when you're right.
          Clear questions, transparent odds, instant payouts.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up delay-300 mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            className="bg-gradient-hero hover:opacity-90 transition-smooth shadow-md font-semibold text-base h-12 px-7 rounded-xl"
            onClick={() => setAuthOpen(true)}
          >
            Start Forecasting <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="bg-card hover:bg-secondary border-border font-semibold text-base h-12 px-7 rounded-xl"
            onClick={() => document.getElementById("markets")?.scrollIntoView({ behavior: "smooth" })}
          >
            Browse Markets
          </Button>
        </div>

        {/* Stats */}
        <div className="animate-fade-up delay-300 mt-14 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-14">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2 text-2xl font-extrabold">
                <span className="w-8 h-8 rounded-xl bg-primary/10 grid place-items-center">
                  <Icon className="w-4 h-4 text-primary" />
                </span>
                {value}
              </div>
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
