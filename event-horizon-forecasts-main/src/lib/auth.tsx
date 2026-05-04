import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  balance: number;
};

type AuthCtx = {
  user: AuthUser | null;
  session: Session | null;
  authOpen: boolean;
  setAuthOpen: (v: boolean) => void;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const toAuthUser = (user: User, profile?: { full_name?: string; balance?: number } | null): AuthUser => ({
  id: user.id,
  email: user.email ?? "",
  name: profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "User",
  balance: profile?.balance ?? 10000,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const fetchProfile = async (supabaseUser: User) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, balance")
      .eq("id", supabaseUser.id)
      .single();
    setUser(toAuthUser(supabaseUser, data));
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user);
        setAuthOpen(false);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signup = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) return { error: error.message };

    // Create profile row
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: name,
        email,
        balance: 10000,
      });
    }
    return { error: null };
  };

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <Ctx.Provider value={{ user, session, authOpen, setAuthOpen, login, signup, loginWithGoogle, logout }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
