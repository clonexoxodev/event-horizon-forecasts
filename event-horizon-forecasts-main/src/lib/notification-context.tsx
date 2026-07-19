import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { useAuth } from "./auth";
import apiService from "./api";
import {
  Notification,
  NotificationType,
  createNotification,
  notificationTemplates,
} from "./notifications";

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    type: NotificationType,
    data: {
      title: string;
      message: string;
      metadata?: Notification["metadata"];
    }
  ) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        const stored = localStorage.getItem(`notifications_${user.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setNotifications(parsed);
        }
      } catch (error) {
        console.error("Failed to parse local notifications:", error);
      }

      try {
        const response = await apiService.getNotifications();
        if (response?.notifications?.length) {
          const serverNotifications: Notification[] = response.notifications.map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            type: n.type,
            title: n.title,
            message: n.message,
            read: Boolean(n.read_at),
            createdAt: n.created_at,
            metadata: n.metadata || {},
          }));
          setNotifications((prev) => {
            const merged = [...serverNotifications];
            for (const local of prev) {
              if (!merged.find((n) => n.id === local.id)) {
                merged.push(local);
              }
            }
            return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });
        }
      } catch (error) {
        console.warn("Failed to fetch server notifications:", error);
      }
    };

    loadNotifications();
  }, [user]);

  useEffect(() => {
    if (user && notifications.length > 0) {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
    }
  }, [notifications, user]);

  const addNotification = useCallback(
    (
      type: NotificationType,
      data: {
        title: string;
        message: string;
        metadata?: Notification["metadata"];
      }
    ) => {
      if (!user) return;

      const notification = createNotification(user.id, type, data);
      setNotifications((prev) => [notification, ...prev]);
    },
    [user]
  );

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiService.markAllNotificationsRead();
    } catch (error) {
      console.warn("Failed to mark server notifications as read:", error);
    }
  }, []);

  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    if (user) {
      localStorage.removeItem(`notifications_${user.id}`);
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};

// Helper hooks for specific notification types
export const useNotificationHelpers = () => {
  const { addNotification } = useNotifications();

  const notifyMarketClosingSoon = useCallback(
    (marketId: string, marketQuestion: string, timeLeft: string) => {
      const template = notificationTemplates.market_closing_soon(marketQuestion, timeLeft);
      addNotification("market_closing_soon", {
        ...template,
        metadata: { marketId, marketQuestion },
      });
    },
    [addNotification]
  );

  const notifyPriceMoved = useCallback(
    (marketId: string, marketQuestion: string, priceChange: number, side: "YES" | "NO") => {
      const template = notificationTemplates.market_price_moved(marketQuestion, priceChange, side);
      addNotification("market_price_moved", {
        ...template,
        metadata: { marketId, marketQuestion, priceChange, side },
      });
    },
    [addNotification]
  );

  const notifyForecastConfirmed = useCallback(
    (marketId: string, marketQuestion: string, side: "YES" | "NO", amount: number) => {
      const template = notificationTemplates.forecast_confirmed(marketQuestion, side, amount);
      addNotification("forecast_confirmed", {
        ...template,
        metadata: { marketId, marketQuestion, side, amount },
      });
    },
    [addNotification]
  );

  const notifyMarketResolved = useCallback(
    (
      marketId: string,
      marketQuestion: string,
      outcome: "YES" | "NO",
      won: boolean,
      payout?: number
    ) => {
      const template = notificationTemplates.market_resolved(marketQuestion, outcome, won, payout);
      addNotification("market_resolved", {
        ...template,
        metadata: { marketId, marketQuestion, outcome, won, payout },
      });
    },
    [addNotification]
  );

  const notifyWalletLow = useCallback(
    (balance: number) => {
      const template = notificationTemplates.wallet_low(balance);
      addNotification("wallet_low", {
        ...template,
        metadata: { balance },
      });
    },
    [addNotification]
  );

  const notifyPositionSold = useCallback(
    (marketId: string, marketQuestion: string, amount: number) => {
      const template = notificationTemplates.position_sold(marketQuestion, amount);
      addNotification("position_sold", {
        ...template,
        metadata: { marketId, marketQuestion, amount },
      });
    },
    [addNotification]
  );

  const notifyNewMarket = useCallback(
    (marketId: string, marketQuestion: string, category: string) => {
      const template = notificationTemplates.new_market_added(marketQuestion, category);
      addNotification("new_market_added", {
        ...template,
        metadata: { marketId, marketQuestion, category },
      });
    },
    [addNotification]
  );

  return {
    notifyMarketClosingSoon,
    notifyPriceMoved,
    notifyForecastConfirmed,
    notifyMarketResolved,
    notifyWalletLow,
    notifyPositionSold,
    notifyNewMarket,
  };
};
