import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Loader2, CheckCircle } from "lucide-react";

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

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: signupError } = await signup(username, email, password);
    setLoading(false);

    if (signupError) {
      setError(signupError);
    } else {
      setSuccess(true);
      // Automatically redirect to home after successful signup
      setTimeout(() => {
        navigate("/");
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-elevated border border-border/60 overflow-hidden">
          <div className="h-1 bg-gradient-hero w-full" />
          
          <div className="p-8">
            {/* Logo */}
            <Link to="/" className="inline-block mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center">
                <span className="text-2xl font-bold text-primary">F</span>
              </div>
            </Link>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">Join Flippe</h1>
              <p className="text-sm text-muted-foreground">
                Create a free account and start earning from accuracy.
              </p>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-success/10 grid place-items-center mb-4">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Account created successfully!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Redirecting you to the homepage...
                </p>
              </div>
            ) : (
              <>
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="pl-9 h-11 rounded-xl"
                      disabled={loading}
                    />
                  </div>

                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Email address"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-9 h-11 rounded-xl"
                      disabled={loading}
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
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Confirm password"
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pl-9 pr-10 h-11 rounded-xl"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-xs text-danger bg-danger-soft px-3 py-2.5 rounded-xl">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-gradient-hero hover:opacity-90 text-white font-semibold rounded-xl shadow-sm"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative flex items-center gap-3 py-6">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Google Signup */}
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl font-medium border-border hover:bg-secondary"
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

                {/* Login link */}
                <p className="text-center text-sm text-muted-foreground mt-6">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary font-semibold hover:underline">
                    Log in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
