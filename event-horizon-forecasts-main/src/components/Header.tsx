import { Home, Menu, PieChart, Search, Shield, Wallet, Zap } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import { NotificationBell } from "@/components/NotificationBell";

const primaryNav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/portfolio", label: "Portfolio", icon: PieChart },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/more", label: "More", icon: Menu },
];

export const Header = () => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const adminPath = isSuperAdmin() ? "/super-admin" : "/admin";

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 border-r border-white/10 bg-[#060914]/92 p-5 backdrop-blur-2xl xl:block">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500 text-lg font-black text-white shadow-[0_0_28px_rgba(139,92,246,0.45)]">
            F
          </div>
          <div>
            <div className="text-xl font-black tracking-tight text-white">Flippe</div>
            <div className="text-xs font-bold text-violet-200/70">Social prediction fintech</div>
          </div>
        </Link>

        <nav className="space-y-1">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                  isActive
                    ? "bg-white text-[#050711] shadow-[0_0_32px_rgba(255,255,255,0.12)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
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
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                  isActive ? "bg-violet-500/20 text-violet-100" : "text-slate-500 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Shield className="h-5 w-5" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Available</span>
            <Zap className="h-4 w-4 text-amber-300" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{formatNaira(user?.balance || 0)}</div>
          <Link to="/wallet" className="mt-4 flex h-10 items-center justify-center rounded-xl bg-violet-500 text-sm font-black text-white transition hover:bg-violet-400">
            Add funds
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-40 hidden border-b border-white/10 bg-[#060914]/78 backdrop-blur-2xl md:block">
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-500 text-sm font-black text-white shadow-[0_0_24px_rgba(139,92,246,0.38)]">
              F
            </div>
            <span className="text-xl font-black tracking-tight text-white">Flippe</span>
          </Link>

          <div className="ml-auto hidden h-10 max-w-md flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-3 text-sm font-bold text-slate-500 md:flex">
            <Search className="h-4 w-4" />
            Search markets
          </div>

          {user && (
            <Link to="/wallet" className="hidden rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 text-sm font-black text-white md:block">
              {formatNaira(user.balance)}
            </Link>
          )}
          {user && <NotificationBell />}
          <Link to={user ? "/more" : "/login"} className="grid h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-sm font-black text-white">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : user?.username?.charAt(0).toUpperCase() || "?"}
          </Link>
        </div>
      </header>
    </>
  );
};
