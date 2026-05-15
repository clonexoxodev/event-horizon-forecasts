import { supabase } from "./supabase";
import {
  calculateMarketPrices,
  updateMarketWithTrade,
  calculateMarketConfidence,
  calculateVolatility,
  type MarketPricingState,
} from "./market-pricing";

export type Market = {
  id: string;
  question: string;
  category: string;
  yesPercent: number;
  pool: number;
  closesIn: string;
  description: string;
  source: string;
  icon: string;
  // Pricing fields
  yesPool: number;
  noPool: number;
  totalPool: number;
  participants: number;
  yesPrice: number;
  noPrice: number;
  closeTime: string;
  status: "active" | "closed" | "resolved";
  // Market health indicators
  confidence?: number;
  volatility?: number;
  liquidity?: number;
};

// Pricing calculation functions (using new engine)
export const calculatePrices = (yesPool: number, noPool: number) => {
  return calculateMarketPrices(yesPool, noPool);
};

/**
 * Update market pricing with dynamic AMM logic
 */
export const updateMarketPricing = (
  market: Market,
  side: "YES" | "NO",
  amount: number,
  isNewParticipant: boolean = false
): Market => {
  const newParticipants = isNewParticipant ? market.participants + 1 : market.participants;
  
  // Calculate hours to close (if available)
  let hoursToClose: number | undefined;
  if (market.closeTime) {
    const closeDate = new Date(market.closeTime);
    const now = new Date();
    hoursToClose = Math.max(0, (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  }
  
  // Create current pricing state
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
  
  // Update with trade using dynamic pricing engine
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

// Empty array - no fake data
export const markets: Market[] = [];

// Fetch markets from Supabase
export const fetchMarkets = async (): Promise<Market[]> => {
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .eq("resolved", false)
    .order("pool", { ascending: false });

  // If backend has no data, use demo markets for testing
  if (error || !data || data.length === 0) {
    const { demoMarkets } = await import("./demo-markets");
    return demoMarkets;
  }

  return data.map(m => {
    const yesPool = m.yes_pool ?? 0;
    const noPool = m.no_pool ?? 0;
    const totalPool = yesPool + noPool;
    const participants = m.participants ?? 0;
    const { yesPrice, noPrice } = calculatePrices(yesPool, noPool);
    const confidence = calculateMarketConfidence(totalPool, participants);
    const volatility = calculateVolatility(totalPool, participants);
    
    return {
      id: m.id,
      question: m.question,
      category: m.category,
      yesPercent: yesPrice,
      pool: totalPool,
      closesIn: m.closes_in ?? "",
      description: m.description ?? "",
      source: m.source ?? "",
      icon: m.icon ?? "📊",
      yesPool,
      noPool,
      totalPool,
      participants,
      yesPrice,
      noPrice,
      closeTime: m.close_time ?? "",
      status: m.status ?? "active",
      confidence,
      volatility,
      liquidity: totalPool,
    };
  });
};

// Place a position
export const placePosition = async (
  userId: string,
  marketId: string,
  side: "YES" | "NO",
  stake: number
): Promise<{ error: string | null }> => {
  const { error } = await supabase.from("positions").insert({
    user_id: userId,
    market_id: marketId,
    side,
    stake,
  });

  if (error) return { error: error.message };

  // Deduct from balance
  const { error: balErr } = await supabase.rpc("deduct_balance", {
    user_id: userId,
    amount: stake,
  });

  return { error: balErr?.message ?? null };
};

// Fetch user positions
export const fetchPositions = async (userId: string) => {
  const { data, error } = await supabase
    .from("positions")
    .select("*, markets(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
};

export const formatNaira = (n: number) =>
  "₦" + (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : n.toString());
