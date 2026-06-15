import { supabase } from '../db/supabase-client.js';
import { MarketCreateInput, MarketUpdateInput, MarketStatus, Outcome, normalizeMarketCategory } from '../validation/market.validation.js';

export interface Market {
  id: string;
  question: string;
  description: string | null;
  category: string;
  country_filter: string | null;
  market_type: 'binary' | 'multiple_choice';
  yes_label: string;
  no_label: string;
  yes_price: number;
  no_price: number;
  close_date: string;
  trading_close_at?: string | null;
  resolution_date: string;
  resolution_source: string | null;
  outcome: 'YES' | 'NO' | 'INVALID' | null;
  status: MarketStatus;
  pool_amount_smallest_unit: number;
  participant_count: number;
  trade_count?: number | null;
  total_volume_smallest_unit?: number | null;
  yes_pool_smallest_unit?: number | null;
  no_pool_smallest_unit?: number | null;
  seed_liquidity_yes_smallest_unit?: number | null;
  seed_liquidity_no_smallest_unit?: number | null;
  starting_yes_price?: number | null;
  starting_no_price?: number | null;
  yes_volume_smallest_unit?: number | null;
  no_volume_smallest_unit?: number | null;
  total_yes_shares?: number | null;
  total_no_shares?: number | null;
  currency: 'NGN' | 'USD';
  image_url: string | null;
  video_url?: string | null;
  is_trending?: boolean;
  min_position_smallest_unit?: number | null;
  max_position_smallest_unit?: number | null;
  resolution_instructions?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  archived_at: string | null;
  version: number;
}

export interface MarketFilters {
  status?: MarketStatus;
  category?: string;
  search?: string;
  sort?: 'close_date' | 'pool_amount' | 'created_at';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export class AdminMarketRepository {
  private legacyStateFor(status: string) {
    if (status === 'active') return 'active';
    if (status === 'resolved') return 'resolved';
    return 'closed';
  }

  private getStartingPrices(data: MarketCreateInput) {
    const yesPrice = Number(data.starting_yes_price ?? data.yes_price ?? 50);
    const noPrice = Number(data.starting_no_price ?? data.no_price ?? (100 - yesPrice));
    if (!Number.isFinite(yesPrice) || !Number.isFinite(noPrice) || yesPrice < 1 || noPrice < 1 || Math.round(yesPrice + noPrice) !== 100) {
      throw new Error('Starting YES and NO prices must be valid and add up to 100.');
    }
    return { yesPrice, noPrice };
  }

  /**
   * Create a new market
   */
  async create(data: MarketCreateInput, createdBy: string): Promise<Market> {
    const prices = this.getStartingPrices(data);

    const { data: market, error } = await supabase
      .from('markets')
      .insert({
        question: data.question,
        description: data.description || null,
        category: normalizeMarketCategory(data.category),
        country_filter: data.country_filter || null,
        market_type: data.market_type,
        yes_label: data.yes_label,
        no_label: data.no_label,
        yes_price: prices.yesPrice,
        no_price: prices.noPrice,
        close_date: data.close_date,
        trading_close_at: (data as any).trading_close_at || data.close_date,
        resolution_date: data.resolution_date,
        resolution_source: data.resolution_source || null,
        resolution_instructions: data.resolution_instructions || null,
        status: data.status,
        state: this.legacyStateFor(data.status),
        currency: data.currency,
        image_url: data.image_url || null,
        video_url: data.video_url || null,
        is_trending: data.is_trending || false,
        min_position_smallest_unit: data.min_position_smallest_unit || null,
        max_position_smallest_unit: data.max_position_smallest_unit || null,
        created_by: createdBy,
        closes_at: data.close_date,
        pricing_model: 'ownership_shares',
        starting_yes_price: prices.yesPrice,
        starting_no_price: prices.noPrice,
        pool_amount_smallest_unit: 0,
        settlement_pool_smallest_unit: 0,
        seed_liquidity_yes_smallest_unit: 0,
        seed_liquidity_no_smallest_unit: 0,
        yes_pool_smallest_unit: 0,
        no_pool_smallest_unit: 0,
        yes_volume_smallest_unit: 0,
        no_volume_smallest_unit: 0,
        total_yes_shares: 0,
        total_no_shares: 0,
        total_volume_smallest_unit: 0,
        participant_count: 0,
        trade_count: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create market: ${error.message}`);
    }

    await supabase
      .from('market_price_history')
      .insert({
        market_id: market.id,
        yes_price: prices.yesPrice,
        no_price: prices.noPrice,
        yes_pool_smallest_unit: 0,
        no_pool_smallest_unit: 0,
        yes_volume_smallest_unit: 0,
        no_volume_smallest_unit: 0,
        total_yes_shares: 0,
        total_no_shares: 0,
        volume_smallest_unit: 0,
        trade_count: 0
      })
      .then(({ error: historyError }) => {
        if (historyError) console.warn('Failed to save initial market price history:', historyError.message);
      });

    return market;
  }

  /**
   * Find market by ID
   */
  async findById(id: string): Promise<Market | null> {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find market: ${error.message}`);
    }

    return data;
  }

  /**
   * Update market with optimistic locking
   */
  async update(
    id: string,
    data: Partial<MarketUpdateInput>,
    expectedVersion: number
  ): Promise<Market> {
    const updateData: any = {};
    
    // Only include provided fields
    if (data.question !== undefined) updateData.question = data.question;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = normalizeMarketCategory(data.category);
    if (data.country_filter !== undefined) updateData.country_filter = data.country_filter;
    if (data.market_type !== undefined) updateData.market_type = data.market_type;
    if (data.yes_label !== undefined) updateData.yes_label = data.yes_label;
    if (data.no_label !== undefined) updateData.no_label = data.no_label;
    if (data.yes_price !== undefined) updateData.yes_price = data.yes_price;
    if (data.no_price !== undefined) updateData.no_price = data.no_price;
    if (data.close_date !== undefined) updateData.close_date = data.close_date;
    if (data.close_date !== undefined) updateData.closes_at = data.close_date;
    if ((data as any).trading_close_at !== undefined) updateData.trading_close_at = (data as any).trading_close_at;
    if (data.resolution_date !== undefined) updateData.resolution_date = data.resolution_date;
    if (data.resolution_source !== undefined) updateData.resolution_source = data.resolution_source;
    if (data.resolution_instructions !== undefined) updateData.resolution_instructions = data.resolution_instructions;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.image_url !== undefined) updateData.image_url = data.image_url;
    if (data.video_url !== undefined) updateData.video_url = data.video_url;
    if (data.is_trending !== undefined) updateData.is_trending = data.is_trending;
    if (data.min_position_smallest_unit !== undefined) updateData.min_position_smallest_unit = data.min_position_smallest_unit;
    if (data.max_position_smallest_unit !== undefined) updateData.max_position_smallest_unit = data.max_position_smallest_unit;

    const { data: market, error } = await supabase
      .from('markets')
      .update(updateData)
      .eq('id', id)
      .eq('version', expectedVersion)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update market: ${error.message}`);
    }

    if (!market) {
      throw new Error('CONCURRENT_MODIFICATION');
    }

    return market;
  }

  /**
   * Update market status
   */
  async updateStatus(
    id: string,
    status: MarketStatus,
    outcome?: Outcome,
    resolutionSource?: string
  ): Promise<Market> {
    const updateData: any = { status, state: this.legacyStateFor(status) };
    
    if (outcome !== undefined) {
      updateData.outcome = outcome;
      updateData.winning_outcome = outcome === 'INVALID' ? null : outcome;
      updateData.resolved_outcome = outcome === 'INVALID' ? null : outcome;
    }

    if (status === 'resolved' || status === 'cancelled') {
      updateData.resolved_at = new Date().toISOString();
    }
    
    if (resolutionSource !== undefined) {
      updateData.resolution_source = resolutionSource;
    }

    const { data: market, error } = await supabase
      .from('markets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update market status: ${error.message}`);
    }

    return market;
  }

  /**
   * Delete market (draft only)
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('markets')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete market: ${error.message}`);
    }
  }

  /**
   * List markets with filters and pagination
   */
  async list(filters: MarketFilters): Promise<{ markets: Market[]; pagination: PaginationInfo }> {
    let query = supabase.from('markets').select('*', { count: 'exact' });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.category) {
      const normalizedCategory = normalizeMarketCategory(filters.category);
      query = normalizedCategory === 'Economy'
        ? query.in('category', ['Economy', 'Finance', 'finance'])
        : query.eq('category', normalizedCategory);
    }

    if (filters.search) {
      query = query.ilike('question', `%${filters.search}%`);
    }

    // Apply sorting
    const sortField = filters.sort || 'created_at';
    const sortOrder = filters.order || 'desc';
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list markets: ${error.message}`);
    }

    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return {
      markets: data || [],
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };
  }

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(marketIds: string[], status: MarketStatus): Promise<number> {
    const { data, error } = await supabase
      .from('markets')
      .update({ status })
      .in('id', marketIds)
      .select('id');

    if (error) {
      throw new Error(`Failed to bulk update markets: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Get markets for export
   */
  async getForExport(filters: MarketFilters): Promise<Market[]> {
    let query = supabase.from('markets').select('*');

    // Apply same filters as list
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.category) {
      const normalizedCategory = normalizeMarketCategory(filters.category);
      query = normalizedCategory === 'Economy'
        ? query.in('category', ['Economy', 'Finance', 'finance'])
        : query.eq('category', normalizedCategory);
    }

    if (filters.search) {
      query = query.ilike('question', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get markets for export: ${error.message}`);
    }

    return data || [];
  }
}
