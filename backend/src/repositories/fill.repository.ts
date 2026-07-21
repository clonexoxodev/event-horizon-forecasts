import { supabase } from '../db/supabase-client.js';
import { OrderFill } from '../types/order.js';

export class FillRepository {
  async create(fill: {
    order_id: string;
    user_id: string;
    market_id: string;
    side: string;
    order_type: string;
    fill_price: number;
    fill_quantity: number;
    matched_order_id: string;
    matched_user_id: string;
    position_id?: string;
  }): Promise<OrderFill> {
    const { data, error } = await supabase
      .from('order_fills')
      .insert(fill)
      .select()
      .single();

    if (error) throw new Error('Failed to create fill: ' + error.message);
    return data;
  }

  async updatePositionId(fillId: string, positionId: string): Promise<OrderFill> {
    const { data, error } = await supabase
      .from('order_fills')
      .update({ position_id: positionId })
      .eq('id', fillId)
      .select()
      .single();

    if (error) throw new Error('Failed to update fill position_id: ' + error.message);
    return data;
  }

  async findByOrder(orderId: string): Promise<OrderFill[]> {
    const { data, error } = await supabase
      .from('order_fills')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw new Error('Failed to find fills by order: ' + error.message);
    return data || [];
  }

  async findByMarket(marketId: string): Promise<OrderFill[]> {
    const { data, error } = await supabase
      .from('order_fills')
      .select('*')
      .eq('market_id', marketId)
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to find fills by market: ' + error.message);
    return data || [];
  }

  async findByUserAndMarket(userId: string, marketId: string): Promise<OrderFill[]> {
    const { data, error } = await supabase
      .from('order_fills')
      .select('*')
      .eq('user_id', userId)
      .eq('market_id', marketId)
      .order('created_at', { ascending: true });

    if (error) throw new Error('Failed to find fills by user and market: ' + error.message);
    return data || [];
  }
}
