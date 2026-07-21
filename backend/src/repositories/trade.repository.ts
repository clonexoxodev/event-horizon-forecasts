import { supabase } from '../db/supabase-client.js';
import { Trade } from '../types/order.js';

export class TradeRepository {
  async create(trade: {
    market_id: string;
    buy_order_id: string;
    sell_order_id: string;
    buyer_id: string;
    seller_id: string;
    side: string;
    trade_price: number;
    trade_quantity: number;
    fee_smallest_unit?: number;
  }): Promise<Trade> {
    const { data, error } = await supabase
      .from('trades')
      .insert({
        ...trade,
        fee_smallest_unit: trade.fee_smallest_unit || 0,
      })
      .select()
      .single();

    if (error) throw new Error('Failed to create trade: ' + error.message);
    return data;
  }

  async findByMarket(marketId: string): Promise<Trade[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('market_id', marketId)
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to find trades by market: ' + error.message);
    return data || [];
  }

  async findByOrder(orderId: string): Promise<Trade[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .or(`buy_order_id.eq.${orderId},sell_order_id.eq.${orderId}`)
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to find trades by order: ' + error.message);
    return data || [];
  }
}
