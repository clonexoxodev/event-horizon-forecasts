import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiService, ApiRequestError, AuthUserResponse, UserRole } from "./api";

type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  balance: number;
  role: UserRole;
  avatarUrl?: string | null;
};

type AuthCtx = {
  user: AuthUser | null;
  session: { user: AuthUser } | null;
  isLoading: boolean;
  authOpen: boolean;
  setAuthOpen: (open: boolean) => void;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
};

const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  admin: 1,
  super_admin: 2,
};

const PRIMARY_SUPER_ADMIN_EMAIL = "fehintoluwaolu@gmail.com";
const AUTH_USER_CACHE_KEY = "flippe_auth_user";

const Ctx = createContext<AuthCtx | null>(null);

const walletBalanceFromResponse = (wallet: Awaited<ReturnType<typeof apiService.getWallet>>["wallet"]): number => {
  if (typeof wallet.availableNgn === "number") return wallet.availableNgn;
  if (typeof wallet.availableNgnKobo === "number") return wallet.availableNgnKobo / 100;
  if (typeof wallet.balanceNgn === "number") return wallet.balanceNgn;
  if (typeof wallet.balanceNgnKobo === "number") return wallet.balanceNgnKobo / 100;
  return 0;
};

const toAuthUser = (user: AuthUserResponse, balance?: number): AuthUser => ({
  id: user.id,
  email: user.email,
  username: user.username,
  name: user.username,
  balance: typeof balance === "number" ? balance : user.balance ?? 0,
  role: user.email.toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL ? "super_admin" : user.role || "user",
  avatarUrl: user.avatarUrl || user.avatar_url || user.profile_image_url || null,
});

const isConfirmedAuthFailure = (error: unknown) => (
  error instanceof ApiRequestError &&
  error.status === 401 &&
  ["UNAUTHORIZED", "INVALID_TOKEN"].includes(error.code || "")
);

const readCachedUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_USER_CACHE_KEY);
    return raw ? JSON.parse(raw) as AuthUser : null;
  } catch {
    return null;
  }
};

const writeCachedUser = (authUser: AuthUser | null) => {
  if (typeof window === "undefined") return;

  try {
    if (authUser) {
      window.localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(authUser));
    } else {
      window.localStorage.removeItem(AUTH_USER_CACHE_KEY);
    }
  } catch {
    // Session cache is a convenience only; token handling remains authoritative.
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const cachedUser = readCachedUser();
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [session, setSession] = useState<{ user: AuthUser } | null>(cachedUser ? { user: cachedUser } : null);
  const [isLoading, setIsLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  const applyUser = async (apiUser: AuthUserResponse) => {
    let balance = apiUser.balance ?? 0;

    try {
      const walletResponse = await apiService.getWallet();
      balance = walletBalanceFromResponse(walletResponse.wallet);
    } catch (walletError) {
      console.warn("Failed to fetch wallet during auth refresh:", walletError);
    }

    const authUser = toAuthUser(apiUser, balance);
    writeCachedUser(authUser);
    setUser(authUser);
    setSession({ user: authUser });
  };

  const clearUser = () => {
    writeCachedUser(null);
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    try {
      const response = await apiService.getCurrentUser();
      await applyUser(response.user);
    } catch (error) {
      if (isConfirmedAuthFailure(error)) {
        apiService.setAuthToken(null);
        clearUser();
      } else {
        console.warn("Auth refresh failed without confirmed session invalidation:", error);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      setIsLoading(true);
      if (!apiService.hasAuthToken()) {
        if (!cancelled) {
          clearUser();
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await apiService.getCurrentUser();
        if (!cancelled) {
          await applyUser(response.user);
        }
      } catch (error) {
        if (!cancelled) {
          if (isConfirmedAuthFailure(error)) {
            apiService.setAuthToken(null);
            clearUser();
          } else {
            console.warn("Session restore failed without confirmed session invalidation:", error);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login({
        email: email.trim().toLowerCase(),
        password,
      });
      apiService.setAuthToken(response.token);
      await applyUser(response.user);
      setAuthOpen(false);
      return { error: null };
    } catch (error: any) {
      return { error: error.message || "Login failed" };
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const response = await apiService.signup({
        username: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      apiService.setAuthToken(response.token);
      await applyUser(response.user);
      setAuthOpen(false);
      return { error: null };
    } catch (error: any) {
      return { error: error.message || "Signup failed" };
    }
  };

  const loginWithGoogle = async () => {
    throw new Error("Google sign-in is not available yet.");
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      apiService.setAuthToken(null);
      clearUser();
    }
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
  };

  const isAdmin = (): boolean => hasRole("admin");
  const isSuperAdmin = (): boolean => hasRole("super_admin");

  return (
    <Ctx.Provider value={{
      user,
      session,
      isLoading,
      authOpen,
      setAuthOpen,
      refreshUser,
      login,
      signup,
      loginWithGoogle,
      logout,
      hasRole,
      isAdmin,
      isSuperAdmin,
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
