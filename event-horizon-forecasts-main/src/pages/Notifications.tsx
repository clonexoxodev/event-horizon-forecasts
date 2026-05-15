import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notification-context";
import { formatNotificationTime, getNotificationStyle } from "@/lib/notifications";
import { Bell, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } =
    useNotifications();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-20 text-center">
          <h2 className="text-2xl font-bold mb-3 text-charcoal">Sign in to view notifications</h2>
          <p className="text-graphite">Stay updated on your markets and positions.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const handleNotificationClick = (notificationId: string, read: boolean) => {
    if (!read) {
      markAsRead(notificationId);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />
      <main className="flex-1 container py-10 max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Notifications</h1>
            <p className="text-graphite mt-1 text-sm">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "You're all caught up!"}
            </p>
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  onClick={markAllAsRead}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                onClick={clearAll}
                variant="outline"
                size="sm"
                className="text-xs text-coral hover:text-coral"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear all
              </Button>
            </div>
          )}
        </div>

        <div className="bg-off-white rounded-2xl shadow-card border border-graphite/10 overflow-hidden">
          {notifications.length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-graphite/10 grid place-items-center mx-auto mb-4 text-3xl">
                🔔
              </div>
              <h3 className="font-semibold text-lg text-charcoal">No notifications yet</h3>
              <p className="text-sm text-graphite mt-1">
                We'll notify you about important updates
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-graphite/10">
              {notifications.map((notif, index) => {
                const style = getNotificationStyle(notif.type);
                return (
                  <li
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif.id, notif.read)}
                    className={`p-5 hover:bg-graphite/5 transition-fast cursor-pointer relative animate-fade-up ${
                      !notif.read ? "bg-purple/5" : ""
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 text-xl ${style.color}`}>
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm text-charcoal">{notif.title}</h3>
                          <div className="flex items-center gap-2 shrink-0">
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-purple" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                              className="w-6 h-6 rounded-lg grid place-items-center text-graphite hover:text-coral hover:bg-coral-soft transition-fast"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-graphite mb-2 leading-relaxed">{notif.message}</p>
                        <span className="text-xs text-graphite">
                          {formatNotificationTime(notif.createdAt)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
