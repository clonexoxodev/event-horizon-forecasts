import type { ApiMarket, NormalizedFixture } from "@/lib/api";

export const formatKickoff = (iso: string | null | undefined): string => {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
};

export const formatKickoffFull = (iso: string | null | undefined): string => {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const matchClock = (fixture: NormalizedFixture | null): string => {
  if (!fixture) return "";
  const status = fixture.statusShort?.toUpperCase() || "";
  if (["NS", "TBD", ""].includes(status)) return "Not started";
  if (["FT", "AET", "PEN"].includes(status)) return "Full time";
  if (status === "HT") return "Half time";
  if (status === "PST") return "Postponed";
  if (status === "CANC") return "Cancelled";
  if (status === "ABD") return "Abandoned";
  if (fixture.minute != null && status !== "FT") return `${fixture.minute}'`;
  return status;
};

export const isMatchLive = (fixture: NormalizedFixture | null): boolean => {
  const status = fixture?.statusShort?.toUpperCase() || "";
  return ["1H", "2H", "HT", "ET", "BT", "P"].includes(status);
};

export const formatStake = (n: number | null | undefined): string => {
  const value = Math.round(Number(n ?? 0) / 100);
  return `\u20A6${value.toLocaleString("en-NG")}`;
};

export const argumentStatusLabel = (argument: ApiMarket): string => {
  switch (argument.status) {
    case "resolved":
      return argument.winningOutcome ? `Resolved ${argument.winningOutcome}` : "Resolved";
    case "pending_resolution":
      return "Settling";
    case "refunded":
      return "Refunded";
    case "cancelled":
      return "Cancelled";
    default:
      return "Active";
  }
};

export const formatLabel = (format: string | null | undefined): string => {
  if (format === "1v1") return "1v1";
  if (format === "group") return "Group";
  return "Unlimited";
};