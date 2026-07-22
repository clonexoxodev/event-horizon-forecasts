import { Home, ListOrdered, Menu, PieChart, Wallet } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/positions", icon: PieChart, label: "Positions" },
  { to: "/orders", icon: ListOrdered, label: "Orders" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
  { to: "/more", icon: Menu, label: "More" },
];

export const MobileNav = () => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E7EB]/50 bg-white/80 backdrop-blur-2xl md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="grid h-16 grid-cols-5 px-1 pt-1.5">
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
                <span className="relative flex h-8 w-12 items-center justify-center rounded-xl transition-all duration-200">
                  {isActive && (
                    <span className="absolute inset-0 rounded-xl bg-[#4F46E5]/[0.07]" />
                  )}
                  <item.icon
                    className="relative h-[20px] w-[20px]"
                    strokeWidth={isActive ? 2.3 : 1.6}
                  />
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
