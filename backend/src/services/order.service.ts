import { MatchingEngine } from './matching.engine.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { FillRepository } from '../repositories/fill.repository.js';
import { TradeRepository } from '../repositories/trade.repository.js';
import { EventRepository } from '../repositories/event.repository.js';
import { WalletRepository } from '../repositories/wallet.repository.js';
import { SettlementService } from './settlement.service.js';
import { supabase } from '../db/supabase-client.js';
import {
  Order, CreateOrderInput, OrderType, OrderStatus,
  OrderFill, Trade, EventType, MatchResult, OrderBook,
} from '../types/order.js';

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

export class OrderService {
  private engine: MatchingEngine;
  private orderRepo: OrderRepository;
  private fillRepo: FillRepository;
  private tradeRepo: TradeRepository;
  private eventRepo: EventRepository;
  private walletRepo: WalletRepository;
  private settlementService: SettlementService;

  constructor(deps?: {
    engine?: MatchingEngine;
    orderRepo?: OrderRepository;
    fillRepo?: FillRepository;
    tradeRepo?: TradeRepository;
    eventRepo?: EventRepository;
    walletRepo?: WalletRepository;
    settlementService?: SettlementService;
  }) {
    this.engine = deps?.engine || new MatchingEngine();
    this.orderRepo = deps?.orderRepo || new OrderRepository();
    this.fillRepo = deps?.fillRepo || new FillRepository();
    this.tradeRepo = deps?.tradeRepo || new TradeRepository();
    this.eventRepo = deps?.eventRepo || new EventRepository();
    this.walletRepo = deps?.walletRepo || new WalletRepository();
    this.settlementService = deps?.settlementService || new SettlementService();
  }

  async createOrder(input: CreateOrderInput): Promise<MatchResult> {
    this.validateOrderInput(input);

    if (input.idempotency_key) {
      const existing = await this.orderRepo.findByIdempotencyKey(input.idempotency_key);
      if (existing) {
        throw new OrderValidationError('Duplicate order: idempotency key already used');
      }
    }

    const wallet = await this.walletRepo.findByUserId(input.user_id);
    if (!wallet) throw new OrderValidationError('Wallet not found');

    const available = input.currency === 'USD'
      ? wallet.available_usd_cents
      : wallet.available_ngn_kobo;

    if (available < input.quantity) {
      throw new OrderValidationError('Insufficient available balance');
    }

    const currency = input.currency || 'NGN';
    const locked = await this.walletRepo.lockForOrder(input.user_id, input.quantity, currency);
    if (!locked) throw new OrderValidationError('Failed to lock funds — insufficient balance');

    const order = await this.orderRepo.create(input, 'pending', input.quantity);

    await this.eventRepo.log({
      order_id: order.id,
      market_id: input.market_id,
      user_id: input.user_id,
      event_type: 'locked',
      quantity_affected: input.quantity,
      locked_before: wallet.locked_ngn_kobo,
      locked_after: locked.locked_ngn_kobo,
    });

    const result = await this.matchOrder(order);

    return result;
  }

  async cancelOrder(orderId: string, userId: string): Promise<Order> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new OrderValidationError('Order not found');
    if (order.user_id !== userId) throw new OrderValidationError('Unauthorized');
    if (!['waiting', 'partial'].includes(order.status)) {
      throw new OrderValidationError(`Cannot cancel order in '${order.status}' state`);
    }

    const remaining = this.engine.getRemainingQuantity(order);

    if (remaining > 0) {
      await this.walletRepo.unlockFromOrder(userId, remaining, 'NGN');
    }

    const now = new Date().toISOString();
    const updated = await this.orderRepo.updateStatus(orderId, 'cancelled', {
      cancelled_at: now,
    });

    await this.eventRepo.log({
      order_id: orderId,
      market_id: order.market_id,
      user_id: userId,
      event_type: 'cancelled',
      quantity_affected: remaining,
    });

    if (remaining > 0) {
      await this.eventRepo.log({
        order_id: orderId,
        market_id: order.market_id,
        user_id: userId,
        event_type: 'unlock',
        quantity_affected: remaining,
      });
    }

    return updated;
  }

  async expireOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new OrderValidationError('Order not found');
    if (!['waiting', 'partial'].includes(order.status)) {
      throw new OrderValidationError(`Cannot expire order in '${order.status}' state`);
    }

    const remaining = this.engine.getRemainingQuantity(order);

    if (remaining > 0) {
      await this.walletRepo.unlockFromOrder(order.user_id, remaining, 'NGN');
    }

    const now = new Date().toISOString();
    const updated = await this.orderRepo.updateStatus(orderId, 'expired', {
      cancelled_at: now,
    });

    await this.eventRepo.log({
      order_id: orderId,
      market_id: order.market_id,
      user_id: order.user_id,
      event_type: 'expired',
      quantity_affected: remaining,
    });

    if (remaining > 0) {
      await this.eventRepo.log({
        order_id: orderId,
        market_id: order.market_id,
        user_id: order.user_id,
        event_type: 'unlock',
        quantity_affected: remaining,
      });
    }

    return updated;
  }

  async expireOrdersByMarket(marketId: string): Promise<number> {
    const activeOrders = await this.orderRepo.findActiveByMarket(marketId);
    let expired = 0;

    for (const order of activeOrders) {
      try {
        await this.expireOrder(order.id);
        expired++;
      } catch {
        console.error(`Failed to expire order ${order.id}: continuing`);
      }
    }

    return expired;
  }

  async getOrderBook(marketId: string): Promise<OrderBook> {
    const book = await this.orderRepo.getOrderBook(marketId);
    const best_bid = book.bids.length > 0 ? book.bids[0]?.price ?? null : null;
    const best_ask = book.asks.length > 0 ? book.asks[0]?.price ?? null : null;
    const spread = best_bid !== null && best_ask !== null ? best_ask - best_bid : null;
    return { ...book, best_bid, best_ask, spread };
  }

  async getUserOrders(userId: string, marketId?: string): Promise<Order[]> {
    return this.orderRepo.findByUser(userId, marketId);
  }

  async getMarketOrders(marketId: string, status?: OrderStatus[]): Promise<Order[]> {
    return this.orderRepo.findByMarket(marketId, status);
  }

  private validateOrderInput(input: CreateOrderInput): void {
    if (!input.user_id) throw new OrderValidationError('user_id is required');
    if (!input.market_id) throw new OrderValidationError('market_id is required');
    if (!['YES', 'NO'].includes(input.side)) throw new OrderValidationError('side must be YES or NO');
    if (!['BUY', 'SELL'].includes(input.order_type)) throw new OrderValidationError('order_type must be BUY or SELL');
    if (!Number.isFinite(input.price) || input.price <= 0 || input.price >= 100) {
      throw new OrderValidationError('price must be between 1 and 99');
    }
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      throw new OrderValidationError('quantity must be greater than 0');
    }
  }

  private async matchOrder(order: Order): Promise<MatchResult> {
    const opposingType: OrderType = order.order_type === 'BUY' ? 'SELL' : 'BUY';
    const opposingOrders = await this.orderRepo.findActiveOpposing(
      order.market_id,
      order.side,
      opposingType
    );

    const matchOutput = this.engine.matchOrder(order, opposingOrders);
    const fills: OrderFill[] = [];
    const trades: Trade[] = [];
    const matchedOrders: MatchResult['matchedOrders'] = [];
    const events: MatchResult['events'] = [];

    events.push({
      orderId: order.id,
      eventType: 'match_started',
      quantityAffected: matchOutput.totalFilled,
    });

    const fillPairs = this.engine.generateFillResults(order, opposingOrders, matchOutput);

    for (const pair of fillPairs) {
      const buyFill = await this.fillRepo.create({
        order_id: pair.buyOrder.id,
        user_id: pair.buyOrder.user_id,
        market_id: pair.buyOrder.market_id,
        side: pair.buyOrder.side,
        order_type: 'BUY',
        fill_price: pair.matchPrice,
        fill_quantity: pair.matchQuantity,
        matched_order_id: pair.sellOrder.id,
        matched_user_id: pair.sellOrder.user_id,
      });

      const sellFill = await this.fillRepo.create({
        order_id: pair.sellOrder.id,
        user_id: pair.sellOrder.user_id,
        market_id: pair.sellOrder.market_id,
        side: pair.sellOrder.side,
        order_type: 'SELL',
        fill_price: pair.matchPrice,
        fill_quantity: pair.matchQuantity,
        matched_order_id: pair.buyOrder.id,
        matched_user_id: pair.buyOrder.user_id,
      });

      const trade = await this.tradeRepo.create({
        market_id: order.market_id,
        buy_order_id: pair.buyOrder.id,
        sell_order_id: pair.sellOrder.id,
        buyer_id: pair.buyOrder.user_id,
        seller_id: pair.sellOrder.user_id,
        side: pair.buyOrder.side,
        trade_price: pair.matchPrice,
        trade_quantity: pair.matchQuantity,
      });

      fills.push(buyFill, sellFill);
      trades.push(trade);

      if (pair.buyOrder.order_type === 'BUY') {
        const positionId = await this.settlementService.createPositionFromBuyFill(
          {
            id: buyFill.id,
            user_id: pair.buyOrder.user_id,
            market_id: pair.buyOrder.market_id,
            side: pair.buyOrder.side,
            fill_price: pair.matchPrice,
            fill_quantity: pair.matchQuantity,
          },
          {
            id: pair.buyOrder.id,
            currency: 'NGN',
          }
        );

        if (positionId) {
          await this.fillRepo.updatePositionId(buyFill.id, positionId);
        }
      }

      if (pair.sellOrder.order_type === 'SELL') {
        const { data: sellPositions } = await supabase
          .from('positions')
          .select('id')
          .eq('user_id', pair.sellOrder.user_id)
          .eq('market_id', pair.sellOrder.market_id)
          .eq('side', pair.sellOrder.side)
          .limit(1);

        const sellPositionId = sellPositions?.[0]?.id || null;
        if (sellPositionId) {
          await this.fillRepo.updatePositionId(sellFill.id, sellPositionId);
        }
      }

      const buyFilledQty = (pair.buyOrder.filled_quantity || 0) + pair.matchQuantity;
      const sellFilledQty = (pair.sellOrder.filled_quantity || 0) + pair.matchQuantity;
      const buyFilledAmt = (pair.buyOrder.filled_amount || 0) + (pair.matchQuantity * pair.matchPrice);
      const sellFilledAmt = (pair.sellOrder.filled_amount || 0) + (pair.matchQuantity * pair.matchPrice);
      const buyStatus = this.engine.calculateNewStatus(buyFilledQty, pair.buyOrder.quantity);
      const sellStatus = this.engine.calculateNewStatus(sellFilledQty, pair.sellOrder.quantity);

      const updatedBuy = await this.orderRepo.updatePartialMatch(
        pair.buyOrder.id, buyFilledQty, buyFilledAmt, buyStatus
      );
      const updatedSell = await this.orderRepo.updatePartialMatch(
        pair.sellOrder.id, sellFilledQty, sellFilledAmt, sellStatus
      );

      matchedOrders.push({
        id: pair.buyOrder.id,
        status: updatedBuy.status,
        filled_quantity: updatedBuy.filled_quantity,
        filled_at: updatedBuy.filled_at,
      });
      matchedOrders.push({
        id: pair.sellOrder.id,
        status: updatedSell.status,
        filled_quantity: updatedSell.filled_quantity,
        filled_at: updatedSell.filled_at,
      });

      const buyEventType: EventType = buyStatus === 'filled' ? 'full_fill' : 'partial_fill';
      const sellEventType: EventType = sellStatus === 'filled' ? 'full_fill' : 'partial_fill';

      events.push(
        { orderId: pair.buyOrder.id, eventType: buyEventType, quantityAffected: pair.matchQuantity, priceAffected: pair.matchPrice },
        { orderId: pair.sellOrder.id, eventType: sellEventType, quantityAffected: pair.matchQuantity, priceAffected: pair.matchPrice },
        { orderId: pair.buyOrder.id, eventType: 'fill_completed', metadata: { fillId: buyFill.id } },
        { orderId: pair.sellOrder.id, eventType: 'fill_completed', metadata: { fillId: sellFill.id } },
        { orderId: pair.buyOrder.id, eventType: 'trade_created', metadata: { tradeId: trade.id } },
        { orderId: pair.sellOrder.id, eventType: 'trade_created', metadata: { tradeId: trade.id } },
      );
    }

    const newFilledQty = (order.filled_quantity || 0) + matchOutput.totalFilled;
    const newFilledAmt = (order.filled_amount || 0) + matchOutput.totalFilled * (matchOutput.fillPrice || order.price);
    const newStatus = this.engine.calculateNewStatus(newFilledQty, order.quantity);

    const updatedOrder = await this.orderRepo.updatePartialMatch(
      order.id, newFilledQty, newFilledAmt, newStatus
    );

    if (newStatus === 'waiting' || newStatus === 'partial') {
      events.push({ orderId: order.id, eventType: 'entered_book' });
    }

    const finalEventType: EventType = newStatus === 'filled' ? 'full_fill' : (matchOutput.totalFilled > 0 ? 'partial_fill' : 'entered_book');
    if (matchOutput.totalFilled > 0) {
      events.push({
        orderId: order.id,
        eventType: finalEventType,
        quantityAffected: matchOutput.totalFilled,
        priceAffected: matchOutput.fillPrice ?? undefined,
      });
    }

    await this.flushEvents(order, events);

    return {
      fills,
      trades,
      newOrder: updatedOrder,
      matchedOrders,
      events: events.map(e => ({
        orderId: e.orderId,
        eventType: e.eventType,
        quantityAffected: e.quantityAffected,
        priceAffected: e.priceAffected,
        metadata: e.metadata,
      })),
      totalMatched: matchOutput.totalFilled,
    };
  }

  private async flushEvents(
    order: Order,
    events: Array<{
      orderId: string;
      eventType: EventType;
      quantityAffected?: number;
      priceAffected?: number;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<void> {
    for (const event of events) {
      await this.eventRepo.log({
        order_id: event.orderId,
        market_id: order.market_id,
        user_id: order.user_id,
        event_type: event.eventType,
        quantity_affected: event.quantityAffected,
        price_affected: event.priceAffected,
        metadata: event.metadata,
      });
    }
  }
}
