import { supabase } from '../db/supabase-client.js';
import { EventType, OrderEvent } from '../types/order.js';

export class EventRepository {
  async log(event: {
    order_id: string;
    market_id: string;
    user_id: string;
    event_type: EventType;
    quantity_affected?: number;
    price_affected?: number;
    balance_before?: number;
    balance_after?: number;
    locked_before?: number;
    locked_after?: number;
    metadata?: Record<string, unknown>;
  }): Promise<OrderEvent> {
    const { data, error } = await supabase
      .from('order_events')
      .insert({
        order_id: event.order_id,
        market_id: event.market_id,
        user_id: event.user_id,
        event_type: event.event_type,
        quantity_affected: event.quantity_affected ?? null,
        price_affected: event.price_affected ?? null,
        balance_before: event.balance_before ?? null,
        balance_after: event.balance_after ?? null,
        locked_before: event.locked_before ?? null,
        locked_after: event.locked_after ?? null,
        metadata: event.metadata ?? null,
      })
      .select()
      .single();

    if (error) throw new Error('Failed to log order event: ' + error.message);
    return data;
  }

  async findByOrder(orderId: string): Promise<OrderEvent[]> {
    const { data, error } = await supabase
      .from('order_events')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw new Error('Failed to find events by order: ' + error.message);
    return data || [];
  }

  async findByMarket(marketId: string): Promise<OrderEvent[]> {
    const { data, error } = await supabase
      .from('order_events')
      .select('*')
      .eq('market_id', marketId)
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to find events by market: ' + error.message);
    return data || [];
  }
}
