import type { AdminMarket, ApiTransaction } from "@/lib/api";
import { getCategoryLabel, normalizeCategory } from "@/lib/categories";

import type { AdminRecord, AdminListResponse, FinanceTransaction, MarketKind } from "./types";

export const koboToNaira = (value?: number | null) => Number(value || 0) / 100;

export const marketVolume = (market: AdminMarket) =>
  koboToNaira(
    market.total_volume_smallest_unit ??
      market.pool_amount_smallest_unit ??
      market.total_pool_smallest_unit ??
      0
  );

export const formatDate = (value?: string | null) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatShortDate = (value?: string | null) => {
  if (!value) return "Not tracked";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not tracked";
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const statusText = (status?: string | null) => {
  if (!status) return "Draft";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const statusClasses = (status?: string | null) => {
  switch (status) {
    case "active":
      return "border-[#C7D2FE] bg-[#EEF2FF] text-[#4F46E5]";
    case "pending_resolution":
    case "closed":
      return "border-amber-500/30 bg-amber-500/10 text-[#B7791F]";
    case "resolved":
      return "border-sky-500/30 bg-sky-500/10 text-[#2563EB]";
    case "refunded":
      return "border-indigo-500/30 bg-indigo-500/10 text-[#4F46E5]";
    case "cancelled":
    case "archived":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
};

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "Unknown error");
  }
  return "Unknown error";
};

export const normalizeAdminList = (payload: AdminListResponse | unknown): AdminRecord[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && "admins" in payload) {
    const admins = (payload as { admins?: unknown }).admins;
    return Array.isArray(admins) ? admins : [];
  }
  return [];
};

export const categoryLabel = (category?: string | null) =>
  getCategoryLabel(normalizeCategory(category || "Other"));

export const isEndingSoon = (market: AdminMarket) => {
  const closeDate = new Date(market.close_date || market.closes_at || "");
  if (Number.isNaN(closeDate.getTime())) return false;
  const diff = closeDate.getTime() - Date.now();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
};

export const marketKindFromLabels = (yes?: string | null, no?: string | null): MarketKind => {
  const y = (yes || "").toLowerCase();
  const n = (no || "").toLowerCase();
  if (y === "up" || n === "down") return "UP/DOWN";
  if (y === "bigger" || n === "smaller") return "Bigger/Smaller";
  return "YES/NO";
};

export const labelsForKind = (kind: MarketKind) => {
  if (kind === "UP/DOWN") return { yes: "UP", no: "DOWN" };
  if (kind === "Bigger/Smaller") return { yes: "BIGGER", no: "SMALLER" };
  return { yes: "YES", no: "NO" };
};

export const toDateTimeLocal = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

export const dateTimeLocalToIso = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

export const isValidDateTimeLocal = (value?: string | null) =>
  Boolean(value && dateTimeLocalToIso(value));

export const getDateTimeLocalMin = () => {
  const now = new Date(Date.now() + 60_000);
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

export const metricValue = (value: number | undefined | null) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

export const isToday = (value?: string | null) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

export const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const requestUserLabel = (item: { user?: { email?: string; username?: string } | null; userId?: string }) =>
  item.user?.email ||
  item.user?.username ||
  item.userId ||
  "Unknown user";

export const txDate = (tx: ApiTransaction | FinanceTransaction) =>
  (tx as any).createdAt || (tx as any).created_at || "";

export const txUserLabel = (tx: ApiTransaction | FinanceTransaction) =>
  (tx as any).userEmail ||
  (tx as any).userUsername ||
  (tx as any).user_email ||
  (tx as any).user?.email ||
  (tx as any).userId ||
  (tx as any).user_id ||
  "Unknown";

export const txReference = (tx: ApiTransaction | FinanceTransaction) =>
  (tx as any).reference || (tx as any).referenceId || (tx as any).reference_id || "-";

export const txMarketLabel = (tx: ApiTransaction | FinanceTransaction) =>
  (tx as any).marketQuestion ||
  (tx as any).market_question ||
  (tx as any).metadata?.marketQuestion ||
  (tx as any).metadata?.market_question ||
  (tx as any).marketId ||
  (tx as any).market_id ||
  "-";
