import { Home, Briefcase, Wallet, MoreHorizontal } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export const MobileNav = () => {
  const { user } = useAuth();

  if (!user) return null;

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/wallet", icon: Wallet, label: "Wallet" },
    { to: "/portfolio", icon: Briefcase, label: "Portfolio" },
    { to: "/more", icon: MoreHorizontal, label: "More" },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-graphite/10 shadow-elevated">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                isActive
                  ? "text-purple"
                  : "text-graphite active:scale-95"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative ${isActive ? "scale-110" : ""} transition-transform duration-200`}>
                  <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple animate-pulse" />
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? "text-purple" : "text-graphite"}`}>
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
