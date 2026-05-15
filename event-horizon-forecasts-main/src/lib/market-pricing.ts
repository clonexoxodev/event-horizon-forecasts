/**
 * Dynamic Market Pricing Engine
 * 
 * Implements Polymarket/Kalshi-style prediction market pricing with:
 * - Automated Market Maker (AMM) logic
 * - Constant Product Market Maker (CPMM) formula
 * - Gradual price movements
 * - Liquidity-based pricing
 * - Time decay factors
 */

export interface MarketPricingState {
  yesPool: number;
  noPool: number;
  totalPool: number;
  yesPrice: number;
  noPrice: number;
  liquidity: number;
  confidence: number; // 0-100, based on pool size and participants
  volatility: number; // 0-100, how much prices can move
}

export interface PriceMovementFactors {
  tradeSize: number;
  side: "YES" | "NO";
  timeToClose?: number; // hours remaining
  externalSignal?: number; // -1 to 1, from AI/API
  participantCount?: number;
}

/**
 * Calculate market prices using Constant Product Market Maker (CPMM)
 * Similar to Uniswap's x * y = k formula
 */
export const calculateMarketPrices = (
  yesPool: number,
  noPool: number
): { yesPrice: number; noPrice: number } => {
  const totalPool = yesPool + noPool;
  
  if (totalPool === 0) {
    return { yesPrice: 50, noPrice: 50 };
  }
  
  // Use CPMM formula for more realistic pricing
  // Price = shares / (shares + counterShares)
  const yesPrice = Math.round((yesPool / totalPool) * 100);
  const noPrice = 100 - yesPrice;
  
  return { yesPrice, noPrice };
};

/**
 * Calculate price impact of a trade
 * Larger trades have bigger impact, but with diminishing returns
 */
export const calculatePriceImpact = (
  tradeSize: number,
  poolSize: number,
  side: "YES" | "NO"
): number => {
  if (poolSize === 0) return 0;
  
  // Impact percentage based on trade size relative to pool
  const impactRatio = tradeSize / poolSize;
  
  // Use logarithmic scaling for more realistic impact
  // Small trades have minimal impact, large trades have significant but bounded impact
  const baseImpact = Math.log(1 + impactRatio * 10) / Math.log(11);
  
  // Scale to percentage points (max ~15% price movement per trade)
  return baseImpact * 15;
};

/**
 * Calculate market confidence based on liquidity and participants
 * Higher confidence = more stable prices
 */
export const calculateMarketConfidence = (
  totalPool: number,
  participants: number
): number => {
  // Confidence increases with pool size and participant count
  const poolFactor = Math.min(totalPool / 1000000, 1); // Max at ₦1M
  const participantFactor = Math.min(participants / 100, 1); // Max at 100 participants
  
  // Weighted average (pool size matters more)
  const confidence = (poolFactor * 0.7 + participantFactor * 0.3) * 100;
  
  return Math.round(confidence);
};

/**
 * Calculate market volatility
 * Lower liquidity = higher volatility = bigger price swings
 */
export const calculateVolatility = (
  totalPool: number,
  participants: number
): number => {
  // Inverse of confidence
  const confidence = calculateMarketConfidence(totalPool, participants);
  return 100 - confidence;
};

/**
 * Apply time decay factor
 * Markets become more stable as they approach close time
 */
export const applyTimeDecay = (
  priceMovement: number,
  hoursToClose: number
): number => {
  if (hoursToClose <= 0) return 0;
  
  // Reduce volatility as market approaches close
  // Last 24 hours: reduce movement by up to 50%
  if (hoursToClose < 24) {
    const decayFactor = hoursToClose / 24;
    return priceMovement * (0.5 + decayFactor * 0.5);
  }
  
  return priceMovement;
};

/**
 * Apply external signal (AI/API data)
 * Gradually shifts market sentiment
 */
export const applyExternalSignal = (
  currentPrice: number,
  signal: number, // -1 to 1
  strength: number = 0.1 // How much to weight the signal
): number => {
  // Signal pushes price toward 0 (bearish) or 100 (bullish)
  const targetPrice = 50 + signal * 50;
  const adjustment = (targetPrice - currentPrice) * strength;
  
  return adjustment;
};

/**
 * Update market pricing with a trade
 * Returns new pricing state with smooth, realistic movements
 */
export const updateMarketWithTrade = (
  currentState: MarketPricingState,
  factors: PriceMovementFactors
): MarketPricingState => {
  const { tradeSize, side, timeToClose, externalSignal, participantCount } = factors;
  
  // Calculate new pool sizes
  const newYesPool = side === "YES" ? currentState.yesPool + tradeSize : currentState.yesPool;
  const newNoPool = side === "NO" ? currentState.noPool + tradeSize : currentState.noPool;
  const newTotalPool = newYesPool + newNoPool;
  
  // Calculate base prices from pools
  const { yesPrice: baseYesPrice, noPrice: baseNoPrice } = calculateMarketPrices(newYesPool, newNoPool);
  
  // Calculate price impact
  const impactPool = side === "YES" ? currentState.yesPool : currentState.noPool;
  const priceImpact = calculatePriceImpact(tradeSize, impactPool, side);
  
  // Apply time decay if provided
  let adjustedImpact = priceImpact;
  if (timeToClose !== undefined) {
    adjustedImpact = applyTimeDecay(priceImpact, timeToClose);
  }
  
  // Apply external signal if provided
  let signalAdjustment = 0;
  if (externalSignal !== undefined) {
    signalAdjustment = applyExternalSignal(baseYesPrice, externalSignal);
  }
  
  // Calculate final prices with all adjustments
  let finalYesPrice = baseYesPrice + (side === "YES" ? adjustedImpact : -adjustedImpact) + signalAdjustment;
  
  // Clamp prices to valid range (1-99)
  finalYesPrice = Math.max(1, Math.min(99, Math.round(finalYesPrice)));
  const finalNoPrice = 100 - finalYesPrice;
  
  // Calculate new confidence and volatility
  const newParticipants = participantCount || 0;
  const confidence = calculateMarketConfidence(newTotalPool, newParticipants);
  const volatility = calculateVolatility(newTotalPool, newParticipants);
  
  return {
    yesPool: newYesPool,
    noPool: newNoPool,
    totalPool: newTotalPool,
    yesPrice: finalYesPrice,
    noPrice: finalNoPrice,
    liquidity: newTotalPool,
    confidence,
    volatility,
  };
};

/**
 * Simulate gradual price movement over time
 * Used for creating realistic market activity between trades
 */
export const simulateGradualMovement = (
  currentPrice: number,
  targetPrice: number,
  step: number = 0.5 // Maximum movement per tick
): number => {
  const difference = targetPrice - currentPrice;
  
  if (Math.abs(difference) <= step) {
    return targetPrice;
  }
  
  return currentPrice + Math.sign(difference) * step;
};

/**
 * Calculate slippage for a trade
 * Shows users how much price will move with their trade
 */
export const calculateSlippage = (
  tradeSize: number,
  currentPrice: number,
  poolSize: number,
  side: "YES" | "NO"
): { newPrice: number; slippage: number; priceImpact: number } => {
  const impact = calculatePriceImpact(tradeSize, poolSize, side);
  const newPrice = side === "YES" 
    ? Math.min(99, currentPrice + impact)
    : Math.max(1, currentPrice - impact);
  
  const slippage = Math.abs(newPrice - currentPrice);
  
  return {
    newPrice: Math.round(newPrice),
    slippage: Math.round(slippage * 10) / 10,
    priceImpact: Math.round(impact * 10) / 10,
  };
};

/**
 * Get market health indicators
 */
export const getMarketHealth = (state: MarketPricingState): {
  health: "excellent" | "good" | "fair" | "poor";
  liquidityLevel: "high" | "medium" | "low";
  stabilityLevel: "stable" | "moderate" | "volatile";
} => {
  // Determine overall health
  let health: "excellent" | "good" | "fair" | "poor";
  if (state.confidence >= 75) health = "excellent";
  else if (state.confidence >= 50) health = "good";
  else if (state.confidence >= 25) health = "fair";
  else health = "poor";
  
  // Determine liquidity level
  let liquidityLevel: "high" | "medium" | "low";
  if (state.liquidity >= 500000) liquidityLevel = "high";
  else if (state.liquidity >= 100000) liquidityLevel = "medium";
  else liquidityLevel = "low";
  
  // Determine stability
  let stabilityLevel: "stable" | "moderate" | "volatile";
  if (state.volatility <= 30) stabilityLevel = "stable";
  else if (state.volatility <= 60) stabilityLevel = "moderate";
  else stabilityLevel = "volatile";
  
  return { health, liquidityLevel, stabilityLevel };
};

/**
 * Format price for display
 */
export const formatPrice = (price: number): string => {
  return `₦${price}`;
};

/**
 * Format percentage for display
 */
export const formatPercentage = (value: number): string => {
  return `${value}%`;
};
