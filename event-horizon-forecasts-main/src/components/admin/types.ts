import type { AdminMarket, ApiTransaction, WithdrawalRequest, DepositRequest } from "@/lib/api";

export type AdminView =
  | "dashboard"
  | "markets"
  | "market-detail"
  | "create-market"
  | "edit-market"
  | "finance"
  | "withdrawals"
  | "users"
  | "admins"
  | "audit-log"
  | "settlement-dashboard";

export type MarketStatusFilter =
  | "all"
  | "draft"
  | "active"
  | "closed"
  | "pending_resolution"
  | "resolved"
  | "refunded"
  | "cancelled"
  | "archived";

export type AdminUserRecord = {
  id: string;
  email: string;
  username: string;
  role: "user" | "admin" | "super_admin";
  balance?: number;
  createdAt?: string;
  created_at?: string;
  lastLoginAt?: string;
  last_login_at?: string;
  totalPredictions?: number;
  totalStaked?: number;
  status?: string;
};

export type AdminListResponse = {
  admins?: AdminUserRecord[];
  users?: AdminUserRecord[];
};

export type FinanceOverview = {
  totalDeposits?: number;
  totalWithdrawals?: number;
  pendingWithdrawals?: number;
  pendingDeposits?: number;
  completedWithdrawals?: number;
  failedWithdrawals?: number;
  totalRefunds?: number;
  platformRevenue?: number;
  walletLiability?: number;
  lockedFunds?: number;
  activeExposure?: number;
  todayDeposits?: number;
  todayWithdrawals?: number;
  todayPredictionVolume?: number;
  totalUsers?: number;
  activeMarkets?: number;
  totalVolume?: number;
};

export type AdminAnalytics = {
  totalUsers?: number;
  newUsersToday?: number;
  activeUsers?: number;
  totalMarkets?: number;
  activeMarkets?: number;
  pendingResolutions?: number;
  predictionsToday?: number;
  todayVolume?: number;
  totalVolume?: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
  pendingWithdrawals?: number;
  totalRefunds?: number;
  dailyActiveUsers?: Array<{ date: string; count: number }>;
  dailyVolume?: Array<{ date: string; volume: number }>;
  dailyNewUsers?: Array<{ date: string; count: number }>;
  categoryDistribution?: Array<{ category: string; count: number }>;
  recentActivity?: AuditLogEntry[];
};

export type AuditLogEntry = {
  id: string;
  action: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  details?: Record<string, unknown>;
  createdAt: string;
  created_at?: string;
};

export type ResolutionPreview = {
  success: boolean;
  preview: {
    totalWinners?: number;
    totalLosers?: number;
    totalPayout?: number;
    totalRefunded?: number;
    yesPool?: number;
    noPool?: number;
    totalPool?: number;
    eligibleForRefund?: boolean;
    refundReason?: string;
    winners?: Array<{
      userId: string;
      username?: string;
      side: string;
      stake: number;
      payout: number;
    }>;
  };
};

export const MARKET_STATUS_OPTIONS: { value: MarketStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "active", label: "Live" },
  { value: "closed", label: "Closed" },
  { value: "pending_resolution", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "refunded", label: "Refunded" },
  { value: "cancelled", label: "Cancelled" },
  { value: "archived", label: "Archived" },
];

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  market_created: "Market Created",
  market_updated: "Market Updated",
  market_deleted: "Market Deleted",
  market_resolved: "Market Resolved",
  market_refunded: "Market Refunded",
  market_published: "Market Published",
  withdrawal_approved: "Withdrawal Approved",
  withdrawal_rejected: "Withdrawal Rejected",
  deposit_approved: "Deposit Approved",
  deposit_rejected: "Deposit Rejected",
  admin_added: "Admin Added",
  admin_removed: "Admin Removed",
  user_suspended: "User Suspended",
  user_activated: "User Activated",
  admin_login: "Admin Login",
  permission_changed: "Permission Changed",
};

export const ADMIN_MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";
export const ADMIN_MEDIA_MAX_MB = 30;
