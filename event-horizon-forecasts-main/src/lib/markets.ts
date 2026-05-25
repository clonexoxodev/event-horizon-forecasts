import apiService, { type ApiMarket } from "./api";
import {
  calculateMarketPrices,
  updateMarketWithTrade,
  calculateMarketConfidence,
  calculateVolatility,
  type MarketPricingState,
} from "./market-pricing";

export type Market = ApiMarket;

export const calculatePrices = (yesPool: number, noPool: number) => {
  return calculateMarketPrices(yesPool, noPool);
};

/**
 * Local price projection helper for read-only previews. Authoritative market
 * pool updates happen on the backend through placePrediction.
 */
export const updateMarketPricing = (
  market: Market,
  side: "YES" | "NO",
  amount: number,
  isNewParticipant: boolean = false
): Market => {
  const newParticipants = isNewParticipant ? market.participants + 1 : market.participants;

  let hoursToClose: number | undefined;
  if (market.closeTime) {
    const closeDate = new Date(market.closeTime);
    const now = new Date();
    hoursToClose = Math.max(0, (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  }

  const currentState: MarketPricingState = {
    yesPool: market.yesPool,
    noPool: market.noPool,
    totalPool: market.totalPool,
    yesPrice: market.yesPrice,
    noPrice: market.noPrice,
    liquidity: market.totalPool,
    confidence: market.confidence || calculateMarketConfidence(market.totalPool, market.participants),
    volatility: market.volatility || calculateVolatility(market.totalPool, market.participants),
  };

  const newState = updateMarketWithTrade(currentState, {
    tradeSize: amount,
    side,
    timeToClose: hoursToClose,
    participantCount: newParticipants,
  });

  return {
    ...market,
    yesPool: newState.yesPool,
    noPool: newState.noPool,
    totalPool: newState.totalPool,
    participants: newParticipants,
    yesPrice: newState.yesPrice,
    noPrice: newState.noPrice,
    yesPercent: newState.yesPrice,
    pool: newState.totalPool,
    confidence: newState.confidence,
    volatility: newState.volatility,
    liquidity: newState.liquidity,
  };
};

export const markets: Market[] = [];

export const fetchMarkets = async (): Promise<Market[]> => {
  const response = await apiService.getMarkets();
  return response.markets;
};

export const placePosition = async (
  _userId: string,
  marketId: string,
  side: "YES" | "NO",
  stake: number
): Promise<{ error: string | null }> => {
  try {
    await apiService.placePrediction(marketId, { side, amount: stake, currency: "NGN" });
    return { error: null };
  } catch (error: any) {
    return { error: error.message || "Failed to place prediction" };
  }
};

export const fetchPositions = async (_userId: string) => {
  const response = await apiService.getPositions();
  return response.positions;
};

export const formatNaira = (n: number) =>
  "₦" + (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : n.toString());
