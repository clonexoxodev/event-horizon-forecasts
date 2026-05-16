// Flippe Platform v2.2.0 - Production Ready with cross-domain cookies
// Last updated: 2026-05-16 00:30 UTC - Cross-domain cookie fix deployed
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ForecastSlipProvider, useForecastSlip } from "@/lib/forecast-slip";
import { MarketStateProvider, useMarketState } from "@/lib/market-state";
import { NotificationProvider, useNotificationHelpers } from "@/lib/notification-context";
import { ForecastSlip } from "@/components/ForecastSlip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import MarketDetail from "./pages/MarketDetail.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Wallet from "./pages/Wallet.tsx";
import Portfolio from "./pages/Portfolio.tsx";
import Notifications from "./pages/Notifications.tsx";
import Profile from "./pages/Profile.tsx";
import More from "./pages/More.tsx";
import Admin from "./pages/Admin.tsx";
import SuperAdminDashboard from "./pages/SuperAdminDashboard.tsx";
import ListingDetail from "./pages/ListingDetail.tsx";
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

// Forecast Slip Container
const ForecastSlipContainer = () => {
  const { selection, closeForecastSlip } = useForecastSlip();
  const { updateMarket } = useMarketState();
  const { user } = useAuth();
  const { notifyForecastConfirmed, notifyWalletLow } = useNotificationHelpers();

  const handleConfirm = async (selection: any, amount: number) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    if (!user) {
      throw new Error("User not authenticated");
    }
    
    // Update market pricing locally
    updateMarket(selection.marketId, selection.side, amount, user.id);
    
    // Create forecast confirmed notification
    notifyForecastConfirmed(
      selection.marketId,
      selection.marketQuestion,
      selection.side,
      amount
    );
    
    // Check if wallet is low after forecast
    const newBalance = user.balance - amount;
    if (newBalance < 5000) { // Less than ₦5K
      notifyWalletLow(newBalance);
    }
    
    // TODO: Save position to backend
    console.log("Forecast confirmed:", { selection, amount });
    
    // In production, this would be handled by the backend
    // The backend would:
    // 1. Deduct balance from user wallet
    // 2. Create position record
    // 3. Update market pools (yes_pool, no_pool)
    // 4. Increment participants count if new
    // 5. Return updated market data
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
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/market/:id" element={<MarketDetail />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/listing/:code" element={<ListingDetail />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
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
