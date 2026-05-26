import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Flame, Gift, Home, Loader2, Search, Shield, Tag, User, Wallet } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notification-context";
import { formatNaira } from "@/lib/markets";
import apiService, { type ApiMarket, type ApiSearchUser } from "@/lib/api";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/markets", label: "Trending", icon: Flame },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/activity", label: "Activity", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

export const Header = () => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const adminPath = isSuperAdmin() ? "/super-admin" : "/admin";
  const searchRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [markets, setMarkets] = useState<ApiMarket[]>([]);
  const [users, setUsers] = useState<ApiSearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const categories = useMemo(() => {
    const known = ["Sports", "Music", "Crypto", "Politics", "Entertainment", "Finance", "Technology"];
    const marketCategories = markets.map((market) => market.category).filter(Boolean);
    return Array.from(new Set([...known, ...marketCategories]));
  }, [markets]);

  const filteredMarkets = useMemo(() => {
    if (query.trim().length < 2) return [];
    const normalized = query.toLowerCase();
    return markets
      .filter((market) =>
        market.question.toLowerCase().includes(normalized) ||
        market.category.toLowerCase().includes(normalized)
      )
      .slice(0, 5);
  }, [markets, query]);

  const filteredCategories = useMemo(() => {
    if (query.trim().length < 2) return [];
    const normalized = query.toLowerCase();
    return categories.filter((category) => category.toLowerCase().includes(normalized)).slice(0, 5);
  }, [categories, query]);

  useEffect(() => {
    const loadMarkets = async () => {
      try {
        const response = await apiService.getMarkets();
        setMarkets(response.markets || []);
      } catch {
        setMarkets([]);
      }
    };

    loadMarkets();
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setUsers([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await apiService.searchUsers(query.trim());
        setUsers(response.users || []);
      } catch {
        setUsers([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const goToSearch = (path: string) => {
    setSearchOpen(false);
    setQuery("");
    navigate(path);
  };

  return (
    <>
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 border-r border-white/10 bg-[#070a14]/95 p-5 backdrop-blur-2xl xl:block">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/20 text-violet-200 shadow-[0_0_24px_rgba(139,92,246,0.35)]">
          F
        </div>
        <span className="text-2xl font-extrabold tracking-tight text-white">Flippe</span>
      </Link>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                isActive
                  ? "bg-violet-500/20 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.16)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
        {(isAdmin() || isSuperAdmin()) && (
          <NavLink
            to={adminPath}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                isActive
                  ? "bg-violet-500/20 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.16)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Shield className="h-5 w-5" />
            Admin
          </NavLink>
        )}
      </nav>
      <div className="absolute bottom-5 left-5 right-5 rounded-3xl border border-white/10 bg-white/[0.055] p-4">
        <Gift className="mb-3 h-6 w-6 text-violet-300" />
        <div className="text-sm font-black text-white">Invite and earn</div>
        <div className="mt-1 text-xs text-slate-500">Share Flippe with friends</div>
      </div>
    </aside>
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070a14]/85 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-500/20 text-violet-200 shadow-[0_0_24px_rgba(139,92,246,0.35)]">
            F
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white">
            Flippe
          </span>
        </Link>

        <nav className="ml-3 hidden items-center gap-1 lg:flex xl:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-violet-500/20 text-violet-200"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
          {(isAdmin() || isSuperAdmin()) && (
            <NavLink
              to={adminPath}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <Shield className="h-4 w-4" />
              Admin
            </NavLink>
          )}
        </nav>

        <div ref={searchRef} className="relative order-last w-full md:order-none md:ml-auto md:max-w-md md:flex-1 xl:max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search markets, topics, people..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-10 rounded-2xl border-white/15 bg-[#0d1220] pl-9 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:ring-violet-500/20"
          />
          {searchOpen && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-3xl border border-violet-300/25 bg-[#0b1020] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.62)] ring-1 ring-violet-400/10 backdrop-blur-2xl">
              {searching && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              )}
              {!searching && filteredMarkets.length === 0 && filteredCategories.length === 0 && users.length === 0 && (
                <div className="px-3 py-5 text-center text-sm text-slate-500">
                  No results found.
                </div>
              )}
              {filteredMarkets.length > 0 && (
                <SearchGroup label="Markets">
                  {filteredMarkets.map((market) => (
                    <button key={market.id} onClick={() => goToSearch(`/market/${market.id}`)} className="w-full rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-2 text-left transition hover:border-violet-300/30 hover:bg-violet-500/10">
                      <div className="line-clamp-1 text-sm font-black text-white">{market.question}</div>
                      <div className="mt-1 text-xs text-slate-400">{market.category} | {formatNaira(market.totalPool)}</div>
                    </button>
                  ))}
                </SearchGroup>
              )}
              {filteredCategories.length > 0 && (
                <SearchGroup label="Categories">
                  {filteredCategories.map((category) => (
                    <button key={category} onClick={() => goToSearch(`/markets?category=${encodeURIComponent(category)}`)} className="flex w-full items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-2 text-left text-sm font-bold text-slate-300 transition hover:border-violet-300/30 hover:bg-violet-500/10 hover:text-white">
                      <Tag className="h-4 w-4 text-violet-300" />
                      {category}
                    </button>
                  ))}
                </SearchGroup>
              )}
              {users.length > 0 && (
                <SearchGroup label="Users">
                  {users.map((item) => (
                    <button key={item.id} onClick={() => goToSearch(`/profile?user=${encodeURIComponent(item.username)}`)} className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-2 text-left transition hover:border-violet-300/30 hover:bg-violet-500/10">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-violet-500/20 text-xs font-black text-violet-200">{item.username.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="text-sm font-black text-white">@{item.username}</div>
                        <div className="text-xs capitalize text-slate-500">{item.role.replace("_", " ")}</div>
                      </div>
                    </button>
                  ))}
                </SearchGroup>
              )}
            </div>
          )}
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/wallet"
              className="hidden rounded-xl bg-violet-500 px-3 py-2 text-sm font-bold text-white shadow-[0_0_22px_rgba(139,92,246,0.35)] transition hover:bg-violet-400 sm:block"
            >
              Add Money
            </Link>
            <Link
              to="/wallet"
              className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-emerald-300 sm:block"
            >
              {formatNaira(user.balance)}
            </Link>
            <Link
              to="/activity"
              className="relative hidden h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 sm:grid"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            {(isAdmin() || isSuperAdmin()) && (
              <Link
                to={adminPath}
                title="Admin dashboard"
                className="hidden h-10 items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-500/15 px-3 text-sm font-black text-violet-100 shadow-[0_0_22px_rgba(139,92,246,0.18)] transition hover:bg-violet-500/25 sm:flex"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <Link
              to="/profile"
              className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-sm font-extrabold text-white"
            >
              {user.username?.charAt(0).toUpperCase() || "U"}
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="rounded-xl text-slate-300 hover:bg-white/5 hover:text-white">
                Log in
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="rounded-xl bg-violet-500 text-white hover:bg-violet-400">
                Sign up
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
    </>
  );
};

const SearchGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="py-1">
    <div className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-[0.18em] text-violet-200/70">
      {label}
    </div>
    {children}
  </div>
);
