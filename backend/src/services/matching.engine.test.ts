import { describe, it, expect, beforeEach } from 'vitest';
import { MatchingEngine } from './matching.engine.js';
import { Order } from '../types/order.js';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: overrides.id || 'order-1',
    user_id: overrides.user_id || 'user-1',
    market_id: overrides.market_id || 'market-1',
    side: overrides.side || 'YES',
    order_type: overrides.order_type || 'BUY',
    price: overrides.price ?? 50,
    quantity: overrides.quantity ?? 1000,
    filled_quantity: overrides.filled_quantity ?? 0,
    status: overrides.status || 'pending',
    locked_amount: overrides.locked_amount ?? 0,
    filled_amount: overrides.filled_amount ?? 0,
    source: overrides.source || 'user',
    idempotency_key: overrides.idempotency_key ?? null,
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
    filled_at: overrides.filled_at ?? null,
    cancelled_at: overrides.cancelled_at ?? null,
  };
}

describe('MatchingEngine', () => {
  let engine: MatchingEngine;

  beforeEach(() => {
    engine = new MatchingEngine();
  });

  describe('matchOrder', () => {
    it('should match a BUY order against a resting SELL order at the same price', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 1000 });
      const opposingOrders = [
        makeOrder({ id: 'sell-1', order_type: 'SELL', price: 50, quantity: 1000, status: 'waiting', user_id: 'user-2' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(1000);
      expect(result.fillPrice).toBe(50);
      expect(result.matchedOrderIds).toContain('sell-1');
      expect(result.matchedQuantities.get('sell-1')).toBe(1000);
    });

    it('should not match when BUY price < SELL price', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 40, quantity: 1000 });
      const opposingOrders = [
        makeOrder({ id: 'sell-1', order_type: 'SELL', price: 50, quantity: 1000, status: 'waiting' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(0);
      expect(result.fillPrice).toBeNull();
      expect(result.matchedOrderIds).toHaveLength(0);
    });

    it('should match a SELL order against a resting BUY order at the same price', () => {
      const newOrder = makeOrder({ id: 'sell-1', order_type: 'SELL', price: 50, quantity: 1000 });
      const opposingOrders = [
        makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 1000, status: 'waiting', user_id: 'user-2' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(1000);
      expect(result.fillPrice).toBe(50);
    });

    it('should not match when SELL price > BUY price', () => {
      const newOrder = makeOrder({ id: 'sell-1', order_type: 'SELL', price: 60, quantity: 1000 });
      const opposingOrders = [
        makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 1000, status: 'waiting' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(0);
      expect(result.fillPrice).toBeNull();
    });
  });

  describe('FIFO — price priority and time priority', () => {
    it('should match against the cheapest SELL first (price priority)', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 60, quantity: 500 });
      const opposingOrders = [
        makeOrder({ id: 'sell-cheap', order_type: 'SELL', price: 45, quantity: 500, status: 'waiting', created_at: '2026-01-01T00:00:01Z' }),
        makeOrder({ id: 'sell-expensive', order_type: 'SELL', price: 55, quantity: 500, status: 'waiting', created_at: '2026-01-01T00:00:00Z' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(500);
      expect(result.matchedOrderIds).toContain('sell-cheap');
      expect(result.matchedQuantities.get('sell-cheap')).toBe(500);
    });

    it('should match against the earliest order at the same price (FIFO)', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 500 });
      const opposingOrders = [
        makeOrder({ id: 'sell-first', order_type: 'SELL', price: 50, quantity: 500, status: 'waiting', created_at: '2026-01-01T00:00:00Z' }),
        makeOrder({ id: 'sell-second', order_type: 'SELL', price: 50, quantity: 500, status: 'waiting', created_at: '2026-01-01T00:00:01Z' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(500);
      expect(result.matchedOrderIds[0]).toBe('sell-first');
    });

    it('should match against highest BUY first when selling (price priority)', () => {
      const newOrder = makeOrder({ id: 'sell-1', order_type: 'SELL', price: 40, quantity: 500 });
      const opposingOrders = [
        makeOrder({ id: 'buy-high', order_type: 'BUY', price: 55, quantity: 500, status: 'waiting', created_at: '2026-01-01T00:00:01Z' }),
        makeOrder({ id: 'buy-low', order_type: 'BUY', price: 45, quantity: 500, status: 'waiting', created_at: '2026-01-01T00:00:00Z' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(500);
      expect(result.matchedOrderIds).toContain('buy-high');
      expect(result.matchedQuantities.get('buy-high')).toBe(500);
    });
  });

  describe('Partial fills', () => {
    it('should partially fill when opposing order has less quantity', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 2000 });
      const opposingOrders = [
        makeOrder({ id: 'sell-1', order_type: 'SELL', price: 50, quantity: 800, status: 'waiting' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(800);
      expect(result.matchedQuantities.get('sell-1')).toBe(800);
    });

    it('should partially fill when incoming order has less quantity', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 300 });
      const opposingOrders = [
        makeOrder({ id: 'sell-1', order_type: 'SELL', price: 50, quantity: 1000, status: 'waiting' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(300);
      expect(result.matchedQuantities.get('sell-1')).toBe(300);
    });

    it('should partially fill against multiple opposing orders', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 1500 });
      const opposingOrders = [
        makeOrder({ id: 'sell-1', order_type: 'SELL', price: 50, quantity: 1000, status: 'waiting' }),
        makeOrder({ id: 'sell-2', order_type: 'SELL', price: 50, quantity: 500, status: 'waiting' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(1500);
      expect(result.matchedQuantities.get('sell-1')).toBe(1000);
      expect(result.matchedQuantities.get('sell-2')).toBe(500);
    });
  });

  describe('Multiple partial fills', () => {
    it('should match across multiple price levels', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 60, quantity: 2000 });
      const opposingOrders = [
        makeOrder({ id: 'sell-1', order_type: 'SELL', price: 45, quantity: 1000, status: 'waiting' }),
        makeOrder({ id: 'sell-2', order_type: 'SELL', price: 55, quantity: 500, status: 'waiting' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(1500);
      expect(result.matchedQuantities.get('sell-1')).toBe(1000);
      expect(result.matchedQuantities.get('sell-2')).toBe(500);
      expect(result.fillPrice).toBe(55);
    });

    it('should stop matching when price is no longer compatible', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 2000 });
      const opposingOrders = [
        makeOrder({ id: 'sell-1', order_type: 'SELL', price: 45, quantity: 500, status: 'waiting' }),
        makeOrder({ id: 'sell-2', order_type: 'SELL', price: 55, quantity: 500, status: 'waiting' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(500);
      expect(result.matchedOrderIds).toContain('sell-1');
      expect(result.matchedOrderIds).not.toContain('sell-2');
    });
  });

  describe('Waiting orders', () => {
    it('should return empty when no opposing orders exist', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 1000 });

      const result = engine.matchOrder(newOrder, []);

      expect(result.totalFilled).toBe(0);
      expect(result.fillPrice).toBeNull();
      expect(result.matchedOrderIds).toHaveLength(0);
    });
  });

  describe('Order expiration', () => {
    it('should return remaining quantity for cancellation', () => {
      const order = makeOrder({ id: 'order-1', quantity: 1000, filled_quantity: 300 });
      const result = engine.cancelOrder(order);
      expect(result.remainingQuantity).toBe(700);
    });

    it('should return remaining quantity for expiration', () => {
      const order = makeOrder({ id: 'order-1', quantity: 1000, filled_quantity: 0 });
      const result = engine.expireOrder(order);
      expect(result.remainingQuantity).toBe(1000);
    });

    it('should return 0 remaining when fully filled', () => {
      const order = makeOrder({ id: 'order-1', quantity: 1000, filled_quantity: 1000 });
      const result = engine.cancelOrder(order);
      expect(result.remainingQuantity).toBe(0);
    });
  });

  describe('Trade creation', () => {
    it('should generate fill results with correct buy/sell assignment', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 1000 });
      const opposingOrders = [
        makeOrder({ id: 'sell-1', order_type: 'SELL', price: 50, quantity: 1000, status: 'waiting', user_id: 'user-2' }),
      ];

      const matchOutput = engine.matchOrder(newOrder, opposingOrders);
      const fillResults = engine.generateFillResults(newOrder, opposingOrders, matchOutput);

      expect(fillResults).toHaveLength(1);
      expect(fillResults[0].buyOrder.id).toBe('buy-1');
      expect(fillResults[0].sellOrder.id).toBe('sell-1');
      expect(fillResults[0].matchPrice).toBe(50);
      expect(fillResults[0].matchQuantity).toBe(1000);
    });

    it('should generate multiple fill results for multiple opposing orders', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 1500 });
      const opposingOrders = [
        makeOrder({ id: 'sell-1', order_type: 'SELL', price: 50, quantity: 1000, status: 'waiting', user_id: 'user-2' }),
        makeOrder({ id: 'sell-2', order_type: 'SELL', price: 50, quantity: 500, status: 'waiting', user_id: 'user-3' }),
      ];

      const matchOutput = engine.matchOrder(newOrder, opposingOrders);
      const fillResults = engine.generateFillResults(newOrder, opposingOrders, matchOutput);

      expect(fillResults).toHaveLength(2);
      expect(fillResults[0].matchQuantity).toBe(1000);
      expect(fillResults[1].matchQuantity).toBe(500);
    });
  });

  describe('Events', () => {
    it('should have correct remaining quantity for partially matched order', () => {
      const order = makeOrder({ id: 'order-1', quantity: 1000, filled_quantity: 400 });
      const result = engine.cancelOrder(order);
      expect(result.remainingQuantity).toBe(600);
    });
  });

  describe('Order book building', () => {
    it('should build correct bid/ask aggregation', () => {
      const orders = [
        makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 1000, filled_quantity: 0, status: 'waiting' }),
        makeOrder({ id: 'buy-2', order_type: 'BUY', price: 50, quantity: 500, filled_quantity: 0, status: 'waiting' }),
        makeOrder({ id: 'buy-3', order_type: 'BUY', price: 45, quantity: 800, filled_quantity: 0, status: 'waiting' }),
        makeOrder({ id: 'sell-1', order_type: 'SELL', price: 55, quantity: 1200, filled_quantity: 0, status: 'waiting' }),
        makeOrder({ id: 'sell-2', order_type: 'SELL', price: 60, quantity: 600, filled_quantity: 0, status: 'waiting' }),
      ];

      const book = engine.buildOrderBook(orders);

      expect(book.bids).toHaveLength(2);
      expect(book.bids[0].price).toBe(50);
      expect(book.bids[0].total_quantity).toBe(1500);
      expect(book.bids[0].order_count).toBe(2);
      expect(book.bids[1].price).toBe(45);
      expect(book.bids[1].total_quantity).toBe(800);

      expect(book.asks).toHaveLength(2);
      expect(book.asks[0].price).toBe(55);
      expect(book.asks[0].total_quantity).toBe(1200);
      expect(book.asks[1].price).toBe(60);
      expect(book.asks[1].total_quantity).toBe(600);
    });

    it('should exclude filled orders from book', () => {
      const orders = [
        makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 1000, filled_quantity: 1000, status: 'filled' }),
        makeOrder({ id: 'buy-2', order_type: 'BUY', price: 45, quantity: 500, filled_quantity: 0, status: 'waiting' }),
      ];

      const book = engine.buildOrderBook(orders);

      expect(book.bids).toHaveLength(1);
      expect(book.bids[0].price).toBe(45);
    });
  });

  describe('Edge cases', () => {
    it('should not overfill — match quantity never exceeds remaining', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 500 });
      const opposingOrders = [
        makeOrder({ id: 'sell-1', order_type: 'SELL', price: 50, quantity: 1000, filled_quantity: 800, status: 'partial' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(200);
      expect(result.matchedQuantities.get('sell-1')).toBe(200);
    });

    it('should handle opposing order with filled_quantity > 0', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 300 });
      const opposingOrders = [
        makeOrder({ id: 'sell-1', order_type: 'SELL', price: 50, quantity: 1000, filled_quantity: 700, status: 'partial' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(300);
      expect(result.matchedQuantities.get('sell-1')).toBe(300);
    });

    it('should preserve FIFO when multiple orders at same price', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 600 });
      const opposingOrders = [
        makeOrder({ id: 'sell-1', order_type: 'SELL', price: 50, quantity: 400, status: 'waiting', created_at: '2026-01-01T00:00:00Z' }),
        makeOrder({ id: 'sell-2', order_type: 'SELL', price: 50, quantity: 400, status: 'waiting', created_at: '2026-01-01T00:00:01Z' }),
      ];

      const result = engine.matchOrder(newOrder, opposingOrders);

      expect(result.totalFilled).toBe(600);
      expect(result.matchedQuantities.get('sell-1')).toBe(400);
      expect(result.matchedQuantities.get('sell-2')).toBe(200);
    });

    it('should handle no opposing orders (empty book)', () => {
      const newOrder = makeOrder({ id: 'buy-1', order_type: 'BUY', price: 50, quantity: 1000 });

      const result = engine.matchOrder(newOrder, []);

      expect(result.totalFilled).toBe(0);
      expect(result.matchedOrderIds).toHaveLength(0);
    });
  });
});
