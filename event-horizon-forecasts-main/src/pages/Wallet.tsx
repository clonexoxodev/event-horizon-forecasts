import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Clock, Loader2, RefreshCw, TrendingDown, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { DepositModal } from "@/components/DepositModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/markets";
import apiService, { type ApiTransaction } from "@/lib/api";
import { toast } from "sonner";

type WalletRow = {
  id: string;
  label: string;
  amount: number;
  status: string;
  date: string;
  type: ApiTransaction["type"];
};

export default function Wallet() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<WalletRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    if (!user || authLoading) return;

    setHistoryLoading(true);
    try {
      const response = await apiService.getTransactions();
      setTransactions(
        response.transactions.map((tx) => ({
          id: tx.id,
          label: labelForTransaction(tx),
          amount: tx.direction === "IN" ? tx.amount : -tx.amount,
          status: statusText(tx),
          date: new Date(tx.createdAt).toLocaleDateString(),
          type: tx.type,
        }))
      );
    } catch (error: any) {
      console.warn("Wallet history request failed", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshWallet = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      if (user) await loadHistory();
      toast.success("Wallet refreshed.");
    } catch (error: any) {
      toast.error(error.message || "Could not refresh wallet.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    loadHistory();
  }, [authLoading, user]);

  const ngnBalance = user?.balance || 0;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050711] text-white xl:pl-64">
        <Header />
        <main className="grid min-h-[70vh] place-items-center px-4">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-violet-300" />
            <p className="text-sm font-bold text-slate-400">Restoring your wallet...</p>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050711] text-white xl:pl-64">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-2xl font-black">Log in to see your wallet</h2>
          <p className="mt-2 text-sm text-slate-400">Your balance and history will show here.</p>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050711] pb-24 text-white md:pb-0 xl:pl-64">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-violet-300">Wallet</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Balance and history</h1>
            <p className="mt-2 text-sm text-slate-400">Add money, withdraw, and review transactions.</p>
          </div>
        </div>

        <section>
          <div className="rounded-3xl border border-violet-400/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.42),rgba(10,13,25,0.96)_46%)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.42)] sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-violet-200">
                  <WalletIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-300">Balance</div>
                  <div className="text-xs text-slate-500">Ready to use</div>
                </div>
              </div>
              <button
                onClick={refreshWallet}
                disabled={refreshing}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="mt-8 text-4xl font-black tracking-tight sm:text-5xl">
              {formatNaira(ngnBalance)}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <Button
                onClick={() => setDepositModalOpen(true)}
                className="h-12 rounded-2xl bg-violet-500 font-black text-white shadow-[0_0_24px_rgba(139,92,246,0.35)] hover:bg-violet-400"
              >
                <ArrowDownRight className="mr-2 h-4 w-4" />
                Add Money
              </Button>
              <Button
                onClick={() => setWithdrawModalOpen(true)}
                variant="outline"
                className="h-12 rounded-2xl border-white/10 bg-white/5 font-black text-white hover:bg-white/10"
              >
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-2xl sm:p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">History</h2>
              <p className="text-sm text-slate-500">Deposits, withdrawals, predictions, winnings, and refunds.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
              {historyLoading ? "Loading" : `${transactions.length} items`}
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 py-14 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-violet-300">
                <WalletIcon className="h-6 w-6" />
              </div>
              <div className="font-black">No history yet</div>
              <p className="mt-1 text-sm text-slate-500">Add money or make a prediction to start.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1020]/80 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tx.amount >= 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
                      {tx.amount >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-white">{tx.label}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {tx.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-black ${tx.amount >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                      {tx.amount >= 0 ? "+" : "-"}
                      {formatNaira(Math.abs(tx.amount))}
                    </div>
                    <div className="mt-1 text-xs capitalize text-slate-500">{tx.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <DepositModal open={depositModalOpen} onClose={() => setDepositModalOpen(false)} currency="NGN" onSaved={refreshWallet} />
      <WithdrawModal open={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} currency="NGN" availableBalance={ngnBalance} onSaved={refreshWallet} />

      <MobileNav />
    </div>
  );
}

const labelForTransaction = (tx: ApiTransaction) => {
  const marketQuestion = typeof tx.metadata?.marketQuestion === "string" ? tx.metadata.marketQuestion : "";
  if (marketQuestion && (tx.type === "position_entry" || tx.type === "position_payout")) {
    return tx.type === "position_payout" ? `Winning: ${marketQuestion}` : `Prediction: ${marketQuestion}`;
  }

  const labels: Record<ApiTransaction["type"], string> = {
    deposit: "Add money",
    withdrawal: "Withdraw",
    position_entry: "Prediction",
    position_payout: "Winning",
    refund: "Refund",
  };

  return labels[tx.type] || tx.type.replace(/_/g, " ");
};

const statusText = (tx: ApiTransaction) => {
  if (tx.status === "completed") return "approved";
  if (tx.status === "failed" && tx.type === "withdrawal") return "rejected";
  if (tx.status === "failed") return "failed";
  return tx.status;
};
