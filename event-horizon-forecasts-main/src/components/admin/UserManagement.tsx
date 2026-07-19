import React, { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Ban,
  Loader2,
  Search,
  ShieldPlus,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserRole } from "@/lib/api";
import { formatNaira } from "@/lib/markets";
import type { AdminRecord, AdminUser } from "./types";
import { ShellCard, SectionHeader, Badge, EmptyState } from "./ui";
import { formatShortDate, getErrorMessage, metricValue, statusText } from "./utils";

const ActionButton = ({
  label,
  icon: Icon,
  tone = "neutral",
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "green" | "red";
  disabled?: boolean;
  onClick?: () => void;
}) => {
  const base =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition";
  const toneClasses =
    tone === "green"
      ? "border-[#C7D2FE] bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#4338CA]/20"
      : tone === "red"
        ? "border-red-500/30 bg-red-500/10 text-[#E85D5D] hover:bg-red-500/20"
        : "border-[#E5E7EB] bg-[#F3F4F6] text-[#667085] hover:bg-[#E5E7EB] hover:text-[#101828]";
  const disabledClass = disabled ? "cursor-not-allowed opacity-40" : "";

  return (
    <button
      className={`${base} ${toneClasses} ${disabledClass}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
};

export const UsersView = ({
  users,
  search,
  setSearch,
}: {
  users: AdminUser[];
  search: string;
  setSearch: (value: string) => void;
}) => {
  const filtered = users.filter((adminUser) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [adminUser.username, adminUser.email, adminUser.role]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  return (
    <ShellCard>
      <SectionHeader
        eyebrow="Users"
        title="User management"
        description="Operational user visibility. Suspension and last-login tracking need backend support."
        action={
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users..."
              className="border-[#E5E7EB] bg-white pl-9 text-[#101828]"
            />
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-[#E5E7EB] text-xs uppercase tracking-wide text-[#667085]">
            <tr>
              <th className="px-6 py-4">User</th>
              <th>Wallet balance</th>
              <th>Active positions</th>
              <th>Predictions</th>
              <th>Last active</th>
              <th>Joined</th>
              <th>Status</th>
              <th className="pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filtered.map((adminUser) => (
              <tr key={adminUser.id} className="hover:bg-[#F8F7F4]">
                <td className="px-6 py-4">
                  <p className="font-medium">{adminUser.username || "User"}</p>
                  <p className="text-xs text-[#667085]">{adminUser.email}</p>
                </td>
                <td>{formatNaira(metricValue(adminUser.wallet_balance))}</td>
                <td>{metricValue(adminUser.active_positions)}</td>
                <td>{metricValue(adminUser.total_predictions)}</td>
                <td className="text-[#667085]">
                  {formatShortDate(adminUser.last_active_at || adminUser.last_login_at)}
                </td>
                <td className="text-[#667085]">{formatShortDate(adminUser.created_at)}</td>
                <td>
                  <Badge tone={adminUser.status === "suspended" ? "red" : "green"}>
                    {adminUser.status || "Active"}
                  </Badge>
                </td>
                <td className="pr-6">
                  <div className="flex justify-end gap-1.5">
                    <ActionButton label="View wallet history" icon={Wallet} disabled />
                    <ActionButton label="View prediction history" icon={BarChart3} disabled />
                    <ActionButton label="Suspend user" icon={Ban} tone="red" disabled />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <EmptyState title="No users found" body="No user records match this search." />
        )}
      </div>
    </ShellCard>
  );
};

class AdminRolesErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Admin Roles] render failure", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return <AdminRolesErrorState error={this.state.error} />;
    }
    return this.props.children;
  }
}

export { AdminRolesErrorBoundary };

const AdminRolesErrorState = ({ error }: { error?: Error | string | null }) => (
  <ShellCard>
    <div className="p-6">
      <div className="flex items-start gap-3 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-[#7F1D1D]">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#E85D5D]" />
        <div>
          <p className="font-semibold">Unable to load admin roles</p>
          <p className="mt-1 text-sm text-[#991B1B]">
            The access-control panel could not render. Please refresh or try again.
          </p>
          {import.meta.env.DEV && error && (
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-[#7F1D1D]">
              {getErrorMessage(error)}
            </pre>
          )}
        </div>
      </div>
    </div>
  </ShellCard>
);

export const AddAdminView = ({
  admins,
  email,
  setEmail,
  onAdd,
  onRemove,
  saving,
  loading,
  error,
  canManage,
}: {
  admins: AdminRecord[];
  email: string;
  setEmail: (value: string) => void;
  onAdd: () => void;
  onRemove: (admin: AdminRecord) => void;
  saving: boolean;
  loading: boolean;
  error: string | null;
  canManage: boolean;
}) => {
  const adminList = Array.isArray(admins) ? admins : [];

  if (!canManage) {
    return <AdminRolesErrorState error="Super admin permission is required." />;
  }

  if (error) {
    return <AdminRolesErrorState error={error} />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <ShellCard>
        <SectionHeader
          eyebrow="Access control"
          title="Add admin"
          description="Grant admin access by verified email."
        />
        <div className="space-y-4 p-6">
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            className="border-[#E5E7EB] bg-white text-[#101828]"
          />
          <Button
            className="w-full bg-[#4F46E5] text-[#FFFFFF] hover:bg-[#4338CA]"
            onClick={onAdd}
            disabled={saving || loading}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <ShieldPlus className="mr-2 h-4 w-4" />
            Add admin role
          </Button>
          <p className="text-xs text-[#667085]">
            TODO: store added_by and added_at in an admin role audit table for full traceability.
          </p>
        </div>
      </ShellCard>

      <ShellCard>
        <SectionHeader title="Current admins" description="Remove access carefully." />
        <div className="divide-y divide-[#E5E7EB]">
          {loading && (
            <div className="flex items-center gap-3 p-6 text-sm text-[#667085]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading admin roles...
            </div>
          )}
          {!loading &&
            adminList.map((admin) => (
              <div
                key={admin.id || admin.email}
                className="flex items-center justify-between gap-4 p-6 hover:bg-[#F8F7F4]"
              >
                <div>
                  <p className="font-medium">{admin.username || admin.email}</p>
                  <p className="text-sm text-[#667085]">{admin.email}</p>
                  <p className="mt-1 text-xs text-[#667085]">
                    Added: {formatShortDate(admin.added_at || admin.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={admin.role === "super_admin" ? "blue" : "neutral"}>
                    {statusText(admin.role)}
                  </Badge>
                  <Button
                    variant="outline"
                    className="border-red-500/30 bg-red-500/10 text-[#E85D5D] hover:bg-red-500/20"
                    onClick={() => onRemove(admin)}
                    disabled={saving || loading || admin.role === "super_admin" || !admin.id}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          {!loading && !adminList.length && (
            <EmptyState
              title="No admins listed"
              body="Admin role records were not returned by the backend."
            />
          )}
        </div>
      </ShellCard>
    </div>
  );
};
