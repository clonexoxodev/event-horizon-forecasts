import { useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Clock,
  Inbox,
  Loader2,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notification-context";
import {
  formatNotificationTime,
  getNotificationStyle,
  type NotificationType,
} from "@/lib/notifications";

const typeIcon: Record<string, any> = {
  market_closing_soon: Clock,
  market_price_moved: TrendingUp,
  forecast_confirmed: Zap,
  market_resolved: Trophy,
  wallet_low: Wallet,
  position_sold: Wallet,
  new_market_added: Inbox,
  settlement_won: Trophy,
  settlement_lost: TrendingUp,
  order_refunded: Wallet,
  refund: Wallet,
};

export default function Notifications() {
  const { user, isLoading: authLoading } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  const sorted = useMemo(
    () =>
      [...notifications].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [notifications]
  );

  if (authLoading) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#4F46E5]" />
            <p className="mt-3 text-sm font-bold text-[#9CA3AF]">
              Loading notifications...
            </p>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-bg min-h-screen text-[#111827] xl:pl-64">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
            <Bell className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-black">Log in to see notifications</h2>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            Your alerts and activity feed will appear here.
          </p>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen pb-24 text-[#111827] md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
              Notifications
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-[#9CA3AF]">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#4F46E5]/20 bg-[#EEF2FF] px-4 py-2 text-xs font-bold text-[#4F46E5] transition hover:bg-[#4F46E5]/10"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E5E7EB] bg-white/60 py-20 text-center">
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-[#F3F4F6]">
              <Bell className="h-10 w-10 text-[#D1D5DB]" />
            </div>
            <h3 className="text-lg font-bold text-[#111827]">
              No notifications yet
            </h3>
            <p className="mt-2 max-w-xs mx-auto text-sm text-[#9CA3AF]">
              When you place predictions, make deposits, or win payouts, updates
              will appear here.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-[#E5E7EB] bg-white">
            <ul role="log" aria-label="Notifications" aria-live="polite">
              {sorted.map((notification) => {
                const isRead = notification.read;
                const style = getNotificationStyle(
                  notification.type as NotificationType
                );
                const Icon =
                  typeIcon[notification.type] || Bell;

                return (
                  <li
                    key={notification.id}
                    className={`border-b border-[#F3F4F6] last:border-b-0 transition hover:bg-[#F8F7F4] ${
                      !isRead ? "bg-[#FAFAFE]" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!isRead) markAsRead(notification.id);
                      }}
                      aria-label={`${notification.title}. ${notification.message}. ${formatNotificationTime(notification.createdAt)}${!isRead ? ". Unread" : ""}`}
                      className="flex w-full items-start gap-3.5 p-4 text-left"
                    >
                      <div
                        className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style.color}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className={`text-sm leading-tight ${
                              isRead
                                ? "font-semibold text-[#9CA3AF]"
                                : "font-bold text-[#111827]"
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {!isRead && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#4F46E5]" />
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#9CA3AF] line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#D1D5DB]">
                          <Clock className="h-3 w-3" />
                          {formatNotificationTime(notification.createdAt)}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
