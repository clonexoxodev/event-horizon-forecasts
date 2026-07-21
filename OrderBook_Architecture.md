# FLIPPE ORDER BOOK + MATCHING ENGINE — COMPLETE ARCHITECTURE

## 1. EXECUTIVE SUMMARY

This document defines the complete replacement of Flippe's pool-based (parimutuel) payout engine with a production-grade Order Book + Matching Engine. The design preserves all existing systems (auth, wallet, Flutterwave, Protected Markets, admin, notifications, audit logs) while introducing order-based trading with FIFO matching, partial fills, locked balances, and deterministic settlement.

---

## 2. CURRENT SYSTEM ANALYSIS

### 2.1 What Exists Today
- **Parimutuel pool model**: Users bet into shared YES/NO pools. Winners split losers' money proportionally.
- **Instant positions**: Bet → immediate position with shares calculated from pool ratio.
- **Payout formula**: `payout = stake + (shares / total_winning_shares) * total_losing_stake`
- **No order book**: No individual orders, no matching queue, no waiting states.
- **Wallet model**: `balance` (total), `available` (spendable), `locked` (withdrawals only). `locked` columns exist but are NEVER written by code.

### 2.2 What Must Change
| Current | New |
|---------|-----|
| Pool-ratio pricing `yesPool / totalPool * 100` | Best bid/ask from order book |
| Instant position on bet | Order enters queue → waits for match |
| Fixed "Estimated Return" in UI | Dynamic "Estimated Entry Price" + "Order Status" |
| `shares = amount / price` at pool ratio | `shares = matched_amount / match_price` |
| Winners split losers' money | Each matched pair has independent settlement |
| `positions` table (one per bet) | `orders` table + `order_fills` table + `trades` table |
| `locked_ngn_kobo` never used | Properly tracks waiting order funds |

### 2.3 What Must NOT Change
- Authentication (JWT + cookies)
- Flutterwave payment integration
- Protected Market activation system
- Admin roles (user/admin/super_admin)
- Notification system
- Audit trail logging
- Wallet deposit/withdrawal flow (except locked balance)
- Market creation and lifecycle (except resolution logic)

---

## 3. NEW DATABASE SCHEMA

### 3.1 New Tables

```sql
-- ============================================================
-- TABLE: orders
-- Individual order in the order book
-- ============================================================
CREATE TABLE orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id       text NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  
  -- Order details
  side            text NOT NULL CHECK (side IN ('YES', 'NO')),
  order_type      text NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
  price           bigint NOT NULL CHECK (price > 0 AND price < 100), -- price in kobo (1-99)
  quantity        bigint NOT NULL CHECK (quantity > 0), -- total quantity in kobo
  
  -- Fill tracking
  filled_quantity bigint NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0),
  remaining_quantity bigint GENERATED ALWAYS AS (quantity - filled_quantity) STORED,
  
  -- State
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',       -- just created, not yet in book
    'waiting',       -- in the book, waiting to be matched
    'partial',       -- partially matched, remainder in book
    'filled',        -- fully matched
    'cancelled',     -- cancelled by user or admin
    'refunded',      -- unmatched portion refunded at resolution
    'expired'        -- expired without match
  )),
  
  -- Money tracking
  locked_amount   bigint NOT NULL DEFAULT 0, -- kobo locked for this order
  filled_amount   bigint NOT NULL DEFAULT 0, -- kobo worth of fills received
  
  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  filled_at       timestamptz,
  cancelled_at    timestamptz,
  
  -- Metadata
  source          text NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'admin', 'system')),
  metadata        jsonb
);

-- Priority queue index: price DESC (best price first), then created_at ASC (FIFO)
CREATE INDEX idx_orders_market_status_side ON orders(market_id, status, side, price DESC, created_at ASC);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_market_id ON orders(market_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

```sql
-- ============================================================
-- TABLE: order_fills
-- Individual fill events (one row per partial/full match)
-- ============================================================
CREATE TABLE order_fills (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Which order was filled
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id       text NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  
  -- Fill details
  side            text NOT NULL CHECK (side IN ('YES', 'NO')),
  order_type      text NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
  fill_price      bigint NOT NULL CHECK (fill_price > 0 AND fill_price < 100),
  fill_quantity   bigint NOT NULL CHECK (fill_quantity > 0),
  
  -- The matching order
  matched_order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  matched_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Position created from this fill
  position_id     uuid, -- FK added after positions table is altered
  
  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fills_order_id ON order_fills(order_id);
CREATE INDEX idx_fills_market_id ON order_fills(market_id);
CREATE INDEX idx_fills_user_id ON order_fills(user_id);
CREATE INDEX idx_fills_position_id ON order_fills(position_id);
CREATE INDEX idx_fills_created_at ON order_fills(created_at);
```

```sql
-- ============================================================
-- TABLE: trades
-- Aggregated trade record (one row per match event between two orders)
-- ============================================================
CREATE TABLE trades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id       text NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  
  -- The two sides of the trade
  buy_order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sell_order_id   uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Trade details
  side            text NOT NULL CHECK (side IN ('YES', 'NO')), -- which side was traded
  trade_price     bigint NOT NULL CHECK (trade_price > 0 AND trade_price < 100),
  trade_quantity  bigint NOT NULL CHECK (trade_quantity > 0),
  
  -- Fee tracking
  fee_smallest_unit bigint NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trades_market_id ON trades(market_id);
CREATE INDEX idx_trades_buy_order_id ON trades(buy_order_id);
CREATE INDEX idx_trades_sell_order_id ON trades(sell_order_id);
CREATE INDEX idx_trades_created_at ON trades(created_at);
```

```sql
-- ============================================================
-- TABLE: order_book_snapshot
-- Periodic snapshots of order book depth for charts/analytics
-- ============================================================
CREATE TABLE order_book_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id       text NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  
  -- Book depth at snapshot time
  best_bid_price  bigint,
  best_bid_quantity bigint,
  best_ask_price  bigint,
  best_ask_quantity bigint,
  spread          bigint,
  
  -- Aggregated depth
  bid_depth       jsonb, -- [{price: 60, quantity: 5000}, ...]
  ask_depth       jsonb, -- [{price: 61, quantity: 3000}, ...]
  
  -- Mid price and last trade
  mid_price       numeric,
  last_trade_price bigint,
  last_trade_at   timestamptz,
  
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_snapshots_market_id ON order_book_snapshots(market_id);
CREATE INDEX idx_snapshots_created_at ON order_book_snapshots(created_at);
```

```sql
-- ============================================================
-- TABLE: settlement_ledger
-- Records every settlement event (payout, refund, loss)
-- ============================================================
CREATE TABLE settlement_ledger (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id       text NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Settlement details
  settlement_type text NOT NULL CHECK (settlement_type IN ('payout', 'refund', 'loss', 'partial_refund')),
  position_id     uuid, -- FK to positions
  order_id        uuid REFERENCES orders(id),
  
  -- Money
  amount_smallest_unit bigint NOT NULL,
  currency        text NOT NULL DEFAULT 'NGN',
  
  -- References
  transaction_id  uuid, -- FK to transactions
  
  -- Metadata
  details         jsonb,
  
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_settlement_market ON settlement_ledger(market_id);
CREATE INDEX idx_settlement_user ON settlement_ledger(user_id);
CREATE INDEX idx_settlement_type ON settlement_ledger(settlement_type);
```

### 3.2 Modifications to Existing Tables

```sql
-- ============================================================
-- MARKETS TABLE: Add order book columns
-- ============================================================
ALTER TABLE markets ADD COLUMN IF NOT EXISTS 
  pricing_model text NOT NULL DEFAULT 'orderbook'; -- 'pool' | 'orderbook'

-- Order book state
ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  best_bid_price bigint; -- current best bid (highest buy)
ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  best_ask_price bigint; -- current best ask (lowest sell)
ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  last_trade_price bigint; -- last executed trade price
ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  last_trade_at timestamptz;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  total_orders_count integer NOT NULL DEFAULT 0;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  matched_volume_smallest_unit bigint NOT NULL DEFAULT 0;

-- Exposure limits (admin-configurable)
ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  max_exposure_per_user_smallest_unit bigint DEFAULT 100000000; -- ₦1,000,000
ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  max_exposure_per_side_smallest_unit bigint DEFAULT 500000000; -- ₦5,000,000
ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  max_imbalance_ratio numeric DEFAULT 3.0; -- max YES:NO ratio
ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  max_order_size_smallest_unit bigint DEFAULT 50000000; -- ₦500,000
ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  max_daily_exposure_smallest_unit bigint DEFAULT 200000000; -- ₦2,000,000
```

```sql
-- ============================================================
-- POSITIONS TABLE: Add order reference
-- ============================================================
ALTER TABLE positions ADD COLUMN IF NOT EXISTS
  order_id uuid REFERENCES orders(id);
ALTER TABLE positions ADD COLUMN IF NOT EXISTS
  fill_id uuid REFERENCES order_fills(id);
```

```sql
-- ============================================================
-- WALLETS TABLE: Activate locked columns
-- ============================================================
-- locked_ngn_kobo and locked_usd_cents already exist
-- They will now be actively used for waiting orders
-- Add constraint: available = balance - locked (must hold)
-- This is enforced in application code via transactions
```

```sql
-- ============================================================
-- TRANSACTIONS TABLE: Add new types
-- ============================================================
-- New transaction types: 'order_lock', 'order_unlock', 'order_fill', 'settlement_payout', 'settlement_refund'
-- New directions: 'LOCK', 'UNLOCK' (in addition to IN, OUT, RELEASE)
```

---

## 4. ORDER LIFECYCLE

### 4.1 Order States
```
pending → waiting → partial → filled
                    ↓
                  waiting → cancelled → refunded (at resolution)
                    ↓
                  expired
```

### 4.2 Detailed State Transitions

**PENDING**: Order created, wallet debited, funds locked.
```
User submits order
→ Validate: price, quantity, balance, exposure limits
→ Lock funds: available -= quantity, locked += quantity
→ Insert into orders (status='pending')
→ Run matching engine
→ Update status to 'waiting', 'partial', or 'filled'
```

**WAITING**: Order is in the book, no match yet.
```
Order placed in book sorted by:
  1. Price priority (best price first)
  2. Time priority (earlier first)
  
Visible in order book depth display.
Can be cancelled by user or admin.
```

**PARTIAL**: Some quantity matched, rest still waiting.
```
A portion was matched against opposing orders.
filled_quantity > 0 AND remaining_quantity > 0
New fills create positions and trades.
Order remains in book with reduced quantity.
```

**FILLED**: Entire quantity matched.
```
All quantity has been matched.
filled_quantity = quantity
Order removed from book.
Status = 'filled', filled_at = now().
```

**CANCELLED**: Order removed from book.
```
Only possible if status = 'waiting' or 'partial'.
Unmatched quantity is refunded.
locked_amount for remaining quantity → unlocked.
available += remaining_quantity, locked -= remaining_quantity.
```

**REFUNDED**: Unmatched portion refunded at resolution.
```
When market resolves, all waiting/partial orders
have their remaining quantity refunded.
locked → available.
```

---

## 5. MATCHING ENGINE

### 5.1 Algorithm
```
FUNCTION matchOrder(newOrder):
  IF newOrder.side == 'YES' AND newOrder.order_type == 'BUY':
    // Looking for SELL YES orders (people selling YES)
    // or equivalently BUY NO orders at (100 - price)
    opposingSide = 'YES'
    opposingType = 'SELL'
    sortDirection = 'ASC' // lowest ask first
    
  ELIF newOrder.side == 'YES' AND newOrder.order_type == 'SELL':
    opposingSide = 'YES'  
    opposingType = 'BUY'
    sortDirection = 'DESC' // highest bid first
    
  ELIF newOrder.side == 'NO' AND newOrder.order_type == 'BUY':
    // BUY NO = SELL YES at (100 - price)
    opposingSide = 'YES'
    opposingType = 'SELL'
    sortDirection = 'ASC'
    // Transform: BUY NO @ price → SELL YES @ (100 - price)
    
  ELIF newOrder.side == 'NO' AND newOrder.order_type == 'SELL':
    // SELL NO = BUY YES at (100 - price)
    opposingSide = 'YES'
    opposingType = 'BUY'
    sortDirection = 'DESC'

  // Find matching opposing orders
  opposingOrders = SELECT * FROM orders
    WHERE market_id = newOrder.market_id
      AND side = opposingSide
      AND order_type = opposingType
      AND status IN ('waiting', 'partial')
      AND price matches (price compatibility check)
    ORDER BY price {sortDirection}, created_at ASC  -- FIFO within same price

  FOR EACH opposingOrder IN opposingOrders:
    IF newOrder.remaining_quantity <= 0: BREAK
    
    // Price compatibility check
    IF NOT pricesCompatible(newOrder, opposingOrder): BREAK
    
    // Calculate match quantity
    matchQty = MIN(newOrder.remaining_quantity, opposingOrder.remaining_quantity)
    matchPrice = opposingOrder.price  // Maker gets priority price
    
    // Execute match
    executeMatch(newOrder, opposingOrder, matchPrice, matchQty)
    
    // Update orders
    newOrder.filled_quantity += matchQty
    opposingOrder.filled_quantity += matchQty
    
    IF newOrder.remaining_quantity <= 0:
      newOrder.status = 'filled'
      newOrder.filled_at = now()
      
    IF opposingOrder.remaining_quantity <= 0:
      opposingOrder.status = 'filled'
      opposingOrder.filled_at = now()
    ELSE:
      opposingOrder.status = 'partial'

  // If new order still has remaining quantity
  IF newOrder.remaining_quantity > 0:
    IF newOrder.status == 'pending':
      newOrder.status = 'waiting'  // Enter the book
    ELSE:
      newOrder.status = 'partial'
  ELSE:
    newOrder.status = 'filled'
    
  // Update market best bid/ask
  updateMarketOrderBook(newOrder.market_id)
```

### 5.2 Price Compatibility
```
FUNCTION pricesCompatible(buyOrder, sellOrder):
  // BUY YES @ 60 matches SELL YES @ 60 or lower
  // BUY NO @ 40 matches SELL NO @ 40 or lower
  // Cross-side: BUY YES @ 60 matches against SELL YES @ 61? NO
  // Cross-side: BUY YES @ 60 matches against SELL YES @ 59? YES ( buyer pays more)
  
  IF buyOrder.order_type == 'BUY':
    return buyOrder.price >= sellOrder.price  // Buyer willing to pay at least seller wants
  ELSE:
    return buyOrder.price <= sellOrder.price  // Seller willing to accept at most buyer offers
```

### 5.3 Deterministic Matching Rules
1. **Price priority**: Best price executes first (highest bid, lowest ask)
2. **Time priority**: Earlier orders at same price execute first (FIFO)
3. **No randomness**: Same inputs always produce same outputs
4. **Partial fills**: Any quantity can match, no minimum
5. **Independent orders**: Never merge multiple user orders
6. **Atomic execution**: Each match is a single database transaction

### 5.4 Example
```
BOOK STATE (YES side):
  SELL YES @ ₦70: ₦3,000  (User C)
  SELL YES @ ₦65: ₦5,000  (User D)
  BUY YES @ ₦60:  ₦10,000 (User A)
  BUY YES @ ₦55:  ₦2,000  (User B)

NEW ORDER: BUY YES @ ₦65: ₦8,000 (User E)

MATCHING:
1. Match against SELL YES @ ₦65 (User D): ₦5,000 @ ₦65
   → User E gets 5,000 kobo YES @ ₦65
   → User D sells 5,000 kobo YES @ ₦65
   → User E remaining: ₦3,000

2. Match against SELL YES @ ₦70 (User C): ₦3,000 @ ₦70
   → User E gets 3,000 kobo YES @ ₦70
   → User C sells 3,000 kobo YES @ ₦70
   → User E remaining: ₦0

RESULT:
  User E: status='filled', 8,000 kobo YES bought
  User D: status='filled', 5,000 kobo YES sold
  User C: status='partial', 2,000 kobo YES remaining
  User A: unchanged, still waiting
  User B: unchanged, still waiting

NEW BOOK STATE:
  SELL YES @ ₦70: ₦2,000  (User C, partial)
  BUY YES @ ₦60:  ₦10,000 (User A)
  BUY YES @ ₦55:  ₦2,000  (User B)
```

---

## 6. WALLET INTEGRATION

### 6.1 New Balance Model
```
wallet.balance_ngn_kobo     = total money in wallet
wallet.available_ngn_kobo   = spendable right now
wallet.locked_ngn_kobo      = locked in waiting orders

INVARIANT: balance = available + locked + (pending_withdrawals)
```

### 6.2 Order Placement
```
1. Validate: available >= orderQuantity
2. Lock: UPDATE wallets SET 
     available_ngn_kobo = available_ngn_kobo - quantity,
     locked_ngn_kobo = locked_ngn_kobo + quantity
   WHERE user_id = X AND available_ngn_kobo >= quantity
   -- Atomic SQL update, no read-then-write
3. Create order record
4. Run matching engine
5. On fill: locked → (position or refund)
```

### 6.3 On Match (Fill)
```
For buyer:
  locked -= fillQuantity
  (buyer now owns a position, not cash)
  
For seller:
  locked -= fillQuantity
  available += (fillQuantity * fillPrice / 100)
  (seller receives cash minus their cost)
```

### 6.4 On Cancel
```
1. remaining_quantity > 0 required
2. Unlock: UPDATE wallets SET
     available_ngn_kobo = available_ngn_kobo + remaining,
     locked_ngn_kobo = locked_ngn_kobo - remaining
3. Update order status = 'cancelled'
```

### 6.5 On Resolution (Unmatched Orders)
```
For each waiting/partial order:
  1. Unlock remaining: available += remaining, locked -= remaining
  2. Status → 'refunded'
  3. Create settlement_ledger record
```

---

## 7. POSITION CREATION

### 7.1 From Order Fill
Each fill creates a position entry (or updates existing one per user per market per side):
```
position.user_id = fill.user_id
position.market_id = fill.market_id
position.side = fill.side
position.order_id = fill.order_id
position.fill_id = fill.id
position.amount_smallest_unit += fill.fill_quantity
position.shares_received += (fill.fill_quantity * 100 / fill.fill_price)
position.entry_price = weighted_average(all fills for this position)
position.status = 'active'
```

### 7.2 Position Aggregation
Multiple fills from different orders aggregate into one position per user per market per side:
```
User buys YES in 3 separate fills:
  Fill 1: ₦3,000 @ ₦60 → 5,000 shares
  Fill 2: ₦2,000 @ ₦65 → 3,077 shares
  Fill 3: ₦1,000 @ ₦70 → 1,429 shares

Position:
  amount = ₦6,000
  shares = 9,506
  entry_price = ₦6,000 / 9,506 * 100 = ₦63.12 (weighted avg)
```

---

## 8. MARKET RESOLUTION

### 8.1 Resolution Flow
```
1. Admin selects winning side: YES, NO, or REFUND
2. For YES winners:
   - Every matched YES position pays out: shares * ₦100 / 100 = shares kobo
   - Actually: position.shares * 1 = payout in kobo (each share = 1 kobo of value at resolution)
   
3. For NO winners:
   - Same logic for NO positions

4. For unmatched orders (waiting/partial):
   - Remaining quantity refunded to available balance
   - locked -= remaining, available += remaining
   
5. Market state → 'resolved'
```

### 8.2 Settlement Formula
```
WINNER payout = position.shares * 1 (each share = ₦1 at resolution)
LOSING position = 0 payout, stake lost
UNMATCHED order = full remaining refund

Example:
  User A: BUY YES @ ₦60, ₦6,000 total, 10,000 shares
  User B: BUY NO @ ₦40, ₦4,000 total, 10,000 shares
  
  Market resolves YES:
    User A: wins → payout = 10,000 shares * 1 = ₦100 kobo per share
             Actually: each share bought at ₦60 kobo, pays ₦100 kobo
             Profit = 10,000 * (100 - 60) = ₦400 kobo
             Total payout = ₦10,000 kobo (share * 100 / 100)
    User B: loses → payout = 0
```

### 8.3 Refund Resolution
```
Market resolved as REFUND:
  ALL positions (won or not) get full stake back
  ALL unmatched orders get remaining refunded
  
  For matched positions:
    payout = position.amount_smallest_unit (full stake back)
    
  For unmatched orders:
    remaining_quantity refunded to available balance
```

---

## 9. PROTECTED MARKET INTEGRATION

### 9.1 Pre-Activation Behavior
When `protected_market_enabled = true`:
- Users can still place orders (up to `protected_max_stake_smallest_unit` per user)
- Orders enter the book but market shows "pre-activation" status
- Matching still occurs (to build liquidity)
- If activation thresholds NOT met by close_date:
  - Cancel ALL waiting orders
  - Refund ALL unmatched quantities
  - Refund ALL matched positions (full stake back)
  - Market status → 'refunded'

### 9.2 Activation Check
```
Activation requirements:
  totalMatchedVolume >= activation_threshold
  yesMatchedVolume >= activation_yes_min
  noMatchedVolume >= activation_no_min
  uniqueParticipants >= activation_min_participants

On each new trade, check if activation thresholds are now met.
If yes: market.activation_state → 'live'
```

### 9.3 Post-Activation
- Exposure limits enforced
- Order size limits enforced
- Normal resolution flow applies

---

## 10. EXPOSURE PROTECTION

### 10.1 Per-User Limits
```
On order placement:
  userExposure = SUM(orders.locked_amount) WHERE user_id = X AND status IN ('waiting', 'partial')
  
  IF userExposure + newOrder.quantity > market.max_exposure_per_user:
    REJECT order
    
  dailyExposure = SUM(orders.quantity) WHERE user_id = X AND created_at > today_start
  IF dailyExposure + newOrder.quantity > market.max_daily_exposure:
    REJECT order
```

### 10.2 Per-Side Limits
```
  yesExposure = SUM(orders.locked_amount) WHERE side='YES' AND status IN ('waiting','partial')
  noExposure = SUM(orders.locked_amount) WHERE side='NO' AND status IN ('waiting','partial')
  
  IF yesExposure + newOrder.quantity > market.max_exposure_per_side AND newOrder.side='YES':
    REJECT
    
  IF max_imbalance_ratio > 0:
    IF yesExposure / MAX(noExposure, 1) > max_imbalance_ratio AND newOrder.side='YES':
      REJECT
```

### 10.3 Order Size Limits
```
  IF newOrder.quantity > market.max_order_size:
    REJECT
```

---

## 11. API ENDPOINTS

### 11.1 New Endpoints (Added to api/index.ts)

```
POST   /api/markets/:id/orders          - Place new order
GET    /api/markets/:id/orderbook        - Get order book depth
GET    /api/markets/:id/orders           - Get user's orders for market
DELETE /api/markets/:id/orders/:orderId  - Cancel waiting order (user)
GET    /api/markets/:id/trades           - Get recent trades
GET    /api/markets/:id/fills            - Get user's fills

GET    /api/orders                        - Get all user orders across markets
GET    /api/orders/:orderId               - Get single order detail
GET    /api/orders/:orderId/fills         - Get fills for an order

POST   /api/admin/markets/:id/matching/pause   - Pause matching (Super Admin only)
POST   /api/admin/markets/:id/matching/resume  - Resume matching
GET    /api/admin/markets/:id/exposure         - Get exposure summary
GET    /api/admin/markets/:id/liquidity        - Get liquidity summary
GET    /api/admin/markets/:id/settlement-preview - Get settlement preview
```

### 11.2 Modified Endpoints

```
POST /api/markets/:id/predictions → POST /api/markets/:id/orders
  (backward compatible: old {side, amount} creates a BUY order at market price)

GET /api/markets/:id → includes order book depth, best bid/ask, spread
GET /api/user/balance → includes locked balance breakdown
POST /api/admin/markets/:id/resolve → uses new settlement logic
```

### 11.3 Order Book Depth Response
```json
{
  "marketId": "will-btc-hit-100k",
  "bestBid": 62,
  "bestAsk": 65,
  "spread": 3,
  "midPrice": 63.5,
  "lastTradePrice": 63,
  "bids": [
    {"price": 62, "quantity": 15000, "orderCount": 3},
    {"price": 61, "quantity": 8000, "orderCount": 2},
    {"price": 60, "quantity": 25000, "orderCount": 5}
  ],
  "asks": [
    {"price": 65, "quantity": 10000, "orderCount": 2},
    {"price": 66, "quantity": 12000, "orderCount": 4},
    {"price": 67, "quantity": 5000, "orderCount": 1}
  ]
}
```

### 11.4 Order Response
```json
{
  "orderId": "uuid",
  "marketId": "will-btc-hit-100k",
  "side": "YES",
  "orderType": "BUY",
  "price": 62,
  "quantity": 10000,
  "filledQuantity": 7000,
  "remainingQuantity": 3000,
  "status": "partial",
  "lockedAmount": 10000,
  "filledAmount": 7000,
  "fills": [
    {
      "fillId": "uuid",
      "fillPrice": 62,
      "fillQuantity": 5000,
      "counterparty": "user_xxx",
      "createdAt": "2026-07-21T..."
    },
    {
      "fillId": "uuid", 
      "fillPrice": 63,
      "fillQuantity": 2000,
      "counterparty": "user_yyy",
      "createdAt": "2026-07-21T..."
    }
  ],
  "createdAt": "2026-07-21T..."
}
```

---

## 12. FRONTEND CHANGES

### 12.1 Prediction Slip Replacement

**REMOVE** (all instances):
- "Estimated Return" with fixed ₦ amount
- "Estimated Profit" with fixed ₦ amount
- Pool-ratio payout calculations
- `calculatePotentialReturn()` calls
- "Returns may change as market activity changes" disclaimer

**REPLACE WITH**:
```
┌─────────────────────────────────────┐
│ Place Order                         │
│                                     │
│ Side: [YES] [NO]                    │
│                                     │
│ Order Type: [Limit Order]           │
│                                     │
│ Price: ₦___  (1-99)                │
│ ↳ Current best ask: ₦65            │
│                                     │
│ Amount: ₦___                       │
│ ↳ You'll receive ~___ shares       │
│                                     │
│ ─── Order Summary ──────────────── │
│ Order Value:       ₦10,000         │
│ Est. Entry Price:  ₦63.50          │
│ Current Market:    ₦64/₦66         │
│ Spread:            ₦2              │
│ Est. Shares:       ~15,748         │
│ Status:            Waiting         │
│ ────────────────────────────────── │
│                                     │
│ Settlement occurs after matching    │
│ and market resolution.              │
│                                     │
│ [Place Order]                       │
└─────────────────────────────────────┘
```

### 12.2 Market Card Changes

**REMOVE**:
- "₦{pool} pool" display
- Fixed odds percentages as primary display

**REPLACE WITH**:
```
┌─────────────────────────────────────┐
│ Will BTC hit $100K?                 │
│                                     │
│ [YES ₦62] [NO ₦38]                │
│                                     │
│ Spread: ₦3 | Last: ₦63             │
│ 45 orders | ₦250K volume           │
│                                     │
│ ████████░░░░ 65% protected          │
│ Closes in 2 days                    │
└─────────────────────────────────────┘
```

### 12.3 Market Detail Changes

Add order book visualization:
```
┌─────────────────────────────────────────────┐
│ Order Book                                  │
│                                             │
│ SELL (NO side)    │  BUY (YES side)         │
│ ───────────────── │ ─────────────────────── │
│ ₦68  ▓▓░░  5,000 │  ₦62  ▓▓▓▓▓▓  15,000  │
│ ₦67  ▓▓▓░  8,000 │  ₦61  ▓▓░░░   8,000   │
│ ₦66  ▓▓▓▓ 12,000 │  ₦60  ▓▓▓▓▓▓▓ 25,000  │
│ ₦65  ▓▓░░ 10,000 │  ₦59  ▓░░      3,000  │
│                   │                        │
│ Spread: ₦3       │ Last trade: ₦63         │
└─────────────────────────────────────────────┘
```

### 12.4 Dashboard/Portfolio Changes

**REMOVE**:
- Pool-based "Current Value" calculation
- Pool-based P/L calculation
- `getPredictionInsight()` pool formula fallback

**REPLACE WITH**:
```
┌─────────────────────────────────────┐
│ My Position: YES                    │
│ Status: Partially Matched (60%)     │
│                                     │
│ Total Order:     ₦10,000           │
│ Matched:         ₦6,000 (60%)     │
│ Waiting:         ₦4,000 (40%)     │
│ Avg Entry:       ₦62.50           │
│ Current Price:   ₦64              │
│ Unrealized P/L:  +₦240 (est.)     │
│                                     │
│ [View Fills] [Cancel Waiting]       │
└─────────────────────────────────────┘
```

### 12.5 Wallet Display Changes

```
┌─────────────────────────────────────┐
│ Wallet                              │
│                                     │
│ Total Balance:     ₦50,000         │
│ Available:         ₦35,000         │
│ Locked (orders):   ₦15,000         │
│ Pending Refunds:   ₦0              │
│                                     │
│ [Deposit] [Withdraw]                │
└─────────────────────────────────────┘
```

### 12.6 Files to Modify

| File | Changes |
|------|---------|
| `src/lib/api.ts` | Add order endpoints, remove pool payout methods, add order types |
| `src/lib/types.ts` | Add Order, Fill, Trade, OrderBook types |
| `src/lib/market-pricing.ts` | Replace pool pricing with order book mid-price |
| `src/lib/markets.ts` | Remove pool-based activation check, add order book state |
| `src/lib/positions.ts` | Remove `calculateEstimatedValue()` pool formula |
| `src/lib/market-state.tsx` | Add order book state, remove optimistic pool updates |
| `src/components/prediction/ForecastSlip.tsx` | Complete rewrite for order placement |
| `src/components/prediction/MarketCard.tsx` | Replace pool display with order book stats |
| `src/components/prediction/MyBetsCard.tsx` | Show order status, fills, waiting amounts |
| `src/components/prediction/SellPositionModal.tsx` | Create SELL order instead of P2P listing |
| `src/components/prediction/PlaceBetModal.tsx` | Complete rewrite for order book |
| `src/pages/MarketDetail.tsx` | Add order book depth display, replace pool UI |
| `src/pages/Dashboard.tsx` | Replace pool-based position values |
| `src/pages/Profile.tsx` | Update portfolio stats |
| `src/components/admin/MarketsView.tsx` | Add order book stats, exposure display |
| `src/components/admin/MarketDetailView.tsx` | Add order book management, exposure limits |
| `src/components/admin/FinanceView.tsx` | Add locked balance tracking |
| `src/components/admin/types.ts` | Add order book admin types |

---

## 13. BACKEND CHANGES

### 13.1 New Files
```
backend/src/services/order-book.service.ts     - Order book logic
backend/src/services/matching.engine.ts        - Matching algorithm
backend/src/services/settlement.service.ts     - Resolution/settlement
backend/src/services/exposure.service.ts       - Exposure limit checks
backend/src/repositories/order.repository.ts   - Order CRUD
backend/src/repositories/fill.repository.ts    - Fill records
backend/src/repositories/trade.repository.ts   - Trade records
backend/src/repositories/settlement.repository.ts - Settlement ledger
```

### 13.2 Modified Files
```
backend/api/index.ts                    - Add order routes, modify resolution
backend/src/services/wallet.service.ts  - Add lock/unlock methods
backend/src/repositories/wallet.repository.ts - Atomic balance operations
```

### 13.3 Atomic Balance Operations (CRITICAL FIX)
```sql
-- CURRENT (race condition risk):
-- Read balance in JS, calculate new value, write back

-- NEW (atomic):
UPDATE wallets SET
  available_ngn_kobo = available_ngn_kobo - $1,
  locked_ngn_kobo = locked_ngn_kobo + $1,
  updated_at = now()
WHERE user_id = $2 
  AND available_ngn_kobo >= $1
  AND currency = 'NGN'
RETURNING *;
-- If RETURNING is empty, insufficient balance
```

---

## 14. SECURITY REQUIREMENTS

### 14.1 Race Condition Prevention
- All balance operations use atomic SQL `UPDATE ... WHERE available >= $1`
- Order matching uses `SELECT ... FOR UPDATE` (row-level lock)
- Single database transaction per match operation

### 14.2 Double-Match Prevention
- Each order has unique ID, each fill references specific order
- `filled_quantity` monotonically increases, never decreases
- `status` transitions are enforced (can't go from 'filled' to 'waiting')

### 14.3 Double-Settlement Prevention
- `settlement_ledger` records every payout/refund
- Market resolution checks `status != 'resolved'` before proceeding
- Position payout checks `settled_at IS NULL` before crediting

### 14.4 Duplicate Webhook Prevention
- Flutterwave webhook `idempotency_key` already exists
- Add `idempotency_key` to order placement (prevent duplicate orders)

### 14.5 Negative Balance Prevention
- `CHECK (available_ngn_kobo >= 0)` constraint (add to schema)
- Atomic `WHERE available >= quantity` prevents overspend

---

## 15. MIGRATION STRATEGY

### Phase 1: Schema Migration (Non-Breaking)
1. Create new tables: `orders`, `order_fills`, `trades`, `order_book_snapshots`, `settlement_ledger`
2. Add new columns to existing tables
3. Create database functions for atomic operations
4. **Do NOT remove any existing columns or tables**
5. Deploy and verify

### Phase 2: Backend Engine (Non-Breaking)
1. Implement matching engine service
2. Implement order book service
3. Implement settlement service
4. Implement exposure service
5. Add new API endpoints alongside existing ones
6. Existing pool endpoints continue to work
7. Deploy and verify

### Phase 3: Dual-Mode Activation
1. Add `pricing_model` column to markets (default 'pool')
2. New markets created with `pricing_model = 'orderbook'`
3. Existing markets continue with pool model
4. Backend routes detect pricing_model and use appropriate engine
5. Deploy and verify

### Phase 4: Frontend Migration
1. Add order book components (new)
2. Modify prediction slip (order placement)
3. Add order book depth visualization
4. Modify position display (order status)
5. Modify wallet display (locked balance)
6. Remove pool-payout displays
7. Deploy and verify

### Phase 5: Existing Market Migration
1. For each existing active market:
   a. Freeze trading momentarily
   b. Calculate current pool state
   c. Create synthetic orders from existing positions
   d. Set pricing_model = 'orderbook'
   e. Resume trading
2. Admin can trigger per-market migration
3. Deploy and verify

### Phase 6: Cleanup
1. Remove dead pool-payout code
2. Archive old pool-related functions
3. Remove `market-pricing.ts` pool formulas
4. Clean up unused columns (mark as deprecated, don't drop yet)
5. Deploy and verify

---

## 16. PERFORMANCE CONSIDERATIONS

### 16.1 Indexing Strategy
- Primary lookup: `market_id + status + side + price DESC + created_at ASC`
- User orders: `user_id + status`
- Fill lookup: `order_id`
- Trade history: `market_id + created_at`

### 16.2 Query Optimization
- Order book depth: Materialized view refreshed on each trade
- User exposure: Cached in wallet record, updated atomically
- Market stats: Updated in same transaction as trade

### 16.3 Scaling for 10K Users
- Each market has its own order book (isolated)
- Matching engine processes one order at a time per market
- Database handles concurrency via row-level locks
- No in-memory state required (pure database)

### 16.4 Caching Strategy
- Order book depth: Cached in Redis/memory, refreshed on trade
- Best bid/ask: Stored in markets table, updated atomically
- User exposure: Computed from orders table with index

---

## 17. IMPLEMENTATION ORDER

### Sprint 1: Foundation (Days 1-3)
1. Create database migration (all new tables + columns)
2. Implement atomic wallet operations
3. Implement order repository
4. Implement basic matching engine

### Sprint 2: Core Engine (Days 4-6)
1. Implement order book service
2. Implement fill/trade recording
3. Implement exposure checks
4. Add order API endpoints
5. Write comprehensive tests

### Sprint 3: Settlement (Days 7-8)
1. Implement settlement service
2. Integrate with market resolution
3. Implement refund logic for unmatched orders
4. Test settlement edge cases

### Sprint 4: Frontend - Order Placement (Days 9-11)
1. Rewrite ForecastSlip for order book
2. Rewrite PlaceBetModal for order book
3. Add order book depth visualization to MarketDetail
4. Test order placement flow

### Sprint 5: Frontend - Portfolio & Display (Days 12-14)
1. Update Dashboard position display
2. Update MyBetsCard with order status
3. Update MarketCard with order book stats
4. Update wallet display with locked balance
5. Update Profile portfolio stats

### Sprint 6: Admin & Polish (Days 15-17)
1. Add admin order book management
2. Add exposure monitoring dashboard
3. Add settlement preview for admins
4. Migration tool for existing markets
5. End-to-end testing

### Sprint 7: Security & Hardening (Days 18-20)
1. Race condition testing
2. Double-match prevention testing
3. Load testing with concurrent orders
4. Security audit
5. Final deployment

---

## 18. RISK MITIGATION

| Risk | Mitigation |
|------|------------|
| Race conditions on balance | Atomic SQL operations, row-level locks |
| Double settlement | Settlement ledger idempotency checks |
| Matching engine bugs | Comprehensive test suite, admin pause capability |
| Performance at scale | Indexing strategy, per-market isolation |
| Data migration errors | Dual-mode operation, gradual rollout |
| Frontend breaking changes | New components alongside old, feature flags |

---

## 19. SUCCESS CRITERIA

1. Orders are placed and enter a queue
2. Orders match deterministically (FIFO + price priority)
3. Partial fills work correctly
4. Waiting funds are locked and visible in wallet
5. Settlement calculates correctly for YES/NO/REFUND
6. No pool-payout displays remain in the UI
7. Protected Markets still work with new system
8. Admin can pause matching in emergencies
9. No race conditions or double-settlements
10. System handles 10 concurrent users per market
