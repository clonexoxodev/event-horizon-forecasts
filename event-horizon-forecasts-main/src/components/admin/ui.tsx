import { useState, useEffect, useRef, type ReactNode } from "react";
import { classNames } from "./utils";

// ─── Card ────────────────────────────────────────────────────────────────────

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
      "rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow transition-fast",
      padding && "p-5",
      className
    )}
  >
    {children}
  </div>
);

// ─── MetricCard ──────────────────────────────────────────────────────────────

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
  const toneMap: Record<string, { bg: string; text: string; ring: string }> = {
    neutral: { bg: "bg-gray-100", text: "text-gray-600", ring: "ring-gray-100" },
    green: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
    red: { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-100" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-100" },
  };
  const t = toneMap[tone] ?? toneMap.neutral;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow transition-fast">
      <div className="flex items-start gap-4">
        {icon && (
          <div
            className={classNames(
              "grid h-11 w-11 shrink-0 place-items-center rounded-lg ring-1",
              t.bg,
              t.text,
              t.ring
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900">
            {value}
          </p>
          {sub && (
            <p className="mt-1 text-xs font-medium text-gray-400">{sub}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Badge ───────────────────────────────────────────────────────────────────

export const Badge = ({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "muted";
}) => {
  const variantMap: Record<string, string> = {
    default: "bg-gray-100 text-gray-600 ring-gray-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-red-50 text-red-700 ring-red-200",
    info: "bg-blue-50 text-blue-700 ring-blue-200",
    muted: "bg-gray-50 text-gray-500 ring-gray-200",
  };
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
        variantMap[variant]
      )}
    >
      {children}
    </span>
  );
};

// ─── SectionHeader ───────────────────────────────────────────────────────────

export const SectionHeader = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="mb-5 flex items-start justify-between gap-4">
    <div className="min-w-0">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-900">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

// ─── EmptyState ──────────────────────────────────────────────────────────────

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
  <div className="grid min-h-[240px] place-items-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
    <div className="max-w-xs">
      {icon && (
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-500 ring-1 ring-indigo-100">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {body && (
        <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{body}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  </div>
);

// ─── SkeletonRow ─────────────────────────────────────────────────────────────

export const SkeletonRow = ({ cols = 4 }: { cols?: number }) => (
  <div className="flex gap-4 animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="h-4 flex-1 rounded-md bg-gray-200" />
    ))}
  </div>
);

// ─── SkeletonCard ────────────────────────────────────────────────────────────

export const SkeletonCard = () => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
    <div className="space-y-3">
      <div className="h-3.5 w-1/3 rounded-md bg-gray-200" />
      <div className="h-7 w-1/2 rounded-md bg-gray-200" />
      <div className="h-3 w-2/3 rounded-md bg-gray-100" />
    </div>
  </div>
);

// ─── SkeletonText ────────────────────────────────────────────────────────────

export const SkeletonText = ({ lines = 3, className = "" }: { lines?: number; className?: string }) => (
  <div className={classNames("space-y-2.5 animate-pulse", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={classNames(
          "h-3.5 rounded-md bg-gray-200",
          i === lines - 1 ? "w-3/5" : "w-full"
        )}
      />
    ))}
  </div>
);

// ─── ConfirmDialog ───────────────────────────────────────────────────────────

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
    danger: "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500",
    warning: "bg-amber-600 hover:bg-amber-700 text-white focus-visible:ring-amber-500",
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus-visible:ring-indigo-500",
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl transition-fast"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-fast hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={classNames(
              "rounded-lg px-4 py-2 text-sm font-bold transition-fast active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50",
              btnMap[confirmVariant]
            )}
          >
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── InputField ──────────────────────────────────────────────────────────────

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
}) => {
  const base =
    "mt-1.5 w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";
  const border = error
    ? "border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20"
    : "border-gray-200 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20";

  const inputClasses = classNames(base, border);

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {rows ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={inputClasses}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
        />
      )}
      {hint && !error && (
        <p className="mt-1.5 text-[11px] text-gray-400">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-[11px] font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
};

// ─── SelectField ─────────────────────────────────────────────────────────────

export const SelectField = ({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  disabled?: boolean;
}) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="mt-1.5 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 transition-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

// ─── TabBar ──────────────────────────────────────────────────────────────────

export const TabBar = ({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: string; label: string; count?: number }[];
  active: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 scrollbar-none">
    {tabs.map((tab) => (
      <button
        key={tab.value}
        onClick={() => onChange(tab.value)}
        className={classNames(
          "shrink-0 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1",
          active === tab.value
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        {tab.label}
        {tab.count !== undefined && (
          <span
            className={classNames(
              "ml-1.5 rounded-full px-1.5 py-px text-[10px] font-bold",
              active === tab.value ? "bg-indigo-50 text-indigo-600" : "bg-gray-200/60 text-gray-400"
            )}
          >
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

// ─── DataTable ───────────────────────────────────────────────────────────────

export const DataTable = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={classNames(
      "overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm",
      className
    )}
  >
    <table className="w-full text-left text-sm">{children}</table>
  </div>
);

// ─── Th ──────────────────────────────────────────────────────────────────────

export const Th = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <th
    className={classNames(
      "border-b border-gray-100 bg-gray-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500",
      className
    )}
  >
    {children}
  </th>
);

// ─── Td ──────────────────────────────────────────────────────────────────────

export const Td = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <td
    className={classNames(
      "border-b border-gray-100 px-4 py-3.5 text-sm text-gray-700 last:border-b-0",
      className
    )}
  >
    {children}
  </td>
);

// ─── PriceDisplay ────────────────────────────────────────────────────────────

export const PriceDisplay = ({
  value,
  change,
  changePercent,
  size = "md",
}: {
  value: string | number;
  change?: string | number;
  changePercent?: string | number;
  size?: "sm" | "md" | "lg";
}) => {
  const numericChange = typeof change === "string" ? parseFloat(change) : change;
  const isUp = numericChange !== undefined && numericChange > 0;
  const isDown = numericChange !== undefined && numericChange < 0;
  const isFlat = numericChange === 0;

  const sizeMap = {
    sm: "text-sm font-bold",
    md: "text-lg font-bold",
    lg: "text-2xl font-bold",
  };

  const changeColor = isUp
    ? "text-emerald-600"
    : isDown
      ? "text-red-500"
      : "text-gray-400";

  const arrow = isUp ? "▲" : isDown ? "▼" : "";

  return (
    <div className="flex items-baseline gap-2">
      <span className={classNames(sizeMap[size], "text-gray-900 tracking-tight")}>
        {value}
      </span>
      {(change !== undefined || changePercent !== undefined) && (
        <span className={classNames("text-xs font-semibold", changeColor)}>
          {arrow}
          {change !== undefined && <span className="ml-0.5">{change}</span>}
          {changePercent !== undefined && (
            <span className="ml-0.5">({changePercent}%)</span>
          )}
        </span>
      )}
    </div>
  );
};

// ─── ProgressBar ─────────────────────────────────────────────────────────────

export const ProgressBar = ({
  value,
  max = 100,
  tone = "indigo",
  showLabel = false,
  className = "",
}: {
  value: number;
  max?: number;
  tone?: "indigo" | "emerald" | "amber" | "red" | "gray";
  showLabel?: boolean;
  className?: string;
}) => {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);

  const toneMap: Record<string, string> = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    gray: "bg-gray-400",
  };

  return (
    <div className={classNames("w-full", className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={classNames("h-full rounded-full transition-all duration-500 ease-out", toneMap[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1.5 text-[11px] font-medium text-gray-400">
          {Math.round(percent)}%
        </p>
      )}
    </div>
  );
};

// ─── StatPill ────────────────────────────────────────────────────────────────

export const StatPill = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "green" | "red" | "amber" | "blue";
}) => {
  const toneMap: Record<string, string> = {
    default: "bg-gray-100 text-gray-600",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs",
        toneMap[tone]
      )}
    >
      <span className="font-medium opacity-70">{label}</span>
      <span className="font-bold">{value}</span>
    </span>
  );
};

// ─── Avatar ──────────────────────────────────────────────────────────────────

export const Avatar = ({
  name,
  src,
  size = "md",
  className = "",
}: {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) => {
  const sizeMap = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const colors = [
    "bg-indigo-100 text-indigo-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-sky-100 text-sky-700",
    "bg-violet-100 text-violet-700",
  ];

  const colorIndex =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={classNames(
          "rounded-full object-cover ring-2 ring-white",
          sizeMap[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={classNames(
        "grid place-items-center rounded-full font-bold ring-2 ring-white",
        sizeMap[size],
        colors[colorIndex],
        className
      )}
      title={name}
    >
      {initials}
    </div>
  );
};

// ─── Toast / Alert ───────────────────────────────────────────────────────────

export const Toast = ({
  variant = "info",
  title,
  body,
  dismissible = false,
  onDismiss,
  className = "",
}: {
  variant?: "success" | "warning" | "error" | "info";
  title: string;
  body?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}) => {
  const variantMap: Record<
    string,
    { container: string; icon: string; border: string }
  > = {
    success: {
      container: "bg-emerald-50 text-emerald-800",
      icon: "✓",
      border: "border-emerald-200",
    },
    warning: {
      container: "bg-amber-50 text-amber-800",
      icon: "!",
      border: "border-amber-200",
    },
    error: {
      container: "bg-red-50 text-red-800",
      icon: "✕",
      border: "border-red-200",
    },
    info: {
      container: "bg-blue-50 text-blue-800",
      icon: "i",
      border: "border-blue-200",
    },
  };

  const v = variantMap[variant] ?? variantMap.info;

  return (
    <div
      role="alert"
      className={classNames(
        "flex items-start gap-3 rounded-xl border p-4 transition-fast",
        v.container,
        v.border,
        className
      )}
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/60 text-[10px] font-bold">
        {v.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        {body && <p className="mt-0.5 text-xs leading-relaxed opacity-80">{body}</p>}
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 text-current opacity-50 transition-fast hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// ─── Divider ─────────────────────────────────────────────────────────────────

export const Divider = ({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) => {
  if (label) {
    return (
      <div className={classNames("flex items-center gap-3 py-2", className)}>
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          {label}
        </span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
    );
  }

  return (
    <hr className={classNames("border-0 border-t border-gray-200 py-1", className)} />
  );
};

// ─── Tooltip ─────────────────────────────────────────────────────────────────

export const Tooltip = ({
  content,
  children,
  position = "top",
}: {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), 300);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const positionMap: Record<string, string> = {
    top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
    left: "right-full top-1/2 mr-2 -translate-y-1/2",
    right: "left-full top-1/2 ml-2 -translate-y-1/2",
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <div
          role="tooltip"
          className={classNames(
            "absolute z-50 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg transition-fast",
            positionMap[position]
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
