import type { AdminMarket, ApiTransaction, UserRole } from "@/lib/api";

export type AdminView =
  | "dashboard"
  | "markets"
  | "create"
  | "resolution"
  | "finance"
  | "transactions"
  | "users"
  | "add-admin"
  | "reports"
  | "settings";

export type MarketKind = "YES/NO" | "UP/DOWN" | "Bigger/Smaller";

export type MarketStatusFilter =
  | "all"
  | "active"
  | "ending_soon"
  | "pending_resolution"
  | "resolved"
  | "refunded"
  | "cancelled"
  | "archived";

export type AdminUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  created_at?: string;
  last_login_at?: string;
  last_active_at?: string;
  status?: string;
  wallet_balance?: number;
  active_positions?: number;
  total_predictions?: number;
  total_volume?: number;
};

export type AdminRecord = AdminUser & {
  isPrimary?: boolean;
  added_by?: string;
  added_at?: string;
};

export type AdminListResponse = AdminRecord[] | { admins?: AdminRecord[] };

export type Analytics = Awaited<ReturnType<typeof import("@/lib/api").apiService.getAnalytics>>;

export type FinanceOverview = Record<string, number>;

export type FinanceTransaction = ApiTransaction;

export type ResolutionPreview = Awaited<
  ReturnType<typeof import("@/lib/api").apiService.previewAdminMarketResolution>
>["preview"];

export type ResolutionState = {
  market: AdminMarket;
  outcome: "YES" | "NO";
  preview: ResolutionPreview | null;
};

export type DangerAction = "close" | "cancel" | "refund" | "archive" | "delete";

export type DangerState = {
  market: AdminMarket;
  action: DangerAction;
};

export type MarketForm = {
  question: string;
  category: string;
  market_type: string;
  yes_label: string;
  no_label: string;
  yes_price: number;
  no_price: number;
  close_date: string;
  trading_close_at: string;
  resolution_source: string;
  rules: string;
  image_url: string;
  video_url: string;
  status: string;
  is_trending: boolean;
  min_stake: number;
  max_stake: number;
  protected_market_enabled: boolean;
  activation_threshold: number;
  activation_yes_min: number;
  activation_no_min: number;
  activation_min_participants: number;
  protected_max_stake: number;
};

export const emptyForm: MarketForm = {
  question: "",
  category: "Sports",
  market_type: "YES/NO",
  yes_label: "YES",
  no_label: "NO",
  yes_price: 50,
  no_price: 50,
  close_date: "",
  trading_close_at: "",
  resolution_source: "",
  rules: "",
  image_url: "",
  video_url: "",
  status: "active",
  is_trending: false,
  min_stake: 100,
  max_stake: 100000,
  protected_market_enabled: true,
  activation_threshold: 10000,
  activation_yes_min: 2000,
  activation_no_min: 2000,
  activation_min_participants: 5,
  protected_max_stake: 1000,
};

export const ADMIN_MEDIA_MAX_BYTES = 30 * 1024 * 1024;
export const ADMIN_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const ADMIN_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const ADMIN_MEDIA_TYPES = [...ADMIN_IMAGE_TYPES, ...ADMIN_VIDEO_TYPES];

export type DashboardMetrics = {
  liveMarkets: number;
  pendingResolution: number;
  resolvedMarkets: number;
  totalUsers: number;
  activeUsersToday: number;
  newUsersToday: number;
  usersWithPredictions: number;
  todayPredictions: number;
  todayVolume: number;
  pendingPayouts: number;
  totalWalletBalance: number;
  activeMarketMoney: number;
};
