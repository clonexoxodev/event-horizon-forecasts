export const koboToNaira = (kobo: number) => Math.round(Number(kobo || 0) / 100);

export const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

export const formatDate = (date?: string | null) => {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
};

export const formatDateTime = (date?: string | null) => {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleString("en-NG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
};

export const formatRelativeTime = (date?: string | null) => {
  if (!date) return "—";
  try {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return formatDate(date);
  } catch {
    return "—";
  }
};

export const formatCountdown = (closeTime?: string) => {
  if (!closeTime) return "—";
  try {
    const diff = new Date(closeTime).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hrs >= 24) return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  } catch {
    return "—";
  }
};

export const statusLabel = (status: string) =>
  status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const statusColor = (status: string): string => {
  switch (status) {
    case "draft": return "bg-gray-100 text-gray-600";
    case "active": return "bg-emerald-50 text-emerald-700";
    case "closed": return "bg-amber-50 text-amber-700";
    case "pending_resolution": return "bg-orange-50 text-orange-700";
    case "resolved": return "bg-indigo-50 text-indigo-700";
    case "refunded": return "bg-purple-50 text-purple-700";
    case "cancelled": return "bg-red-50 text-red-700";
    case "archived": return "bg-gray-100 text-gray-500";
    case "pending": return "bg-amber-50 text-amber-700";
    case "completed": case "approved": return "bg-emerald-50 text-emerald-700";
    case "failed": case "rejected": return "bg-red-50 text-red-700";
    default: return "bg-gray-100 text-gray-600";
  }
};

export const marketVolume = (m: { total_volume_smallest_unit?: number; totalVolume?: number }) =>
  koboToNaira(m.total_volume_smallest_unit || m.totalVolume || 0);

export const isEndingSoon = (m: { close_date?: string; trading_close_at?: string; closeTime?: string; tradingCloseTime?: string }) => {
  const close = m.trading_close_at || m.tradingCloseTime || m.close_date || m.closeTime;
  if (!close) return false;
  const diff = new Date(close).getTime() - Date.now();
  return diff > 0 && diff < 3600000;
};

export const normalizeAdminList = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (response?.admins && Array.isArray(response.admins)) return response.admins;
  if (response?.users && Array.isArray(response.users)) return response.users;
  return [];
};

export const classNames = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

export const toDateTimeLocal = (iso?: string | null) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
};

export const dateTimeLocalToIso = (local: string) => (local ? `${local}:00Z` : "");

export const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "An unexpected error occurred.";
};

export const txUserLabel = (tx: { metadata?: Record<string, unknown>; userId?: string }) => {
  const m = tx.metadata || {};
  return (m.username as string) || (m.user_email as string) || tx.userId?.slice(0, 8) || "—";
};

export const txMarketLabel = (tx: { metadata?: Record<string, unknown> }) =>
  (tx.metadata?.marketQuestion as string) || (tx.metadata?.market_question as string) || "—";
