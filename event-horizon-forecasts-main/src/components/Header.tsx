import { Home, Menu, PieChart, Search, Shield, Wallet } from "lucide-react";
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
      {/* ── Desktop sidebar ── */}
      <aside
        className="fixed left-0 top-0 z-50 hidden h-screen w-64 border-r border-[#E5E7EB] bg-white p-5 shadow-[4px_0_24px_rgba(17,24,39,0.04)] xl:flex xl:flex-col"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <Link to="/" className="mb-8 flex items-center gap-3" aria-label="FLIPPE home">
          <FlippeWordmark size="md" tagline="Real-world prediction markets" />
        </Link>

        {/* Primary nav */}
        <nav className="flex-1 space-y-1" aria-label="Primary navigation">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              aria-label={item.label}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition-all duration-200",
                  isActive
                    ? "bg-[#4F46E5]/[0.06] text-[#4F46E5] shadow-[inset_3px_0_0_0_#4F46E5]"
                    : "text-[#6B7280] hover:bg-[#F8F7F4] hover:text-[#111827] hover:shadow-[inset_3px_0_0_0_#E5E7EB]",
                ].join(" ")
              }
            >
              <item.icon className="h-5 w-5 shrink-0" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}

          {(isAdmin() || isSuperAdmin()) && (
            <NavLink
              to={adminPath}
              aria-label="Admin dashboard"
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition-all duration-200",
                  isActive
                    ? "bg-[#4F46E5]/[0.06] text-[#4F46E5] shadow-[inset_3px_0_0_0_#4F46E5]"
                    : "text-[#6B7280] hover:bg-[#F8F7F4] hover:text-[#111827] hover:shadow-[inset_3px_0_0_0_#E5E7EB]",
                ].join(" ")
              }
            >
              <Shield className="h-5 w-5 shrink-0" strokeWidth={2} />
              Admin
            </NavLink>
          )}
        </nav>

        {/* Funds card */}
        <div className="relative overflow-hidden rounded-2xl p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] opacity-[0.92]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                Available
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15">
                <Wallet className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
              {formatNaira(user?.balance || 0)}
            </div>
            <Link
              to="/wallet"
              aria-label="Add funds to wallet"
              className="mt-4 flex h-10 items-center justify-center rounded-2xl bg-white/20 text-sm font-black text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/30 active:scale-[0.98]"
            >
              Add funds
            </Link>
          </div>
        </div>

        {/* User card */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8F7F4] p-3">
          <Link
            to={user ? "/more" : "/login"}
            aria-label={user ? "Account settings" : "Log in"}
            className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[#E5E7EB] bg-white text-sm font-black text-[#111827] transition-shadow hover:shadow-md"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              user?.username?.charAt(0).toUpperCase() || "?"
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-[#111827]">
              {user?.username || "Guest"}
            </div>
            <div className="truncate text-xs font-semibold text-[#6B7280]">
              {user?.email || "Sign in to start"}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Top header bar ── */}
      <header
        className="sticky top-0 z-40 hidden border-b border-[#E5E7EB] bg-white/80 backdrop-blur-xl md:block"
        role="banner"
      >
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-3 sm:px-6">
          {/* Logo – visible when sidebar is hidden */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="FLIPPE home">
            <FlippeSymbol size="sm" />
            <span className="text-lg font-black tracking-[0.04em] text-[#111827]">
              FLIPPE
            </span>
          </Link>

          {/* Search */}
          <Link
            to="/markets"
            aria-label="Search markets"
            className="ml-auto hidden h-10 max-w-md flex-1 items-center gap-2.5 rounded-2xl border border-[#E5E7EB] bg-[#F8F7F4] px-4 text-sm font-bold text-[#6B7280] transition-all duration-200 hover:border-[#4F46E5]/40 hover:bg-white hover:shadow-sm md:flex"
          >
            <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
            Search markets
          </Link>

          {/* Balance pill */}
          {user && (
            <Link
              to="/wallet"
              aria-label={`Wallet balance: ${formatNaira(user.balance)}`}
              className="hidden rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-black text-[#111827] transition-all duration-200 hover:border-[#4F46E5]/40 hover:shadow-sm md:block"
            >
              {formatNaira(user.balance)}
            </Link>
          )}

          {/* Notifications */}
          {user && <NotificationBell />}

          {/* Avatar */}
          <Link
            to={user ? "/more" : "/login"}
            aria-label={user ? "Account settings" : "Log in"}
            className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border-2 border-[#E5E7EB] bg-[#F3F4F6] text-sm font-black text-[#111827] transition-all duration-200 hover:border-[#4F46E5]/40 hover:shadow-md"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              user?.username?.charAt(0).toUpperCase() || "?"
            )}
          </Link>
        </div>
      </header>
    </>
  );
};
