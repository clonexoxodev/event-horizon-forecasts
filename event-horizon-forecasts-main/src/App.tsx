import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ForecastSlipProvider, useForecastSlip } from "@/lib/forecast-slip";
import type { ForecastSelection } from "@/lib/forecast-slip";
import { MarketStateProvider, useMarketState } from "@/lib/market-state";
import { NotificationProvider, useNotificationHelpers } from "@/lib/notification-context";
import { AuthModal } from "@/components/AuthModal";
import { ForecastSlip } from "@/components/ForecastSlip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import apiService from "@/lib/api";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import MarketDetail from "./pages/MarketDetail.tsx";
import Portfolio from "./pages/Portfolio.tsx";
import Wallet from "./pages/Wallet.tsx";
import Profile from "./pages/Profile.tsx";
import Settings from "./pages/Settings.tsx";
import Support from "./pages/Support.tsx";
import EditProfile from "./pages/EditProfile.tsx";
import More from "./pages/More.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";
import About from "./pages/About.tsx";
import HowItWorks from "./pages/HowItWorks.tsx";
import Markets from "./pages/Markets.tsx";
import CreateMarket from "./pages/CreateMarket.tsx";
import FAQ from "./pages/FAQ.tsx";
import HelpCenter from "./pages/HelpCenter.tsx";
import Contact from "./pages/Contact.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import RiskDisclaimer from "./pages/RiskDisclaimer.tsx";
import TransactionHistory from "./pages/TransactionHistory.tsx";
import Notifications from "./pages/Notifications.tsx";
import JoinPrivate from "./pages/JoinPrivate.tsx";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const InviteRedirect = () => {
  const { code } = useParams<{ code: string }>();
  return <Navigate to={`/join?code=${encodeURIComponent(code || "")}`} replace />;
};

const ForecastSlipContainer = () => {
  const { selection, closeForecastSlip } = useForecastSlip();
  const { upsertMarket } = useMarketState();
  const { user, refreshUser } = useAuth();
  const { notifyForecastConfirmed, notifyWalletLow } = useNotificationHelpers();

  const handleConfirm = async (selection: ForecastSelection, amount: number) => {
    if (!user) {
      throw new Error("User not authenticated");
    }
    if (selection.side !== "YES" && selection.side !== "NO") {
      throw new Error("Only YES/NO predictions are supported");
    }

    const result = await apiService.placePrediction(selection.marketId, {
      side: selection.side,
      amount,
      currency: "NGN",
    });

    try {
      if (result?.market) {
        upsertMarket(result.market);
      }
    } catch (err) {
      console.warn("Market upsert after trade failed", err);
    }

    try {
      await refreshUser();
    } catch (err) {
      console.warn("User refresh after trade failed", err);
    }

    try {
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
    } catch (err) {
      console.warn("Notification after trade failed", err);
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
  <ErrorBoundary>
    <TooltipProvider>
      <AuthProvider>
        <NotificationProvider>
          <MarketStateProvider>
            <ForecastSlipProvider>
              <Sonner />
              <AuthModal />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <ScrollToTop />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/market/:id" element={<MarketDetail />} />
                  <Route path="/predictions" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
                  <Route path="/join" element={<JoinPrivate />} />
                  <Route path="/join/:code" element={<JoinPrivate />} />
                  <Route path="/invite/:code" element={<InviteRedirect />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/edit-profile" element={<EditProfile />} />
                  <Route path="/more" element={<More />} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/about" element={<About />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/markets" element={<Markets />} />
                  <Route path="/create" element={<CreateMarket />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/help-center" element={<HelpCenter />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/risk-disclaimer" element={<RiskDisclaimer />} />
                  <Route path="/responsible-use" element={<RiskDisclaimer />} />
                  <Route path="/transaction-history" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>} />

                  {/* Legacy aliases — kept only so old links and bookmarks keep working */}
                  <Route path="/portfolio" element={<Navigate to="/predictions" replace />} />
                  <Route path="/positions" element={<Navigate to="/predictions" replace />} />
                  <Route path="/orders" element={<Navigate to="/predictions" replace />} />
                  <Route path="/dashboard" element={<Navigate to="/predictions" replace />} />
                  <Route path="/activity" element={<Navigate to="/predictions" replace />} />
                  <Route path="/listing/:code" element={<Navigate to="/predictions" replace />} />
                  <Route path="/discussion" element={<Navigate to="/" replace />} />

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
                        <Admin />
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
  </ErrorBoundary>
);

export default App;
