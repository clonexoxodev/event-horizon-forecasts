import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Clock, RefreshCw, TrendingDown, TrendingUp, Wallet as WalletIcon } from "lucide-react";
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
  const { user, refreshUser } = useAuth();
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<WalletRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    if (!user) return;

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
      toast("Could not load history", {
        description: error.message || "Please refresh and try again.",
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshWallet = async () => {
    await refreshUser();
    await loadHistory();
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  const ngnBalance = user?.balance || 0;
  const usdBalance = ngnBalance / 1500;
  const displayBalance = currency === "NGN" ? ngnBalance : usdBalance;
  const totalIn = transactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const totalOut = transactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-violet-300">Wallet</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Your money</h1>
            <p className="mt-2 text-sm text-slate-400">Add money, withdraw, and see every move.</p>
          </div>
          <div className="flex w-fit rounded-2xl border border-white/10 bg-white/[0.06] p-1">
            {(["NGN", "USD"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setCurrency(item)}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  currency === item ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-violet-400/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.42),rgba(10,13,25,0.96)_46%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
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
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-8 text-4xl font-black tracking-tight sm:text-5xl">
              {currency === "NGN" ? formatNaira(displayBalance) : `$${displayBalance.toFixed(2)}`}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {currency === "NGN" ? `About $${usdBalance.toFixed(2)}` : `About ${formatNaira(ngnBalance)}`}
            </p>
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <StatCard label="Money in" value={formatNaira(totalIn)} tone="green" />
            <StatCard label="Money out" value={formatNaira(totalOut)} tone="red" />
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-2xl">
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
                      {currency === "NGN" ? formatNaira(Math.abs(tx.amount)) : `$${(Math.abs(tx.amount) / 1500).toFixed(2)}`}
                    </div>
                    <div className="mt-1 text-xs capitalize text-slate-500">{tx.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <DepositModal open={depositModalOpen} onClose={() => setDepositModalOpen(false)} currency={currency} onSaved={refreshWallet} />
      <WithdrawModal open={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} currency={currency} availableBalance={displayBalance} onSaved={refreshWallet} />

      <MobileNav />
    </div>
  );
}

const StatCard = ({ label, value, tone }: { label: string; value: string; tone: "green" | "red" }) => (
  <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
    <div className="text-sm font-bold text-slate-500">{label}</div>
    <div className={`mt-3 text-2xl font-black ${tone === "green" ? "text-emerald-300" : "text-red-300"}`}>{value}</div>
  </div>
);

const labelForTransaction = (tx: ApiTransaction) => {
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
