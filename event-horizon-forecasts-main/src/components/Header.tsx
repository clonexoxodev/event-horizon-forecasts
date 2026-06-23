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
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 border-r border-[#E5E7EB] bg-white/88 p-5 shadow-[12px_0_40px_rgba(17,24,39,0.06)] backdrop-blur-xl xl:block">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <FlippeWordmark size="md" tagline="Real-world prediction markets" />
        </Link>

        <nav className="space-y-1">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-black transition ${
                  isActive
                    ? "border border-[#E5E7EB] bg-[#F3F4F6] text-[#111827]"
                    : "text-[#6B7280] hover:bg-[#F8F7F4] hover:text-[#111827]"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
          {(isAdmin() || isSuperAdmin()) && (
            <NavLink
              to={adminPath}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-black transition ${
                  isActive ? "border border-[#E5E7EB] bg-[#F3F4F6] text-[#111827]" : "text-[#6B7280] hover:bg-[#F8F7F4] hover:text-[#111827]"
                }`
              }
            >
              <Shield className="h-5 w-5" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-[#E5E7EB] bg-[#F8F7F4] p-4">
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280]">
            <span>Available</span>
            <Wallet className="h-4 w-4 text-[#4F46E5]" />
          </div>
          <div className="mt-2 text-2xl font-black text-[#111827]">{formatNaira(user?.balance || 0)}</div>
          <Link to="/wallet" className="mt-4 flex h-10 items-center justify-center rounded-xl bg-[#4F46E5] text-sm font-black text-white transition hover:bg-[#4338CA]">
            Add funds
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-40 hidden border-b border-[#E5E7EB] bg-white/80 backdrop-blur-xl md:block">
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <FlippeSymbol size="sm" />
            <span className="text-xl font-black tracking-[0.04em] text-[#111827]">FLIPPE</span>
          </Link>

          <div className="ml-auto hidden h-10 max-w-md flex-1 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] px-3 text-sm font-bold text-[#6B7280] md:flex">
            <Search className="h-4 w-4" />
            Search markets
          </div>

          {user && (
            <Link to="/wallet" className="hidden rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-black text-[#111827] transition hover:border-[#4F46E5]/50 md:block">
              {formatNaira(user.balance)}
            </Link>
          )}
          {user && <NotificationBell />}
          <Link to={user ? "/more" : "/login"} className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-[#E5E7EB] bg-[#F3F4F6] text-sm font-black text-[#111827]">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : user?.username?.charAt(0).toUpperCase() || "?"}
          </Link>
        </div>
      </header>
    </>
  );
};
