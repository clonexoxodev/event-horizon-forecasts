import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notification-context";
import { useEffect, useMemo, useRef, useState } from "react";
import apiService, { type ApiNotification } from "@/lib/api";

const normalizeStoredNotification = (notification: ApiNotification) => ({
  id: notification.id,
  title: notification.title,
  message: notification.message,
  read: notification.is_read ?? notification.read ?? false,
  createdAt: notification.created_at || notification.createdAt || new Date().toISOString(),
  marketId: notification.metadata?.marketId || notification.reference_id || undefined,
});

export const NotificationBell = () => {
  const { user } = useAuth();
  const localNotifications = useNotifications();
  const [storedNotifications, setStoredNotifications] = useState<ReturnType<typeof normalizeStoredNotification>[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    apiService.getNotifications().then((response) => {
      if (!cancelled) {
        setStoredNotifications((response.notifications || []).map(normalizeStoredNotification));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const notifications = useMemo(() => {
    if (storedNotifications.length > 0) return storedNotifications;
    return localNotifications.notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      createdAt: notification.createdAt,
      marketId: notification.metadata?.marketId,
    }));
  }, [localNotifications.notifications, storedNotifications]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <Link
      to="/notifications"
      className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:bg-[#F8F7F4] hover:text-[#111827]"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500" aria-hidden="true" />
      )}
      {unreadCount > 0 && (
        <span className="sr-only">{unreadCount} unread notifications</span>
      )}
    </Link>
  );
};
