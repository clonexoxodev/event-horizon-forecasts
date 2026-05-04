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
    <div className="border-b border-border/60 bg-background/95 backdrop-blur-sm sticky top-[57px] z-30">
      <div className="container flex items-center gap-0 overflow-x-auto scrollbar-none">
        {categories.map(({ label, icon: Icon }) => {
          const isActive = active === label;
          return (
            <button
              key={label}
              onClick={() => { setActive(label); onChange?.(label); }}
              className={`relative flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-smooth ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : ""}`} />
              {label}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
