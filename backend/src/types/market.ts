export interface Market {
  id: string;
  question: string;
  description?: string;
  currency: 'NGN' | 'USD';
  pool_amount_smallest_unit: number;
  yes_pool_smallest_unit: number;
  no_pool_smallest_unit: number;
  min_position_smallest_unit: number;
  max_position_smallest_unit?: number;
  state: 'active' | 'closed' | 'resolved';
  winning_side?: 'YES' | 'NO';
  closes_at: Date;
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMarketRequest {
  question: string;
  description?: string;
  currency: 'NGN' | 'USD';
  min_position_smallest_unit: number;
  max_position_smallest_unit?: number;
  closes_at: Date;
}

export interface MarketFilters {
  state?: 'active' | 'closed' | 'resolved';
  currency?: 'NGN' | 'USD';
  limit?: number;
  offset?: number;
}

export interface UpdatePoolAmountsRequest {
  yes_pool_increment?: number;
  no_pool_increment?: number;
}
