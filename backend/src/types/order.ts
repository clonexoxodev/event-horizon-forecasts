export type OrderSide = 'YES' | 'NO';
export type OrderType = 'BUY' | 'SELL';
export type OrderStatus = 'pending' | 'waiting' | 'partial' | 'filled' | 'cancelled' | 'expired' | 'refunded';
export type OrderSource = 'user' | 'admin' | 'system' | 'seed';

export type EventType =
  | 'created' | 'locked' | 'entered_book' | 'match_started'
  | 'partial_fill' | 'full_fill' | 'fill_completed'
  | 'trade_created' | 'position_created' | 'position_updated'
  | 'cancelled' | 'unlock' | 'expired' | 'refunded' | 'error';

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['waiting', 'partial', 'filled', 'cancelled'],
  waiting: ['partial', 'filled', 'cancelled', 'expired', 'refunded'],
  partial: ['filled', 'cancelled', 'expired', 'refunded'],
  filled: [],
  cancelled: [],
  expired: ['refunded'],
  refunded: [],
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export interface Order {
  id: string;
  user_id: string;
  market_id: string;
  side: OrderSide;
  order_type: OrderType;
  price: number;
  quantity: number;
  filled_quantity: number;
  status: OrderStatus;
  locked_amount: number;
  filled_amount: number;
  source: OrderSource;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  filled_at: string | null;
  cancelled_at: string | null;
}

export interface OrderFill {
  id: string;
  order_id: string;
  user_id: string;
  market_id: string;
  side: OrderSide;
  order_type: OrderType;
  fill_price: number;
  fill_quantity: number;
  matched_order_id: string;
  matched_user_id: string;
  position_id: string | null;
  created_at: string;
}

export interface Trade {
  id: string;
  market_id: string;
  buy_order_id: string;
  sell_order_id: string;
  buyer_id: string;
  seller_id: string;
  side: OrderSide;
  trade_price: number;
  trade_quantity: number;
  fee_smallest_unit: number;
  created_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  market_id: string;
  user_id: string;
  event_type: EventType;
  quantity_affected: number | null;
  price_affected: number | null;
  balance_before: number | null;
  balance_after: number | null;
  locked_before: number | null;
  locked_after: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateOrderInput {
  user_id: string;
  market_id: string;
  side: OrderSide;
  order_type: OrderType;
  price: number;
  quantity: number;
  currency?: 'NGN' | 'USD';
  source?: OrderSource;
  idempotency_key?: string;
}

export interface MatchResult {
  fills: OrderFill[];
  trades: Trade[];
  newOrder: Order;
  matchedOrders: Array<{ id: string; status: OrderStatus; filled_quantity: number; filled_at: string | null }>;
  events: Array<{ orderId: string; eventType: EventType; quantityAffected?: number; priceAffected?: number; metadata?: Record<string, unknown> }>;
  totalMatched: number;
}

export interface OrderBookEntry {
  price: number;
  total_quantity: number;
  order_count: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  best_bid: number | null;
  best_ask: number | null;
  spread: number | null;
}
