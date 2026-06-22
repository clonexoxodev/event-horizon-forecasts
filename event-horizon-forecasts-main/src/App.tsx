import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ForecastSlipProvider, useForecastSlip } from "@/lib/forecast-slip";
import { MarketStateProvider, useMarketState } from "@/lib/market-state";
import { NotificationProvider, useNotificationHelpers } from "@/lib/notification-context";
import { ForecastSlip } from "@/components/ForecastSlip";
import { PageTransitionLoader } from "@/components/FlippeBrand";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import apiService from "@/lib/api";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import MarketDetail from "./pages/MarketDetail.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Wallet from "./pages/Wallet.tsx";
import Notifications from "./pages/Notifications.tsx";
import Profile from "./pages/Profile.tsx";
import Settings from "./pages/Settings.tsx";
import Support from "./pages/Support.tsx";
import EditProfile from "./pages/EditProfile.tsx";
import More from "./pages/More.tsx";
import Admin from "./pages/Admin.tsx";
import SuperAdminDashboard from "./pages/SuperAdminDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import About from "./pages/About.tsx";
import HowItWorks from "./pages/HowItWorks.tsx";
import Markets from "./pages/Markets.tsx";
import FAQ from "./pages/FAQ.tsx";
import HelpCenter from "./pages/HelpCenter.tsx";
import Contact from "./pages/Contact.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import RiskDisclaimer from "./pages/RiskDisclaimer.tsx";

const queryClient = new QueryClient();

const ForecastSlipContainer = () => {
  const { selection, closeForecastSlip } = useForecastSlip();
  const { upsertMarket } = useMarketState();
  const { user, refreshUser } = useAuth();
  const { notifyForecastConfirmed, notifyWalletLow } = useNotificationHelpers();

  const handleConfirm = async (selection: any, amount: number) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    const result = await apiService.placePrediction(selection.marketId, {
      side: selection.side,
      amount,
      currency: "NGN",
    });

    upsertMarket(result.market);

    refreshUser().catch((error) => console.warn("User refresh after prediction failed", error));

    notifyForecastConfirmed(
      selection.marketId,
      selection.marketQuestion,
      selection.side,
      amount
    );

    const newBalance = user.balance - amount;
    if (newBalance < 5000) {
      notifyWalletLow(newBalance);
    }
  };

  return (
    <ForecastSlip
      selection={selection}
      onClose={closeForecastSlip}
      onConfirm={handleConfirm}
    />
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <NotificationProvider>
          <MarketStateProvider>
            <ForecastSlipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <PageTransitionLoader />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/market/:id" element={<MarketDetail />} />
                  <Route path="/portfolio" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Navigate to="/portfolio" replace />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/listing/:code" element={<Navigate to="/portfolio" replace />} />
                  <Route path="/activity" element={<Navigate to="/portfolio" replace />} />
                  <Route path="/discussion" element={<Navigate to="/" replace />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/edit-profile" element={<EditProfile />} />
                  <Route path="/more" element={<More />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/markets" element={<Markets />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/help-center" element={<HelpCenter />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/risk-disclaimer" element={<RiskDisclaimer />} />
                  <Route path="/responsible-use" element={<RiskDisclaimer />} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Admin />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/super-admin"
                    element={
                      <ProtectedRoute requiredRole="super_admin">
                        <SuperAdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              <ForecastSlipContainer />
            </ForecastSlipProvider>
          </MarketStateProvider>
        </NotificationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
