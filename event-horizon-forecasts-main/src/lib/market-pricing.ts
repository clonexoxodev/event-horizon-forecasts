/**
 * Order Book Price Derivation
 *
 * Pure utility functions for reading order book state.
 * No AMM, no pool math, no simulated price movements.
 */

export interface OrderBookLevel {
  price: number;
  total_quantity: number;
  order_count: number;
}

export interface OrderBookState {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  best_bid: number | null;
  best_ask: number | null;
  spread: number | null;
}

/** Best bid price from the order book. */
export const getBestBid = (bids: OrderBookLevel[]): number | null => {
  if (bids.length === 0) return null;
  return Math.max(...bids.map((b) => b.price));
};

/** Best ask price from the order book. */
export const getBestAsk = (asks: OrderBookLevel[]): number | null => {
  if (asks.length === 0) return null;
  return Math.min(...asks.map((a) => a.price));
};

/** Mid-market price between best bid and best ask. */
export const getMidPrice = (bestBid: number | null, bestAsk: number | null): number | null => {
  if (bestBid == null || bestAsk == null) return bestBid ?? bestAsk ?? null;
  return (bestBid + bestAsk) / 2;
};

/** Spread between best ask and best bid. */
export const getSpread = (bestBid: number | null, bestAsk: number | null): number | null => {
  if (bestBid == null || bestAsk == null) return null;
  return bestAsk - bestBid;
};

/** Volume-weighted average price across order book levels. */
export const getWeightedAveragePrice = (levels: OrderBookLevel[]): number | null => {
  let totalValue = 0;
  let totalQty = 0;
  for (const level of levels) {
    totalValue += level.price * level.total_quantity;
    totalQty += level.total_quantity;
  }
  return totalQty > 0 ? totalValue / totalQty : null;
};

/** Total liquidity (sum of all quantities) on one side. */
export const getMarketLiquidity = (levels: OrderBookLevel[]): number =>
  levels.reduce((sum, l) => sum + l.total_quantity, 0);

/** Total quantity available at or better than a given price. */
export const getDepthAtPrice = (levels: OrderBookLevel[], price: number, side: "bid" | "ask"): number =>
  levels
    .filter((l) => (side === "bid" ? l.price >= price : l.price <= price))
    .reduce((sum, l) => sum + l.total_quantity, 0);

/** Simple volatility estimate from price history points. */
export const getMarketVolatility = (priceHistory: Array<{ yesPrice?: number }>): number => {
  if (priceHistory.length < 2) return 0;
  const prices = priceHistory.map((p) => Number(p.yesPrice || 50));
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(Math.abs(prices[i] - prices[i - 1]));
  }
  const avg = changes.reduce((s, c) => s + c, 0) / changes.length;
  return Math.min(100, Math.round(avg * 10));
};

export const applyTimeDecay = (priceMovement: number, hoursToClose: number): number => {
  if (hoursToClose <= 0) return 0;
  if (hoursToClose < 24) {
    const decayFactor = hoursToClose / 24;
    return priceMovement * (0.5 + decayFactor * 0.5);
  }
  return priceMovement;
};

export const formatPercentage = (value: number): string => `${value}%`;
