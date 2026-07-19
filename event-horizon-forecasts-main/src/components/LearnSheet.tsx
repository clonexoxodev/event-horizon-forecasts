import { useEffect, useRef, useState } from "react";
import { X, Info } from "lucide-react";

export interface LearnSheetItem {
  icon?: "check" | "info" | "star";
  title: string;
  description: string;
}

interface LearnSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  intro?: string;
  items?: LearnSheetItem[];
  example?: {
    label: string;
    body: string;
  };
  footer?: React.ReactNode;
}

export const LearnSheet = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  intro,
  items,
  example,
  footer,
}: LearnSheetProps) => {
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
      aria-label={title}
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
            {icon ? (
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#4F46E5]/10">
                {icon}
              </div>
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#4F46E5]/10">
                <Info className="h-5 w-5 text-[#4F46E5]" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-[#111827]">{title}</h2>
              {subtitle && <p className="text-xs text-[#9CA3AF]">{subtitle}</p>}
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
          {intro && (
            <div className="rounded-xl bg-[#EEF2FF]/60 p-4">
              <p className="text-sm font-bold leading-relaxed text-[#344054]">{intro}</p>
            </div>
          )}

          {items && items.length > 0 && (
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#12B886]/10">
                    {item.icon === "star" ? (
                      <span className="text-xs text-[#4F46E5] font-bold">&#9733;</span>
                    ) : item.icon === "info" ? (
                      <Info className="h-3.5 w-3.5 text-[#4F46E5]" />
                    ) : (
                      <svg className="h-3.5 w-3.5 text-[#12B886]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#111827]">{item.title}. </span>
                    <span className="text-sm text-[#6B7280]">{item.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {example && (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                {example.label}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#344054]">{example.body}</p>
            </div>
          )}

          {footer}

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

export const LearnTooltip = ({
  onClick,
  label = "Learn",
  className = "",
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      e.preventDefault();
      onClick();
    }}
    className={`inline-flex items-center gap-1 rounded-full bg-[#4F46E5]/10 px-2 py-0.5 text-[10px] font-bold text-[#4F46E5] transition hover:bg-[#4F46E5]/15 ${className}`}
    aria-label={`Learn about ${label}`}
  >
    <Info className="h-3 w-3" />
    {label}
  </button>
);
