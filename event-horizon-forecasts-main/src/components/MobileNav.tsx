import { Home, Flame, Wallet, Activity, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export const MobileNav = () => {
  const { user } = useAuth();

  if (!user) return null;

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/markets", icon: Flame, label: "Trending" },
    { to: "/wallet", icon: Wallet, label: "Wallet" },
    { to: "/activity", icon: Activity, label: "Activity" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070a14]/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-12px_30px_rgba(0,0,0,0.35)]">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                isActive
                  ? "text-violet-300"
                  : "text-slate-500 active:scale-95"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative ${isActive ? "scale-110" : ""} transition-transform duration-200`}>
                  <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400 shadow-[0_0_14px_rgba(167,139,250,0.9)] animate-pulse" />
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? "text-violet-300" : "text-slate-500"}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
