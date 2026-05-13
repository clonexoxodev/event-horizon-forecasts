import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiService } from "./api";

type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  balance: number;
};

type AuthCtx = {
  user: AuthUser | null;
  session: any | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<any | null>(null);

  useEffect(() => {
    // Check if user is already logged in by checking for auth cookie
    // We'll skip the initial wallet check since it requires authentication
    // The user will be set after successful login/signup
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login({ email, password });
      if (response.user) {
        // Fetch wallet info
        const walletResponse = await apiService.getWallet();
        const authUser: AuthUser = {
          id: response.user.id,
          email: response.user.email,
          username: response.user.username,
          name: response.user.username,
          balance: (walletResponse.wallet?.balance_ngn_kobo || 0) / 100,
        };
        setUser(authUser);
        setSession({ user: authUser });
        return { error: null };
      }
      return { error: 'Login failed' };
    } catch (error: any) {
      return { error: error.message || 'Login failed' };
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const response = await apiService.signup({ 
        username: name, 
        email, 
        password 
      });
      if (response.user) {
        // Fetch wallet info
        const walletResponse = await apiService.getWallet();
        const authUser: AuthUser = {
          id: response.user.id,
          email: response.user.email,
          username: response.user.username,
          name: response.user.username,
          balance: (walletResponse.wallet?.balance_ngn_kobo || 0) / 100,
        };
        setUser(authUser);
        setSession({ user: authUser });
        return { error: null };
      }
      return { error: 'Signup failed' };
    } catch (error: any) {
      return { error: error.message || 'Signup failed' };
    }
  };

  const loginWithGoogle = async () => {
    // Google OAuth not implemented yet
    console.log('Google OAuth not implemented');
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <Ctx.Provider value={{ user, session, login, signup, loginWithGoogle, logout }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
