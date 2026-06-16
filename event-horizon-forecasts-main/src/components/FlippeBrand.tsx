import symbolUrl from "@/assets/flippe-symbol.svg";

type FlippeSymbolProps = {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-12 w-12 rounded-xl",
  xl: "h-16 w-16 rounded-2xl",
};

export const FlippeSymbol = ({ size = "md", className = "" }: FlippeSymbolProps) => (
  <span className={`inline-grid shrink-0 place-items-center overflow-hidden border border-white/10 bg-[#080C10] shadow-sm ${sizeClasses[size]} ${className}`}>
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
      <span className="block text-xl font-black tracking-[0.04em] text-white">FLIPPE</span>
      {tagline && <span className="block text-xs font-semibold text-[#8B98A8]">{tagline}</span>}
    </span>
  </span>
);

export const FlippeLoader = ({ label = "Loading FLIPPE" }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center gap-4 text-center">
    <div className="flippe-loader relative h-16 w-16">
      <FlippeSymbol size="xl" className="flippe-loader-symbol absolute inset-0" />
    </div>
    <div>
      <p className="text-sm font-black text-white">{label}</p>
      <p className="mt-1 text-xs text-[#8B98A8]">Many possibilities. One reality.</p>
    </div>
  </div>
);
