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
  CheckCircle,
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
        <div className="rounded-3xl border border-[#E5E7EB] bg-white shadow-[0_8px_40px_rgba(16,24,40,0.08)]">
          <div className="flex flex-col items-center px-8 pt-10 pb-8 sm:px-12">
            <Link to="/" className="mb-8 inline-flex items-center">
              <FlippeWordmark size="xl" />
            </Link>

            <p className="mb-1.5 text-center text-sm font-medium text-[#6B7280]">
              Trade real-world outcomes
            </p>

            <h1 className="mb-8 text-center text-2xl font-extrabold tracking-tight text-[#111827]">
              Welcome back
            </h1>

            <form onSubmit={handleSubmit} className="w-full space-y-5" aria-label="Log in to your account">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9CA3AF]" />
                  <Input
                    placeholder="you@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-[#E5E7EB] bg-[#F9FAFB] pl-11 text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9CA3AF]" />
                  <Input
                    placeholder="Enter your password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-[#E5E7EB] bg-[#F9FAFB] pl-11 pr-11 text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
                    tabIndex={-1}
                  >
                    {showPass ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div />
                <Link
                  to="/support"
                  className="text-xs font-semibold text-[#6B7280] transition-colors hover:text-[#4F46E5]"
                >
                  Need help?
                </Link>
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3.5 text-sm font-medium text-red-600" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="group h-12 w-full rounded-xl bg-[#4F46E5] text-sm font-bold text-white shadow-[0_2px_8px_rgba(79,70,229,0.25)] transition-all duration-200 hover:bg-[#4338CA] hover:shadow-[0_4px_16px_rgba(79,70,229,0.35)] disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Log in
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 w-full border-t border-[#F3F4F6] pt-6 text-center text-sm text-[#6B7280]">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-bold text-[#4F46E5] transition-colors hover:text-[#6366F1]"
              >
                Create one free
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#9CA3AF]">
          <CheckCircle className="h-3.5 w-3.5" />
          Your data is encrypted and securely stored.
        </div>
      </div>
    </AuthLayout>
  );
}
