import { Search, User, Bell, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import { useState } from "react";

export const Header = () => {
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-premium bg-card/70 border-b border-border/40 shadow-xs">
      <div className="container max-w-[1280px] mx-auto py-2.5 px-4 sm:px-6 flex items-center gap-2.5">
        {/* Logo */}
        <Link
          to="/"
          className="font-bold text-[19px] tracking-tighter shrink-0 flex items-center gap-0.5 hover:opacity-80 transition-micro text-charcoal"
        >
          Flippe<span className="text-purple text-[22px] leading-none">.</span>
        </Link>

        {/* Desktop search */}
        <div className="relative flex-1 max-w-sm hidden sm:block">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-graphite pointer-events-none" />
          <Input
            placeholder="Search markets..."
            className="pl-8 h-8 bg-graphite/6 border-transparent focus:border-purple/30 focus:bg-card rounded-lg text-[13px] transition-fast placeholder:text-graphite/60"
          />
        </div>

        {/* Mobile search toggle */}
        {searchOpen && (
          <div className="absolute inset-x-0 top-0 z-50 flex items-center gap-2 px-4 h-[52px] bg-card border-b border-border/40 sm:hidden shadow-sm">
            <Search className="w-4 h-4 text-graphite shrink-0" />
            <Input
              autoFocus
              placeholder="Search markets..."
              className="flex-1 h-8 border-none bg-transparent focus-visible:ring-0 text-[13px] p-0"
            />
            <button onClick={() => setSearchOpen(false)} className="text-graphite hover:text-charcoal transition-micro">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden w-8 h-8 rounded-lg grid place-items-center text-graphite hover:text-charcoal hover:bg-graphite/6 transition-micro"
          >
            <Search className="w-4 h-4" />
          </button>

          {user ? (
            <>
              {/* Balance chip */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-purple/8 border border-purple/15 text-[13px] font-semibold text-purple">
                <span className="w-1.5 h-1.5 rounded-full bg-purple animate-pulse" />
                {formatNaira(user.balance)}
              </div>

              {/* Notifications */}
              <NavLink
                to="/notifications"
                className={({ isActive }) =>
                  `relative w-8 h-8 rounded-lg grid place-items-center transition-micro ${
                    isActive
                      ? "bg-purple/10 text-purple"
                      : "text-graphite hover:text-charcoal hover:bg-graphite/6"
                  }`
                }
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple" />
              </NavLink>

              <NavLink
                to="/wallet"
                className={({ isActive }) =>
                  `hidden sm:block text-[13px] font-semibold px-2.5 py-1.5 rounded-lg transition-micro ${
                    isActive
                      ? "bg-purple/10 text-purple"
                      : "text-graphite hover:text-charcoal hover:bg-graphite/6"
                  }`
                }
              >
                Wallet
              </NavLink>

              <NavLink
                to="/portfolio"
                className={({ isActive }) =>
                  `hidden sm:block text-[13px] font-semibold px-2.5 py-1.5 rounded-lg transition-micro ${
                    isActive
                      ? "bg-purple/10 text-purple"
                      : "text-graphite hover:text-charcoal hover:bg-graphite/6"
                  }`
                }
              >
                Portfolio
              </NavLink>

              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `text-[13px] font-semibold px-2.5 py-1.5 rounded-lg transition-micro ${
                    isActive
                      ? "bg-purple/10 text-purple"
                      : "text-graphite hover:text-charcoal hover:bg-graphite/6"
                  }`
                }
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `w-8 h-8 rounded-full grid place-items-center transition-micro shadow-sm ${
                    isActive
                      ? "bg-purple text-white"
                      : "bg-charcoal text-off-white hover:bg-charcoal/80"
                  }`
                }
                aria-label="Profile"
              >
                <User className="w-4 h-4" />
              </NavLink>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-graphite hover:text-charcoal hover:bg-graphite/6 rounded-lg text-[13px] font-semibold"
                >
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="sm"
                  className="bg-gradient-hero text-white hover:opacity-90 rounded-lg shadow-sm font-semibold text-[13px] h-8"
                >
                  Sign up free
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
