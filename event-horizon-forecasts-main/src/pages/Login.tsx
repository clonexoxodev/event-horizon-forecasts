import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Flame, Loader2, Lock, Mail, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isLoading: authLoading } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const from = (location.state as any)?.from?.pathname || "/";

  useEffect(() => {
    if (!authLoading && user) navigate(from, { replace: true });
  }, [authLoading, from, navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const { error: loginError } = await login(email, password);

      if (loginError) {
        setError(loginError);
      } else {
        navigate(from, { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#090d19]/90 shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-violet-300" />

          <div className="p-6 sm:p-8">
            <Link to="/" className="mb-7 inline-flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/20 text-2xl font-black text-violet-200 shadow-[0_0_30px_rgba(139,92,246,0.38)]">
                F
              </div>
              <span className="text-xl font-black text-white">Flippe</span>
            </Link>

            <div className="mb-8">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-violet-300">Welcome back</p>
              <h1 className="text-3xl font-black tracking-tight text-white">Log in</h1>
              <p className="mt-2 text-sm text-slate-400">Get back to your markets, wallet, and predictions.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-13 rounded-2xl border-white/10 bg-white/[0.055] pl-11 text-base font-semibold text-white placeholder:text-slate-500 focus:border-violet-400"
                  disabled={loading}
                />
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-13 rounded-2xl border-white/10 bg-white/[0.055] pl-11 pr-11 text-base font-semibold text-white placeholder:text-slate-500 focus:border-violet-400"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="h-13 w-full rounded-2xl bg-violet-500 text-base font-black text-white shadow-[0_0_26px_rgba(139,92,246,0.32)] hover:bg-violet-400 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Log in"}
              </Button>
            </form>

            <div className="relative flex items-center gap-3 py-6">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-bold text-slate-500">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <Button
              onClick={() => {
                toast("Coming soon", {
                  description: "Google sign-in is currently in development",
                });
              }}
              variant="outline"
              className="h-12 w-full rounded-2xl border-white/10 bg-white/[0.055] font-bold text-white hover:bg-white/10"
              disabled={loading}
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <p className="mt-6 text-center text-sm text-slate-400">
              Don't have an account?{" "}
              <Link to="/signup" className="font-black text-violet-300 hover:text-violet-200">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

const AuthShell = ({ children }: { children: React.ReactNode }) => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050711] p-4 text-white">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(139,92,246,0.28),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.18),transparent_30%),linear-gradient(180deg,#050711,#070a14)]" />
    <div className="absolute left-6 top-6 hidden rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl lg:block">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/20 text-violet-200">
          <Flame className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-black">Live predictions</div>
          <div className="text-xs text-slate-500">Back your next call</div>
        </div>
      </div>
    </div>
    <div className="absolute bottom-6 right-6 hidden rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl lg:block">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-black">Win with accuracy</div>
          <div className="text-xs text-slate-500">Simple. Fast. Social.</div>
        </div>
      </div>
    </div>
    <div className="relative z-10 w-full">{children}</div>
  </div>
);

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);
