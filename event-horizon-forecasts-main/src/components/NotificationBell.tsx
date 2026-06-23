import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import apiService, { type ApiNotification } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notification-context";
import { formatNotificationTime } from "@/lib/notifications";

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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storedNotifications, setStoredNotifications] = useState<ReturnType<typeof normalizeStoredNotification>[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open || !user) return;

    let cancelled = false;
    const loadNotifications = async () => {
      setLoading(true);
      try {
        const response = await apiService.getNotifications();
        if (!cancelled) {
          setStoredNotifications((response.notifications || []).map(normalizeStoredNotification));
        }
      } catch {
        if (!cancelled) setStoredNotifications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

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

  const markAllRead = async () => {
    localNotifications.markAllAsRead();
    setStoredNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    try {
      await apiService.markAllNotificationsRead();
    } catch {
      // Local state already reflects the action; server sync can retry on the next open.
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:bg-[#F8F7F4] hover:text-[#111827]"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500" />}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[70] w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white/98 text-[#111827] shadow-[0_24px_90px_rgba(17,24,39,0.16)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] p-4">
            <div>
              <div className="text-sm font-black">Notifications</div>
              <div className="text-xs text-[#6B7280]">{unreadCount ? `${unreadCount} unread` : "All caught up"}</div>
            </div>
            {notifications.length > 0 && (
              <button onClick={markAllRead} className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#F8F7F4] px-3 py-1.5 text-xs font-black text-[#6B7280]">
                <CheckCheck className="h-3.5 w-3.5" />
                Read
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid h-36 place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#12B886]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] text-[#12B886]">
                <Bell className="h-5 w-5" />
              </div>
              <div className="font-black">No notifications yet.</div>
              <p className="mt-1 text-sm text-[#6B7280]">Prediction updates, market results, and payouts will appear here.</p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto p-2">
              {notifications.map((notification) => {
                const content = (
                  <div className={`rounded-xl p-3 transition hover:bg-[#F8F7F4] ${notification.read ? "" : "bg-[#12B886]/10"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="line-clamp-1 text-sm font-black">{notification.title}</div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6B7280]">{notification.message}</p>
                      </div>
                      {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#12B886]" />}
                    </div>
                    <div className="mt-2 text-[11px] font-bold text-[#6B7280]">{formatNotificationTime(notification.createdAt)}</div>
                  </div>
                );

                return notification.marketId ? (
                  <Link key={notification.id} to={`/market/${notification.marketId}`} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
