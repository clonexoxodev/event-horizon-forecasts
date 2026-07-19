import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CheckCircle,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Plus,
  ReceiptText,
  RefreshCcw,
  Settings as SettingsIcon,
  ShieldPlus,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { FlippeSymbol } from "@/components/FlippeBrand";
import type { AdminView } from "./types";
import { classNames } from "./utils";

const navItems: Array<{
  id: AdminView;
  label: string;
  hint: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    hint: "Platform health",
    icon: LayoutDashboard,
  },
  { id: "markets", label: "Markets", hint: "Operate markets", icon: BarChart3 },
  { id: "create", label: "Create Market", hint: "Publish safely", icon: Plus },
  {
    id: "resolution",
    label: "Resolution",
    hint: "Settle outcomes",
    icon: CheckCircle,
  },
  { id: "finance", label: "Finance", hint: "Deposits & withdrawals", icon: Wallet },
  {
    id: "transactions",
    label: "Transactions",
    hint: "Ledger search",
    icon: ReceiptText,
  },
  { id: "users", label: "Users", hint: "Account visibility", icon: Users },
  { id: "add-admin", label: "Admin Roles", hint: "Access control", icon: ShieldPlus },
  { id: "reports", label: "Reports", hint: "Operational reports", icon: FileText },
  { id: "settings", label: "Settings", hint: "Platform controls", icon: SettingsIcon },
];

export { navItems };

const AdminSidebar = ({
  view,
  setView,
  isSuperAdmin,
}: {
  view: AdminView;
  setView: (v: AdminView) => void;
  isSuperAdmin: boolean;
}) => (
  <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-[#E5E7EB] bg-white px-5 py-6 xl:block">
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-8 flex shrink-0 items-center gap-3">
        <FlippeSymbol size="lg" />
        <div>
          <p className="text-lg font-semibold tracking-[0.04em]">FLIPPE Admin</p>
          <p className="text-sm text-[#667085]">
            {isSuperAdmin ? "Super admin console" : "Admin console"}
          </p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-color:#263241_transparent]">
        {navItems
          .filter((item) => isSuperAdmin || item.id !== "add-admin")
          .map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={classNames(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                  active
                    ? "bg-[#EEF2FF] text-[#4F46E5] shadow-[inset_3px_0_0_#4F46E5]"
                    : "text-[#667085] hover:bg-[#F3F4F6] hover:text-[#101828]"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="block text-xs text-[#667085]">{item.hint}</span>
                </span>
                {active && <ChevronRight className="h-4 w-4 text-[#4F46E5]" />}
              </button>
            );
          })}
      </nav>
    </div>
  </aside>
);

const AdminHeader = ({
  view,
  isSuperAdmin,
  onRefresh,
  onCreateMarket,
}: {
  view: AdminView;
  isSuperAdmin: boolean;
  onRefresh: () => void;
  onCreateMarket: () => void;
}) => (
  <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-[#F8F7F4]/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5]">
          Operations
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {navItems.find((item) => item.id === view)?.label || "Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-[#667085]">
          Real platform controls for markets, users, finance, and risk.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="border-[#E5E7EB] bg-white text-[#344054] hover:bg-[#F3F4F6]"
          onClick={onRefresh}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button
          className="bg-[#4F46E5] text-[#FFFFFF] hover:bg-[#4338CA]"
          onClick={onCreateMarket}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Market
        </Button>
      </div>
    </div>

    <div className="mt-4 flex gap-2 overflow-x-auto xl:hidden">
      {navItems
        .filter((item) => isSuperAdmin || item.id !== "add-admin")
        .map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={classNames(
              "whitespace-nowrap rounded-full border px-4 py-2 text-sm",
              view === item.id
                ? "border-[#4F46E5] bg-[#4F46E5] text-[#FFFFFF]"
                : "border-[#E5E7EB] bg-white text-[#667085]"
            )}
          >
            {item.label}
          </button>
        ))}
    </div>
  </header>
);

export const AdminLayout = ({
  view,
  setView,
  isSuperAdmin,
  loading,
  authLoading,
  onRefresh,
  onCreateMarket,
  children,
}: {
  view: AdminView;
  setView: (v: AdminView) => void;
  isSuperAdmin: boolean;
  loading: boolean;
  authLoading: boolean;
  onRefresh: () => void;
  onCreateMarket: () => void;
  children: ReactNode;
}) => (
  <div className="min-h-screen bg-[#F8F7F4] text-[#101828]">
    <AdminSidebar view={view} setView={setView} isSuperAdmin={isSuperAdmin} />

    <div className="xl:pl-72">
      <AdminHeader
        view={view}
        isSuperAdmin={isSuperAdmin}
        onRefresh={onRefresh}
        onCreateMarket={onCreateMarket}
      />

      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  </div>
);
