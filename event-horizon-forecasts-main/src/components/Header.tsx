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
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 border-r border-[#263241] bg-[#080c10]/96 p-5 backdrop-blur-xl xl:block">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <FlippeWordmark size="lg" tagline="Real-world prediction markets" />
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
                    ? "border border-[#263241] bg-[#151E28] text-white"
                    : "text-[#8B98A8] hover:bg-[#101720] hover:text-white"
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
                  isActive ? "border border-[#263241] bg-[#151E28] text-white" : "text-[#8B98A8] hover:bg-[#101720] hover:text-white"
                }`
              }
            >
              <Shield className="h-5 w-5" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-[#263241] bg-[#101720] p-4">
          <div className="flex items-center justify-between text-xs font-bold text-[#8B98A8]">
            <span>Available</span>
            <Wallet className="h-4 w-4 text-[#12B886]" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{formatNaira(user?.balance || 0)}</div>
          <Link to="/wallet" className="mt-4 flex h-10 items-center justify-center rounded-xl bg-[#12B886] text-sm font-black text-[#06100d] transition hover:bg-[#2dd4a0]">
            Add funds
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-40 hidden border-b border-[#263241] bg-[#080c10]/90 backdrop-blur-xl md:block">
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <FlippeSymbol size="md" />
            <span className="text-xl font-black tracking-[0.04em] text-white">FLIPPE</span>
          </Link>

          <div className="ml-auto hidden h-10 max-w-md flex-1 items-center gap-2 rounded-xl border border-[#263241] bg-[#101720] px-3 text-sm font-bold text-[#8B98A8] md:flex">
            <Search className="h-4 w-4" />
            Search markets
          </div>

          {user && (
            <Link to="/wallet" className="hidden rounded-xl border border-[#263241] bg-[#101720] px-3 py-2 text-sm font-black text-white transition hover:border-[#12B886]/60 md:block">
              {formatNaira(user.balance)}
            </Link>
          )}
          {user && <NotificationBell />}
          <Link to={user ? "/more" : "/login"} className="grid h-10 w-10 overflow-hidden rounded-full border border-[#263241] bg-[#151E28] text-sm font-black text-white">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : user?.username?.charAt(0).toUpperCase() || "?"}
          </Link>
        </div>
      </header>
    </>
  );
};
