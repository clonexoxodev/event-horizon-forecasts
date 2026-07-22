import { Home, Menu, PieChart, Wallet } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useNotifications } from "@/lib/notification-context";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/portfolio", icon: PieChart, label: "Positions" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
  { to: "/more", icon: Menu, label: "More" },
];

export const MobileNav = () => {
  const { unreadCount } = useNotifications();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E7EB]/50 bg-white/80 backdrop-blur-2xl md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="grid h-16 grid-cols-4 px-1 pt-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            aria-label={item.label}
            className={({ isActive }) =>
              [
                "flex flex-col items-center justify-center gap-1 transition-all duration-200",
                isActive
                  ? "text-[#4F46E5]"
                  : "text-[#9CA3AF] active:scale-95",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative flex h-8 w-14 items-center justify-center rounded-xl transition-all duration-200">
                  {isActive && (
                    <span className="absolute inset-0 rounded-xl bg-[#4F46E5]/[0.07]" />
                  )}
                  <item.icon
                    className="relative h-[22px] w-[22px]"
                    strokeWidth={isActive ? 2.3 : 1.6}
                  />
                  {item.to === "/" && unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#E85D5D] px-1 text-[9px] font-bold text-white shadow-sm shadow-[#E85D5D]/30">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] leading-none tracking-wide ${
                    isActive ? "font-bold" : "font-medium"
                  }`}
                >
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
