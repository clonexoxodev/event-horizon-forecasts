import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import { classNames } from "./utils";

export const ShellCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={classNames(
      "rounded-2xl border border-[#E5E7EB] bg-white shadow-sm",
      className
    )}
  >
    {children}
  </section>
);

export const SectionHeader = ({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col gap-3 border-b border-[#E5E7EB] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
    <div>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4F46E5]">
          {eyebrow}
        </p>
      )}
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-sm text-[#667085]">{description}</p>}
    </div>
    {action}
  </div>
);

export const MetricCard = ({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
  icon: React.ComponentType<{ className?: string }>;
}) => {
  const tones = {
    neutral: "bg-[#F3F4F6] text-[#667085]",
    green: "bg-[#EEF2FF] text-[#4F46E5]",
    amber: "bg-amber-500/10 text-[#B7791F]",
    red: "bg-red-500/10 text-[#B42318]",
    blue: "bg-sky-500/10 text-[#2563EB]",
  };

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#667085]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={classNames("rounded-xl p-2.5", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-[#667085]">{hint}</p>}
    </div>
  );
};

export const Badge = ({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) => (
  <span
    className={classNames(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
      tone === "green" && "border-[#C7D2FE] bg-[#EEF2FF] text-[#4F46E5]",
      tone === "amber" && "border-amber-500/30 bg-amber-500/10 text-[#B7791F]",
      tone === "red" && "border-red-500/30 bg-red-500/10 text-[#B42318]",
      tone === "blue" && "border-sky-500/30 bg-sky-500/10 text-[#2563EB]",
      tone === "neutral" && "border-[#E5E7EB] bg-[#F3F4F6] text-[#667085]"
    )}
  >
    {children}
  </span>
);

export const Stat = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => (
  <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5">
    <p className="text-xs text-[#667085]">{label}</p>
    <p className="mt-1 font-semibold">{value}</p>
  </div>
);

export const EmptyState = ({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon?: React.ComponentType<{ className?: string }>;
}) => (
  <div className="px-8 py-12 text-center">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#667085]">
      {Icon ? <Icon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
    </div>
    <p className="font-semibold">{title}</p>
    <p className="mt-1 text-sm text-[#667085]">{body}</p>
  </div>
);

export const Field = ({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-[#344054]">
      {label}
      {required && <span className="ml-1 text-[#E85D5D]">*</span>}
    </span>
    {children}
    {hint && <p className="mt-1.5 text-xs text-[#667085]">{hint}</p>}
  </label>
);

export const ChecklistItem = ({
  ok,
  children,
}: {
  ok: boolean;
  children: ReactNode;
}) => (
  <div className="flex items-center gap-2.5 py-1">
    <span
      className={classNames(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
        ok
          ? "bg-[#12B886] text-white"
          : "border border-[#E5E7EB] bg-white text-[#667085]"
      )}
    >
      {ok ? "\u2713" : ""}
    </span>
    <span className={ok ? "text-sm text-[#101828]" : "text-sm text-[#667085]"}>
      {children}
    </span>
  </div>
);
