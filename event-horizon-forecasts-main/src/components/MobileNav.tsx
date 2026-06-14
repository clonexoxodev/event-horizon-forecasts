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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#263241] bg-[#080c10]/94 shadow-[0_-12px_30px_rgba(0,0,0,0.32)] backdrop-blur-xl md:hidden">
      <div className="grid h-16 grid-cols-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                isActive
                  ? "text-[#12B886]"
                  : "text-[#8B98A8] active:scale-95"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative ${isActive ? "scale-110" : ""} transition-transform duration-200`}>
                  <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#12B886]" />
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? "text-[#12B886]" : "text-[#8B98A8]"}`}>
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
