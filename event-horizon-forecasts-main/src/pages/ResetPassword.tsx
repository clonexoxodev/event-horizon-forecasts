import { useState } from 'react';
import { toast } from 'sonner';
import { apiService } from '../lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('https://flippe-backend4.vercel.app/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          newPassword: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to reset password');
      }

      toast.success('Password reset successfully! You can now login.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-graphite/10">
        <div className="container py-4 px-4">
          <Link to="/" className="text-2xl font-bold text-charcoal">
            Flippe<span className="text-purple">.</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-graphite hover:text-charcoal transition-fast mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-fast" />
            Back to Login
          </Link>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-card border border-graphite/10 p-8">
            {/* Icon */}
            <div className="w-16 h-16 bg-purple/10 rounded-2xl grid place-items-center mx-auto mb-6">
              <KeyRound className="w-8 h-8 text-purple" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-charcoal text-center mb-2">
              Reset Password
            </h1>
            <p className="text-graphite text-center mb-8">
              Enter your email and new password to reset your account.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-graphite/20 rounded-xl bg-white text-charcoal placeholder:text-graphite/50 focus:border-purple focus:ring-4 focus:ring-purple/10 transition-fast"
                  disabled={loading}
                  required
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-graphite/20 rounded-xl bg-white text-charcoal placeholder:text-graphite/50 focus:border-purple focus:ring-4 focus:ring-purple/10 transition-fast"
                  disabled={loading}
                  required
                  minLength={8}
                />
                <p className="text-xs text-graphite mt-1">
                  Must be at least 8 characters long
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-graphite/20 rounded-xl bg-white text-charcoal placeholder:text-graphite/50 focus:border-purple focus:ring-4 focus:ring-purple/10 transition-fast"
                  disabled={loading}
                  required
                  minLength={8}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-purple text-white rounded-xl font-semibold shadow-sm hover:bg-purple/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-fast"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-sm text-graphite">
                Remember your password?{' '}
                <Link to="/login" className="text-purple font-semibold hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-purple/5 border border-purple/20 rounded-xl">
            <p className="text-sm text-charcoal">
              <span className="font-semibold">Note:</span> After resetting your password, you can login immediately with your new credentials.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
