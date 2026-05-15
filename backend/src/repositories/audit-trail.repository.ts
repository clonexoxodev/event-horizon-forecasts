import { supabase } from '../db/supabase-client.js';
import { Market } from './admin-market.repository.js';

export type AuditActionType = 'create' | 'update' | 'status_change' | 'delete';

export interface AuditEntry {
  id: string;
  market_id: string;
  admin_user_id: string;
  action_timestamp: string;
  action_type: AuditActionType;
  changed_fields: Record<string, { old: any; new: any }> | null;
  snapshot_before: Market | null;
  snapshot_after: Market | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface AuditEntryWithUser extends AuditEntry {
  admin_user: {
    id: string;
    username: string;
    email: string;
  };
}

export interface CreateAuditEntryInput {
  market_id: string;
  admin_user_id: string;
  action_type: AuditActionType;
  changed_fields?: Record<string, { old: any; new: any }>;
  snapshot_before?: Market;
  snapshot_after?: Market;
  ip_address?: string;
  user_agent?: string;
}

export class AuditTrailRepository {
  /**
   * Create audit trail entry
   */
  async create(input: CreateAuditEntryInput): Promise<AuditEntry> {
    const { data, error } = await supabase
      .from('market_audit_trail')
      .insert({
        market_id: input.market_id,
        admin_user_id: input.admin_user_id,
        action_type: input.action_type,
        changed_fields: input.changed_fields || null,
        snapshot_before: input.snapshot_before || null,
        snapshot_after: input.snapshot_after || null,
        ip_address: input.ip_address || null,
        user_agent: input.user_agent || null,
      })
      .select()
      .single();

    if (error) {
      // Log error but don't throw - audit failures shouldn't block operations
      console.error('Failed to create audit entry:', error);
      throw new Error(`Failed to create audit entry: ${error.message}`);
    }

    return data;
  }

  /**
   * Get audit trail for a market
   */
  async getByMarketId(
    marketId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ entries: AuditEntryWithUser[]; pagination: any }> {
    const offset = (page - 1) * limit;

    // Get audit entries with user details
    const { data, error, count } = await supabase
      .from('market_audit_trail')
      .select(`
        *,
        admin_user:users!market_audit_trail_admin_user_id_fkey(id, username, email)
      `, { count: 'exact' })
      .eq('market_id', marketId)
      .order('action_timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get audit trail: ${error.message}`);
    }

    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return {
      entries: data || [],
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };
  }

  /**
   * Get audit entries by admin user
   */
  async getByAdminUserId(
    adminUserId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ entries: AuditEntry[]; pagination: any }> {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('market_audit_trail')
      .select('*', { count: 'exact' })
      .eq('admin_user_id', adminUserId)
      .order('action_timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get audit trail: ${error.message}`);
    }

    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return {
      entries: data || [],
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };
  }

  /**
   * Calculate changed fields between old and new market data
   */
  calculateChangedFields(oldMarket: Market, newMarket: Partial<Market>): Record<string, { old: any; new: any }> {
    const changed: Record<string, { old: any; new: any }> = {};

    for (const key of Object.keys(newMarket)) {
      const oldValue = (oldMarket as any)[key];
      const newValue = (newMarket as any)[key];

      if (oldValue !== newValue) {
        changed[key] = { old: oldValue, new: newValue };
      }
    }

    return changed;
  }
}
