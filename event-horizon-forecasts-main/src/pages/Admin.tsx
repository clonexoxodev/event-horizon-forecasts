import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DashboardView } from "@/components/admin/DashboardView";
import { MarketsView } from "@/components/admin/MarketsView";
import { MarketDetailView } from "@/components/admin/MarketDetailView";
import { CreateMarketView } from "@/components/admin/CreateMarketView";
import { EditMarketView } from "@/components/admin/EditMarketView";
import { WithdrawalQueueView } from "@/components/admin/WithdrawalQueueView";
import { FinanceView } from "@/components/admin/FinanceView";
import { UsersView } from "@/components/admin/UsersView";
import { AdminsView } from "@/components/admin/AdminsView";
import { AuditLogView } from "@/components/admin/AuditLogView";
import { SettlementDashboardView } from "@/components/admin/SettlementDashboardView";
import { AnalyticsView } from "@/components/admin/AnalyticsView";
import { RiskCenterView } from "@/components/admin/RiskCenterView";
import { SystemHealthView } from "@/components/admin/SystemHealthView";
import { FeatureFlagsView } from "@/components/admin/FeatureFlagsView";
import { SettingsView } from "@/components/admin/SettingsView";
import { SearchView } from "@/components/admin/SearchView";
import { ExportView } from "@/components/admin/ExportView";
import { useAuth } from "@/lib/auth";
import type { AdminView } from "@/components/admin/types";
import { DelayedFlippeLoader } from "@/components/FlippeBrand";

const Admin = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [view, setView] = useState<AdminView>("dashboard");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);

  const handleViewChange = useCallback((v: AdminView) => {
    setView(v);
    if (v !== "market-detail" && v !== "edit-market") setSelectedMarketId(null);
  }, []);

  const handleMarketSelect = useCallback((id: string) => {
    setSelectedMarketId(id);
    setView("market-detail");
  }, []);

  const handleMarketCreated = useCallback((id: string) => {
    setSelectedMarketId(id);
    setView("market-detail");
  }, []);

  const handleMarketEdit = useCallback((id: string) => {
    setSelectedMarketId(id);
    setView("edit-market");
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
          <MarketDetailView
            marketId={selectedMarketId}
            onBack={() => handleViewChange("markets")}
            onEdit={handleMarketEdit}
          />
        ) : (
          <DashboardView setView={handleViewChange} setSelectedMarketId={handleMarketSelect} />
        );
      case "create-market":
        return <CreateMarketView onBack={() => handleViewChange("markets")} onCreated={handleMarketCreated} />;
      case "edit-market":
        return selectedMarketId ? (
          <EditMarketView
            marketId={selectedMarketId}
            onBack={() => handleViewChange("markets")}
            onSaved={handleMarketCreated}
          />
        ) : (
          <MarketsView setView={handleViewChange} setSelectedMarketId={handleMarketSelect} />
        );
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
      case "settlement-dashboard":
        return <SettlementDashboardView setSelectedMarketId={handleMarketSelect} />;
      case "analytics":
        return <AnalyticsView />;
      case "risk-center":
        return <RiskCenterView />;
      case "system-health":
        return <SystemHealthView />;
      case "feature-flags":
        return <FeatureFlagsView />;
      case "settings":
        return <SettingsView />;
      case "search":
        return <SearchView setSelectedMarketId={handleMarketSelect} />;
      case "export":
        return <ExportView />;
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
