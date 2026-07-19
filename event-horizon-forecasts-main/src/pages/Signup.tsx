import { useMemo, useState } from "react";
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
        setTimeout(() => {
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
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_90px_rgba(16,24,40,0.12)]">
          <div className="flex flex-col items-center px-6 pt-10 pb-8 sm:px-10">
            <Link to="/" className="mb-8 inline-flex items-center">
              <FlippeWordmark size="xl" />
            </Link>

            <p className="mb-2 text-center text-sm text-[#6B7280]">
              Join thousands of forecasters
            </p>

            <h1 className="mb-8 text-center text-2xl font-black tracking-tight text-[#111827]">
              Create your account
            </h1>

            {success ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#12B886]/10 text-[#047857]">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-lg font-black text-[#111827]">
                  Account created
                </h3>
                <p className="text-sm text-[#6B7280]">
                  Taking you to the app...
                </p>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="w-full space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#6B7280]">
                      Username
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                      <Input
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-12 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-11 text-sm font-semibold text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5]"
                        disabled={loading}
                      />
                    </div>
                  </div>

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
                        placeholder="At least 8 characters"
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
                    {password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-1 gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="h-1 flex-1 rounded-full transition-colors duration-300"
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
                    <label className="mb-1.5 block text-xs font-bold text-[#6B7280]">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                      <Input
                        placeholder="Re-enter your password"
                        type={showConfirmPass ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`h-12 rounded-xl bg-[#F8F7F4] pl-11 pr-11 text-sm font-semibold text-[#111827] placeholder:text-[#9CA3AF] ${
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
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition hover:text-[#6B7280]"
                        tabIndex={-1}
                      >
                        {showConfirmPass ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordsMatch && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-[#12B886]">
                        <CheckCircle className="h-3 w-3" />
                        Passwords match
                      </p>
                    )}
                    {passwordsMismatch && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-[#E85D5D]">
                        <AlertCircle className="h-3 w-3" />
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <p className="text-xs text-[#6B7280]">
                    By creating an account, you agree to our{" "}
                    <span className="font-bold text-[#4F46E5] cursor-pointer hover:underline">
                      Terms of Service
                    </span>{" "}
                    and{" "}
                    <span className="font-bold text-[#4F46E5] cursor-pointer hover:underline">
                      Privacy Policy
                    </span>
                    .
                  </p>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="group h-12 w-full rounded-xl bg-[#4F46E5] text-sm font-black text-white transition hover:bg-[#4338CA] hover:shadow-[0_4px_14px_rgba(79,70,229,0.4)] disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2">
                        Create account
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#9CA3AF]">
                  <Shield className="h-3.5 w-3.5" />
                  Secured with end-to-end encryption
                </div>

                <div className="mt-6 text-center text-sm text-[#6B7280]">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-black text-[#4F46E5] transition hover:text-[#6366F1]"
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
