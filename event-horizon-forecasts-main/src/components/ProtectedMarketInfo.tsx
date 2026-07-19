import { useEffect, useRef, useState } from "react";
import { Shield, X, CheckCircle, Info } from "lucide-react";
import { formatNaira } from "@/lib/markets";

interface ProtectedMarketInfoProps {
  isOpen: boolean;
  onClose: () => void;
  activation?: {
    progress: number;
    totalPool: number;
    requirements: {
      totalPool: number;
      protectedMaxStake: number;
    };
  };
}

export const ProtectedMarketInfo = ({
  isOpen,
  onClose,
  activation,
}: ProtectedMarketInfoProps) => {
  const [visible, setVisible] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && sheetRef.current) {
      const focusable = sheetRef.current.querySelector<HTMLElement>("button, [href]");
      focusable?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="What are Protected Markets?"
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-3xl border border-[#E5E7EB] bg-white p-6 pb-[calc(24px+env(safe-area-inset-bottom))] text-[#111827] shadow-[0_-24px_80px_rgba(17,24,39,0.18)] transition-transform duration-300 ease-out md:mx-auto md:max-w-lg md:rounded-2xl md:bottom-8 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#4F46E5]/10">
              <Shield className="h-5 w-5 text-[#4F46E5]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111827]">Refund Protected</h2>
              <p className="text-xs text-[#9CA3AF]">How it works</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#6B7280] transition hover:text-[#111827]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-[#EEF2FF]/60 p-4">
            <p className="text-sm font-bold leading-relaxed text-[#344054]">
              A <span className="text-[#4F46E5]">Refund Protected</span> market is new and building
              momentum. Your stake is safe — if the market doesn&apos;t reach enough activity before
              closing, you&apos;ll get a full refund.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#111827]">What this means for you</h3>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#12B886]/10">
                <CheckCircle className="h-3.5 w-3.5 text-[#12B886]" />
              </div>
              <p className="text-sm text-[#6B7280]">
                <span className="font-bold text-[#111827]">Zero risk.</span> If the market stays
                under the activity threshold, your stake is returned in full.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#12B886]/10">
                <CheckCircle className="h-3.5 w-3.5 text-[#12B886]" />
              </div>
              <p className="text-sm text-[#6B7280]">
                <span className="font-bold text-[#111827]">Early advantage.</span> Get in before
                the market goes live and crowd View shifts.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#12B886]/10">
                <CheckCircle className="h-3.5 w-3.5 text-[#12B886]" />
              </div>
              <p className="text-sm text-[#6B7280]">
                <span className="font-bold text-[#111827]">Limited stake.</span> Protected markets
                cap individual stakes to keep things fair.
              </p>
            </div>
          </div>

          {activation && (
            <div className="rounded-xl border border-[#E5E7EB] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-[#6B7280]">Activity progress</span>
                <span className="font-bold text-[#4F46E5]">
                  {Math.round(activation.progress)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                <div
                  className="h-full rounded-full bg-[#4F46E5] transition-all duration-500"
                  style={{ width: `${activation.progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[#9CA3AF]">
                {formatNaira(activation.totalPool)} / {formatNaira(activation.requirements.totalPool)}{" "}
                pool activity
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-bold text-white transition hover:bg-[#4338CA] active:scale-[0.98]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProtectedMarketTooltip = ({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      e.preventDefault();
      onClick();
    }}
    className={`inline-flex items-center gap-1 rounded-full bg-[#4F46E5]/10 px-2 py-0.5 text-[10px] font-bold text-[#4F46E5] transition hover:bg-[#4F46E5]/15 ${className}`}
    aria-label="Learn about Refund Protected markets"
  >
    <Shield className="h-3 w-3" />
    Protected
    <Info className="h-3 w-3 opacity-60" />
  </button>
);
