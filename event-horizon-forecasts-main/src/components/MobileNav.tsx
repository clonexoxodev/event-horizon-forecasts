import { Home, Menu, PieChart, Wallet } from "lucide-react";
import { NavLink } from "react-router-dom";

export const MobileNav = () => {
  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/portfolio", icon: PieChart, label: "Portfolio" },
    { to: "/wallet", icon: Wallet, label: "Wallet" },
    { to: "/more", icon: Menu, label: "More" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#070a14]/92 shadow-[0_-12px_30px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:hidden">
      <div className="grid h-16 grid-cols-4">
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
