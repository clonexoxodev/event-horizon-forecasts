import { Home, Menu, PieChart, Shield, Wallet } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import { NotificationBell } from "@/components/NotificationBell";
import { FlippeSymbol, FlippeWordmark } from "@/components/FlippeBrand";

const primaryNav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/portfolio", label: "My Predictions", icon: PieChart },
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
        className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/90 backdrop-blur-xl md:hidden"
        role="banner"
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2" aria-label="FLIPPE home">
            <FlippeSymbol size="sm" />
            <span className="text-base font-extrabold tracking-[0.04em] text-[#111827]">FLIPPE</span>
          </Link>
          <div className="flex items-center gap-1">
            {user && (
              <Link
                to="/wallet"
                aria-label={`Wallet: ${formatNaira(user.balance)}`}
                className="flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-2 py-1 text-[11px] font-bold text-[#111827]"
              >
                <Wallet className="h-3 w-3 text-[#4F46E5]" />
                {formatNaira(user.balance)}
              </Link>
            )}
            {user && <NotificationBell />}
            <Link
              to={user ? "/more" : "/login"}
              aria-label={user ? "Account" : "Log in"}
              className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border-2 border-[#E5E7EB] bg-[#F3F4F6] text-xs font-bold text-[#111827]"
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
        className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/80 backdrop-blur-xl hidden md:block xl:hidden"
        role="banner"
      >
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="FLIPPE home">
            <FlippeSymbol size="sm" />
            <span className="text-lg font-extrabold tracking-[0.04em] text-[#111827]">FLIPPE</span>
          </Link>
          <div className="flex-1" />
          {user && (
            <Link
              to="/wallet"
              aria-label={`Wallet: ${formatNaira(user.balance)}`}
              className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-bold text-[#111827] transition hover:border-[#4F46E5]/30 hover:shadow-sm"
            >
              <Wallet className="h-3.5 w-3.5 text-[#4F46E5]" />
              {formatNaira(user.balance)}
            </Link>
          )}
          {user && <NotificationBell />}
          <Link
            to={user ? "/more" : "/login"}
            aria-label={user ? "Account" : "Log in"}
            className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border-2 border-[#E5E7EB] bg-[#F3F4F6] text-sm font-bold text-[#111827] transition-all duration-150 hover:border-[#4F46E5]/40 hover:shadow-sm"
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
        className="fixed left-0 top-0 z-50 hidden h-screen w-64 border-r border-[#E5E7EB] bg-white xl:flex xl:flex-col"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="px-5 pt-6 pb-4">
          <Link to="/" className="flex items-center gap-3" aria-label="FLIPPE home">
            <FlippeWordmark size="md" tagline="Real-world prediction markets" />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label="Primary navigation">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              aria-label={item.label}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-150",
                  isActive
                    ? "bg-[#4F46E5]/[0.06] text-[#4F46E5]"
                    : "text-[#6B7280] hover:bg-[#F8F7F4] hover:text-[#111827]",
                ].join(" ")
              }
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}

          {(isAdmin() || isSuperAdmin()) && (
            <NavLink
              to={adminPath}
              aria-label="Admin dashboard"
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-150",
                  isActive
                    ? "bg-[#4F46E5]/[0.06] text-[#4F46E5]"
                    : "text-[#6B7280] hover:bg-[#F8F7F4] hover:text-[#111827]",
                ].join(" ")
              }
            >
              <Shield className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="mx-3 mb-3 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">Balance</span>
            <Wallet className="h-4 w-4 text-[#4F46E5]" strokeWidth={2} />
          </div>
          <div className="mt-1.5 text-xl font-black text-[#111827]">
            {formatNaira(user?.balance || 0)}
          </div>
          <Link
            to="/wallet"
            aria-label="Add funds"
            className="mt-3 flex h-9 items-center justify-center rounded-lg bg-[#4F46E5] text-xs font-bold text-white transition hover:bg-[#4338CA] active:scale-[0.98]"
          >
            Add funds
          </Link>
        </div>

        <div className="border-t border-[#E5E7EB] px-3 py-3">
          <Link
            to={user ? "/more" : "/login"}
            aria-label={user ? "Account settings" : "Log in"}
            className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-[#F8F7F4]"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-[#E5E7EB] bg-white text-sm font-bold text-[#111827]">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                user?.username?.charAt(0).toUpperCase() || "?"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-[#111827]">
                {user?.username || "Guest"}
              </div>
              <div className="truncate text-xs text-[#9CA3AF]">
                {user?.email || "Sign in"}
              </div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
};
