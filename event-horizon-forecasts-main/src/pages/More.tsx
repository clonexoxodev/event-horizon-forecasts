import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/lib/auth";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Bell,
  User,
  HelpCircle,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useNotifications } from "@/lib/notification-context";

export default function More() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Check if user is admin
  const SUPER_ADMIN_EMAILS = [
    "fehintoluwaolu@gmail.com",
    "oluwasinaayomifetuga@gmail.com"
  ];
  const isAdmin = user && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

  const menuSections = [
    {
      title: "Account",
      items: [
        {
          to: "/dashboard",
          icon: LayoutDashboard,
          label: "Dashboard",
          description: "Overview and stats",
        },
        {
          to: "/notifications",
          icon: Bell,
          label: "Notifications",
          description: "Updates and alerts",
          badge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount.toString()) : undefined,
        },
        {
          to: "/profile",
          icon: User,
          label: "Profile",
          description: "Manage your account",
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          to: "/support",
          icon: HelpCircle,
          label: "Help & Support",
          description: "Get assistance",
        },
        {
          to: "/profile",
          icon: Settings,
          label: "Settings",
          description: "App preferences",
        },
      ],
    },
  ];

  // Add admin section if user is admin
  if (isAdmin) {
    menuSections.push({
      title: "Admin",
      items: [
        {
          to: "/admin",
          icon: Shield,
          label: "Admin Panel",
          description: "Manage platform",
        },
      ],
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 sm:pb-0">
      <Header />
      <main className="flex-1 container py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-charcoal">More</h1>
          <p className="text-graphite mt-1 text-sm">Additional options and settings</p>
        </div>

        <div className="space-y-6">
          {menuSections.map((section) => (
            <div key={section.title} className="bg-off-white rounded-2xl overflow-hidden shadow-card border border-border/50">
              <div className="px-4 py-3 border-b border-border/30">
                <h2 className="text-xs font-bold uppercase tracking-wide text-graphite">{section.title}</h2>
              </div>
              <div className="divide-y divide-border/30">
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-4 p-4 hover:bg-graphite/5 active:bg-graphite/10 transition-fast"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple/10 text-purple grid place-items-center shrink-0">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-charcoal flex items-center gap-2">
                        {item.label}
                        {item.badge && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-purple text-white text-[10px] font-bold flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-graphite mt-0.5">{item.description}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-graphite shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Logout button */}
          <div className="bg-off-white rounded-2xl overflow-hidden shadow-card border border-border/50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-4 hover:bg-coral-soft active:bg-coral-soft/80 transition-fast text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-coral-soft text-coral grid place-items-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-coral">Log Out</div>
                <div className="text-xs text-graphite mt-0.5">Sign out of your account</div>
              </div>
              <ChevronRight className="w-5 h-5 text-coral shrink-0" />
            </button>
          </div>
        </div>

        {/* App version */}
        <div className="text-center mt-8 text-xs text-graphite">
          <p>Flippe v2.0.0</p>
          <p className="mt-1">Prediction Platform</p>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
