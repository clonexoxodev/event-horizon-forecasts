import { useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  ClipboardList,
  CreditCard,
  Download,
  Flag,
  Gavel,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  TrendingUp,
  Users,
  Zap,
  X,
  Inbox,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { FlippeSymbol } from "@/components/FlippeBrand";
import type { AdminView } from "./types";
import { classNames } from "./utils";

const NAV_SECTIONS: { label: string; items: { view: AdminView; icon: typeof LayoutDashboard; label: string; superAdminOnly?: boolean }[] }[] = [
  {
    label: "Overview",
    items: [{ view: "dashboard", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Operations",
    items: [
      { view: "markets", icon: TrendingUp, label: "Markets" },
      { view: "reviews", icon: Inbox, label: "Pool Reviews" },
      { view: "settlement-dashboard", icon: Gavel, label: "Settlements" },
      { view: "withdrawals", icon: CreditCard, label: "Withdrawals" },
      { view: "finance", icon: BarChart3, label: "Finance" },
      { view: "users", icon: Users, label: "Users" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { view: "analytics", icon: Zap, label: "Analytics" },
      { view: "risk-center", icon: Heart, label: "Risk Center" },
      { view: "system-health", icon: Activity, label: "System Health" },
      { view: "search", icon: Search, label: "Search" },
      { view: "export", icon: Download, label: "Export" },
    ],
  },
  {
    label: "Administration",
    items: [
      { view: "admins", icon: Shield, label: "Admins", superAdminOnly: true },
      { view: "audit-log", icon: ClipboardList, label: "Audit Log" },
      { view: "feature-flags", icon: Flag, label: "Feature Flags", superAdminOnly: true },
      { view: "settings", icon: Settings, label: "Settings", superAdminOnly: true },
    ],
  },
];

const VIEW_TITLES: Record<AdminView, string> = {
  dashboard: "Dashboard",
  markets: "Markets",
  reviews: "Pool Reviews",
  "market-detail": "Market Detail",
  "create-market": "Create Market",
  "edit-market": "Edit Market",
  finance: "Finance",
  withdrawals: "Withdrawal Queue",
  users: "User Management",
  admins: "Admin Management",
  "audit-log": "Audit Log",
  "settlement-dashboard": "Settlement Dashboard",
  analytics: "Platform Analytics",
  "risk-center": "Risk Center",
  "system-health": "System Health",
  "feature-flags": "Feature Flags",
  settings: "Settings",
  search: "Search",
  export: "Export Center",
};

export const AdminLayout = ({
  view,
  setView,
  setSelectedMarketId,
  children,
}: {
  view: AdminView;
  setView: (v: AdminView) => void;
  setSelectedMarketId?: (id: string | null) => void;
  children: ReactNode;
}) => {
  const { user, logout, isSuperAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigateTo = (v: AdminView) => {
    setView(v);
    setMobileOpen(false);
    if (v !== "market-detail" && v !== "edit-market") setSelectedMarketId?.(null);
  };

  const renderNav = () => (
    <nav className="flex flex-1 flex-col gap-6 px-3 py-6">
      {NAV_SECTIONS.map((section) => {
        const visible = section.items.filter((item) => !item.superAdminOnly || isSuperAdmin());
        if (visible.length === 0) return null;
        return (
          <div key={section.label}>
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {visible.map((item) => (
                <button
                  key={item.view}
                  onClick={() => navigateTo(item.view)}
                  className={classNames(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                    view === item.view
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-['Inter',sans-serif]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-gray-200 bg-white xl:flex xl:flex-col">
        <div className="flex items-center gap-3 px-5 py-5">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Back to Flippe">
            <FlippeSymbol size="sm" />
            <span className="text-sm font-extrabold tracking-wide text-gray-900">FLIPPE</span>
          </Link>
          <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600">Admin</span>
        </div>
        {renderNav()}
        <div className="border-t border-gray-100 px-3 py-4">
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
              {user?.username?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-gray-900">{user?.username}</div>
              <div className="truncate text-[10px] text-gray-400">{user?.role === "super_admin" ? "Super Admin" : "Admin"}</div>
            </div>
          </div>
          <div className="mt-3 flex gap-1">
            <Link
              to="/"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              App
            </Link>
            <button
              onClick={() => logout()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              <LogOut className="h-3 w-3" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-xl xl:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <div className="text-sm font-bold text-gray-900">{VIEW_TITLES[view]}</div>
            </div>
          </div>
          <Link to="/" className="flex items-center gap-1.5">
            <FlippeSymbol size="sm" />
          </Link>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] xl:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <FlippeSymbol size="sm" />
                <span className="text-sm font-extrabold">Admin</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderNav()}
            <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 px-3 py-4">
              <div className="flex items-center gap-3 px-2">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                  {user?.username?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold">{user?.username}</div>
                  <div className="truncate text-[10px] text-gray-400">{user?.role === "super_admin" ? "Super Admin" : "Admin"}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-1">
                <Link to="/" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">
                  App
                </Link>
                <button onClick={() => logout()} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">
                  <LogOut className="h-3 w-3" /> Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="pb-24 xl:ml-60 xl:pb-8">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};
