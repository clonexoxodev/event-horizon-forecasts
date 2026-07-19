import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DashboardView } from "@/components/admin/DashboardView";
import { MarketsView } from "@/components/admin/MarketsView";
import { MarketDetailView } from "@/components/admin/MarketDetailView";
import { CreateMarketView } from "@/components/admin/CreateMarketView";
import { WithdrawalQueueView } from "@/components/admin/WithdrawalQueueView";
import { FinanceView } from "@/components/admin/FinanceView";
import { UsersView } from "@/components/admin/UsersView";
import { AdminsView } from "@/components/admin/AdminsView";
import { AuditLogView } from "@/components/admin/AuditLogView";
import { useAuth } from "@/lib/auth";
import type { AdminView } from "@/components/admin/types";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";

const Admin = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [view, setView] = useState<AdminView>("dashboard");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);

  const handleViewChange = useCallback((v: AdminView) => {
    setView(v);
    if (v !== "market-detail") setSelectedMarketId(null);
  }, []);

  const handleMarketSelect = useCallback((id: string) => {
    setSelectedMarketId(id);
    setView("market-detail");
  }, []);

  const handleMarketCreated = useCallback((id: string) => {
    setSelectedMarketId(id);
    setView("market-detail");
  }, []);

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-gray-50">
        <DelayedFlippeLoader active label="Loading admin panel..." />
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return (
      <div className="grid min-h-screen place-items-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-500">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case "dashboard":
        return <DashboardView setView={handleViewChange} setSelectedMarketId={handleMarketSelect} />;
      case "markets":
        return <MarketsView setView={handleViewChange} setSelectedMarketId={handleMarketSelect} />;
      case "market-detail":
        return selectedMarketId ? (
          <MarketDetailView marketId={selectedMarketId} onBack={() => handleViewChange("markets")} />
        ) : (
          <DashboardView setView={handleViewChange} setSelectedMarketId={handleMarketSelect} />
        );
      case "create-market":
        return <CreateMarketView onBack={() => handleViewChange("markets")} onCreated={handleMarketCreated} />;
      case "withdrawals":
        return <WithdrawalQueueView />;
      case "finance":
        return <FinanceView />;
      case "users":
        return <UsersView />;
      case "admins":
        return <AdminsView />;
      case "audit-log":
        return <AuditLogView />;
      default:
        return <DashboardView setView={handleViewChange} setSelectedMarketId={handleMarketSelect} />;
    }
  };

  return (
    <AdminLayout
      view={view}
      setView={handleViewChange}
      setSelectedMarketId={setSelectedMarketId}
    >
      {renderView()}
    </AdminLayout>
  );
};

export default Admin;
