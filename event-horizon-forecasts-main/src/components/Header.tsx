import { Home, Menu, PieChart, Shield, Wallet } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import { NotificationBell } from "@/components/NotificationBell";
import { FlippeSymbol, FlippeWordmark } from "@/components/FlippeBrand";

const primaryNav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/portfolio", label: "My Positions", icon: PieChart },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/more", label: "More", icon: Menu },
];

export const Header = () => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const adminPath = isSuperAdmin() ? "/super-admin" : "/admin";

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          MOBILE HEADER (below md) — single source of truth on mobile
          ═══════════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-40 border-b border-[#E5E7EB]/60 bg-white/80 backdrop-blur-2xl md:hidden"
        role="banner"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="FLIPPE home">
            <FlippeSymbol size="sm" />
            <span className="text-[15px] font-black tracking-[0.08em] text-[#111827]">FLIPPE</span>
          </Link>
          <div className="flex items-center gap-1.5">
            {user && (
              <Link
                to="/wallet"
                aria-label={`Wallet: ${formatNaira(user.balance)}`}
                className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB]/80 bg-white/60 px-2.5 py-1 text-[11px] font-bold text-[#374151] transition-all duration-200 hover:border-[#4F46E5]/25 hover:shadow-sm"
              >
                <Wallet className="h-3 w-3 text-[#4F46E5]" />
                <span>{formatNaira(user.balance)}</span>
              </Link>
            )}
            {user && <NotificationBell />}
            <Link
              to={user ? "/more" : "/login"}
              aria-label={user ? "Account" : "Log in"}
              className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-[#E5E7EB]/80 bg-[#F9FAFB] text-[11px] font-bold text-[#374151] transition-all duration-200 hover:border-[#4F46E5]/30 hover:shadow-sm"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                user?.username?.charAt(0).toUpperCase() || "?"
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          TABLET TOP BAR (md to xl) — sidebar takes over at xl
          ═══════════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-40 border-b border-[#E5E7EB]/60 bg-white/80 backdrop-blur-2xl hidden md:block xl:hidden"
        role="banner"
      >
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-5 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="FLIPPE home">
            <FlippeSymbol size="sm" />
            <span className="text-[15px] font-black tracking-[0.08em] text-[#111827]">FLIPPE</span>
          </Link>
          <div className="flex-1" />
          {user && (
            <Link
              to="/wallet"
              aria-label={`Wallet: ${formatNaira(user.balance)}`}
              className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB]/80 bg-white/60 px-3 py-1.5 text-sm font-bold text-[#374151] transition-all duration-200 hover:border-[#4F46E5]/25 hover:shadow-sm"
            >
              <Wallet className="h-3.5 w-3.5 text-[#4F46E5]" />
              <span>{formatNaira(user.balance)}</span>
            </Link>
          )}
          {user && <NotificationBell />}
          <Link
            to={user ? "/more" : "/login"}
            aria-label={user ? "Account" : "Log in"}
            className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[#E5E7EB]/80 bg-[#F9FAFB] text-sm font-bold text-[#374151] transition-all duration-200 hover:border-[#4F46E5]/30 hover:shadow-sm"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              user?.username?.charAt(0).toUpperCase() || "?"
            )}
          </Link>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          DESKTOP SIDEBAR (xl+) — sole navigation on desktop
          ═══════════════════════════════════════════════════════════ */}
      <aside
        className="fixed left-0 top-0 z-50 hidden h-screen w-64 border-r border-[#E5E7EB]/60 bg-white xl:flex xl:flex-col"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="px-5 pt-7 pb-5">
          <Link to="/" className="flex items-center gap-3" aria-label="FLIPPE home">
            <FlippeWordmark size="md" tagline="Trade real-world outcomes" />
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 px-3" aria-label="Primary navigation">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              aria-label={item.label}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200",
                  isActive
                    ? "bg-[#4F46E5]/[0.06] text-[#4F46E5] shadow-sm shadow-[#4F46E5]/[0.04]"
                    : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]",
                ].join(" ")
              }
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}

          {(isAdmin() || isSuperAdmin()) && (
            <div className="mt-4 border-t border-[#E5E7EB]/50 pt-4">
              <NavLink
                to={adminPath}
                aria-label="Admin dashboard"
                className={({ isActive }) =>
                  [
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200",
                    isActive
                      ? "bg-[#4F46E5]/[0.06] text-[#4F46E5]"
                      : "text-[#9CA3AF] hover:bg-[#F9FAFB] hover:text-[#6B7280]",
                  ].join(" ")
                }
              >
                <Shield className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                Admin
              </NavLink>
            </div>
          )}
        </nav>

        <div className="mx-3 mb-3 rounded-xl border border-[#E5E7EB]/70 bg-gradient-to-br from-[#F9FAFB] to-[#F3F4F6]/80 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF]">
              Balance
            </span>
            <Wallet className="h-3.5 w-3.5 text-[#4F46E5]" strokeWidth={2.5} />
          </div>
          <div className="mt-2 text-xl font-black tracking-tight text-[#111827]">
            {formatNaira(user?.balance || 0)}
          </div>
          <Link
            to="/wallet"
            aria-label="Add funds"
            className="mt-3 flex h-9 items-center justify-center rounded-lg bg-[#4F46E5] text-xs font-bold text-white transition-all duration-200 hover:bg-[#4338CA] hover:shadow-md hover:shadow-[#4F46E5]/20 active:scale-[0.98]"
          >
            Add funds
          </Link>
        </div>

        <div className="border-t border-[#E5E7EB]/50 px-3 py-3">
          <Link
            to={user ? "/more" : "/login"}
            aria-label={user ? "Account settings" : "Log in"}
            className="flex items-center gap-3 rounded-xl p-2 transition-all duration-200 hover:bg-[#F9FAFB]"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-[#E5E7EB]/70 bg-white text-sm font-bold text-[#374151]">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                user?.username?.charAt(0).toUpperCase() || "?"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-[#111827]">
                {user?.username || "Guest"}
              </div>
              <div className="truncate text-[11px] text-[#9CA3AF]">
                {user?.email || "Sign in"}
              </div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
};
