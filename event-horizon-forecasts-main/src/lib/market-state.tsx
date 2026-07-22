import { createContext, useContext, useState, ReactNode, useCallback, Dispatch, SetStateAction } from "react";
import { fetchMarkets, Market, updateMarketPricing } from "./markets";

const MARKET_CACHE_KEY = "flippe_markets_cache_v1";
const MARKET_CACHE_TTL = 2 * 60 * 1000;

const readCachedMarkets = (): { markets: Market[]; loadedAt: number } => {
  if (typeof window === "undefined") return { markets: [], loadedAt: 0 };

  try {
    const raw = window.localStorage.getItem(MARKET_CACHE_KEY);
    if (!raw) return { markets: [], loadedAt: 0 };
    const parsed = JSON.parse(raw) as { markets?: Market[]; loadedAt?: number };
    return {
      markets: Array.isArray(parsed.markets) ? parsed.markets : [],
      loadedAt: Number(parsed.loadedAt || 0),
    };
  } catch {
    return { markets: [], loadedAt: 0 };
  }
};

const writeCachedMarkets = (markets: Market[]) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify({ markets, loadedAt: Date.now() }));
  } catch {
    // Cache failure should never break navigation or market rendering.
  }
};

const marketFreshnessScore = (market: Market) => {
  const tradeScore = Number(market.tradeCount || 0) * 1_000_000;
  const historyScore = Number(market.priceHistory?.length || 0) * 10_000;
  const volumeScore = Number(market.totalVolume || 0);
  return tradeScore + historyScore + volumeScore;
};

const shouldReplaceMarket = (incoming: Market, existing?: Market) => {
  if (!existing) return true;
  return marketFreshnessScore(incoming) >= marketFreshnessScore(existing);
};

const mergeMarketData = (incoming: Market, existing?: Market) => {
  if (!existing) return incoming;

  const incomingHistory = incoming.priceHistory || [];
  const existingHistory = existing.priceHistory || [];
  const priceHistory = incomingHistory.length >= existingHistory.length ? incomingHistory : existingHistory;

  return {
    ...existing,
    ...incoming,
    priceHistory,
  };
};

const mergeMarketsByFreshness = (incoming: Market[], existing: Market[]) => {
  const existingById = new Map(existing.map((market) => [market.id, market]));
  const incomingIds = new Set(incoming.map((market) => market.id));
  const mergedIncoming = incoming.map((market) => {
    const previous = existingById.get(market.id);
    return shouldReplaceMarket(market, previous) ? mergeMarketData(market, previous) : previous!;
  });
  const preserved = existing.filter((market) => !incomingIds.has(market.id));
  return [...mergedIncoming, ...preserved];
};

type MarketStateContextType = {
  markets: Market[];
  setMarkets: Dispatch<SetStateAction<Market[]>>;
  isLoadingMarkets: boolean;
  marketError: string | null;
  lastLoadedAt: number;
  loadMarkets: (options?: { force?: boolean }) => Promise<Market[]>;
  upsertMarket: (market: Market) => void;
  updateMarket: (marketId: string, side: "YES" | "NO", amount: number, userId: string) => void;
  getMarket: (marketId: string) => Market | undefined;
};

const MarketStateContext = createContext<MarketStateContextType | undefined>(undefined);

export const MarketStateProvider = ({ children }: { children: ReactNode }) => {
  const cached = readCachedMarkets();
  const [markets, setMarketsState] = useState<Market[]>(cached.markets);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(cached.loadedAt);
  const [userParticipation, setUserParticipation] = useState<Record<string, Set<string>>>({});

  const setMarkets: Dispatch<SetStateAction<Market[]>> = useCallback((next) => {
    setMarketsState((previous) => {
      const resolved = typeof next === "function" ? (next as (value: Market[]) => Market[])(previous) : next;
      writeCachedMarkets(resolved);
      setLastLoadedAt(Date.now());
      return resolved;
    });
  }, []);

  const loadMarkets = useCallback(async (options: { force?: boolean } = {}) => {
    const cacheIsFresh = Date.now() - lastLoadedAt < MARKET_CACHE_TTL;
    if (!options.force && markets.length > 0 && cacheIsFresh) {
      return markets;
    }

    setIsLoadingMarkets(true);
    setMarketError(null);
    try {
      const loaded = await fetchMarkets();
      const merged = mergeMarketsByFreshness(loaded, markets);
      setMarkets(merged);
      return merged;
    } catch (error: any) {
      const message = error?.message || "Could not load markets.";
      console.warn("Market list request failed", error);
      setMarketError(message);
      return markets;
    } finally {
      setIsLoadingMarkets(false);
    }
  }, [lastLoadedAt, markets, setMarkets]);

  const upsertMarket = useCallback((market: Market) => {
    setMarkets((prev) =>
      prev.some((item) => item.id === market.id)
        ? prev.map((item) => (item.id === market.id && shouldReplaceMarket(market, item) ? mergeMarketData(market, item) : item))
        : [...prev, market]
    );
  }, [setMarkets]);

  const updateMarket = useCallback((marketId: string, side: "YES" | "NO", amount: number, userId: string) => {
    setMarkets(prevMarkets => {
      return prevMarkets.map(market => {
        if (market.id !== marketId) return market;
        
        // Check if this is a new participant
        const marketParticipants = userParticipation[marketId] || new Set();
        const isNewParticipant = !marketParticipants.has(userId);
        
        // Update participation tracking
        if (isNewParticipant) {
          setUserParticipation(prev => ({
            ...prev,
            [marketId]: new Set([...Array.from(prev[marketId] || []), userId]),
          }));
        }
        
        return updateMarketPricing(market, side, amount, isNewParticipant);
      });
    });
  }, [setMarkets, userParticipation]);

  const getMarket = useCallback((marketId: string) => {
    return markets.find(m => m.id === marketId);
  }, [markets]);

  return (
    <MarketStateContext.Provider value={{ markets, setMarkets, isLoadingMarkets, marketError, lastLoadedAt, loadMarkets, upsertMarket, updateMarket, getMarket }}>
      {children}
    </MarketStateContext.Provider>
  );
};

export const useMarketState = () => {
  const context = useContext(MarketStateContext);
  if (!context) {
    throw new Error("useMarketState must be used within MarketStateProvider");
  }
  return context;
};
