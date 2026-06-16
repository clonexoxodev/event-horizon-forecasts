import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import symbolUrl from "@/assets/flippe-symbol.svg";

type FlippeSymbolProps = {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  className?: string;
};

const sizeClasses = {
  xs: "h-7 w-7 rounded-lg",
  sm: "h-8 w-8 rounded-lg",
  md: "h-9 w-9 rounded-xl",
  lg: "h-12 w-12 rounded-xl",
  xl: "h-16 w-16 rounded-2xl",
  hero: "h-24 w-24 rounded-[1.5rem]",
};

export const FlippeSymbol = ({ size = "md", className = "" }: FlippeSymbolProps) => (
  <span className={`inline-grid shrink-0 place-items-center overflow-hidden border border-white/10 bg-[#080C10] shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${sizeClasses[size]} ${className}`}>
    <img src={symbolUrl} alt="FLIPPE" className="h-full w-full object-cover" />
  </span>
);

export const FlippeWordmark = ({
  size = "md",
  tagline,
  className = "",
}: FlippeSymbolProps & { tagline?: string }) => (
  <span className={`inline-flex items-center gap-3 ${className}`}>
    <FlippeSymbol size={size} />
    <span className="leading-tight">
      <span className="block text-xl font-black tracking-[0.16em] text-white drop-shadow-[0_0_18px_rgba(245,247,250,0.18)]">FLIPPE</span>
      {tagline && <span className="block text-xs font-semibold text-[#8B98A8]">{tagline}</span>}
    </span>
  </span>
);

export const FlippeLoader = ({
  label = "Many possibilities. One reality.",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) => (
  <div className={`flex flex-col items-center justify-center text-center ${compact ? "gap-2" : "gap-5"}`}>
    <div className={`flippe-loader-stage relative ${compact ? "h-12 w-12" : "h-24 w-24"}`}>
      <span className="flippe-loader-glow" />
      <span className="flippe-loader-spark" />
      <FlippeSymbol size={compact ? "lg" : "hero"} className="flippe-loader-symbol relative z-10" />
    </div>
    <div className={compact ? "hidden" : "block"}>
      <p className="text-lg font-black tracking-[0.16em] text-white">FLIPPE</p>
      <p className="mt-2 text-sm font-semibold text-[#8B98A8]">{label}</p>
    </div>
  </div>
);

export const MiniBrandLoader = ({ label = "Loading" }: { label?: string }) => (
  <div className="inline-flex items-center gap-3 text-sm font-bold text-[#8B98A8]">
    <FlippeLoader compact label={label} />
    <span>{label}</span>
  </div>
);

export const PageTransitionLoader = () => {
  const location = useLocation();
  const firstRender = useRef(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 720);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div className="flippe-route-loader" aria-live="polite" aria-label="Loading page">
      <FlippeLoader label="Many possibilities. One reality." />
    </div>
  );
};
