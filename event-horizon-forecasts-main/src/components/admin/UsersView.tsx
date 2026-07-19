import { useEffect, useState } from "react";
import { Eye, Loader2, Search, ShieldCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import {
  Card,
  Badge,
  SectionHeader,
  EmptyState,
  DataTable,
  Th,
  Td,
  SkeletonCard,
  ConfirmDialog,
} from "./ui";
import { formatDate, statusLabel } from "./utils";

type AdminUserRecord = {
  id: string;
  email: string;
  username: string;
  role: string;
  created_at?: string;
  status?: string;
};

export const UsersView = () => {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "suspend" | "activate";
    user: AdminUserRecord;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiService.listAdminUsers();
      setUsers(res.users || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [u.username, u.email, u.role]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setActing(true);
    try {
      if (confirmAction.type === "suspend") {
        await apiService.suspendAdminUser(confirmAction.user.id, reason);
        toast.success(`User ${confirmAction.user.username} suspended`);
      } else {
        await apiService.activateAdminUser(confirmAction.user.id);
        toast.success(`User ${confirmAction.user.username} activated`);
      }
      setConfirmAction(null);
      setReason("");
      await fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    } finally {
      setActing(false);
    }
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Badge variant="info">{statusLabel(role)}</Badge>;
      case "admin":
        return <Badge variant="default">{statusLabel(role)}</Badge>;
      default:
        return <Badge variant="muted">{statusLabel(role)}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="User Management"
        description="View and manage platform users."
        action={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="No users found"
          body={search ? "Try adjusting your search term." : "No users registered yet."}
        />
      ) : (
        <Card padding={false}>
          <DataTable>
            <thead>
              <tr>
                <Th>Username</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Joined</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="transition hover:bg-gray-50">
                  <Td>
                    <span className="font-semibold text-gray-900">{u.username || "—"}</span>
                  </Td>
                  <Td className="text-gray-500">{u.email}</Td>
                  <Td>{roleBadge(u.role)}</Td>
                  <Td className="text-xs text-gray-500">{formatDate(u.created_at)}</Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </button>
                      {u.status === "suspended" ? (
                        <button
                          onClick={() => setConfirmAction({ type: "activate", user: u })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Activate
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmAction({ type: "suspend", user: u })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          Suspend
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
      )}

      {selectedUser && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">User Details</h3>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Username</span>
                <span className="font-semibold text-gray-900">{selectedUser.username || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Role</span>
                {roleBadge(selectedUser.role)}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <Badge variant={selectedUser.status === "suspended" ? "danger" : "success"}>
                  {selectedUser.status || "Active"}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Joined</span>
                <span className="text-gray-900">{formatDate(selectedUser.created_at)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">User ID</span>
                <span className="font-mono text-xs text-gray-400">{selectedUser.id}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmDialog
          open
          title={confirmAction.type === "suspend" ? "Suspend User" : "Activate User"}
          body={
            confirmAction.type === "suspend"
              ? `Are you sure you want to suspend ${confirmAction.user.username}? They will lose access to the platform.`
              : `Are you sure you want to reactivate ${confirmAction.user.username}?`
          }
          confirmLabel={confirmAction.type === "suspend" ? "Suspend" : "Activate"}
          confirmVariant={confirmAction.type === "suspend" ? "danger" : "primary"}
          loading={acting}
          onConfirm={handleConfirm}
          onCancel={() => {
            setConfirmAction(null);
            setReason("");
          }}
        />
      )}

      {confirmAction?.type === "suspend" && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">Suspend User</h3>
            <p className="mt-2 text-sm text-gray-600">
              Provide a reason for suspending <strong>{confirmAction.user.username}</strong>.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Reason for suspension..."
              className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmAction(null);
                  setReason("");
                }}
                disabled={acting}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={acting || !reason.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50 active:scale-[0.98]"
              >
                {acting && <Loader2 className="h-4 w-4 animate-spin" />}
                Suspend User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
