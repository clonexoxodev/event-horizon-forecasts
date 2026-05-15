import { useState } from "react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { DepositModal } from "@/components/DepositModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, Clock, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { formatNaira } from "@/lib/markets";
import { toast } from "sonner";

export default function Wallet() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  
  // Empty transactions - no fake data
  const transactions: any[] = [];

  // Mock USD balance (NGN / 1500 exchange rate)
  const ngnBalance = user?.balance || 0;
  const usdBalance = ngnBalance / 1500;
  const displayBalance = currency === "NGN" ? ngnBalance : usdBalance;
  const symbol = currency === "NGN" ? "₦" : "$";

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-20 text-center">
          <h2 className="text-2xl font-bold mb-3">Sign in to view your wallet</h2>
          <p className="text-muted-foreground">Manage your balance and transactions.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white pb-20 md:pb-0">
      <Header />
      <main className="flex-1 container py-10 max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Wallet</h1>
            <p className="text-graphite mt-1 text-sm">Manage your balance and transactions</p>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center gap-1 bg-graphite/5 rounded-xl p-1 border border-graphite/10">
            <button
              onClick={() => setCurrency("NGN")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-fast ${
                currency === "NGN"
                  ? "bg-off-white text-charcoal shadow-sm"
                  : "text-graphite hover:text-charcoal"
              }`}
            >
              NGN
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-fast ${
                currency === "USD"
                  ? "bg-off-white text-charcoal shadow-sm"
                  : "text-graphite hover:text-charcoal"
              }`}
            >
              USD
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Balance Card */}
          <div className="bg-gradient-hero text-white rounded-2xl p-6 shadow-elevated animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <WalletIcon className="w-5 h-5" />
                <span className="text-sm font-medium opacity-90">Available Balance</span>
              </div>
              <button 
                onClick={() => {
                  toast("Coming soon", {
                    description: "Balance refresh feature is currently in development",
                  });
                }}
                className="w-8 h-8 rounded-lg grid place-items-center hover:bg-white/10 transition-smooth"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="text-4xl font-extrabold tracking-tight mb-2">
              {currency === "NGN" ? formatNaira(displayBalance) : `$${displayBalance.toFixed(2)}`}
            </div>
            <p className="text-sm opacity-75">
              {currency === "NGN" ? `≈ $${usdBalance.toFixed(2)}` : `≈ ${formatNaira(ngnBalance)}`}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-card border border-graphite/10 animate-fade-up" style={{ animationDelay: "50ms" }}>
            <h3 className="font-bold mb-4 text-charcoal">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setDepositModalOpen(true)}
                className="h-12 bg-purple hover:bg-purple/90 text-white rounded-xl font-semibold shadow-sm transition-fast hover:shadow-md"
              >
                <ArrowDownRight className="w-4 h-4 mr-2" />
                Deposit
              </Button>
              <Button
                onClick={() => setWithdrawModalOpen(true)}
                variant="outline"
                className="h-12 rounded-xl font-semibold border-graphite/20 text-charcoal hover:bg-graphite/5 hover:border-graphite/30 transition-fast"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Withdraw
              </Button>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl p-6 shadow-card border border-graphite/10 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-lg text-charcoal">Transaction History</h2>
            <span className="text-xs text-graphite bg-graphite/10 px-3 py-1 rounded-lg font-semibold border border-graphite/10">
              {transactions.length} transactions
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-graphite/5 grid place-items-center mx-auto mb-4 text-3xl">
                💳
              </div>
              <p className="text-sm font-semibold mb-1 text-charcoal">No transactions yet</p>
              <p className="text-xs text-graphite">Your transaction history will appear here</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {transactions.map((tx, index) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-graphite/5 transition-fast cursor-pointer animate-fade-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl grid place-items-center ${
                        tx.amount > 0 ? "bg-emerald-soft text-emerald" : "bg-coral-soft text-coral"
                      }`}
                    >
                      {tx.amount > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-charcoal">{tx.label}</div>
                      <div className="text-xs text-graphite flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {tx.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-extrabold ${
                        tx.amount > 0 ? "text-emerald" : "text-coral"
                      }`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {currency === "NGN" ? formatNaira(Math.abs(tx.amount)) : `$${(Math.abs(tx.amount) / 1500).toFixed(2)}`}
                    </div>
                    <div className="text-xs text-graphite capitalize">{tx.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* Modals */}
      <DepositModal
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        currency={currency}
      />
      <WithdrawModal
        open={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        currency={currency}
        availableBalance={displayBalance}
      />

      <Footer />
      <MobileNav />
    </div>
  );
}
