import { supabase } from '../db/supabase-client.js';
import { MatchingEngine } from './matching.engine.js';

export type ResolutionOutcome = 'YES' | 'NO' | 'REFUND' | 'CANCEL';

export type SettlementStatus = 'idle' | 'pending' | 'settling' | 'completed' | 'failed' | 'refunding' | 'refunded' | 'cancelled';

export type MarketLifecycleStatus =
  | 'draft' | 'active' | 'closed' | 'pending_resolution'
  | 'resolving' | 'resolved' | 'refunding' | 'refunded'
  | 'cancelled' | 'archived';

export interface SettlementResult {
  marketId: string;
  outcome: ResolutionOutcome;
  positionsSettled: number;
  ordersRefunded: number;
  totalPayoutSmallestUnit: number;
  totalRefundedSmallestUnit: number;
  errors: string[];
}

export interface AuditLogEntry {
  market_id: string;
  admin_user_id?: string;
  action_type: string;
  outcome?: string;
  position_id?: string;
  order_id?: string;
  fill_id?: string;
  trade_id?: string;
  user_id?: string;
  amount_smallest_unit?: number;
  payout_smallest_unit?: number;
  refund_amount_smallest_unit?: number;
  metadata?: Record<string, unknown>;
  error_message?: string;
}

const VALID_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'cancelled'],
  active: ['closed', 'pending_resolution', 'cancelled', 'refunded'],
  closed: ['pending_resolution', 'resolving', 'refunded', 'cancelled'],
  pending_resolution: ['resolving', 'refunded', 'cancelled'],
  resolving: ['resolved', 'refunding', 'failed'],
  resolved: ['archived'],
  refunding: ['refunded', 'failed'],
  refunded: ['archived'],
  cancelled: ['archived'],
  archived: [],
};

export function isValidLifecycleTransition(from: string, to: string): boolean {
  return VALID_LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

export class SettlementService {
  async logAudit(entry: AuditLogEntry): Promise<void> {
    try {
      await supabase.from('settlement_audit_log').insert({
        ...entry,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Audit log failed (non-fatal):', err);
    }
  }

  async transitionMarketStatus(
    marketId: string,
    toStatus: string,
    extra?: Record<string, unknown>
  ): Promise<boolean> {
    const { data: market } = await supabase
      .from('markets')
      .select('status, settlement_status')
      .eq('id', marketId)
      .single();

    if (!market) return false;

    if (!isValidLifecycleTransition(market.status, toStatus)) {
      throw new Error(`Invalid transition: ${market.status} -> ${toStatus}`);
    }

    const updateData: Record<string, unknown> = {
      status: toStatus,
      updated_at: new Date().toISOString(),
      ...extra,
    };

    if (toStatus === 'resolving') {
      updateData.settlement_status = 'settling';
      updateData.settlement_started_at = new Date().toISOString();
    } else if (toStatus === 'resolved') {
      updateData.settlement_status = 'completed';
      updateData.settlement_completed_at = new Date().toISOString();
    } else if (toStatus === 'refunding') {
      updateData.settlement_status = 'refunding';
    } else if (toStatus === 'refunded') {
      updateData.settlement_status = 'refunded';
      updateData.settlement_completed_at = new Date().toISOString();
    } else if (toStatus === 'cancelled') {
      updateData.settlement_status = 'cancelled';
    } else if (toStatus === 'failed') {
      updateData.settlement_status = 'failed';
    }

    const { error } = await supabase
      .from('markets')
      .update(updateData)
      .eq('id', marketId);

    if (error) throw error;
    return true;
  }

  async resolveMarket(
    marketId: string,
    outcome: ResolutionOutcome,
    adminUserId: string
  ): Promise<SettlementResult> {
    const result: SettlementResult = {
      marketId,
      outcome,
      positionsSettled: 0,
      ordersRefunded: 0,
      totalPayoutSmallestUnit: 0,
      totalRefundedSmallestUnit: 0,
      errors: [],
    };

    const { data: market } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (!market) throw new Error('Market not found');

    if (market.resolved_at || market.status === 'resolved') {
      return result;
    }

    if (outcome === 'REFUND' || outcome === 'CANCEL') {
      return this.refundMarket(marketId, outcome === 'REFUND' ? 'market_refund' : 'market_cancel', adminUserId);
    }

    const marketStatus = market.status === 'active' && new Date(market.close_date || market.closes_at).getTime() <= Date.now()
      ? 'pending_resolution'
      : market.status;

    if (!['closed', 'pending_resolution'].includes(marketStatus)) {
      throw new Error(`Market must be closed before resolution. Current status: ${market.status}`);
    }

    const pricingModel = market.pricing_model || 'pool';

    await this.transitionMarketStatus(marketId, 'resolving', {
      settlement_status: 'settling',
      settlement_started_at: new Date().toISOString(),
    });

    try {
      if (pricingModel === 'orderbook') {
        await this.settleOrderBookMarket(market, outcome, adminUserId, result);
      } else {
        await this.settlePoolMarket(market, outcome, adminUserId, result);
      }

      await this.refundActiveOrders(marketId, adminUserId, result);

      await this.transitionMarketStatus(marketId, 'resolved', {
        winning_outcome: outcome,
        resolved_outcome: outcome,
        resolved_at: new Date().toISOString(),
        resolved_by: adminUserId,
        resolution_source: market.resolution_source || 'Admin resolution',
        total_settled_positions: result.positionsSettled,
        total_settled_payout_smallest_unit: result.totalPayoutSmallestUnit,
        total_refunded_smallest_unit: result.totalRefundedSmallestUnit,
        settlement_log: (market.settlement_log || []).concat([{
          outcome,
          positionsSettled: result.positionsSettled,
          totalPayout: result.totalPayoutSmallestUnit,
          totalRefunded: result.totalRefundedSmallestUnit,
          timestamp: new Date().toISOString(),
        }]),
      });

      await this.logAudit({
        market_id: marketId,
        admin_user_id: adminUserId,
        action_type: 'resolve',
        outcome,
        metadata: {
          positionsSettled: result.positionsSettled,
          ordersRefunded: result.ordersRefunded,
          totalPayoutSmallestUnit: result.totalPayoutSmallestUnit,
          totalRefundedSmallestUnit: result.totalRefundedSmallestUnit,
        },
      });

      try {
        await supabase.from('market_resolution_logs').insert({
          market_id: marketId,
          resolved_by: adminUserId,
          outcome,
          winning_pool_smallest_unit: result.totalPayoutSmallestUnit,
          losing_pool_smallest_unit: 0,
          payout_pool_smallest_unit: result.totalPayoutSmallestUnit,
          resolved_position_count: result.positionsSettled,
          payout_summary: result,
        });
      } catch (logErr) {
        console.error('Failed to write resolution log (non-fatal):', logErr);
      }

    } catch (err: any) {
      result.errors.push(err.message);

      try {
        await this.transitionMarketStatus(marketId, 'failed', {
          settlement_error: err.message,
        });
        await this.logAudit({
          market_id: marketId,
          admin_user_id: adminUserId,
          action_type: 'resolve',
          outcome,
          error_message: err.message,
        });
      } catch {
        console.error('Failed to mark market as failed:', err);
      }

      throw err;
    }

    return result;
  }

  private async settlePoolMarket(
    market: any,
    outcome: ResolutionOutcome,
    adminUserId: string,
    result: SettlementResult
  ): Promise<void> {
    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('market_id', market.id);

    if (!positions || positions.length === 0) return;

    const winningPositions = positions.filter((p: any) => p.side === outcome);
    const losingPositions = positions.filter((p: any) => p.side !== outcome);

    let totalWinningShares = 0;
    for (const wp of winningPositions) {
      const shares = Number(wp.shares_owned || wp.shares_received || 0);
      totalWinningShares += shares;
    }

    let totalLosingStake = 0;
    for (const lp of losingPositions) {
      totalLosingStake += Number(lp.amount_smallest_unit || 0);
    }

    for (const position of positions) {
      const positionStatus = String(position.status || '').toLowerCase();
      if (position.settled_at || position.resolved_at || ['won', 'lost', 'settled', 'refunded'].includes(positionStatus)) {
        continue;
      }

      const settlementId = `pool_${market.id}_${position.id}_${outcome}`;
      const stake = Number(position.amount_smallest_unit || 0);
      const shares = Number(position.shares_owned || position.shares_received || 0);
      const won = position.side === outcome;

      let payout = 0;
      let profit = 0;

      if (won && totalWinningShares > 0) {
        const ownershipShare = shares / totalWinningShares;
        const poolProfit = Math.round(ownershipShare * totalLosingStake);
        payout = stake + poolProfit;
        profit = poolProfit;
      }

      try {
        await supabase.from('positions').update({
          is_winner: won,
          payout_smallest_unit: payout,
          final_payout_smallest_unit: payout,
          profit_smallest_unit: profit,
          settlement_payout_smallest_unit: payout,
          settlement_profit_smallest_unit: profit,
          status: won ? 'won' : 'lost',
          settlement_id: settlementId,
          settlement_outcome: outcome,
          resolved_at: new Date().toISOString(),
          settled_at: new Date().toISOString(),
          winning_outcome: outcome,
          market_question_snapshot: market.question,
          market_category_snapshot: market.category,
        }).eq('id', position.id);

        if (payout > 0) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', position.user_id)
            .single();

          if (wallet) {
            await supabase.rpc('atomic_settle_winner', {
              p_user_id: position.user_id,
              p_stake: stake,
              p_payout: payout,
              p_profit: profit,
              p_currency: position.currency || 'NGN',
            });

            await supabase.from('transactions').insert({
              user_id: position.user_id,
              wallet_id: wallet.id,
              type: 'settlement_credit',
              amount_smallest_unit: payout,
              currency: position.currency || 'NGN',
              direction: 'IN',
              reference_id: position.id,
              reference_type: 'position',
              market_id: market.id,
              position_id: position.id,
              status: 'completed',
              metadata: {
                outcome,
                stake,
                payout,
                profit,
                settlementId,
                description: `Settlement payout: ${market.question}`,
              },
            });
          }

          await this.insertNotification(position.user_id, {
            type: 'settlement_won',
            title: 'Market Won!',
            message: `You won ₦${(payout / 100).toFixed(2)} from "${market.question}"`,
            reference_id: market.id,
            reference_type: 'market',
            metadata: { marketId: market.id, outcome, payout, profit },
          });
        } else {
          await supabase.rpc('atomic_settle_loser', {
            p_user_id: position.user_id,
            p_stake: stake,
            p_currency: position.currency || 'NGN',
          });

          await this.insertNotification(position.user_id, {
            type: 'settlement_lost',
            title: 'Market Resolved',
            message: `"${market.question}" resolved as ${outcome}. Your prediction did not win.`,
            reference_id: market.id,
            reference_type: 'market',
            metadata: { marketId: market.id, outcome, stake },
          });
        }

        await this.logAudit({
          market_id: market.id,
          admin_user_id: adminUserId,
          action_type: 'settle_position',
          outcome,
          position_id: position.id,
          user_id: position.user_id,
          amount_smallest_unit: stake,
          payout_smallest_unit: payout,
          metadata: { won, shares, totalWinningShares, totalLosingStake },
        });

        result.positionsSettled++;
        result.totalPayoutSmallestUnit += payout;

      } catch (err: any) {
        result.errors.push(`Position ${position.id}: ${err.message}`);
        await this.logAudit({
          market_id: market.id,
          admin_user_id: adminUserId,
          action_type: 'settle_position',
          outcome,
          position_id: position.id,
          user_id: position.user_id,
          error_message: err.message,
        });
      }
    }
  }

  private async settleOrderBookMarket(
    market: any,
    outcome: ResolutionOutcome,
    adminUserId: string,
    result: SettlementResult
  ): Promise<void> {
    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('market_id', market.id);

    if (!positions || positions.length === 0) return;

    for (const position of positions) {
      const positionStatus = String(position.status || '').toLowerCase();
      if (position.settled_at || position.resolved_at || ['won', 'lost', 'settled', 'refunded'].includes(positionStatus)) {
        continue;
      }

      const stake = Number(position.amount_smallest_unit || 0);
      const shares = Number(position.shares_owned || position.shares_received || 0);
      const won = position.side === outcome;

      let payout = 0;
      let profit = 0;

      if (won) {
        payout = shares * 100;
        profit = payout - stake;
      }

      const settlementId = `ob_${market.id}_${position.id}_${outcome}`;

      try {
        await supabase.from('positions').update({
          is_winner: won,
          payout_smallest_unit: payout,
          final_payout_smallest_unit: payout,
          profit_smallest_unit: profit,
          settlement_payout_smallest_unit: payout,
          settlement_profit_smallest_unit: profit,
          status: won ? 'won' : 'lost',
          settlement_id: settlementId,
          settlement_outcome: outcome,
          resolved_at: new Date().toISOString(),
          settled_at: new Date().toISOString(),
          winning_outcome: outcome,
          market_question_snapshot: market.question,
          market_category_snapshot: market.category,
        }).eq('id', position.id);

        if (payout > 0) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', position.user_id)
            .single();

          if (wallet) {
            await supabase.rpc('atomic_orderbook_settle', {
              p_user_id: position.user_id,
              p_stake: stake,
              p_payout: payout,
              p_profit: profit,
              p_currency: position.currency || 'NGN',
            });

            await supabase.from('transactions').insert({
              user_id: position.user_id,
              wallet_id: wallet.id,
              type: 'settlement_credit',
              amount_smallest_unit: payout,
              currency: position.currency || 'NGN',
              direction: 'IN',
              reference_id: position.id,
              reference_type: 'position',
              market_id: market.id,
              position_id: position.id,
              status: 'completed',
              metadata: {
                outcome,
                stake,
                payout,
                profit,
                shares,
                settlementId,
                pricingModel: 'orderbook',
                description: `Order book settlement: ${market.question}`,
              },
            });
          }

          await this.insertNotification(position.user_id, {
            type: 'settlement_won',
            title: 'Order Book Settlement',
            message: `You won ₦${(payout / 100).toFixed(2)} from "${market.question}" (${shares} shares @ ${outcome})`,
            reference_id: market.id,
            reference_type: 'market',
            metadata: { marketId: market.id, outcome, payout, profit, shares },
          });
        } else {
          await supabase.rpc('atomic_settle_loser', {
            p_user_id: position.user_id,
            p_stake: stake,
            p_currency: position.currency || 'NGN',
          });

          await this.insertNotification(position.user_id, {
            type: 'settlement_lost',
            title: 'Order Book Settlement',
            message: `"${market.question}" resolved as ${outcome}. Your ${position.side} position did not win.`,
            reference_id: market.id,
            reference_type: 'market',
            metadata: { marketId: market.id, outcome, stake },
          });
        }

        await this.logAudit({
          market_id: market.id,
          admin_user_id: adminUserId,
          action_type: 'settle_position',
          outcome,
          position_id: position.id,
          user_id: position.user_id,
          amount_smallest_unit: stake,
          payout_smallest_unit: payout,
          metadata: { won, shares, pricingModel: 'orderbook' },
        });

        result.positionsSettled++;
        result.totalPayoutSmallestUnit += payout;

      } catch (err: any) {
        result.errors.push(`Position ${position.id}: ${err.message}`);
        await this.logAudit({
          market_id: market.id,
          admin_user_id: adminUserId,
          action_type: 'settle_position',
          outcome,
          position_id: position.id,
          user_id: position.user_id,
          error_message: err.message,
        });
      }
    }
  }

  private async refundActiveOrders(
    marketId: string,
    adminUserId: string,
    result: SettlementResult
  ): Promise<void> {
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('market_id', marketId)
      .in('status', ['waiting', 'partial', 'pending']);

    if (!activeOrders || activeOrders.length === 0) return;

    const engine = new MatchingEngine();

    for (const order of activeOrders) {
      const remaining = engine.getRemainingQuantity(order);
      if (remaining <= 0) continue;

      try {
        await supabase.rpc('atomic_refund_order', {
          p_user_id: order.user_id,
          p_amount: remaining,
          p_currency: 'NGN',
        });

        await supabase.from('orders').update({
          status: 'refunded',
          cancelled_at: new Date().toISOString(),
        }).eq('id', order.id);

        await supabase.from('order_events').insert({
          order_id: order.id,
          market_id: marketId,
          user_id: order.user_id,
          event_type: 'refunded',
          quantity_affected: remaining,
          metadata: { reason: 'market_resolution', adminUserId },
        });

        await supabase.from('transactions').insert({
          user_id: order.user_id,
          type: 'order_refund',
          amount_smallest_unit: remaining,
          currency: 'NGN',
          direction: 'IN',
          reference_id: order.id,
          reference_type: 'order',
          market_id: marketId,
          status: 'completed',
          metadata: {
            orderId: order.id,
            side: order.side,
            orderType: order.order_type,
            remaining,
            reason: 'Market resolved — unmatched order refunded',
          },
        });

        await this.insertNotification(order.user_id, {
          type: 'order_refunded',
          title: 'Order Refunded',
          message: `Your unmatched ${order.order_type} ${order.side} order was refunded ₦${(remaining / 100).toFixed(2)}`,
          reference_id: marketId,
          reference_type: 'market',
          metadata: { orderId: order.id, refundAmount: remaining },
        });

        await this.logAudit({
          market_id: marketId,
          admin_user_id: adminUserId,
          action_type: 'refund_order',
          order_id: order.id,
          user_id: order.user_id,
          refund_amount_smallest_unit: remaining,
          metadata: { remaining, side: order.side, orderType: order.order_type },
        });

        result.ordersRefunded++;
        result.totalRefundedSmallestUnit += remaining;

      } catch (err: any) {
        result.errors.push(`Order ${order.id}: ${err.message}`);
      }
    }
  }

  async refundMarket(
    marketId: string,
    reason: 'market_refund' | 'market_cancel' | 'protected_refund',
    adminUserId: string
  ): Promise<SettlementResult> {
    const result: SettlementResult = {
      marketId,
      outcome: reason === 'market_cancel' ? 'CANCEL' : 'REFUND',
      positionsSettled: 0,
      ordersRefunded: 0,
      totalPayoutSmallestUnit: 0,
      totalRefundedSmallestUnit: 0,
      errors: [],
    };

    const { data: market } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (!market) throw new Error('Market not found');

    if (market.status === 'refunded') {
      return result;
    }

    const toStatus = reason === 'market_cancel' ? 'cancelled' : 'refunding';
    try {
      await this.transitionMarketStatus(marketId, toStatus);
    } catch {
      if (market.status !== toStatus) {
        await supabase.from('markets').update({
          status: toStatus,
          settlement_status: reason === 'market_cancel' ? 'cancelled' : 'refunding',
          updated_at: new Date().toISOString(),
        }).eq('id', marketId);
      }
    }

    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('market_id', marketId);

    for (const position of positions || []) {
      const positionStatus = String(position.status || '').toLowerCase();
      if (['refunded', 'won', 'lost', 'settled'].includes(positionStatus) || position.settled_at || position.resolved_at) {
        continue;
      }

      const refundAmount = Number(position.amount_smallest_unit || 0);
      if (refundAmount <= 0) continue;

      const settlementId = `refund_${marketId}_${position.id}_${Date.now()}`;

      try {
        const { data: existingRefund } = await supabase
          .from('transactions')
          .select('id')
          .eq('position_id', position.id)
          .eq('type', 'refund')
          .eq('status', 'completed')
          .maybeSingle();
        if (existingRefund) continue;

        const { data: refundedWallet, error: refundError } = await supabase
          .rpc('atomic_refund_to_available', {
            p_user_id: position.user_id,
            p_amount: refundAmount,
            p_currency: position.currency || 'NGN',
          })
          .maybeSingle<{ id: string }>();
        if (refundError || !refundedWallet) throw refundError || new Error('Refund failed');

        await supabase.from('positions').update({
          status: 'refunded',
          is_winner: null,
          payout_smallest_unit: refundAmount,
          final_payout_smallest_unit: refundAmount,
          settlement_payout_smallest_unit: refundAmount,
          settlement_profit_smallest_unit: 0,
          profit_smallest_unit: 0,
          settlement_id: settlementId,
          settlement_outcome: 'REFUND',
          refund_reason: reason,
          refund_amount_smallest_unit: refundAmount,
          refunded_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
          settled_at: new Date().toISOString(),
          market_question_snapshot: market.question,
          market_category_snapshot: market.category,
        }).eq('id', position.id);

        await supabase.from('transactions').insert({
          user_id: position.user_id,
          wallet_id: refundedWallet.id,
          type: 'refund',
          amount_smallest_unit: refundAmount,
          currency: position.currency || 'NGN',
          direction: 'IN',
          reference_id: position.id,
          reference_type: 'position',
          market_id: marketId,
          position_id: position.id,
          status: 'completed',
          description: `Refund: ${market.question}`,
          metadata: {
            marketId,
            marketQuestion: market.question,
            reason,
            settlementId,
          },
        });

        const notifMessages: Record<string, { title: string; message: string }> = {
          market_refund: { title: 'Market Refunded', message: `"${market.question}" was refunded. Your stake has been returned.` },
          market_cancel: { title: 'Market Cancelled', message: `"${market.question}" was cancelled. Your stake has been returned.` },
          protected_refund: { title: 'Protected Market Refund', message: `"${market.question}" did not reach enough activity. Your stake was refunded.` },
        };
        const notif = notifMessages[reason] ?? notifMessages.market_refund;
        if (notif) {
          await this.insertNotification(position.user_id, {
            type: 'refund',
            title: notif.title,
            message: notif.message,
            reference_id: marketId,
            reference_type: 'market',
            metadata: { marketId, reason, refundAmount },
          });
        }

        await this.logAudit({
          market_id: marketId,
          admin_user_id: adminUserId,
          action_type: 'refund_position',
          position_id: position.id,
          user_id: position.user_id,
          refund_amount_smallest_unit: refundAmount,
          metadata: { reason, settlementId },
        });

        result.positionsSettled++;
        result.totalRefundedSmallestUnit += refundAmount;

      } catch (err: any) {
        result.errors.push(`Position ${position.id}: ${err.message}`);
      }
    }

    await this.refundActiveOrders(marketId, adminUserId, result);

    const finalStatus = reason === 'market_cancel' ? 'cancelled' : 'refunded';
    try {
      await this.transitionMarketStatus(marketId, finalStatus, {
        settlement_status: reason === 'market_cancel' ? 'cancelled' : 'refunded',
        settlement_completed_at: new Date().toISOString(),
        total_refunded_smallest_unit: result.totalRefundedSmallestUnit,
      });
    } catch {
      await supabase.from('markets').update({
        status: finalStatus,
        settlement_status: reason === 'market_cancel' ? 'cancelled' : 'refunded',
        refunded_at: new Date().toISOString(),
        settlement_completed_at: new Date().toISOString(),
        total_refunded_smallest_unit: result.totalRefundedSmallestUnit,
        updated_at: new Date().toISOString(),
      }).eq('id', marketId);
    }

    await this.logAudit({
      market_id: marketId,
      admin_user_id: adminUserId,
      action_type: reason === 'market_cancel' ? 'cancel_market' : 'refund_market',
      outcome: reason,
      metadata: {
        positionsSettled: result.positionsSettled,
        ordersRefunded: result.ordersRefunded,
        totalRefundedSmallestUnit: result.totalRefundedSmallestUnit,
      },
    });

    return result;
  }

  async retrySettlement(marketId: string, adminUserId: string): Promise<SettlementResult> {
    const { data: market } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (!market) throw new Error('Market not found');
    if (market.settlement_status !== 'failed') throw new Error('Market is not in failed state');

    await this.logAudit({
      market_id: marketId,
      admin_user_id: adminUserId,
      action_type: 'retry_settlement',
      metadata: { previousError: market.settlement_error },
    });

    await supabase.from('markets').update({
      settlement_status: 'idle',
      settlement_error: null,
      status: market.status === 'resolving' ? 'pending_resolution' : market.status,
      updated_at: new Date().toISOString(),
    }).eq('id', marketId);

    return this.resolveMarket(marketId, market.winning_outcome || 'YES', adminUserId);
  }

  async rollbackSettlement(marketId: string, adminUserId: string): Promise<void> {
    const { data: market } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (!market) throw new Error('Market not found');
    if (market.status !== 'resolved') throw new Error('Can only rollback resolved markets');
    if (market.settlement_completed_at) {
      const elapsed = Date.now() - new Date(market.settlement_completed_at).getTime();
      if (elapsed > 30 * 60 * 1000) {
        throw new Error('Cannot rollback: settlement completed more than 30 minutes ago');
      }
    }

    await this.logAudit({
      market_id: marketId,
      admin_user_id: adminUserId,
      action_type: 'rollback',
      metadata: { previousStatus: market.status, previousOutcome: market.winning_outcome },
    });

    const { data: settledPositions } = await supabase
      .from('positions')
      .select('*')
      .eq('market_id', marketId)
      .not('settled_at', 'is', null);

    for (const position of settledPositions || []) {
      const payout = Number(position.payout_smallest_unit || 0);

      if (payout > 0 && position.user_id) {
        try {
          await supabase.rpc('atomic_refund_to_available', {
            p_user_id: position.user_id,
            p_amount: payout,
            p_currency: position.currency || 'NGN',
          });
        } catch {
          console.error(`Failed to refund position ${position.id} during rollback (non-fatal)`);
        }
      }

      await supabase.from('positions').update({
        status: 'active',
        is_winner: null,
        payout_smallest_unit: 0,
        profit_smallest_unit: 0,
        settlement_payout_smallest_unit: 0,
        settlement_profit_smallest_unit: 0,
        settled_at: null,
        resolved_at: null,
        settlement_id: null,
        settlement_outcome: null,
        winning_outcome: null,
        final_payout_smallest_unit: null,
      }).eq('id', position.id);
    }

    await supabase.from('markets').update({
      status: 'pending_resolution',
      settlement_status: 'idle',
      settlement_completed_at: null,
      settlement_started_at: null,
      settlement_error: null,
      winning_outcome: null,
      resolved_outcome: null,
      resolved_at: null,
      resolved_by: null,
      total_settled_positions: 0,
      total_settled_payout_smallest_unit: 0,
      updated_at: new Date().toISOString(),
    }).eq('id', marketId);
  }

  async createPositionFromBuyFill(
    fill: {
      id: string;
      user_id: string;
      market_id: string;
      side: string;
      fill_price: number;
      fill_quantity: number;
    },
    order: {
      id: string;
      currency?: string;
    }
  ): Promise<string | null> {
    const { data: existingPosition } = await supabase
      .from('positions')
      .select('id')
      .eq('user_id', fill.user_id)
      .eq('market_id', fill.market_id)
      .eq('order_id', order.id)
      .maybeSingle();

    if (existingPosition) {
      const exPos = existingPosition as any;
      await supabase
        .from('positions')
        .update({
          fill_count: (exPos.fill_count || 0) + 1,
          last_fill_price: fill.fill_price,
          amount_smallest_unit: (exPos.amount_smallest_unit || 0) + (fill.fill_quantity * fill.fill_price),
          shares_owned: (exPos.shares_owned || 0) + fill.fill_quantity,
          shares_received: (exPos.shares_received || 0) + fill.fill_quantity,
        })
        .eq('id', existingPosition.id);

      await supabase.from('order_events').insert({
        order_id: order.id,
        market_id: fill.market_id,
        user_id: fill.user_id,
        event_type: 'position_updated',
        quantity_affected: fill.fill_quantity,
        price_affected: fill.fill_price,
        metadata: { positionId: existingPosition.id, fillId: fill.id },
      });

      return existingPosition.id;
    }

    const amountSmallestUnit = fill.fill_quantity * fill.fill_price;
    const positionData = {
      user_id: fill.user_id,
      market_id: fill.market_id,
      side: fill.side,
      amount_smallest_unit: amountSmallestUnit,
      shares_owned: fill.fill_quantity,
      shares_received: fill.fill_quantity,
      price_at_purchase: fill.fill_price,
      entry_price: fill.fill_price,
      order_id: order.id,
      first_fill_price: fill.fill_price,
      last_fill_price: fill.fill_price,
      fill_count: 1,
      status: 'active',
      currency: order.currency || 'NGN',
      stake_amount: amountSmallestUnit / 100,
    };

    const { data: newPosition, error } = await supabase
      .from('positions')
      .insert(positionData)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create position from fill:', error);
      return null;
    }

    await supabase.from('order_events').insert({
      order_id: order.id,
      market_id: fill.market_id,
      user_id: fill.user_id,
      event_type: 'position_created',
      quantity_affected: fill.fill_quantity,
      price_affected: fill.fill_price,
      metadata: { positionId: newPosition.id, fillId: fill.id },
    });

    return newPosition.id;
  }

  private async insertNotification(
    userId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      reference_id?: string;
      reference_type?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        ...notification,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Notification failed (non-fatal):', err);
    }
  }
}
