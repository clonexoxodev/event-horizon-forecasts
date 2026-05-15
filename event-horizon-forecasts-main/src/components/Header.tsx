import { Search, User, Bell, X, ChevronDown, Wallet, Briefcase, LayoutDashboard, HelpCircle, Settings, LogOut, Shield, UserCog } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notification-context";
import { formatNaira } from "@/lib/markets";
import { useState, useRef, useEffect } from "react";

export const Header = () => {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const { unreadCount } = useNotifications();
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-graphite/10 shadow-xs">
      <div className="container max-w-[1280px] mx-auto py-3 px-4 sm:px-6 flex items-center gap-3">
        {/* Logo */}
        <Link
          to="/"
          className="font-bold text-xl tracking-tight shrink-0 flex items-center gap-0.5 hover:opacity-80 transition-fast text-charcoal"
        >
          Flippe<span className="text-purple text-2xl leading-none">.</span>
        </Link>

        {/* Desktop search - centered */}
        <div className="relative flex-1 max-w-md mx-auto hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-graphite pointer-events-none" />
          <Input
            placeholder="Search markets..."
            className="pl-9 h-9 bg-graphite/5 border-graphite/10 focus:border-purple/30 focus:bg-white rounded-xl text-sm transition-fast placeholder:text-graphite/60"
          />
        </div>

        {/* Mobile search toggle */}
        {searchOpen && (
          <div className="absolute inset-x-0 top-0 z-50 flex items-center gap-2 px-4 h-[56px] bg-card border-b border-border/40 sm:hidden shadow-sm">
            <Search className="w-4 h-4 text-graphite shrink-0" />
            <Input
              autoFocus
              placeholder="Search markets..."
              className="flex-1 h-9 border-none bg-transparent focus-visible:ring-0 text-sm p-0"
            />
            <button onClick={() => setSearchOpen(false)} className="text-graphite hover:text-charcoal transition-micro">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden w-9 h-9 rounded-xl grid place-items-center text-graphite hover:text-charcoal hover:bg-graphite/6 transition-micro"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>

          {user ? (
            <>
              {/* Balance chip - desktop only */}
              <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-xl bg-purple/10 border border-purple/20 text-sm font-semibold text-purple">
                <span className="w-1.5 h-1.5 rounded-full bg-purple animate-pulse" />
                {formatNaira(user.balance)}
              </div>

              {/* Notifications - desktop only */}
              <NavLink
                to="/notifications"
                className={({ isActive }) =>
                  `hidden sm:grid relative w-9 h-9 rounded-xl place-items-center transition-micro ${
                    isActive
                      ? "bg-purple/10 text-purple"
                      : "text-graphite hover:text-charcoal hover:bg-graphite/6"
                  }`
                }
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-purple text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </NavLink>

              {/* Profile dropdown - desktop only */}
              <div className="hidden sm:block relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center gap-1.5 h-9 pl-1.5 pr-2.5 rounded-xl transition-micro ${
                    dropdownOpen
                      ? "bg-purple/10 text-purple"
                      : "text-graphite hover:text-charcoal hover:bg-graphite/6"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-charcoal text-off-white grid place-items-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-elevated border border-graphite/10 overflow-hidden">
                    <div className="p-3 border-b border-graphite/10">
                      <div className="font-semibold text-charcoal text-sm">{user.username}</div>
                      <div className="text-xs text-graphite mt-0.5">{user.email}</div>
                    </div>
                    
                    <div className="py-1">
                      <NavLink
                        to="/wallet"
                        onClick={() => setDropdownOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 text-sm transition-micro ${
                            isActive
                              ? "bg-purple/10 text-purple font-semibold"
                              : "text-charcoal hover:bg-graphite/6"
                          }`
                        }
                      >
                        <Wallet className="w-4 h-4" />
                        Wallet
                      </NavLink>
                      
                      <NavLink
                        to="/portfolio"
                        onClick={() => setDropdownOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 text-sm transition-micro ${
                            isActive
                              ? "bg-purple/10 text-purple font-semibold"
                              : "text-charcoal hover:bg-graphite/6"
                          }`
                        }
                      >
                        <Briefcase className="w-4 h-4" />
                        Portfolio
                      </NavLink>
                      
                      <NavLink
                        to="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 text-sm transition-micro ${
                            isActive
                              ? "bg-purple/10 text-purple font-semibold"
                              : "text-charcoal hover:bg-graphite/6"
                          }`
                        }
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </NavLink>
                      
                      <NavLink
                        to="/notifications"
                        onClick={() => setDropdownOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 text-sm transition-micro ${
                            isActive
                              ? "bg-purple/10 text-purple font-semibold"
                              : "text-charcoal hover:bg-graphite/6"
                          }`
                        }
                      >
                        <Bell className="w-4 h-4" />
                        <span className="flex-1">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-purple text-white text-[10px] font-bold flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </NavLink>
                    </div>

                    <div className="border-t border-graphite/10 py-1">
                      {/* Admin links - only show for admin or super_admin */}
                      {isAdmin() && (
                        <NavLink
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 text-sm transition-micro ${
                              isActive
                                ? "bg-purple/10 text-purple font-semibold"
                                : "text-charcoal hover:bg-graphite/6"
                            }`
                          }
                        >
                          <UserCog className="w-4 h-4" />
                          Admin
                        </NavLink>
                      )}
                      
                      {/* Super Admin link - only show for super_admin */}
                      {isSuperAdmin() && (
                        <NavLink
                          to="/super-admin"
                          onClick={() => setDropdownOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 text-sm transition-micro ${
                              isActive
                                ? "bg-purple/10 text-purple font-semibold"
                                : "text-charcoal hover:bg-graphite/6"
                            }`
                          }
                        >
                          <Shield className="w-4 h-4" />
                          Super Admin
                        </NavLink>
                      )}
                      
                      <NavLink
                        to="/support"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-charcoal hover:bg-graphite/6 transition-micro"
                      >
                        <HelpCircle className="w-4 h-4" />
                        Support
                      </NavLink>
                      
                      <NavLink
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 text-sm transition-micro ${
                            isActive
                              ? "bg-purple/10 text-purple font-semibold"
                              : "text-charcoal hover:bg-graphite/6"
                          }`
                        }
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </NavLink>
                    </div>

                    <div className="border-t border-graphite/10 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-coral hover:bg-coral-soft transition-fast"
                      >
                        <LogOut className="w-4 h-4" />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-graphite hover:text-charcoal hover:bg-graphite/6 rounded-xl text-sm font-semibold h-9"
                >
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="sm"
                  className="bg-purple text-white hover:bg-purple/90 rounded-xl shadow-sm font-semibold text-sm h-9 transition-fast"
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
