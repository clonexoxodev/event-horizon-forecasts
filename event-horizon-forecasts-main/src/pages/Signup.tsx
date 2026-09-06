import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  ArrowRight,
  Shield,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { FlippeWordmark } from "@/components/FlippeBrand";
import { AuthLayout } from "@/components/AuthLayout";

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "#E85D5D" };
  if (score <= 2) return { score, label: "Fair", color: "#F59E0B" };
  if (score <= 3) return { score, label: "Good", color: "#3B82F6" };
  return { score, label: "Strong", color: "#12B886" };
}

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: signupError } = await signup(username, email, password);

      if (signupError) {
        setError(signupError);
      } else {
        setSuccess(true);
        redirectTimer.current = setTimeout(() => {
          navigate("/");
        }, 1500);
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
              Join thousands of predictors
            </p>

            <h1 className="mb-8 text-center text-2xl font-extrabold tracking-tight text-[#111827]">
              Create your account
            </h1>

            {success ? (
              <div className="flex flex-col items-center justify-center py-8 text-center" role="status" aria-live="polite">
                <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#12B886]/10">
                  <CheckCircle className="h-8 w-8 text-[#12B886]" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#111827]">
                  You're all set!
                </h3>
                <p className="text-sm font-medium text-[#6B7280]">
                  Taking you to the markets...
                </p>
                <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-[#E5E7EB]">
                  <div className="h-full animate-pulse rounded-full bg-[#12B886]" style={{ width: "60%" }} />
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="w-full space-y-4.5" aria-label="Create your account">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                      Username
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9CA3AF]" />
                      <Input
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-12 rounded-xl border-[#E5E7EB] bg-[#F9FAFB] pl-11 text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.06]"
                        disabled={loading}
                      />
                    </div>
                  </div>

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
                        placeholder="At least 8 characters"
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
                    {password.length > 0 && (
                      <div className="mt-2.5" role="meter" aria-valuenow={Math.round((passwordStrength.score / 5) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Password strength: ${passwordStrength.label}`}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex flex-1 gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="h-1.5 flex-1 rounded-full transition-all duration-300"
                                style={{
                                  backgroundColor:
                                    i <= passwordStrength.score
                                      ? passwordStrength.color
                                      : "#E5E7EB",
                                }}
                              />
                            ))}
                          </div>
                          <span
                            className="text-[11px] font-bold"
                            style={{ color: passwordStrength.color }}
                          >
                            {passwordStrength.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9CA3AF]" />
                      <Input
                        placeholder="Re-enter your password"
                        type={showConfirmPass ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`h-12 rounded-xl bg-[#F9FAFB] pl-11 pr-11 text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:ring-4 focus:ring-[#4F46E5]/[0.06] ${
                          passwordsMatch
                            ? "border-[#12B886] focus:border-[#12B886]"
                            : passwordsMismatch
                              ? "border-[#E85D5D] focus:border-[#E85D5D]"
                              : "border-[#E5E7EB] focus:border-[#4F46E5]"
                        }`}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPass((value) => !value)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
                        tabIndex={-1}
                      >
                        {showConfirmPass ? (
                          <EyeOff className="h-[18px] w-[18px]" />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" />
                        )}
                      </button>
                    </div>
                    {passwordsMatch && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#12B886]">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Passwords match
                      </p>
                    )}
                    {passwordsMismatch && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#E85D5D]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3.5 text-sm font-medium text-red-600" role="alert">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <p className="text-xs leading-relaxed text-[#6B7280]">
                    By creating an account, you agree to our{" "}
                    <Link to="/terms" className="font-bold text-[#4F46E5] hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="font-bold text-[#4F46E5] hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="group h-12 w-full rounded-xl bg-[#4F46E5] text-sm font-bold text-white shadow-[0_2px_8px_rgba(79,70,229,0.25)] transition-all duration-200 hover:bg-[#4338CA] hover:shadow-[0_4px_16px_rgba(79,70,229,0.35)] disabled:opacity-50 disabled:shadow-none"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2">
                        Create account
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#9CA3AF]">
                  <Shield className="h-3.5 w-3.5" />
                  Secured with end-to-end encryption
                </div>

                <div className="mt-6 w-full border-t border-[#F3F4F6] pt-6 text-center text-sm text-[#6B7280]">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-bold text-[#4F46E5] transition-colors hover:text-[#6366F1]"
                  >
                    Log in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
