import { useState } from "react";
import type { ComponentType } from "react";
import { Bitcoin, BriefcaseBusiness, Clapperboard, Globe2, Landmark, LayoutGrid, Mic2, Trophy, TrendingUp, Cpu, LineChart } from "lucide-react";
import { HOME_MARKET_FILTERS, type HomeMarketFilter } from "@/lib/categories";

const categoryIcons: Record<HomeMarketFilter, ComponentType<{ className?: string }>> = {
  Trending: TrendingUp,
  Sports: Trophy,
  Crypto: Bitcoin,
  Politics: Landmark,
  Economy: LineChart,
  Entertainment: Clapperboard,
  Music: Mic2,
  Technology: Cpu,
  Business: BriefcaseBusiness,
  Global: Globe2,
  Other: LayoutGrid,
};

export const CategoryTabs = ({ onChange }: { onChange?: (c: string) => void }) => {
  const [active, setActive] = useState<HomeMarketFilter>("Trending");

  return (
    <div className="border-b border-border/40 bg-card/60 backdrop-premium sticky top-[57px] z-30 shadow-xs">
      <div className="container">
        <div role="tablist" aria-label="Market categories" className="flex items-center gap-1 overflow-x-auto scrollbar-thin py-1 px-1">
          {HOME_MARKET_FILTERS.map((label) => {
            const Icon = categoryIcons[label] || LayoutGrid;
            const isActive = active === label;
            return (
              <button
                key={label}
                role="tab"
                aria-selected={isActive}
                onClick={() => { setActive(label); onChange?.(label); }}
                className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-all duration-280 rounded-lg ${
                  isActive
                    ? "text-purple bg-purple/8"
                    : "text-graphite hover:text-charcoal hover:bg-graphite/5"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 transition-transform duration-280 ${
                  isActive ? "text-purple scale-110" : ""
                }`} />
                <span className="tracking-tight">{label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-purple rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
