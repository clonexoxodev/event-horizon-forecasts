import { createContext, useContext, useState, ReactNode } from "react";

type AuthCtx = {
  user: { name: string; balance: number } | null;
  login: () => void;
  logout: () => void;
  authOpen: boolean;
  setAuthOpen: (v: boolean) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthCtx["user"]>(null);
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <Ctx.Provider value={{
      user,
      login: () => { setUser({ name: "Ada", balance: 25000 }); setAuthOpen(false); },
      logout: () => setUser(null),
      authOpen, setAuthOpen,
    }}>{children}</Ctx.Provider>
  );
};

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
};
