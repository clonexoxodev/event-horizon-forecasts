import { Home, Menu, PieChart, Wallet } from "lucide-react";
import { NavLink } from "react-router-dom";

export const MobileNav = () => {
  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/portfolio", icon: PieChart, label: "My Predictions" },
    { to: "/wallet", icon: Wallet, label: "Wallet" },
    { to: "/more", icon: Menu, label: "More" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E7EB] bg-white/88 shadow-[0_-12px_30px_rgba(17,24,39,0.08)] backdrop-blur-xl md:hidden">
      <div className="grid h-16 grid-cols-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                isActive
                  ? "text-[#4F46E5]"
                  : "text-[#6B7280] active:scale-95"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative ${isActive ? "scale-110" : ""} transition-transform duration-200`}>
                  <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#4F46E5]" />
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? "text-[#4F46E5]" : "text-[#6B7280]"}`}>
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
