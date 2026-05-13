import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { Bell, TrendingUp, Trophy, AlertCircle, Clock } from "lucide-react";

export default function Notifications() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-20 text-center">
          <h2 className="text-2xl font-bold mb-3">Sign in to view notifications</h2>
          <p className="text-muted-foreground">Stay updated on your markets and positions.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const notifications = [
    {
      id: "1",
      type: "win",
      title: "Position Won!",
      message: "Your YES position on 'Will Bitcoin reach $100k?' won ₦2,500",
      time: "2 hours ago",
      read: false,
      icon: Trophy,
      color: "text-emerald bg-emerald-soft",
    },
    {
      id: "2",
      type: "market",
      title: "Market Closing Soon",
      message: "'Will Nigeria qualify for World Cup?' closes in 6 hours",
      time: "5 hours ago",
      read: false,
      icon: Clock,
      color: "text-purple bg-purple/10",
    },
    {
      id: "3",
      type: "update",
      title: "Market Update",
      message: "Odds changed significantly on 'Will Tinubu win election?'",
      time: "1 day ago",
      read: true,
      icon: TrendingUp,
      color: "text-charcoal bg-graphite/10",
    },
    {
      id: "4",
      type: "alert",
      title: "Low Balance",
      message: "Your balance is running low. Consider depositing more funds.",
      time: "2 days ago",
      read: true,
      icon: AlertCircle,
      color: "text-coral bg-coral-soft",
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-10 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Notifications</h1>
          <p className="text-graphite mt-1 text-sm">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "You're all caught up!"}
          </p>
        </div>

        <div className="bg-off-white rounded-2xl shadow-card border border-graphite/10 overflow-hidden">
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 text-graphite mx-auto mb-3" />
              <h3 className="font-semibold text-lg text-charcoal">No notifications yet</h3>
              <p className="text-sm text-graphite mt-1">
                We'll notify you about important updates
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-graphite/10">
              {notifications.map((notif) => (
                <li
                  key={notif.id}
                  className={`p-5 hover:bg-graphite/5 transition-fast cursor-pointer ${
                    !notif.read ? "bg-purple/5" : ""
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${notif.color}`}>
                      <notif.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-charcoal">{notif.title}</h3>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-purple shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-graphite mb-2">{notif.message}</p>
                      <span className="text-xs text-graphite">{notif.time}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="mt-4 text-center">
            <button className="text-sm text-purple font-semibold hover:underline transition-fast">
              Mark all as read
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
