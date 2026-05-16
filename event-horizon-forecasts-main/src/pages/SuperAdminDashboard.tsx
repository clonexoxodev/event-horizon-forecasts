import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiService } from '../lib/api';
import { Users, TrendingUp, DollarSign, Activity, Shield, UserX, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { Footer } from '@/components/Footer';
import { Link } from 'react-router-dom';

interface Analytics {
  totalUsers: number;
  totalForecasts: number;
  totalVolume: number;
  activeMarkets: number;
  resolvedMarkets: number;
  pendingMarkets: number;
}

interface Admin {
  id: string;
  email: string;
  username: string;
  role: string;
  isPrimary: boolean;
}

export default function SuperAdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removingAdminId, setRemovingAdminId] = useState<string | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsData, adminsData] = await Promise.all([
        apiService.getAnalytics(),
        apiService.listAdmins()
      ]);
      setAnalytics(analyticsData);
      setAdmins(adminsData.admins);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Trim the email
    const email = newAdminEmail.trim();
    
    // Validate email is not empty
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setAddingAdmin(true);
      await apiService.addAdmin(email);
      toast.success('Admin added successfully');
      setNewAdminEmail('');
      fetchData(); // Refresh admin list
    } catch (error: any) {
      toast.error(error.message || 'Failed to add admin');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this admin?')) {
      return;
    }

    try {
      setRemovingAdminId(userId);
      await apiService.removeAdmin(userId);
      toast.success('Admin removed successfully');
      fetchData(); // Refresh admin list
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove admin');
    } finally {
      setRemovingAdminId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple/20 border-t-purple rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-graphite">Loading dashboard...</p>
          </div>
        </div>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white pb-20 md:pb-0">
      <Header />
      <main className="flex-1 container py-8 px-4 max-w-7xl">
        {/* Header with Back Button */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-graphite hover:text-charcoal transition-fast mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-fast" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-charcoal flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple/10 grid place-items-center">
              <Shield className="w-6 h-6 text-purple" />
            </div>
            Super Admin Dashboard
          </h1>
          <p className="text-graphite mt-2">Manage platform and administrators</p>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-card p-6 border border-graphite/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-graphite font-semibold uppercase tracking-wider">Total Users</p>
                  <p className="text-3xl font-bold text-charcoal mt-2">{analytics.totalUsers}</p>
                </div>
                <div className="w-12 h-12 bg-purple/10 rounded-xl grid place-items-center">
                  <Users className="w-6 h-6 text-purple" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card p-6 border border-graphite/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-graphite font-semibold uppercase tracking-wider">Total Forecasts</p>
                  <p className="text-3xl font-bold text-charcoal mt-2">{analytics.totalForecasts}</p>
                </div>
                <div className="w-12 h-12 bg-purple/10 rounded-xl grid place-items-center">
                  <TrendingUp className="w-6 h-6 text-purple" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card p-6 border border-graphite/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-graphite font-semibold uppercase tracking-wider">Total Volume</p>
                  <p className="text-3xl font-bold text-charcoal mt-2">
                    ₦{(analytics.totalVolume / 100).toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple/10 rounded-xl grid place-items-center">
                  <DollarSign className="w-6 h-6 text-purple" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card p-6 border border-graphite/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-graphite font-semibold uppercase tracking-wider">Active Markets</p>
                  <p className="text-3xl font-bold text-charcoal mt-2">{analytics.activeMarkets}</p>
                </div>
                <div className="w-12 h-12 bg-charcoal/10 rounded-xl grid place-items-center">
                  <Activity className="w-6 h-6 text-charcoal" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card p-6 border border-graphite/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-graphite font-semibold uppercase tracking-wider">Resolved Markets</p>
                  <p className="text-3xl font-bold text-charcoal mt-2">{analytics.resolvedMarkets}</p>
                </div>
                <div className="w-12 h-12 bg-graphite/10 rounded-xl grid place-items-center">
                  <Activity className="w-6 h-6 text-graphite" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card p-6 border border-graphite/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-graphite font-semibold uppercase tracking-wider">Pending Markets</p>
                  <p className="text-3xl font-bold text-charcoal mt-2">{analytics.pendingMarkets}</p>
                </div>
                <div className="w-12 h-12 bg-graphite/10 rounded-xl grid place-items-center">
                  <Activity className="w-6 h-6 text-graphite" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Management Section */}
        <div className="bg-white rounded-xl shadow-card p-6 border border-graphite/10">
          <h2 className="text-xl font-bold text-charcoal mb-6">Admin Management</h2>

          {/* Add Admin Form */}
          <form onSubmit={handleAddAdmin} className="mb-8">
            <label className="block text-sm font-semibold text-charcoal mb-2">
              Add Admin by Email
            </label>
            <p className="text-xs text-graphite mb-3">
              Note: The user must have an existing account. They need to sign up first before being granted admin privileges.
            </p>
            <div className="flex gap-3">
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="flex-1 px-4 py-3 border border-graphite/20 rounded-xl bg-white text-charcoal placeholder:text-graphite/50 focus:border-purple focus:ring-4 focus:ring-purple/10 transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={addingAdmin}
              />
              <button
                type="submit"
                disabled={addingAdmin || !newAdminEmail.trim()}
                className="px-6 py-3 bg-purple text-white rounded-xl font-semibold shadow-sm hover:bg-purple/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-fast"
              >
                {addingAdmin ? 'Adding...' : 'Add Admin'}
              </button>
            </div>
          </form>

          {/* Admin List */}
          <div>
            <h3 className="text-lg font-semibold text-charcoal mb-4">Current Administrators</h3>
            <div className="space-y-3">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 bg-graphite/5 rounded-xl border border-graphite/10"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-charcoal">{admin.username}</p>
                      {admin.isPrimary && (
                        <span className="px-2.5 py-1 text-xs font-bold bg-purple/10 text-purple rounded-lg border border-purple/20">
                          Primary Super Admin
                        </span>
                      )}
                      {admin.role === 'super_admin' && !admin.isPrimary && (
                        <span className="px-2.5 py-1 text-xs font-bold bg-purple/10 text-purple rounded-lg border border-purple/20">
                          Super Admin
                        </span>
                      )}
                      {admin.role === 'admin' && (
                        <span className="px-2.5 py-1 text-xs font-bold bg-charcoal/10 text-charcoal rounded-lg border border-charcoal/20">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-graphite mt-1">{admin.email}</p>
                  </div>
                  {!admin.isPrimary && (
                    <button
                      onClick={() => handleRemoveAdmin(admin.id)}
                      disabled={removingAdminId === admin.id}
                      className="flex items-center gap-2 px-4 py-2 text-coral hover:bg-coral-soft rounded-xl transition-fast disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      <UserX className="w-4 h-4" />
                      {removingAdminId === admin.id ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              ))}
              {admins.length === 0 && (
                <p className="text-center text-graphite py-8">No administrators found</p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
