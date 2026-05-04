import { Search, User, Bell, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import { useState } from "react";

export const Header = () => {
  const { user, setAuthOpen, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/60">
      <div className="container py-3 flex items-center gap-3">
        {/* Logo */}
        <Link
          to="/"
          className="font-bold text-xl tracking-tight shrink-0 flex items-center gap-0.5 hover:opacity-80 transition-smooth"
        >
          Flippe<span className="text-primary text-2xl leading-none">.</span>
        </Link>

        {/* Desktop search */}
        <div className="relative flex-1 max-w-xs hidden sm:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search markets..."
            className="pl-9 h-9 bg-secondary/60 border-transparent focus:border-primary/40 focus:bg-card rounded-xl text-sm transition-smooth"
          />
        </div>

        {/* Mobile search toggle */}
        {searchOpen && (
          <div className="absolute inset-x-0 top-0 z-50 flex items-center gap-2 px-4 h-[57px] bg-card border-b border-border sm:hidden">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              autoFocus
              placeholder="Search markets..."
              className="flex-1 h-9 border-none bg-transparent focus-visible:ring-0 text-sm p-0"
            />
            <button onClick={() => setSearchOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden w-9 h-9 rounded-xl grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth"
          >
            <Search className="w-4 h-4" />
          </button>

          {user ? (
            <>
              {/* Balance chip */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary/10 border border-primary/20 text-sm font-semibold text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                {formatNaira(user.balance)}
              </div>

              {/* Notifications */}
              <button className="relative w-9 h-9 rounded-xl grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
              </button>

              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `text-sm font-medium px-3 py-2 rounded-xl transition-smooth ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`
                }
              >
                Dashboard
              </NavLink>

              <button
                onClick={logout}
                className="w-9 h-9 rounded-full bg-foreground text-background grid place-items-center hover:bg-foreground/80 transition-smooth shadow-sm"
                aria-label="Profile"
              >
                <User className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAuthOpen(true)}
                className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl"
              >
                Log in
              </Button>
              <Button
                size="sm"
                onClick={() => setAuthOpen(true)}
                className="bg-gradient-hero text-white hover:opacity-90 rounded-xl shadow-sm font-semibold"
              >
                Sign up free
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
