import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiService, AuthUserResponse, UserRole } from "./api";

type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  balance: number;
  role: UserRole;
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

const Ctx = createContext<AuthCtx | null>(null);

const walletBalanceFromResponse = (wallet: Awaited<ReturnType<typeof apiService.getWallet>>["wallet"]): number => {
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
  role: user.role || "user",
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<{ user: AuthUser } | null>(null);
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
    setUser(authUser);
    setSession({ user: authUser });
  };

  const clearUser = () => {
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    try {
      const response = await apiService.getCurrentUser();
      await applyUser(response.user);
    } catch {
      clearUser();
    }
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.getCurrentUser();
        if (!cancelled) {
          await applyUser(response.user);
        }
      } catch {
        if (!cancelled) {
          clearUser();
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
      await applyUser(response.user);
      setAuthOpen(false);
      return { error: null };
    } catch (error: any) {
      clearUser();
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
      await applyUser(response.user);
      setAuthOpen(false);
      return { error: null };
    } catch (error: any) {
      clearUser();
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
