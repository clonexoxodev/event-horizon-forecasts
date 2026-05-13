import { useState } from "react";
import { Flame, DollarSign, Landmark, Music2, BarChart2, Cpu, LayoutGrid } from "lucide-react";

const categories = [
  { label: "Trending",      icon: Flame },
  { label: "Finance",       icon: DollarSign },
  { label: "Politics",      icon: Landmark },
  { label: "Entertainment", icon: Music2 },
  { label: "Economy",       icon: BarChart2 },
  { label: "Technology",    icon: Cpu },
  { label: "Others",        icon: LayoutGrid },
];

export const CategoryTabs = ({ onChange }: { onChange?: (c: string) => void }) => {
  const [active, setActive] = useState("Trending");

  return (
    <div className="border-b border-border/40 bg-card/60 backdrop-premium sticky top-[57px] z-30 shadow-xs">
      <div className="container">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin py-1">
          {categories.map(({ label, icon: Icon }) => {
            const isActive = active === label;
            return (
              <button
                key={label}
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
