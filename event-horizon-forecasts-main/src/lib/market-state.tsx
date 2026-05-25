import { createContext, useContext, useState, ReactNode, useCallback, Dispatch, SetStateAction } from "react";
import { Market, updateMarketPricing } from "./markets";

type MarketStateContextType = {
  markets: Market[];
  setMarkets: Dispatch<SetStateAction<Market[]>>;
  updateMarket: (marketId: string, side: "YES" | "NO", amount: number, userId: string) => void;
  getMarket: (marketId: string) => Market | undefined;
};

const MarketStateContext = createContext<MarketStateContextType | undefined>(undefined);

export const MarketStateProvider = ({ children }: { children: ReactNode }) => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [userParticipation, setUserParticipation] = useState<Record<string, Set<string>>>({});

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
  }, [userParticipation]);

  const getMarket = useCallback((marketId: string) => {
    return markets.find(m => m.id === marketId);
  }, [markets]);

  return (
    <MarketStateContext.Provider value={{ markets, setMarkets, updateMarket, getMarket }}>
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
