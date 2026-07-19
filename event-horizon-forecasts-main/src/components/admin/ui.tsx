import type { ReactNode } from "react";
import { classNames } from "./utils";

export const Card = ({
  children,
  className = "",
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) => (
  <div
    className={classNames(
      "rounded-2xl border border-gray-200 bg-white",
      padding && "p-5",
      className
    )}
  >
    {children}
  </div>
);

export const MetricCard = ({
  icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon?: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "indigo";
}) => {
  const toneMap: Record<string, string> = {
    neutral: "bg-gray-100 text-gray-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className={classNames("grid h-9 w-9 shrink-0 place-items-center rounded-lg", toneMap[tone])}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-gray-500">{label}</div>
          <div className="mt-0.5 text-xl font-black text-gray-900">{value}</div>
          {sub && <div className="mt-0.5 text-[11px] font-medium text-gray-400">{sub}</div>}
        </div>
      </div>
    </div>
  );
};

export const Badge = ({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "muted";
}) => {
  const variantMap: Record<string, string> = {
    default: "bg-gray-100 text-gray-600",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
    muted: "bg-gray-50 text-gray-500",
  };
  return (
    <span className={classNames("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold", variantMap[variant])}>
      {children}
    </span>
  );
};

export const SectionHeader = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="mb-4 flex items-start justify-between gap-4">
    <div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
    </div>
    {action}
  </div>
);

export const EmptyState = ({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) => (
  <div className="grid min-h-[200px] place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
    <div>
      {icon && (
        <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-500">
          {icon}
        </div>
      )}
      <div className="text-sm font-bold text-gray-900">{title}</div>
      {body && <p className="mt-1 text-xs text-gray-500">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  </div>
);

export const SkeletonRow = ({ cols = 4 }: { cols?: number }) => (
  <div className="flex gap-4 animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="h-4 flex-1 rounded bg-gray-200" />
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse space-y-3">
    <div className="h-4 w-1/3 rounded bg-gray-200" />
    <div className="h-7 w-1/2 rounded bg-gray-200" />
    <div className="h-3 w-2/3 rounded bg-gray-100" />
  </div>
);

export const ConfirmDialog = ({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "warning" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) => {
  if (!open) return null;
  const btnMap: Record<string, string> = {
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-amber-600 hover:bg-amber-700 text-white",
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
  };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={classNames("rounded-xl px-4 py-2 text-sm font-bold transition active:scale-[0.98] disabled:opacity-50", btnMap[confirmVariant])}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const InputField = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
  hint,
  error,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  error?: string;
  rows?: number;
}) => (
  <div>
    <label className="block text-xs font-bold text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {rows ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:opacity-50"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:opacity-50"
      />
    )}
    {hint && !error && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    {error && <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p>}
  </div>
);

export const SelectField = ({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) => (
  <div>
    <label className="block text-xs font-bold text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

export const TabBar = ({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: string; label: string; count?: number }[];
  active: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
    {tabs.map((tab) => (
      <button
        key={tab.value}
        onClick={() => onChange(tab.value)}
        className={classNames(
          "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
          active === tab.value
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        )}
      >
        {tab.label}
        {tab.count !== undefined && (
          <span className={classNames("ml-1.5", active === tab.value ? "text-white/70" : "text-gray-400")}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

export const DataTable = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={classNames("overflow-x-auto rounded-2xl border border-gray-200 bg-white", className)}>
    <table className="w-full text-left text-sm">{children}</table>
  </div>
);

export const Th = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <th className={classNames("border-b border-gray-100 bg-gray-50/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500", className)}>
    {children}
  </th>
);

export const Td = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <td className={classNames("border-b border-gray-50 px-4 py-3 text-sm text-gray-700 last:border-b-0", className)}>
    {children}
  </td>
);
