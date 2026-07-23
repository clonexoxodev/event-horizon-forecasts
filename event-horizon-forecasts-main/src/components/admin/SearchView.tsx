import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Users, TrendingUp, CreditCard, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import apiService from "@/lib/api";
import { Card, Badge, EmptyState, SkeletonCard } from "./ui";
import { classNames, formatNaira, formatDateTime, statusLabel } from "./utils";

type SearchResults = {
  users?: any[];
  markets?: any[];
  transactions?: any[];
};

export function SearchView({ setSelectedMarketId }: { setSelectedMarketId: (id: string | null) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({});
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults({});
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.globalSearch(trimmed);
      setResults(res.results || {});
    } catch {
      toast.error("Search failed. Please try again.");
      setResults({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults({});
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      performSearch(query);
      if (!recentSearches.includes(query.trim())) {
        setRecentSearches((prev) => [query.trim(), ...prev].slice(0, 5));
      }
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults({});
    inputRef.current?.focus();
  };

  const useRecentSearch = (term: string) => {
    setQuery(term);
  };

  const totalCount = (results.users?.length || 0) + (results.markets?.length || 0) + (results.transactions?.length || 0);
  const hasQuery = query.trim().length > 0;
  const hasResults = totalCount > 0;

  const marketStatusBadge = (s: string): "default" | "success" | "warning" | "danger" | "info" | "muted" => {
    switch (s) {
      case "active": return "success";
      case "closed": return "warning";
      case "pending_resolution": return "warning";
      case "resolved": return "info";
      case "refunded": return "info";
      case "cancelled": return "danger";
      case "draft": return "muted";
      case "archived": return "muted";
      default: return "default";
    }
  };

  const roleBadge = (role: string): "default" | "success" | "info" | "muted" => {
    switch (role) {
      case "super_admin": return "info";
      case "admin": return "default";
      default: return "muted";
    }
  };

  const txDirectionBadge = (d: string): "success" | "danger" | "info" => {
    switch (d) {
      case "credit": case "inflow": case "incoming": return "success";
      case "debit": case "outflow": case "outgoing": return "danger";
      default: return "info";
    }
  };

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search across all platform data..."
          className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-12 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          autoFocus
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {!loading && hasQuery && !hasResults && (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="No results found"
          body={`No matches for "${query.trim()}". Try a different search term.`}
        />
      )}

      {!loading && !hasQuery && (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="Search across all platform data"
          body="Type to search users, markets, and transactions."
          action={
            recentSearches.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => useRecentSearch(term)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                  >
                    {term}
                  </button>
                ))}
              </div>
            ) : undefined
          }
        />
      )}

      {!loading && hasResults && (
        <div className="space-y-5">
          <p className="text-xs font-semibold text-gray-400">
            {totalCount} result{totalCount !== 1 ? "s" : ""} found
          </p>

          {results.users && results.users.length > 0 && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Users className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Users</h3>
                <Badge variant="info">{results.users.length}</Badge>
              </div>
              <div className="divide-y divide-gray-100">
                {results.users.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-gray-50/50 -mx-5 px-5 rounded-xl cursor-pointer"
                    onClick={() => toast.info(`User: ${user.username || user.email}\nRole: ${statusLabel(user.role || "user")}\nID: ${user.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {user.username || user.email || "—"}
                      </p>
                      <p className="truncate text-xs text-gray-500">{user.email || user.id}</p>
                    </div>
                    <Badge variant={roleBadge(user.role || "user")}>
                      {statusLabel(user.role || "user")}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {results.markets && results.markets.length > 0 && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Markets</h3>
                <Badge variant="info">{results.markets.length}</Badge>
              </div>
              <div className="divide-y divide-gray-100">
                {results.markets.map((market: any) => (
                  <div
                    key={market.id}
                    className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-gray-50/50 -mx-5 px-5 rounded-xl cursor-pointer"
                    onClick={() => setSelectedMarketId(market.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-gray-900">
                        {market.question || "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {market.pool_amount_smallest_unit != null ? formatNaira(Math.round((market.pool_amount_smallest_unit || 0) / 100)) : "—"}
                        {" · "}
                        {formatDateTime(market.created_at)}
                      </p>
                    </div>
                    <Badge variant={marketStatusBadge(market.status || "draft")}>
                      {statusLabel(market.status || "draft")}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {results.transactions && results.transactions.length > 0 && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CreditCard className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Transactions</h3>
                <Badge variant="info">{results.transactions.length}</Badge>
              </div>
              <div className="divide-y divide-gray-100">
                {results.transactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-gray-50/50 -mx-5 px-5 rounded-xl cursor-pointer"
                    onClick={() => toast.info(`Transaction: ${tx.id}\nType: ${statusLabel(tx.type || "—")}\nAmount: ${formatNaira(tx.amount_smallest_unit ? Math.round((tx.amount_smallest_unit || 0) / 100) : tx.amount || 0)}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-gray-900">
                        {tx.id}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tx.type ? statusLabel(tx.type) : "—"}
                        {" · "}
                        {tx.created_at ? formatDateTime(tx.created_at) : "—"}
                      </p>
                    </div>
                    <Badge variant={txDirectionBadge(tx.direction || tx.type || "")}>
                      {tx.direction ? statusLabel(tx.direction) : formatNaira(tx.amount_smallest_unit ? Math.round((tx.amount_smallest_unit || 0) / 100) : tx.amount || 0)}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
