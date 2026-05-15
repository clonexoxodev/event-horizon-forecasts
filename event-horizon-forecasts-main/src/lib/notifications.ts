export type NotificationType =
  | "market_closing_soon"
  | "market_price_moved"
  | "forecast_confirmed"
  | "market_resolved"
  | "wallet_low"
  | "position_sold"
  | "new_market_added";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: {
    marketId?: string;
    marketQuestion?: string;
    amount?: number;
    priceChange?: number;
    outcome?: "YES" | "NO";
    [key: string]: any;
  };
};

// Notification creation helpers
export const createNotification = (
  userId: string,
  type: NotificationType,
  data: {
    title: string;
    message: string;
    metadata?: Notification["metadata"];
  }
): Notification => {
  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type,
    title: data.title,
    message: data.message,
    read: false,
    createdAt: new Date().toISOString(),
    metadata: data.metadata,
  };
};

// Notification templates
export const notificationTemplates = {
  market_closing_soon: (marketQuestion: string, timeLeft: string) => ({
    title: "Market Closing Soon",
    message: `"${marketQuestion}" closes in ${timeLeft}. Review your position.`,
  }),

  market_price_moved: (marketQuestion: string, priceChange: number, side: "YES" | "NO") => ({
    title: "Price Alert",
    message: `${side} price ${priceChange > 0 ? "increased" : "decreased"} by ${Math.abs(priceChange)}% on "${marketQuestion}"`,
  }),

  forecast_confirmed: (marketQuestion: string, side: "YES" | "NO", amount: number) => ({
    title: "Forecast Confirmed",
    message: `Your ${side} forecast of ₦${(amount / 1000).toFixed(1)}K on "${marketQuestion}" is active.`,
  }),

  market_resolved: (marketQuestion: string, outcome: "YES" | "NO", won: boolean, payout?: number) => ({
    title: won ? "You Won! 🎉" : "Market Resolved",
    message: won
      ? `"${marketQuestion}" resolved ${outcome}. You won ₦${payout ? (payout / 1000).toFixed(1) : "0"}K!`
      : `"${marketQuestion}" resolved ${outcome}.`,
  }),

  wallet_low: (balance: number) => ({
    title: "Low Balance",
    message: `Your balance is ₦${(balance / 1000).toFixed(1)}K. Add funds to continue forecasting.`,
  }),

  position_sold: (marketQuestion: string, amount: number) => ({
    title: "Position Sold",
    message: `Your position on "${marketQuestion}" was sold for ₦${(amount / 1000).toFixed(1)}K.`,
  }),

  new_market_added: (marketQuestion: string, category: string) => ({
    title: "New Market",
    message: `New ${category} market: "${marketQuestion}"`,
  }),
};

// Check if market is closing soon (within 1 hour)
export const isMarketClosingSoon = (closeTime: string): boolean => {
  const closeDate = new Date(closeTime);
  const now = new Date();
  const diffMs = closeDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= 1;
};

// Check if price moved significantly (10% or more)
export const hasPriceMovedSignificantly = (
  oldPrice: number,
  newPrice: number,
  threshold: number = 10
): boolean => {
  const change = Math.abs(newPrice - oldPrice);
  return change >= threshold;
};

// Calculate time left string
export const getTimeLeftString = (closeTime: string): string => {
  const closeDate = new Date(closeTime);
  const now = new Date();
  const diffMs = closeDate.getTime() - now.getTime();
  
  if (diffMs <= 0) return "closed";
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  } else {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;
  }
};

// Format notification time (relative)
export const formatNotificationTime = (createdAt: string): string => {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

// Get notification icon and color
export const getNotificationStyle = (type: NotificationType) => {
  const styles = {
    market_closing_soon: {
      icon: "⏰",
      color: "text-amber-600 bg-amber-50",
    },
    market_price_moved: {
      icon: "📈",
      color: "text-blue-600 bg-blue-50",
    },
    forecast_confirmed: {
      icon: "✅",
      color: "text-emerald bg-emerald-soft",
    },
    market_resolved: {
      icon: "🏆",
      color: "text-purple bg-purple/10",
    },
    wallet_low: {
      icon: "💰",
      color: "text-coral bg-coral-soft",
    },
    position_sold: {
      icon: "💸",
      color: "text-emerald bg-emerald-soft",
    },
    new_market_added: {
      icon: "🆕",
      color: "text-indigo-600 bg-indigo-50",
    },
  };

  return styles[type] || { icon: "🔔", color: "text-graphite bg-graphite/10" };
};
