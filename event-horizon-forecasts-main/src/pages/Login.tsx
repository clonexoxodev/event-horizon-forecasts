import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { FlippeWordmark } from "@/components/FlippeBrand";
import { AuthLayout } from "@/components/AuthLayout";

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
    <AuthLayout>
      <div className="w-full max-w-md mx-auto">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_90px_rgba(16,24,40,0.10)]">
          <div className="flex flex-col items-center px-6 pt-10 pb-8 sm:px-10">
            <Link to="/" className="mb-6 inline-flex items-center">
              <FlippeWordmark size="xl" />
            </Link>

            <p className="mb-1 text-center text-sm text-[#9CA3AF]">
              Predict what happens next
            </p>

            <h1 className="mb-7 text-center text-xl font-black tracking-tight text-[#111827]">
              Log in to your account
            </h1>

            <form onSubmit={handleSubmit} className="w-full space-y-4" aria-label="Log in to your account">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#6B7280]">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <Input
                    placeholder="you@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-11 text-sm font-semibold text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5]"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#6B7280]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <Input
                    placeholder="Enter your password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-11 pr-11 text-sm font-semibold text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5]"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition hover:text-[#6B7280]"
                    tabIndex={-1}
                  >
                    {showPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link
                  to="/support"
                  className="text-xs font-bold text-[#6B7280] transition hover:text-[#4F46E5]"
                >
                  Contact support for password reset
                </Link>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="group h-12 w-full rounded-xl bg-[#4F46E5] text-sm font-bold text-white transition hover:bg-[#4338CA] hover:shadow-[0_4px_14px_rgba(79,70,229,0.4)] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Log in
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-[#6B7280]">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-bold text-[#4F46E5] transition hover:text-[#6366F1]"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#9CA3AF]">
          Your data is encrypted and securely stored.
        </p>
      </div>
    </AuthLayout>
  );
}
