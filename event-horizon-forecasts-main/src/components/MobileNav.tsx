import { Compass, PlusCircle, Target, User, Wallet } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const baseNavItems = [
  { key: "discover", to: "/", icon: Compass, label: "Discover" },
  { key: "predictions", to: "/predictions", icon: Target, label: "Predictions", protected: true },
  { key: "create", to: "/create", icon: PlusCircle, label: "Create", prominent: true, protected: true },
  { key: "wallet", to: "/wallet", icon: Wallet, label: "Wallet", protected: true },
  { key: "profile", to: "/profile", icon: User, label: "Profile", protected: true },
] as const;

export const MobileNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const signInState = { from: location };

  const navItems = baseNavItems.map((item) => ({
    ...item,
    to: item.protected && !user ? "/login" : item.to,
    state: item.protected && !user ? signInState : undefined,
  }));
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E7EB]/50 bg-white/85 backdrop-blur-2xl md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="grid h-16 grid-cols-5 px-1 pt-1.5">
        {navItems.map((item) =>
          item.prominent ? (
            <NavLink
              key={item.key}
              to={item.to}
              state={item.state}
              aria-label={item.label}
              className={({ isActive }) =>
                [
                  "relative flex flex-col items-center justify-center gap-1 transition-all duration-200",
                  isActive ? "text-[#4F46E5]" : "text-[#9CA3AF] active:scale-95",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4F46E5] text-white shadow-lg shadow-[#4F46E5]/30 transition-all duration-200">
                    <item.icon className="h-5 w-5" strokeWidth={2.4} />
                  </span>
                  <span
                    className={`text-[10px] leading-none tracking-wide ${
                      isActive ? "font-bold text-[#4F46E5]" : "font-medium"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ) : (
            <NavLink
              key={item.key}
              to={item.to}
              state={item.state}
              end={item.to === "/"}
              aria-label={item.label}
              className={({ isActive }) =>
                [
                  "flex flex-col items-center justify-center gap-1 transition-all duration-200",
                  isActive ? "text-[#4F46E5]" : "text-[#9CA3AF] active:scale-95",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative flex h-9 w-12 items-center justify-center rounded-xl transition-all duration-200">
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
          )
        )}
      </div>
    </nav>
  );
};