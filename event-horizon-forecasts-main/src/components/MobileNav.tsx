import { Home, MoreHorizontal, Target, Wallet } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const baseNavItems = [
  { key: "home", to: "/", icon: Home, label: "Home", end: true },
  { key: "my-arguments", to: "/my-arguments", icon: Target, label: "My Arguments", protected: true },
  { key: "wallet", to: "/wallet", icon: Wallet, label: "Wallet", protected: true },
  { key: "more", to: "/more", icon: MoreHorizontal, label: "More" },
] as const;

export const MobileNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const signInState = { from: location };

  const navItems = baseNavItems.map((item) => ({
    ...item,
    to: (item as any).protected && !user ? "/login" : item.to,
    state: (item as any).protected && !user ? signInState : undefined,
  }));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-flippe-border bg-flippe-surface/95 backdrop-blur-2xl md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="grid h-16 grid-cols-4 px-1 pt-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            state={item.state}
            end={(item as any).end}
            aria-label={item.label}
            className={({ isActive }) =>
              [
                "flex flex-col items-center justify-center gap-1 transition-all duration-200",
                isActive ? "text-flippe-accent" : "text-flippe-muted active:scale-95",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative flex h-9 w-14 items-center justify-center rounded-xl transition-all duration-200">
                  {isActive && (
                    <span className="absolute inset-0 rounded-xl bg-flippe-accent/10" />
                  )}
                  <item.icon
                    className="relative h-[20px] w-[20px]"
                    strokeWidth={isActive ? 2.3 : 1.6}
                  />
                </span>
                <span
                  className={`text-[10px] leading-none tracking-wide ${
                    isActive ? "font-bold text-flippe-accent" : "font-medium"
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