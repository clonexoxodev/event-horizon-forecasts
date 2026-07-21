import { createContext, useContext, useState, ReactNode } from "react";

type ForecastSelection = {
  marketId: string;
  marketQuestion: string;
  marketIcon: string;
  side: "YES" | "NO" | "UP" | "DOWN";
  currentPrice: number;
  yesPool?: number;
  noPool?: number;
  totalYesShares?: number;
  totalNoShares?: number;
  participants?: number;
  minAmount?: number;
  maxAmount?: number;
  pricingModel?: "pool" | "orderbook";
};

type ForecastSlipContextType = {
  selection: ForecastSelection | null;
  openForecastSlip: (selection: ForecastSelection) => void;
  closeForecastSlip: () => void;
};

const ForecastSlipContext = createContext<ForecastSlipContextType | undefined>(undefined);

export const ForecastSlipProvider = ({ children }: { children: ReactNode }) => {
  const [selection, setSelection] = useState<ForecastSelection | null>(null);

  const openForecastSlip = (newSelection: ForecastSelection) => {
    setSelection(newSelection);
  };

  const closeForecastSlip = () => {
    setSelection(null);
  };

  return (
    <ForecastSlipContext.Provider value={{ selection, openForecastSlip, closeForecastSlip }}>
      {children}
    </ForecastSlipContext.Provider>
  );
};

export const useForecastSlip = () => {
  const context = useContext(ForecastSlipContext);
  if (!context) {
    throw new Error("useForecastSlip must be used within ForecastSlipProvider");
  }
  return context;
};
