import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase-client.js';
import { MatchingEngine } from '../services/matching.engine.js';
import { Order } from '../types/order.js';

const router = Router();
const engine = new MatchingEngine();

function authMiddleware(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  const token = req.cookies?.auth_token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '');
  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required', timestamp: new Date().toISOString() } });
    return;
  }
  (req as any)._token = token;
  next();
}

router.use(authMiddleware);

router.post('/:marketId/orders', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated', timestamp: new Date().toISOString() } });
    }

    const marketId = req.params.marketId;
    const { side, order_type, price, quantity } = req.body;

    if (!side || !['YES', 'NO'].includes(side)) {
      return res.status(400).json({ error: { code: 'INVALID_SIDE', message: 'side must be YES or NO', timestamp: new Date().toISOString() } });
    }
    if (!order_type || !['BUY', 'SELL'].includes(order_type)) {
      return res.status(400).json({ error: { code: 'INVALID_ORDER_TYPE', message: 'order_type must be BUY or SELL', timestamp: new Date().toISOString() } });
    }
    if (!Number.isFinite(price) || price <= 0 || price >= 100) {
      return res.status(400).json({ error: { code: 'INVALID_PRICE', message: 'price must be between 1 and 99', timestamp: new Date().toISOString() } });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ error: { code: 'INVALID_QUANTITY', message: 'quantity must be greater than 0', timestamp: new Date().toISOString() } });
    }

    const { data: market, error: marketError } = await supabase.from('markets').select('*').eq('id', marketId).single();
    if (marketError || !market) {
      return res.status(404).json({ error: { code: 'MARKET_NOT_FOUND', message: 'Market not found', timestamp: new Date().toISOString() } });
    }
    if (market.pricing_model !== 'orderbook') {
      return res.status(422).json({ error: { code: 'NOT_ORDERBOOK_MARKET', message: 'This market does not use order book pricing', timestamp: new Date().toISOString() } });
    }
    if (!['trading', 'active'].includes(market.status)) {
      return res.status(422).json({ error: { code: 'MARKET_NOT_TRADING', message: 'Market is not accepting orders', timestamp: new Date().toISOString() } });
    }

    const { data: wallet, error: walletError } = await supabase.from('wallets').select('*').eq('user_id', user.id).single();
    if (walletError || !wallet) {
      return res.status(404).json({ error: { code: 'WALLET_NOT_FOUND', message: 'Wallet not found', timestamp: new Date().toISOString() } });
    }
    if (Number(wallet.available_ngn_kobo || 0) < quantity) {
      return res.status(422).json({ error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient available balance', timestamp: new Date().toISOString() } });
    }

    const { error: lockError } = await supabase.rpc('atomic_lock_for_order', {
      p_user_id: user.id, p_amount: quantity, p_currency: 'NGN'
    });
    if (lockError) {
      return res.status(500).json({ error: { code: 'LOCK_FAILED', message: 'Failed to lock funds', timestamp: new Date().toISOString() } });
    }

    const { data: order, error: orderError } = await supabase.from('orders').insert({
      user_id: user.id, market_id: marketId, side, order_type: order_type,
      price, quantity, filled_quantity: 0, status: 'pending',
      locked_amount: quantity, filled_amount: 0, source: 'user'
    }).select().single();
    if (orderError || !order) {
      await supabase.rpc('atomic_unlock_from_order', { p_user_id: user.id, p_amount: quantity, p_currency: 'NGN' });
      return res.status(500).json({ error: { code: 'ORDER_CREATE_FAILED', message: 'Failed to create order', timestamp: new Date().toISOString() } });
    }

    const { data: opposingOrders } = await supabase
      .from('orders').select('*')
      .eq('market_id', marketId).eq('side', side).eq('order_type', order_type === 'BUY' ? 'SELL' : 'BUY')
      .in('status', ['waiting', 'partial'])
      .order(order_type === 'BUY' ? 'price' : 'price', { ascending: order_type === 'BUY' })
      .order('created_at', { ascending: true });

    const matchOutput = engine.matchOrder(order, (opposingOrders || []) as Order[]);

    let finalStatus = matchOutput.totalFilled >= quantity ? 'filled' :
      matchOutput.totalFilled > 0 ? 'partial' : 'waiting';
    const now = new Date().toISOString();

    if (matchOutput.totalFilled > 0) {
      for (const opp of (opposingOrders || [])) {
        const oppQty = matchOutput.matchedQuantities.get(opp.id);
        if (!oppQty || oppQty <= 0) continue;

        const newOppFilled = (opp.filled_quantity || 0) + oppQty;
        const newOppStatus = newOppFilled >= opp.quantity ? 'filled' : 'partial';

        await supabase.from('orders').update({
          filled_quantity: newOppFilled,
          filled_amount: (opp.filled_amount || 0) + (oppQty * opp.price),
          status: newOppStatus,
          filled_at: newOppStatus === 'filled' ? now : null,
          updated_at: now
        }).eq('id', opp.id);

        const buyerOrder = order_type === 'BUY' ? order : opp;
        const sellerOrder = order_type === 'SELL' ? order : opp;

        const { data: buyerFill } = await supabase.from('order_fills').insert({
          order_id: buyerOrder.id, user_id: buyerOrder.user_id, market_id: marketId,
          side, order_type: 'BUY', fill_price: opp.price, fill_quantity: oppQty,
          matched_order_id: sellerOrder.id, matched_user_id: sellerOrder.user_id
        }).select().single();

        const { data: sellerFill } = await supabase.from('order_fills').insert({
          order_id: sellerOrder.id, user_id: sellerOrder.user_id, market_id: marketId,
          side, order_type: 'SELL', fill_price: opp.price, fill_quantity: oppQty,
          matched_order_id: buyerOrder.id, matched_user_id: buyerOrder.user_id
        }).select().single();

        await supabase.from('trades').insert({
          market_id: marketId, buy_order_id: buyerOrder.id, sell_order_id: sellerOrder.id,
          buyer_id: buyerOrder.user_id, seller_id: sellerOrder.user_id,
          side, trade_price: opp.price, trade_quantity: oppQty
        });

        await supabase.from('order_events').insert([
          { order_id: buyerOrder.id, market_id: marketId, user_id: buyerOrder.user_id, event_type: newOppStatus === 'filled' ? 'full_fill' : 'partial_fill', quantity_affected: oppQty, price_affected: opp.price },
          { order_id: sellerOrder.id, market_id: marketId, user_id: sellerOrder.user_id, event_type: newOppStatus === 'filled' ? 'full_fill' : 'partial_fill', quantity_affected: oppQty, price_affected: opp.price },
        ]);
      }

      await supabase.rpc('atomic_lock_for_order', { p_user_id: user.id, p_amount: 0, p_currency: 'NGN' });
    }

    const newFilled = (order.filled_quantity || 0) + matchOutput.totalFilled;
    await supabase.from('orders').update({
      filled_quantity: newFilled,
      filled_amount: newFilled * (matchOutput.fillPrice || price),
      status: finalStatus,
      filled_at: finalStatus === 'filled' ? now : null,
      updated_at: now
    }).eq('id', order.id);

    await supabase.from('order_events').insert({
      order_id: order.id, market_id: marketId, user_id: user.id,
      event_type: matchOutput.totalFilled > 0 ? (finalStatus === 'filled' ? 'full_fill' : 'partial_fill') : 'entered_book',
      quantity_affected: matchOutput.totalFilled || undefined,
      price_affected: matchOutput.fillPrice || undefined
    });

    const { data: updatedOrder } = await supabase.from('orders').select('*').eq('id', order.id).single();

    res.status(201).json({ order: updatedOrder, matched: matchOutput.totalFilled });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: { code: 'CREATE_ORDER_FAILED', message: 'Failed to create order', timestamp: new Date().toISOString() } });
  }
});

router.delete('/:marketId/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated', timestamp: new Date().toISOString() } });
    }

    const { orderId } = req.params;

    const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (orderError || !order) {
      return res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found', timestamp: new Date().toISOString() } });
    }
    if (order.user_id !== user.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot cancel another user\'s order', timestamp: new Date().toISOString() } });
    }
    if (!['waiting', 'partial'].includes(order.status)) {
      return res.status(422).json({ error: { code: 'ORDER_NOT_CANCELLABLE', message: `Cannot cancel order in '${order.status}' state`, timestamp: new Date().toISOString() } });
    }

    const remaining = order.quantity - (order.filled_quantity || 0);
    if (remaining > 0) {
      await supabase.rpc('atomic_unlock_from_order', { p_user_id: user.id, p_amount: remaining, p_currency: 'NGN' });
    }

    const now = new Date().toISOString();
    await supabase.from('orders').update({ status: 'cancelled', cancelled_at: now, updated_at: now }).eq('id', orderId);
    await supabase.from('order_events').insert([
      { order_id: orderId, market_id: order.market_id, user_id: user.id, event_type: 'cancelled', quantity_affected: remaining },
      { order_id: orderId, market_id: order.market_id, user_id: user.id, event_type: 'unlock', quantity_affected: remaining },
    ]);

    const { data: updatedOrder } = await supabase.from('orders').select('*').eq('id', orderId).single();
    res.json({ order: updatedOrder });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: { code: 'CANCEL_ORDER_FAILED', message: 'Failed to cancel order', timestamp: new Date().toISOString() } });
  }
});

router.get('/:marketId/orderbook', async (req: Request, res: Response) => {
  try {
    const marketId = req.params.marketId;
    const book = await engine.buildOrderBook([]);

    const { data: buyOrders } = await supabase.from('orders')
      .select('price, filled_quantity, quantity').eq('market_id', marketId).eq('order_type', 'BUY').in('status', ['waiting', 'partial']);
    const { data: sellOrders } = await supabase.from('orders')
      .select('price, filled_quantity, quantity').eq('market_id', marketId).eq('order_type', 'SELL').in('status', ['waiting', 'partial']);

    const bidMap = new Map<number, { total_quantity: number; order_count: number }>();
    const askMap = new Map<number, { total_quantity: number; order_count: number }>();

    for (const o of buyOrders || []) {
      const rem = o.quantity - o.filled_quantity;
      if (rem <= 0) continue;
      const e = bidMap.get(o.price) || { total_quantity: 0, order_count: 0 };
      e.total_quantity += rem; e.order_count += 1;
      bidMap.set(o.price, e);
    }
    for (const o of sellOrders || []) {
      const rem = o.quantity - o.filled_quantity;
      if (rem <= 0) continue;
      const e = askMap.get(o.price) || { total_quantity: 0, order_count: 0 };
      e.total_quantity += rem; e.order_count += 1;
      askMap.set(o.price, e);
    }

    const bids = Array.from(bidMap.entries()).map(([price, data]) => ({ price, ...data })).sort((a, b) => b.price - a.price);
    const asks = Array.from(askMap.entries()).map(([price, data]) => ({ price, ...data })).sort((a, b) => a.price - b.price);

    res.json({
      market_id: marketId,
      bids,
      asks,
      best_bid: bids[0]?.price || null,
      best_ask: asks[0]?.price || null,
      spread: (bids[0] && asks[0]) ? asks[0].price - bids[0].price : null,
    });
  } catch (error) {
    console.error('Get orderbook error:', error);
    res.status(500).json({ error: { code: 'ORDERBOOK_FAILED', message: 'Failed to get order book', timestamp: new Date().toISOString() } });
  }
});

router.get('/:marketId/orders', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const marketId = req.params.marketId;
    const { status } = req.query;

    let query = supabase.from('orders').select('*').eq('market_id', marketId).eq('user_id', user.id).order('created_at', { ascending: false });
    if (status) query = query.eq('status', String(status));

    const { data: orders, error } = await query;
    if (error) throw error;
    res.json({ orders: orders || [] });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ error: { code: 'GET_ORDERS_FAILED', message: 'Failed to get orders', timestamp: new Date().toISOString() } });
  }
});

router.get('/:marketId/trades', async (req: Request, res: Response) => {
  try {
    const marketId = req.params.marketId;
    const { data: trades, error } = await supabase.from('trades').select('*').eq('market_id', marketId).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    res.json({ trades: trades || [] });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: { code: 'GET_TRADES_FAILED', message: 'Failed to get trades', timestamp: new Date().toISOString() } });
  }
});

router.get('/:marketId/open-orders', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const marketId = req.params.marketId;

    const { data: orders, error } = await supabase.from('orders')
      .select('*').eq('market_id', marketId).eq('user_id', user.id)
      .in('status', ['waiting', 'partial']).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ orders: orders || [] });
  } catch (error) {
    console.error('Get open orders error:', error);
    res.status(500).json({ error: { code: 'GET_OPEN_ORDERS_FAILED', message: 'Failed to get open orders', timestamp: new Date().toISOString() } });
  }
});

export default router;
