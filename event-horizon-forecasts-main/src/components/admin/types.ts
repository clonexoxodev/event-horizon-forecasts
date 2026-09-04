import type { AdminMarket, ApiTransaction, WithdrawalRequest, DepositRequest } from "@/lib/api";

export type AdminView =
  | "dashboard"
  | "markets"
  | "reviews"
  | "market-detail"
  | "create-market"
  | "edit-market"
  | "finance"
  | "withdrawals"
  | "users"
  | "admins"
  | "audit-log"
  | "settlement-dashboard"
  | "analytics"
  | "risk-center"
  | "system-health"
  | "feature-flags"
  | "settings"
  | "search"
  | "export";

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
    yesVolume?: number;
    noVolume?: number;
    totalVolume?: number;
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
  market_cancelled: "Market Cancelled",
  settlement_started: "Settlement Started",
  settlement_finished: "Settlement Finished",
  settlement_failed: "Settlement Failed",
  refund_started: "Refund Started",
  refund_finished: "Refund Finished",
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
  emergency_stop: "Emergency Stop",
  settings_changed: "Settings Changed",
  feature_flag_changed: "Feature Flag Changed",
};

export type PlatformStats = {
  users: { total: number; verified: number; pending: number };
  markets: { total: number; active: number; pending: number; resolved: number; cancelled: number; protected: number };
  predictions: { today: number; staked: number };
  transactions: { todayDeposits: number; todayWithdrawals: number; todayRefunds: number; todayPayouts: number };
  wallets: { totalBalance: number; totalLocked: number };
  revenue: { total: number };
  withdrawalRequests: { pending: number };
  settlements: { pending: number; failed: number };
  avgSettlementTimeSeconds: number;
};

export type FeatureFlag = {
  id: string;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  category: string;
  created_at: string;
  updated_at: string;
};

export type PlatformSetting = {
  id: string;
  key: string;
  value: any;
  category: string;
  description: string;
  updated_at: string;
};

export type FraudAlert = {
  id: string;
  user_id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  status: string;
  review_notes: string;
  reviewed_at: string;
  created_at: string;
  user_email?: string;
  user_username?: string;
};

export type AdminNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  metadata: Record<string, unknown>;
  read_by: string[];
  created_at: string;
};

export type RiskCenterData = {
  topPositions: Array<{ user_id: string; market_id: string; amount: number; username?: string; market_question?: string }>;
  exposedMarkets: Array<{ id: string; question: string; total_exposure: number }>;
  imbalancedMarkets: Array<{ id: string; question: string; yes_pct: number; no_pct: number }>;
  topExposedUsers: Array<{ user_id: string; username: string; total_exposure: number }>;
  potentialPayouts: number;
  totalLiabilities: number;
  riskScore: number;
};

export type SystemHealth = {
  database: { status: string; latency: number };
  poolEngine: { status: string };
  settlementEngine: { status: string };
  walletService: { status: string };
  paymentGateway: { status: string };
  notifications: { status: string };
  api: { status: string; responseTime: number };
  uptime: number;
};

export type MarketAnalytics = {
  totalPositions: number;
  matchedPositions: number;
  activePositions: number;
  refundedPositions: number;
  totalVolume: number;
  yesVolume: number;
  noVolume: number;
  avgPrice: number;
  highestPrice: number;
  lowestPrice: number;
  liquidity: number;
  exposure: number;
};

export type UserAnalytics = {
  lifetimeVolume: number;
  totalPositions: number;
  matchedPositions: number;
  wins: number;
  losses: number;
  winRate: number;
  profit: number;
  roi: number;
  largestWin: number;
  largestLoss: number;
  avgStake: number;
};

export const ADMIN_MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";
export const ADMIN_MEDIA_MAX_MB = 30;
