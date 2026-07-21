import { supabase } from '../db/supabase-client.js';
import { Order, CreateOrderInput, OrderStatus } from '../types/order.js';

export class OrderRepository {
  async create(input: CreateOrderInput, status: OrderStatus = 'pending', lockedAmount: number = 0): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: input.user_id,
        market_id: input.market_id,
        side: input.side,
        order_type: input.order_type,
        price: input.price,
        quantity: input.quantity,
        filled_quantity: 0,
        status,
        locked_amount: lockedAmount,
        filled_amount: 0,
        source: input.source || 'user',
        idempotency_key: input.idempotency_key || null,
      })
      .select()
      .single();

    if (error) throw new Error('Failed to create order: ' + error.message);
    return data;
  }

  async findById(id: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error('Failed to find order: ' + error.message);
    return data;
  }

  async updateStatus(id: string, status: OrderStatus, extra?: {
    filled_quantity?: number;
    filled_amount?: number;
    filled_at?: string;
    cancelled_at?: string;
  }): Promise<Order> {
    const update: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (extra?.filled_quantity !== undefined) update.filled_quantity = extra.filled_quantity;
    if (extra?.filled_amount !== undefined) update.filled_amount = extra.filled_amount;
    if (extra?.filled_at !== undefined) update.filled_at = extra.filled_at;
    if (extra?.cancelled_at !== undefined) update.cancelled_at = extra.cancelled_at;

    const { data, error } = await supabase
      .from('orders')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('Failed to update order status: ' + error.message);
    return data;
  }

  async updatePartialMatch(id: string, filledQuantity: number, filledAmount: number, status: OrderStatus): Promise<Order> {
    const update: Record<string, unknown> = {
      filled_quantity: filledQuantity,
      filled_amount: filledAmount,
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'filled') {
      update.filled_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('Failed to update partial match: ' + error.message);
    return data;
  }

  async findActiveOpposing(
    marketId: string,
    side: string,
    orderType: string,
    limit: number = 50
  ): Promise<Order[]> {
    const sortDirection = orderType === 'BUY' ? 'price:asc' : 'price:desc';

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('market_id', marketId)
      .eq('side', side)
      .eq('order_type', orderType)
      .in('status', ['waiting', 'partial'])
      .order('price', { ascending: orderType === 'BUY' })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error('Failed to find opposing orders: ' + error.message);
    return data || [];
  }

  async findByMarket(marketId: string, status?: OrderStatus[]): Promise<Order[]> {
    let query = supabase
      .from('orders')
      .select('*')
      .eq('market_id', marketId)
      .order('created_at', { ascending: false });

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error('Failed to find orders by market: ' + error.message);
    return data || [];
  }

  async findActiveByMarket(marketId: string): Promise<Order[]> {
    return this.findByMarket(marketId, ['waiting', 'partial']);
  }

  async findByUser(userId: string, marketId?: string): Promise<Order[]> {
    let query = supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (marketId) {
      query = query.eq('market_id', marketId);
    }

    const { data, error } = await query;
    if (error) throw new Error('Failed to find user orders: ' + error.message);
    return data || [];
  }

  async findByIdempotencyKey(key: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('idempotency_key', key)
      .maybeSingle();

    if (error) throw new Error('Failed to find order by idempotency key: ' + error.message);
    return data;
  }

  async getOrderBook(marketId: string): Promise<{ bids: Array<{ price: number; total_quantity: number; order_count: number }>; asks: Array<{ price: number; total_quantity: number; order_count: number }> }> {
    const { data: bids, error: bidError } = await supabase
      .from('orders')
      .select('price, filled_quantity, quantity')
      .eq('market_id', marketId)
      .eq('order_type', 'BUY')
      .in('status', ['waiting', 'partial']);

    if (bidError) throw new Error('Failed to get bid book: ' + bidError.message);

    const { data: asks, error: askError } = await supabase
      .from('orders')
      .select('price, filled_quantity, quantity')
      .eq('market_id', marketId)
      .eq('order_type', 'SELL')
      .in('status', ['waiting', 'partial']);

    if (askError) throw new Error('Failed to get ask book: ' + askError.message);

    const aggregateBook = (orders: Array<{ price: number; filled_quantity: number; quantity: number }>) => {
      const map = new Map<number, { total_quantity: number; order_count: number }>();
      for (const o of orders) {
        const remaining = o.quantity - o.filled_quantity;
        if (remaining <= 0) continue;
        const existing = map.get(o.price) || { total_quantity: 0, order_count: 0 };
        existing.total_quantity += remaining;
        existing.order_count += 1;
        map.set(o.price, existing);
      }
      return Array.from(map.entries())
        .map(([price, data]) => ({ price, ...data }))
        .sort((a, b) => b.price - a.price);
    };

    return {
      bids: aggregateBook(bids || []),
      asks: aggregateBook(asks || []),
    };
  }
}
