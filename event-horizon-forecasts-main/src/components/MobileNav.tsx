import { Home, Menu, PieChart, Wallet } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/portfolio", icon: PieChart, label: "My Predictions" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
  { to: "/more", icon: Menu, label: "More" },
];

export const MobileNav = () => (
  <nav
    className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E7EB]/80 bg-white/70 backdrop-blur-xl md:hidden"
    role="navigation"
    aria-label="Mobile navigation"
    style={{
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}
  >
    <div className="grid h-[68px] grid-cols-4 px-1 pt-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          aria-label={item.label}
          className={({ isActive }) =>
            [
              "flex flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-200",
              isActive
                ? "text-[#4F46E5]"
                : "text-[#6B7280] active:scale-90",
            ].join(" ")
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={[
                  "relative flex h-10 w-16 items-center justify-center rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-[#4F46E5]/[0.08]"
                    : "bg-transparent",
                ].join(" ")}
              >
                <item.icon
                  className="h-[22px] w-[22px] transition-transform duration-200"
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {isActive && (
                  <span className="absolute -top-1 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-[#4F46E5]" />
                )}
              </span>
              <span
                className={[
                  "text-[10px] leading-none transition-all duration-200",
                  isActive
                    ? "font-black text-[#4F46E5]"
                    : "font-semibold text-[#6B7280]",
                ].join(" ")}
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
