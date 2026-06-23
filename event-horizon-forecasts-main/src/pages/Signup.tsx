import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { FlippeWordmark } from "@/components/FlippeBrand";
import { AuthLayout } from "@/components/AuthLayout";

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

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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
    <AuthLayout
      eyebrow="Start forecasting"
      title="Build your forecasting record."
      benefits={["Predict real-world events", "Track your streak and score", "Compete with other forecasters"]}
    >
      <div className="w-full">
        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_24px_90px_rgba(16,24,40,0.12)] backdrop-blur">
          <div className="h-1 w-full bg-[#4F46E5]" />

          <div className="p-6 sm:p-8">
            <Link to="/" className="mb-7 inline-flex items-center gap-3">
              <FlippeWordmark size="xl" />
            </Link>

            <div className="mb-8">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#667085]">Join Flippe</p>
              <h1 className="text-3xl font-black tracking-tight text-[#101828]">Create account</h1>
              <p className="mt-2 text-sm text-[#667085]">Start predicting, tracking wins, and building your record.</p>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-lg font-black text-[#101828]">Account created</h3>
                <p className="text-sm text-[#667085]">Taking you to the app...</p>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-13 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-11 text-base font-semibold text-[#101828] placeholder:text-[#9CA3AF] focus:border-[#4F46E5]"
                      disabled={loading}
                    />
                  </div>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      placeholder="Email address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-13 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-11 text-base font-semibold text-[#101828] placeholder:text-[#9CA3AF] focus:border-[#4F46E5]"
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
                      className="h-13 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-11 pr-11 text-base font-semibold text-[#101828] placeholder:text-[#9CA3AF] focus:border-[#4F46E5]"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((value) => !value)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-[#101828]"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      placeholder="Confirm password"
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-13 rounded-xl border-[#E5E7EB] bg-[#F8F7F4] pl-11 pr-11 text-base font-semibold text-[#101828] placeholder:text-[#9CA3AF] focus:border-[#4F46E5]"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass((value) => !value)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-[#101828]"
                    >
                      {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-13 w-full rounded-xl bg-[#4F46E5] text-base font-black text-white hover:bg-[#4338CA] disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create account"}
                  </Button>
                </form>

                <div className="relative flex items-center gap-3 py-6">
                  <div className="h-px flex-1 bg-[#E5E7EB]" />
                  <span className="text-xs font-bold text-slate-500">or</span>
                  <div className="h-px flex-1 bg-[#E5E7EB]" />
                </div>

                <Button
                  onClick={() => {
                    toast("Coming soon", {
                      description: "Google sign-up is currently in development",
                    });
                  }}
                  variant="outline"
                  className="h-12 w-full rounded-2xl border-[#E5E7EB] bg-white font-bold text-[#101828] hover:bg-[#F3F4F6]"
                  disabled={loading}
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>

                <p className="mt-6 text-center text-sm text-[#667085]">
                  Already have an account?{" "}
                  <Link to="/login" className="font-black text-[#4F46E5] hover:text-[#6366F1]">
                    Log in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);
