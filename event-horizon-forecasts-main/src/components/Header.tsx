import { Home, MoreHorizontal, Shield, Target, Wallet, PlusCircle } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import { NotificationBell } from "@/components/NotificationBell";
import { FlippeSymbol, FlippeWordmark } from "@/components/FlippeBrand";

const primaryNav = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/my-arguments", label: "My Arguments", icon: Target },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/more", label: "More", icon: MoreHorizontal },
];

const NAV_ACTIVE = "bg-flippe-accent/10 text-flippe-accent shadow-sm shadow-flippe-accent/5";
const NAV_IDLE = "text-flippe-muted hover:bg-flippe-surface-2 hover:text-flippe-text";

export const Header = () => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();
  const adminPath = isSuperAdmin() ? "/super-admin" : "/admin";
  const signInState = { from: location };

  return (
    <>
      {/* MOBILE HEADER */}
      <header
        className="sticky top-0 z-40 border-b border-flippe-border bg-flippe-bg/85 backdrop-blur-2xl md:hidden"
        role="banner"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="FLIPPE home">
            <FlippeSymbol size="sm" />
            <span className="text-[15px] font-black tracking-[0.08em] text-flippe-text">FLIPPE</span>
          </Link>
          <div className="flex items-center gap-1.5">
            {user && (
              <Link
                to="/wallet"
                aria-label={`Wallet: ${formatNaira(user.balance)}`}
                className="flex items-center gap-1.5 rounded-full border border-flippe-border bg-flippe-surface-2 px-2.5 py-1 text-[11px] font-bold text-flippe-text transition-all duration-200 hover:border-flippe-accent/25 hover:shadow-sm"
              >
                <Wallet className="h-3 w-3 text-flippe-accent" />
                <span>{formatNaira(user.balance)}</span>
              </Link>
            )}
            {user && <NotificationBell />}
            <Link
              to={user ? "/profile" : "/login"}
              state={user ? undefined : signInState}
              aria-label={user ? "Account" : "Log in"}
              className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-flippe-border bg-flippe-surface-2 text-[11px] font-bold text-flippe-text transition-all duration-200 hover:border-flippe-accent/30 hover:shadow-sm"
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

      {/* TABLET TOP BAR */}
      <header
        className="sticky top-0 z-40 border-b border-flippe-border bg-flippe-bg/85 backdrop-blur-2xl hidden md:block xl:hidden"
        role="banner"
      >
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-5 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="FLIPPE home">
            <FlippeSymbol size="sm" />
            <span className="text-[15px] font-black tracking-[0.08em] text-flippe-text">FLIPPE</span>
          </Link>
          <nav className="ml-6 flex items-center gap-1" aria-label="Primary navigation">
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={(item as any).end}
                aria-label={item.label}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold transition-all duration-200 ${isActive ? NAV_ACTIVE : NAV_IDLE}`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex-1" />
          {user && (
            <Link
              to="/wallet"
              aria-label={`Wallet: ${formatNaira(user.balance)}`}
              className="flex items-center gap-1.5 rounded-full border border-flippe-border bg-flippe-surface-2 px-3 py-1.5 text-sm font-bold text-flippe-text transition-all duration-200 hover:border-flippe-accent/25 hover:shadow-sm"
            >
              <Wallet className="h-3.5 w-3.5 text-flippe-accent" />
              <span>{formatNaira(user.balance)}</span>
            </Link>
          )}
          {user && <NotificationBell />}
          <Link
            to={user ? "/profile" : "/login"}
            state={user ? undefined : signInState}
            aria-label={user ? "Account" : "Log in"}
            className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-flippe-border bg-flippe-surface-2 text-sm font-bold text-flippe-text transition-all duration-200 hover:border-flippe-accent/30 hover:shadow-sm"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              user?.username?.charAt(0).toUpperCase() || "?"
            )}
          </Link>
        </div>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside
        className="fixed left-0 top-0 z-50 hidden h-screen w-64 border-r border-flippe-border bg-flippe-bg xl:flex xl:flex-col"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="px-5 pt-7 pb-5">
          <Link to="/" className="flex items-center gap-3" aria-label="FLIPPE home">
            <FlippeWordmark size="md" tagline="Settle arguments with real football" />
          </Link>
          <div className="mt-4">
            <Link
              to="/"
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-flippe-accent text-xs font-bold text-flippe-onaccent transition-all duration-200 hover:bg-flippe-accent-strong hover:shadow-md hover:shadow-flippe-accent/20 active:scale-[0.98]"
            >
              <PlusCircle className="h-4 w-4" strokeWidth={2.2} />
              Start an argument
            </Link>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3" aria-label="Primary navigation">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={(item as any).end}
              aria-label={item.label}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200",
                  isActive ? NAV_ACTIVE : NAV_IDLE,
                ].join(" ")
              }
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}

          {(isAdmin() || isSuperAdmin()) && (
            <div className="mt-4 border-t border-flippe-border pt-4">
              <NavLink
                to={adminPath}
                aria-label="Admin dashboard"
                className={({ isActive }) =>
                  [
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200",
                    isActive ? NAV_ACTIVE : "text-flippe-muted hover:bg-flippe-surface-2 hover:text-flippe-text",
                  ].join(" ")
                }
              >
                <Shield className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                Admin
              </NavLink>
            </div>
          )}
        </nav>

        {user ? (
          <div className="mx-3 mb-3 rounded-xl border border-flippe-border bg-gradient-to-br from-flippe-surface to-flippe-surface-2 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-flippe-muted">
                Balance
              </span>
              <Wallet className="h-3.5 w-3.5 text-flippe-accent" strokeWidth={2.5} />
            </div>
            <div className="mt-2 text-xl font-black tracking-tight text-flippe-text">
              {formatNaira(user.balance)}
            </div>
            <Link
              to="/wallet"
              aria-label="Add funds"
              className="mt-3 flex h-9 items-center justify-center rounded-lg bg-flippe-accent text-xs font-bold text-flippe-onaccent transition-all duration-200 hover:bg-flippe-accent-strong hover:shadow-md hover:shadow-flippe-accent/20 active:scale-[0.98]"
            >
              Add funds
            </Link>
          </div>
        ) : (
          <div className="mx-3 mb-3 rounded-xl border border-flippe-border bg-flippe-surface p-4 text-center">
            <div className="text-[11px] font-bold text-flippe-muted">Sign in to start arguing</div>
            <Link
              to="/login"
              state={signInState}
              className="mt-3 flex h-9 items-center justify-center rounded-lg bg-flippe-accent text-xs font-bold text-flippe-onaccent transition-all duration-200 hover:bg-flippe-accent-strong"
            >
              Sign in
            </Link>
          </div>
        )}

        <div className="border-t border-flippe-border px-3 py-3">
          <Link
            to={user ? "/profile" : "/login"}
            state={user ? undefined : signInState}
            aria-label={user ? "Account settings" : "Log in"}
            className="flex items-center gap-3 rounded-xl p-2 transition-all duration-200 hover:bg-flippe-surface-2"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-flippe-border bg-flippe-surface-2 text-sm font-bold text-flippe-text">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                user?.username?.charAt(0).toUpperCase() || "?"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-flippe-text">
                {user?.username || "Guest"}
              </div>
              <div className="truncate text-[11px] text-flippe-muted">
                {user?.email || "Sign in"}
              </div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
};