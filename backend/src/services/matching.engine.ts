import { Order, OrderSide, OrderType, CreateOrderInput } from '../types/order.js';

export interface PendingFill {
  orderId: string;
  orderUserId: string;
  orderSide: OrderSide;
  orderType: OrderType;
  fillPrice: number;
  fillQuantity: number;
  matchedOrderId: string;
  matchedUserId: string;
}

export interface MatchOutput {
  matchedOrderIds: string[];
  matchedQuantities: Map<string, number>;
  totalFilled: number;
  fillPrice: number | null;
}

export interface CancelOutput {
  remainingQuantity: number;
}

export interface ExpireOutput {
  remainingQuantity: number;
}

/**
 * Pure matching engine — no database access, no side effects.
 *
 * Given a set of orders in memory and a new order, produces deterministic
 * match results. All database mutations happen in the OrderService layer.
 *
 * Matching rules:
 *   - BUY orders match against SELL orders at the same price or lower
 *   - SELL orders match against BUY orders at the same price or higher
 *   - Price priority: maker's price (the resting order) is the match price
 *   - Time priority: FIFO — earliest order at same price matches first
 *   - Partial fills allowed — remaining quantity enters the book
 *   - Never overfill — match quantity is min(incoming_remaining, resting_remaining)
 */
export class MatchingEngine {
  /**
   * Attempt to match a new order against the opposing order book.
   *
   * @param newOrder - The incoming order (must be in 'pending' state)
   * @param opposingOrders - Resting orders from the opposite direction, sorted by:
   *   - For BUY incoming: SELL orders sorted by price ASC (cheapest first), then created_at ASC (FIFO)
   *   - For SELL incoming: BUY orders sorted by price DESC (highest first), then created_at ASC (FIFO)
   * @returns MatchOutput with all matched orders, quantities, and final fill price
   */
  matchOrder(newOrder: Order, opposingOrders: Order[]): MatchOutput {
    const matchedOrderIds: string[] = [];
    const matchedQuantities = new Map<string, number>();
    let remaining = newOrder.quantity - newOrder.filled_quantity;
    let lastFillPrice: number | null = null;

    for (const opposing of opposingOrders) {
      if (remaining <= 0) break;

      const opposingRemaining = opposing.quantity - opposing.filled_quantity;
      if (opposingRemaining <= 0) continue;

      if (!this.isPriceCompatible(newOrder, opposing)) break;

      const matchQuantity = Math.min(remaining, opposingRemaining);

      matchedOrderIds.push(opposing.id);
      matchedQuantities.set(opposing.id, (matchedQuantities.get(opposing.id) || 0) + matchQuantity);
      lastFillPrice = opposing.price;
      remaining -= matchQuantity;
    }

    return {
      matchedOrderIds,
      matchedQuantities,
      totalFilled: newOrder.quantity - newOrder.filled_quantity - remaining,
      fillPrice: lastFillPrice,
    };
  }

  /**
   * Check if two orders can match at their respective prices.
   *
   * BUY order matches if: buyPrice >= sellPrice
   * SELL order matches if: sellPrice <= buyPrice
   */
  isPriceCompatible(newOrder: Order, opposing: Order): boolean {
    if (newOrder.order_type === 'BUY') {
      return newOrder.price >= opposing.price;
    } else {
      return newOrder.price <= opposing.price;
    }
  }

  /**
   * Calculate remaining quantity for an order.
   */
  getRemainingQuantity(order: Order): number {
    return order.quantity - order.filled_quantity;
  }

  /**
   * Determine new status after a partial match.
   */
  calculateNewStatus(filledQuantity: number, totalQuantity: number): 'waiting' | 'partial' | 'filled' {
    if (filledQuantity >= totalQuantity) return 'filled';
    if (filledQuantity > 0) return 'partial';
    return 'waiting';
  }

  /**
   * Process a cancellation — returns remaining quantity to refund.
   */
  cancelOrder(order: Order): CancelOutput {
    return {
      remainingQuantity: this.getRemainingQuantity(order),
    };
  }

  /**
   * Process an expiration — returns remaining quantity to refund.
   */
  expireOrder(order: Order): ExpireOutput {
    return {
      remainingQuantity: this.getRemainingQuantity(order),
    };
  }

  /**
   * Generate match results in the format expected by OrderService.
   */
  generateFillResults(
    newOrder: Order,
    opposingOrders: Order[],
    matchOutput: MatchOutput
  ): Array<{
    buyOrder: Order;
    sellOrder: Order;
    matchPrice: number;
    matchQuantity: number;
  }> {
    const results: Array<{
      buyOrder: Order;
      sellOrder: Order;
      matchPrice: number;
      matchQuantity: number;
    }> = [];

    for (const opposing of opposingOrders) {
      const qty = matchOutput.matchedQuantities.get(opposing.id);
      if (!qty || qty <= 0) continue;

      const buyOrder = newOrder.order_type === 'BUY' ? newOrder : opposing;
      const sellOrder = newOrder.order_type === 'SELL' ? newOrder : opposing;

      results.push({
        buyOrder,
        sellOrder,
        matchPrice: opposing.price,
        matchQuantity: qty,
      });
    }

    return results;
  }

  /**
   * Build order book depth from a list of active orders.
   */
  buildOrderBook(orders: Order[]): {
    bids: Array<{ price: number; total_quantity: number; order_count: number }>;
    asks: Array<{ price: number; total_quantity: number; order_count: number }>;
  } {
    const bidMap = new Map<number, { total_quantity: number; order_count: number }>();
    const askMap = new Map<number, { total_quantity: number; order_count: number }>();

    for (const order of orders) {
      const remaining = this.getRemainingQuantity(order);
      if (remaining <= 0) continue;

      const map = order.order_type === 'BUY' ? bidMap : askMap;
      const existing = map.get(order.price) || { total_quantity: 0, order_count: 0 };
      existing.total_quantity += remaining;
      existing.order_count += 1;
      map.set(order.price, existing);
    }

    const sortBids = Array.from(bidMap.entries())
      .map(([price, data]) => ({ price, ...data }))
      .sort((a, b) => b.price - a.price);

    const sortAsks = Array.from(askMap.entries())
      .map(([price, data]) => ({ price, ...data }))
      .sort((a, b) => a.price - b.price);

    return { bids: sortBids, asks: sortAsks };
  }
}
