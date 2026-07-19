import { useEffect, useState } from "react";
import { Loader2, Plus, ShieldPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Card,
  Badge,
  SectionHeader,
  EmptyState,
  SkeletonCard,
  ConfirmDialog,
} from "./ui";
import { formatDate, statusLabel } from "./utils";

type AdminRecord = {
  id: string;
  email: string;
  username?: string;
  role: string;
  created_at?: string;
  added_at?: string;
};

export const AdminsView = () => {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<AdminRecord | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await apiService.listAdmins();
      const list = Array.isArray(res) ? res : res?.admins || res?.users || [];
      setAdmins(list as AdminRecord[]);
    } catch {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setAdding(true);
    try {
      await apiService.addAdmin(email.trim());
      toast.success(`Admin added: ${email.trim()}`);
      setEmail("");
      await fetchAdmins();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add admin");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await apiService.removeAdmin(removeTarget.id);
      toast.success(`Admin removed: ${removeTarget.email}`);
      setRemoveTarget(null);
      await fetchAdmins();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove admin");
    } finally {
      setRemoving(false);
    }
  };

  const isSelf = (admin: AdminRecord) =>
    currentUser && (admin.id === currentUser.id || admin.email?.toLowerCase() === currentUser.email?.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <Card>
          <SectionHeader
            title="Add Admin"
            description="Grant admin access by email."
          />
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !email.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 active:scale-[0.98]"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldPlus className="h-4 w-4" />
              )}
              Add Admin
            </button>
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Current Admins"
            description="Manage admin access for the platform."
          />
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : admins.length === 0 ? (
            <EmptyState
              icon={<ShieldPlus className="h-5 w-5" />}
              title="No admins found"
              body="No admin accounts were returned by the server."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {admins.map((admin) => (
                <div
                  key={admin.id || admin.email}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900">
                      {admin.username || "—"}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">{admin.email}</div>
                    <div className="mt-0.5 text-[11px] text-gray-400">
                      Added {formatDate(admin.added_at || admin.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={admin.role === "super_admin" ? "info" : "default"}>
                      {statusLabel(admin.role)}
                    </Badge>
                    {!isSelf(admin) && (
                      <button
                        onClick={() => setRemoveTarget(admin)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Admin"
        body={`Are you sure you want to remove admin access from ${removeTarget?.email}? This action cannot be undone.`}
        confirmLabel="Remove Admin"
        confirmVariant="danger"
        loading={removing}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
};
