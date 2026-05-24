import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Loader2 } from "lucide-react";

export const AuthModal = () => {
  const { authOpen, setAuthOpen, login, signup, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const reset = () => {
    setError(null);
    setSuccess(null);
    setName("");
    setEmail("");
    setPassword("");
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (mode === "signup" && !name) { setError("Please enter a username."); return; }
    if (mode === "signup" && password.length < 8) { setError("Password must be at least 8 characters long."); return; }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await login(email, password);
        if (error) setError(error);
      } else {
        const { error } = await signup(name, email, password);
        if (error) setError(error);
        else setSuccess("Account created successfully.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      setError(error.message || "Google sign-in is not available yet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={authOpen} onOpenChange={(v) => { setAuthOpen(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[400px] rounded-2xl p-0 overflow-hidden border-border/60 shadow-elevated">
        <div className="h-1 bg-gradient-hero w-full" />

        <div className="p-6">
          <DialogHeader className="mb-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center mb-4">
              <span className="text-2xl font-bold text-primary">F</span>
            </div>
            <DialogTitle className="text-xl font-bold">
              {mode === "login" ? "Welcome back" : "Join Flippe"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login"
                ? "Log in to your account to continue forecasting."
                : "Create a free account and start earning from accuracy."}
            </p>
          </DialogHeader>

          <div className="space-y-3">
            {mode === "signup" && (
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Username"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="pl-9 h-11 rounded-xl"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-9 h-11 rounded-xl"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-9 pr-10 h-11 rounded-xl"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-danger bg-danger-soft px-3 py-2.5 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="text-xs text-success bg-success-soft px-3 py-2.5 rounded-xl">
                {success}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-11 bg-gradient-hero hover:opacity-90 text-white font-semibold rounded-xl shadow-sm mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "login" ? "Log in" : "Create account"}
            </Button>

            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              variant="outline"
              className="w-full h-11 rounded-xl font-medium border-border hover:bg-secondary"
              onClick={handleGoogle}
              disabled={loading}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-5">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); reset(); }}
              className="text-primary font-semibold hover:underline"
            >
              {mode === "login" ? "Create a free account" : "Log in"}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
