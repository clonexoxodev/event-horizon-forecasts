# FLIPPE ORDER BOOK — FINAL ARCHITECTURE SPECIFICATION

**Version:** 1.0 — Definitive Blueprint
**Status:** Ready for Implementation
**Date:** 2026-07-21

This document is the single source of truth for Flippe's Order Book system. After this document is complete, no further architectural changes should be necessary before implementation begins.

---

## PART 1: DESIGN PRINCIPLES

1. **Correctness over performance.** Every balance operation must be atomic. Every settlement must be exact.
2. **Simplicity for early scale.** Flippe has 10–100 users. No premature optimization. Compute on demand.
3. **Backward compatibility.** Pool engine stays available via feature flag. No existing system is broken.
4. **Every state change is logged.** Every order event, every balance movement, every settlement. No silent failures.
5. **Atomic wallet operations.** Every balance change is a single SQL statement with a WHERE guard. No read-then-write.
6. **Deterministic matching.** Same inputs always produce same outputs. No randomness. No external dependencies.
7. **Fail-safe refunds.** If anything goes wrong, locked funds are always refunded to the user. Never lost.

---

## PART 2: FEATURE FLAG — DUAL ENGINE

### 2.1 How It Works

A per-market `pricing_model` column determines which engine handles a market.

```
pricing_model = 'pool'      → Existing pool/parimutuel engine (unchanged)
pricing_model = 'orderbook' → New order book engine (this specification)
```

- Default for new markets: `'orderbook'`
- Existing active markets: remain `'pool'` until admin migrates them
- Admin can switch a market's engine via admin panel (only when market is in `trading` state with zero positions)

### 2.2 API Route Behavior

```
POST /api/markets/:id/predictions
  → IF market.pricing_model == 'pool':    route to pool engine (existing code)
  → IF market.pricing_model == 'orderbook': route to order book engine (new code)
```

All other routes (auth, wallet, deposits, withdrawals, Flutterwave, notifications, admin) are engine-agnostic and unchanged.

### 2.3 Frontend Behavior

The frontend detects `pricing_model` from the market response and renders accordingly:
- Pool markets: show existing pool UI (odds, pool size, estimated return)
- Order book markets: show order book UI (bid/ask, spread, order form)

---

## PART 3: ORDER STATE MACHINE

### 3.1 States

| State | Meaning |
|-------|---------|
| `pending` | Order created, funds locked, not yet entered into matching. Transitional — must resolve within the same request. |
| `waiting` | Order is in the book. Fully unmatched. Visible in order book depth. |
| `partial` | Some quantity matched. Remainder is in the book. |
| `filled` | Entire quantity matched. Order is done. |
| `cancelled` | User or admin cancelled the order. Remaining funds unlocked. |
| `expired` | Order expired (market closed, protected market failure). Remaining funds refunded. |
| `refunded` | Remaining funds returned to user at settlement. Terminal state. |

### 3.2 Valid Transitions

```
                ┌─────────────────────────────────────┐
                │                                     │
                ▼                                     │
  [CREATE] → pending ──┬──→ waiting ──┬──→ filled     │
                       │      │        │               │
                       │      │        ▼               │
                       │      │    partial ──→ filled  │
                       │      │        │               │
                       │      │        ▼               │
                       │      │    cancelled ──────────┘
                       │      │        │
                       │      │        ▼
                       │      │    expired ──→ refunded
                       │      │
                       │      └──→ expired ──→ refunded
                       │
                       └──→ filled (immediate match, never enters book)
```

### 3.3 Complete Transition Table

| From | To | Trigger | Condition |
|------|----|---------|-----------|
| — | `pending` | User places order | Always (initial state) |
| `pending` | `waiting` | Matching engine runs | No opposing orders available |
| `pending` | `partial` | Matching engine runs | Some quantity matched, rest enters book |
| `pending` | `filled` | Matching engine runs | All quantity matched immediately |
| `waiting` | `partial` | Matching engine runs | New opposing order matches some quantity |
| `waiting` | `filled` | Matching engine runs | New opposing order matches all quantity |
| `waiting` | `cancelled` | User cancels | Order is in book, not fully matched |
| `waiting` | `expired` | System expires | Market closed or protected market failed |
| `waiting` | `refunded` | Settlement runs | Market resolved, remaining refunded |
| `partial` | `filled` | Matching engine runs | Remaining quantity matched |
| `partial` | `cancelled` | User cancels | Remaining quantity unlocked |
| `partial` | `expired` | System expires | Market closed or protected market failed |
| `partial` | `refunded` | Settlement runs | Market resolved, remaining refunded |
| `pending` | `cancelled` | System cancels | Matching engine failed or market closed during processing |

### 3.4 Invalid Transitions (Must Never Happen)

- `filled` → any state (terminal)
- `cancelled` → any state (terminal)
- `expired` → any state (terminal)
- `refunded` → any state (terminal)
- `waiting` → `pending` (cannot go backwards)
- `partial` → `pending` (cannot go backwards)
- `partial` → `waiting` (can only go forward)

---

## PART 4: ORDER EXPIRATION RULES

### 4.1 Automatic Expiration Triggers

| Trigger | Orders Affected | Action |
|---------|----------------|--------|
| Market `close_date` reached | All `waiting` and `partial` orders for that market | Status → `expired`, remaining funds unlocked |
| Market resolved (admin) | All `waiting` and `partial` orders | Status → `refunded`, remaining funds refunded as part of settlement |
| Protected market fails activation | All orders for that market | Status → `expired`, ALL funds refunded (including matched positions) |
| Admin cancels market | All orders for that market | Status → `expired`, remaining funds unlocked |
| Order placed after market close | N/A | Rejected at creation (never enters `pending`) |

### 4.2 Expiration Process

```
1. Query: SELECT * FROM orders WHERE market_id = X AND status IN ('waiting', 'partial')
2. For each order:
   a. remaining = quantity - filled_quantity
   b. UPDATE wallets: available += remaining, locked -= remaining (atomic)
   c. UPDATE orders SET status = 'expired', cancelled_at = now()
   d. INSERT transaction (type='order_unlock', direction='RELEASE')
   e. INSERT order_event (event_type='expired', details={remaining, reason})
3. UPDATE markets: total_orders_count, best_bid_price, best_ask_price
```

---

## PART 5: EVENT LOG

### 5.1 Table: `order_events`

Every lifecycle event for every order is recorded here. This is the audit trail for debugging, support, and compliance.

```sql
CREATE TABLE order_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  market_id       text NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  event_type      text NOT NULL CHECK (event_type IN (
    'created',           -- Order placed by user
    'locked',            -- Funds locked in wallet
    'entered_book',      -- Order entered into order book (status → waiting)
    'match_started',     -- Matching engine began processing this order
    'partial_fill',      -- Part of order was matched
    'full_fill',         -- Entire order was matched
    'fill_completed',    -- Fill recorded in order_fills table
    'trade_created',     -- Trade record created
    'position_created',  -- Position created from fill
    'position_updated',  -- Position updated with additional fill
    'cancelled',         -- User or admin cancelled
    'unlock',            -- Remaining funds unlocked
    'expired',           -- Order expired
    'refunded',          -- Remaining funds refunded at settlement
    'error'              -- Something went wrong (includes error details)
  )),
  
  quantity_affected bigint,     -- How much quantity was affected in this event
  price_affected   bigint,      -- Price at which event occurred
  balance_before   bigint,      -- User's available balance before (for financial audit)
  balance_after    bigint,      -- User's available balance after
  locked_before    bigint,      -- User's locked balance before
  locked_after     bigint,      -- User's locked balance after
  
  metadata         jsonb,       -- Event-specific data (error messages, match details, etc.)
  
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_events_order_id ON order_events(order_id);
CREATE INDEX idx_order_events_market_id ON order_events(market_id);
CREATE INDEX idx_order_events_user_id ON order_events(user_id);
CREATE INDEX idx_order_events_type ON order_events(event_type);
CREATE INDEX idx_order_events_created_at ON order_events(created_at);
```

### 5.2 Event Sequence for a Complete Order Lifecycle

**Happy path (order placed, matched, settled):**
```
1. created      → order placed, funds validated
2. locked       → funds locked in wallet
3. entered_book → status → waiting (or partial if immediate partial match)
4. partial_fill → some quantity matched against opposing order
5. fill_completed → fill record created
6. trade_created → trade record created
7. position_created → position record created (first fill)
   OR position_updated → position updated (subsequent fills)
8. full_fill    → remaining quantity matched
9. fill_completed → fill record created
10. trade_created → trade record created
11. position_updated → position updated
[At settlement:]
12. refunded    → if any unmatched quantity remained (shouldn't happen for filled orders)
```

**Cancelled path:**
```
1. created
2. locked
3. entered_book
4. cancelled    → user/admin cancels
5. unlock       → remaining funds unlocked
```

**Expired path:**
```
1. created
2. locked
3. entered_book
4. expired      → market closed
5. unlock       → remaining funds unlocked
```

**Error path:**
```
1. created
2. error        → balance lock failed (insufficient funds race condition)
```

---

## PART 6: DATABASE DESIGN — FINAL

### 6.1 New Tables

Only 4 new tables. No `order_book_snapshots` (compute on-demand).

#### 6.1.1 `orders`

```sql
CREATE TABLE orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id         text NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  
  side              text NOT NULL CHECK (side IN ('YES', 'NO')),
  order_type        text NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
  price             bigint NOT NULL CHECK (price > 0 AND price < 100),
  quantity          bigint NOT NULL CHECK (quantity > 0),
  
  filled_quantity   bigint NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0),
  
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'waiting', 'partial', 'filled', 'cancelled', 'expired', 'refunded'
  )),
  
  locked_amount     bigint NOT NULL DEFAULT 0,
  filled_amount     bigint NOT NULL DEFAULT 0,
  
  source            text NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'admin', 'system', 'seed')),
  idempotency_key   text,  -- Prevent duplicate orders from webhook retries
  
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  filled_at         timestamptz,
  cancelled_at      timestamptz
);

-- Primary query: find opposing orders for matching
CREATE INDEX idx_orders_match_queue ON orders(market_id, status, side, price DESC, created_at ASC)
  WHERE status IN ('waiting', 'partial');

-- User's orders
CREATE INDEX idx_orders_user ON orders(user_id, status);

-- Market depth display
CREATE INDEX idx_orders_book_depth ON orders(market_id, status, side, price DESC, created_at ASC)
  WHERE status IN ('waiting', 'partial');

-- Idempotency check
CREATE UNIQUE INDEX idx_orders_idempotency ON orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

**Partial index design rationale:** The `WHERE status IN ('waiting', 'partial')` filter means the matching query only scans active orders, not filled/cancelled/expired orders. This keeps the index small and queries fast even with thousands of historical orders.

#### 6.1.2 `order_fills`

```sql
CREATE TABLE order_fills (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  order_id          uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id         text NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  
  side              text NOT NULL CHECK (side IN ('YES', 'NO')),
  order_type        text NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
  fill_price        bigint NOT NULL CHECK (fill_price > 0 AND fill_price < 100),
  fill_quantity     bigint NOT NULL CHECK (fill_quantity > 0),
  
  matched_order_id  uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  matched_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  position_id       uuid,  -- Added after first fill creates a position
  
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fills_order ON order_fills(order_id);
CREATE INDEX idx_fills_market ON order_fills(market_id, created_at DESC);
CREATE INDEX idx_fills_user ON order_fills(user_id, market_id);
```

#### 6.1.3 `trades`

```sql
CREATE TABLE trades (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id         text NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  
  buy_order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sell_order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  side              text NOT NULL CHECK (side IN ('YES', 'NO')),
  trade_price       bigint NOT NULL CHECK (trade_price > 0 AND trade_price < 100),
  trade_quantity    bigint NOT NULL CHECK (trade_quantity > 0),
  
  fee_smallest_unit bigint NOT NULL DEFAULT 0,
  
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trades_market ON trades(market_id, created_at DESC);
CREATE INDEX idx_trades_buy_order ON trades(buy_order_id);
CREATE INDEX idx_trades_sell_order ON trades(sell_order_id);
```

#### 6.1.4 `order_events`

(Defined in Part 5 above.)

### 6.2 Modifications to Existing Tables

#### 6.2.1 `markets` — Add Order Book Columns

```sql
ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  pricing_model text NOT NULL DEFAULT 'orderbook'
  CHECK (pricing_model IN ('pool', 'orderbook'));

ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  best_bid_price bigint;

ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  best_ask_price bigint;

ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  last_trade_price bigint;

ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  last_trade_at timestamptz;

ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  total_orders_count integer NOT NULL DEFAULT 0;

ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  matched_volume_smallest_unit bigint NOT NULL DEFAULT 0;

-- Exposure limits (admin-configurable)
ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  max_exposure_per_user bigint DEFAULT 100000000;  -- ₦1,000,000

ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  max_exposure_per_side bigint DEFAULT 500000000;  -- ₦5,000,000

ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  max_imbalance_ratio numeric DEFAULT 3.0;

ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  max_order_size bigint DEFAULT 50000000;  -- ₦500,000

ALTER TABLE markets ADD COLUMN IF NOT EXISTS
  max_daily_exposure bigint DEFAULT 200000000;  -- ₦2,000,000
```

**Why no `order_book_snapshots` table:** With 10–100 users, the order book depth can be computed in real-time from the `orders` table using the partial index. A snapshots table adds write overhead on every trade for a problem that doesn't exist yet. When Flippe reaches 1,000+ concurrent users per market, add snapshots as a materialized cache.

#### 6.2.2 `positions` — Add Order Reference

```sql
ALTER TABLE positions ADD COLUMN IF NOT EXISTS
  order_id uuid REFERENCES orders(id);

ALTER TABLE positions ADD COLUMN IF NOT EXISTS
  first_fill_price bigint;

ALTER TABLE positions ADD COLUMN IF NOT EXISTS
  last_fill_price bigint;

ALTER TABLE positions ADD COLUMN IF NOT EXISTS
  fill_count integer NOT NULL DEFAULT 0;
```

#### 6.2.3 `wallets` — Activate Locked Columns

No schema change needed. `locked_ngn_kobo` and `locked_usd_cents` already exist. They will now be actively used by the order book engine.

**Invariant (enforced in application code via atomic SQL):**
```
available_ngn_kobo + locked_ngn_kobo <= balance_ngn_kobo
```

#### 6.2.4 `transactions` — New Types

Existing types: `deposit`, `withdrawal`, `position_entry`, `position_payout`, `refund`

New types to add:
```
order_lock        -- Funds locked when order placed (direction: LOCK)
order_unlock      -- Funds unlocked when order cancelled/expired (direction: RELEASE)
order_fill        -- Funds transferred on match (direction: varies)
settlement_payout -- Winner payout at resolution (direction: IN)
settlement_refund -- Unmatched order refund (direction: IN)
```

New direction values: `IN`, `OUT`, `RELEASE`, `LOCK`

### 6.3 Tables NOT Created

| Table | Reason Not Created |
|-------|-------------------|
| `order_book_snapshots` | Compute on-demand from `orders` table. Not needed at 10–100 users. |
| `settlement_ledger` | Use existing `transactions` table with new types. Avoids duplicate ledger. |
| `exposure_snapshots` | Compute on-demand from `orders` table. Not needed at 10–100 users. |

---

## PART 7: SERVICE ARCHITECTURE

### 7.1 Service Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     API Routes                          │
│  (backend/api/index.ts — production entry point)        │
│                                                         │
│  POST /api/markets/:id/orders                           │
│  GET  /api/markets/:id/orderbook                        │
│  DELETE /api/markets/:id/orders/:orderId                 │
│  POST /api/admin/markets/:id/resolve                     │
│  ...                                                    │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐   ┌─────────────────────────────┐
│   OrderService      │   │   SettlementService          │
│                     │   │                             │
│ - createOrder()     │   │ - resolveMarket()           │
│ - cancelOrder()     │   │ - refundUnmatchedOrders()   │
│ - getOrderBook()    │   │ - calculatePreview()        │
│ - getUserOrders()   │   │                             │
└────────┬────────────┘   └──────────┬──────────────────┘
         │                           │
         │ calls                     │ calls
         ▼                           ▼
┌─────────────────────┐   ┌─────────────────────────────┐
│  MatchingEngine     │   │   WalletService              │
│                     │   │                             │
│ - matchOrder()      │   │ - lockForOrder()            │
│ - findOpposing()    │   │ - unlockFromOrder()         │
│ - executeMatch()    │   │ - atomicDecrement()         │
│ - updateBook()      │   │ - atomicTransfer()          │
└────────┬────────────┘   └──────────┬──────────────────┘
         │                           │
         │ calls                     │ calls
         ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                     Repositories                         │
│                                                         │
│  OrderRepository  │ FillRepository  │ TradeRepository   │
│  WalletRepository │ TransactionRepo │ PositionRepo      │
│  EventRepository  │ MarketRepository                     │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Service Responsibilities

#### OrderService
- **Owns:** Order lifecycle (create, cancel, query)
- **Validates:** Price, quantity, exposure limits, market state, user balance
- **Delegates to:** WalletService (lock funds), MatchingEngine (match), EventRepository (log)
- **Does NOT contain:** Matching algorithm, settlement logic, wallet SQL

#### MatchingEngine
- **Owns:** Price-time priority matching algorithm
- **Input:** A new order that needs matching
- **Output:** Array of fills, updated order states, market book updates
- **Called by:** OrderService only
- **Does NOT:** Access wallet directly, make API calls, have state between calls
- **Purity:** Given the same orders in the same state, it always produces the same output

#### SettlementService
- **Owns:** Market resolution, position settlement, order refund
- **Called by:** Admin resolution endpoint only
- **Delegates to:** WalletService (credit payouts, unlock refunds), EventRepository (log)
- **Does NOT:** Modify orders directly, change market prices

#### WalletService
- **Owns:** All balance movements
- **Rule:** Every balance change is a single atomic SQL statement
- **Methods:**
  - `lockForOrder(userId, amount)` → atomic: `available -= amount, locked += amount`
  - `unlockFromOrder(userId, amount)` → atomic: `available += amount, locked -= amount`
  - `creditPayout(userId, amount)` → atomic: `available += amount, balance += profit`
  - `atomicDecrement(userId, amount)` → atomic: `available -= amount WHERE available >= amount`

#### EventRepository
- **Owns:** Writing to `order_events` table
- **Called by:** Every service that changes order state
- **Rule:** If an event cannot be written, the operation fails (event log is not optional)

### 7.3 Why MatchingEngine is Independent

1. **Testability:** Can be tested with mock orders without API/HTTP layer
2. **Reusability:** Could be used by admin batch operations, migration tools
3. **Controllability:** Can be paused independently of API routes
4. **Clarity:** Separates "what the user asked for" (API) from "how orders match" (engine)
5. **Auditability:** Engine decisions are logged separately from API decisions

### 7.4 File Map

```
backend/src/services/order.service.ts         -- NEW
backend/src/services/matching.engine.ts       -- NEW
backend/src/services/settlement.service.ts    -- NEW
backend/src/services/wallet.service.ts        -- MODIFY (add lock/unlock/atomic methods)
backend/src/repositories/order.repository.ts  -- NEW
backend/src/repositories/fill.repository.ts   -- NEW
backend/src/repositories/trade.repository.ts  -- NEW
backend/src/repositories/event.repository.ts  -- NEW
backend/src/repositories/wallet.repository.ts -- MODIFY (add atomic SQL operations)
backend/src/repositories/transaction.repository.ts -- MODIFY (add new transaction types)
backend/api/index.ts                          -- MODIFY (add order routes, feature flag)
```

---

## PART 8: MATCHING FLOW — COMPLETE

### 8.1 When a New Order Arrives

```
1. VALIDATE
   ├── Market exists and pricing_model = 'orderbook'
   ├── Market status = 'trading' or 'active'
   ├── Market not past close_date
   ├── Price in range (1, 99)
   ├── Quantity > 0
   ├── Quantity <= market.max_order_size (if exposure limits enabled)
   ├── Idempotency key not already used (prevent duplicate)
   └── Exposure check passes (per-user, per-side, daily)

2. LOCK FUNDS
   ├── WalletService.lockForOrder(userId, quantity)
   │   └── Atomic: UPDATE wallets SET available -= quantity, locked += quantity
   │       WHERE user_id = $1 AND available >= $2
   │   └── If returns empty: INSUFFICIENT_BALANCE error
   ├── Event: 'created' logged
   └── Event: 'locked' logged

3. INSERT ORDER
   ├── INSERT INTO orders (status='pending', locked_amount=quantity)
   └── Event: 'created' logged

4. MATCH
   ├── MatchingEngine.matchOrder(order)
   │   ├── Find opposing orders (sorted by price priority, then time)
   │   ├── For each opposing order:
   │   │   ├── Check price compatibility
   │   │   ├── Calculate match quantity (min of remaining quantities)
   │   │   ├── Calculate match price (maker's price — priority rule)
   │   │   ├── Create fill records (one per order)
   │   │   ├── Create trade record
   │   │   ├── Create/update position for buyer
   │   │   ├── Update filled_quantity on both orders
   │   │   └── Log events: 'partial_fill' or 'full_fill', 'fill_completed', 'trade_created', 'position_created'/'position_updated'
   │   └── Return: array of fills, updated order statuses
   └── Event: 'match_started' logged before matching begins

5. UPDATE ORDER STATUS
   ├── IF all matched: status → 'filled', filled_at = now()
   ├── IF partially matched: status → 'partial'
   └── IF no match: status → 'waiting'
   └── Event: 'entered_book' (if waiting or partial)

6. UPDATE MARKET
   ├── Recalculate best_bid_price, best_ask_price from orders table
   ├── Increment total_orders_count
   ├── Increment matched_volume_smallest_unit by total matched amount
   └── UPDATE last_trade_price, last_trade_at if any trades occurred

7. RETURN
   └── Response: { orderId, status, fills[], bookDepth }
```

### 8.2 Matching Algorithm — Detailed

```
FUNCTION matchOrder(newOrder):
  
  // Determine what we're looking for
  IF newOrder.order_type == 'BUY':
    // BUY YES looks for SELL YES orders
    // BUY NO looks for SELL NO orders
    opposingType = 'SELL'
    sortField = 'price ASC'   // lowest ask first (best price for buyer)
  
  ELIF newOrder.order_type == 'SELL':
    // SELL YES looks for BUY YES orders
    // SELL NO looks for BUY NO orders
    opposingType = 'BUY'
    sortField = 'price DESC'  // highest bid first (best price for seller)

  // Fetch opposing orders
  // Note: For binary market, BUY YES @ 60 is economically equivalent to SELL NO @ 40
  // But we treat them as separate books for clarity
  opposingOrders = query:
    SELECT * FROM orders
    WHERE market_id = newOrder.market_id
      AND side = newOrder.side          // Same side (YES matches YES, NO matches NO)
      AND order_type = opposingType
      AND status IN ('waiting', 'partial')
    ORDER BY {sortField}, created_at ASC  // FIFO within same price

  fills = []
  remaining = newOrder.quantity - newOrder.filled_quantity

  FOR EACH opposing IN opposingOrders:
    IF remaining <= 0: BREAK

    // Price compatibility
    IF newOrder.order_type == 'BUY':
      IF newOrder.price < opposing.price: BREAK  // Buyer won't pay enough
    ELSE:
      IF newOrder.price > opposing.price: BREAK  // Seller wants too much

    // Match quantity
    matchQty = MIN(remaining, opposing.remaining_quantity)
    
    // Match price: maker gets priority (their price)
    matchPrice = opposing.price

    // Execute
    fill = executeMatch(newOrder, opposing, matchPrice, matchQty)
    fills.push(fill)

    remaining -= matchQty
    opposing.filled_quantity += matchQty

    // Update opposing order status
    IF opposing.remaining_quantity <= 0:
      opposing.status = 'filled'
      opposing.filled_at = now()
    ELSE:
      opposing.status = 'partial'

    // Update opposing order in database
    UPDATE orders SET 
      filled_quantity = opposing.filled_quantity,
      status = opposing.status,
      filled_at = opposing.filled_at,
      updated_at = now()
    WHERE id = opposing.id

  // Update new order
  newOrder.filled_quantity += (newOrder.quantity - newOrder.filled_quantity - remaining)
  
  IF remaining <= 0:
    newOrder.status = 'filled'
    newOrder.filled_at = now()
  ELIF newOrder.filled_quantity > 0:
    newOrder.status = 'partial'
  ELSE:
    newOrder.status = 'waiting'

  UPDATE orders SET
    filled_quantity = newOrder.filled_quantity,
    status = newOrder.status,
    filled_at = newOrder.filled_at,
    updated_at = now()
  WHERE id = newOrder.id

  RETURN fills
```

### 8.3 executeMatch — What Happens Per Match

```
FUNCTION executeMatch(buyOrder, sellOrder, price, quantity):
  
  // 1. Create fill for buyer
  fill_buyer = INSERT INTO order_fills (
    order_id: buyOrder.id,
    user_id: buyOrder.user_id,
    market_id: buyOrder.market_id,
    side: buyOrder.side,
    order_type: 'BUY',
    fill_price: price,
    fill_quantity: quantity,
    matched_order_id: sellOrder.id,
    matched_user_id: sellOrder.user_id
  )

  // 2. Create fill for seller
  fill_seller = INSERT INTO order_fills (
    order_id: sellOrder.id,
    user_id: sellOrder.user_id,
    market_id: sellOrder.market_id,
    side: sellOrder.side,
    order_type: 'SELL',
    fill_price: price,
    fill_quantity: quantity,
    matched_order_id: buyOrder.id,
    matched_user_id: buyOrder.user_id
  )

  // 3. Create trade record
  trade = INSERT INTO trades (
    market_id: buyOrder.market_id,
    buy_order_id: buyOrder.id,
    sell_order_id: sellOrder.id,
    buyer_id: buyOrder.user_id,
    seller_id: sellOrder.user_id,
    side: buyOrder.side,
    trade_price: price,
    trade_quantity: quantity
  )

  // 4. Wallet transfers (within same transaction)
  // Buyer: locked → position (deduct locked, buyer now holds contracts)
  WalletService.atomicDecrementLocked(buyOrder.user_id, buyOrder.side_currency, quantity)
  
  // Seller: locked → available (seller receives cash)
  WalletService.atomicDecrementLocked(sellOrder.user_id, sellOrder.side_currency, quantity)
  WalletService.atomicIncrementAvailable(sellOrder.user_id, sellOrder.side_currency, quantity)

  // 5. Create or update position for buyer
  existingPosition = SELECT FROM positions 
    WHERE user_id = buyOrder.user_id AND market_id = buyOrder.market_id AND side = buyOrder.side

  IF existingPosition:
    UPDATE positions SET
      amount_smallest_unit = amount_smallest_unit + quantity,
      shares_received = shares_received + (quantity * 100 / price),
      fill_count = fill_count + 1,
      last_fill_price = price,
      entry_price = (amount_smallest_unit + quantity) / (shares_received + quantity * 100 / price) * 100
    WHERE id = existingPosition.id
    
    position = existingPosition
  ELSE:
    position = INSERT INTO positions (
      user_id: buyOrder.user_id,
      market_id: buyOrder.market_id,
      side: buyOrder.side,
      amount_smallest_unit: quantity,
      shares_received: quantity * 100 / price,
      entry_price: price,
      first_fill_price: price,
      last_fill_price: price,
      fill_count: 1,
      status: 'active',
      order_id: buyOrder.id
    )
  
  // 6. Update fill records with position_id
  UPDATE order_fills SET position_id = position.id WHERE id = fill_buyer.id
  UPDATE order_fills SET position_id = position.id WHERE id = fill_seller.id

  // 7. Log events
  EventRepository.log(buyOrder.id, 'partial_fill' or 'full_fill', {quantity, price})
  EventRepository.log(buyOrder.id, 'fill_completed', {fillId: fill_buyer.id})
  EventRepository.log(buyOrder.id, 'trade_created', {tradeId: trade.id})
  EventRepository.log(buyOrder.id, 'position_created'/'position_updated', {positionId: position.id})

  // 8. Transaction records
  INSERT INTO transactions (user_id, type='order_fill', amount=quantity, direction='OUT', reference_id=trade.id)
  INSERT INTO transactions (user_id, type='order_fill', amount=quantity, direction='IN', reference_id=trade.id)

  RETURN fill_buyer
```

### 8.4 Order Book Depth Query (On-Demand)

```sql
-- Best bid (highest BUY order)
SELECT price, SUM(quantity - filled_quantity) as total_quantity, COUNT(*) as order_count
FROM orders
WHERE market_id = $1 AND order_type = 'BUY' AND status IN ('waiting', 'partial')
GROUP BY price
ORDER BY price DESC
LIMIT 10;

-- Best ask (lowest SELL order)
SELECT price, SUM(quantity - filled_quantity) as total_quantity, COUNT(*) as order_count
FROM orders
WHERE market_id = $1 AND order_type = 'SELL' AND status IN ('waiting', 'partial')
GROUP BY price
ORDER BY price ASC
LIMIT 10;

-- Best bid/ask for markets table update
SELECT 
  MAX(price) FILTER (WHERE order_type = 'BUY') as best_bid,
  MIN(price) FILTER (WHERE order_type = 'SELL') as best_ask
FROM orders
WHERE market_id = $1 AND status IN ('waiting', 'partial');
```

---

## PART 9: SETTLEMENT FLOW — COMPLETE

### 9.1 Resolution Types

| Resolution | Meaning | Payout Logic |
|------------|---------|-------------|
| `YES` | YES side wins | All YES contract holders paid. NO holders lose. Unmatched orders refunded. |
| `NO` | NO side wins | All NO contract holders paid. YES holders lose. Unmatched orders refunded. |
| `REFUND` | Cancelled/failed | All positions refunded (full stake back). All unmatched orders refunded. |

### 9.2 Settlement Formula

For each position (buyer who holds contracts):

```
total_staked = position.amount_smallest_unit
total_shares = position.shares_received

IF position.side == winning_side:
  // Winner: each share pays 100 kobo
  payout = total_shares * 100
  profit = payout - total_staked
ELSE:
  // Loser: shares worth 0
  payout = 0
  profit = -total_staked
```

**Example:**
```
User bought YES at prices: ₦50, ₦60, ₦65
Total staked: ₦10,000 kobo
Shares: (10000/50)*100 + ... = calculated per fill
If YES wins: payout = total_shares * 100
If NO wins: payout = 0
```

### 9.3 Complete Settlement Process

```
FUNCTION resolveMarket(marketId, winningSide):
  
  // 1. Validate
  ├── Admin must be super_admin
  ├── Market status must be 'closed' or 'pending_resolution'
  ├── Market pricing_model must be 'orderbook'
  ├── Market not already resolved
  └── Market must be activated (if protected market)

  // 2. BEGIN TRANSACTION
  ├── Set transaction isolation level to SERIALIZABLE
  └── Lock market row (SELECT ... FOR UPDATE)

  // 3. Cancel all waiting/partial orders
  ├── SELECT * FROM orders WHERE market_id = $1 AND status IN ('waiting', 'partial')
  ├── For each order:
  │   ├── remaining = quantity - filled_quantity
  │   ├── WalletService.unlockFromOrder(order.user_id, remaining)
  │   ├── UPDATE orders SET status = 'expired', cancelled_at = now()
  │   ├── INSERT transaction (type='settlement_refund', direction='IN', amount=remaining)
  │   └── EventRepository.log(order.id, 'refunded', {remaining, reason='market_resolved'})
  └── 

  // 4. Settle all positions
  ├── SELECT * FROM positions WHERE market_id = $1 AND status = 'active'
  ├── For each position:
  │   ├── IF position.side == winningSide:
  │   │   ├── payout = position.shares_received * 100
  │   │   ├── profit = payout - position.amount_smallest_unit
  │   │   ├── WalletService.creditPayout(position.user_id, payout)
  │   │   ├── UPDATE positions SET
  │   │   │   status = 'won',
  │   │   │   payout_smallest_unit = payout,
  │   │   │   profit_smallest_unit = profit,
  │   │   │   is_winner = true,
  │   │   │   resolved_at = now(),
  │   │   │   settled_at = now()
  │   │   └── INSERT transaction (type='settlement_payout', direction='IN', amount=payout)
  │   │
  │   ├── ELIF winningSide == 'REFUND':
  │   │   ├── payout = position.amount_smallest_unit  // Full stake back
  │   │   ├── WalletService.creditPayout(position.user_id, payout)
  │   │   ├── UPDATE positions SET
  │   │   │   status = 'refunded',
  │   │   │   payout_smallest_unit = payout,
  │   │   │   profit_smallest_unit = 0,
  │   │   │   resolved_at = now(),
  │   │   │   settled_at = now()
  │   │   └── INSERT transaction (type='settlement_refund', direction='IN', amount=payout)
  │   │
  │   └── ELSE:
  │       ├── payout = 0
  │       ├── UPDATE positions SET
  │       │   status = 'lost',
  │       │   payout_smallest_unit = 0,
  │       │   profit_smallest_unit = -position.amount_smallest_unit,
  │       │   is_winner = false,
  │       │   resolved_at = now()
  │       └── (no transaction needed — loss already reflected in wallet)

  // 5. Update market
  ├── UPDATE markets SET
  │   status = 'resolved',
  │   state = 'resolved',
  │   outcome = winningSide,
  │   winning_outcome = winningSide,
  │   resolved_at = now(),
  │   resolved_by = admin.id,
  │   best_bid_price = NULL,
  │   best_ask_price = NULL
  └── 

  // 6. Create resolution log
  ├── INSERT INTO market_resolution_logs (
  │   market_id, resolved_by, outcome,
  │   winning_pool_smallest_unit, losing_pool_smallest_unit,
  │   resolved_position_count, payout_summary
  │ )
  └── 

  // 7. COMMIT TRANSACTION
  └── 

  // 8. Send notifications
  ├── For each winner: notify "Your [market] prediction won! Payout: ₦X"
  ├── For each loser: notify "Your [market] prediction did not win"
  └── For each refunded order: notify "Your order on [market] has been refunded"
```

### 9.4 Settlement for Protected Market Failure

```
FUNCTION refundUnactivatedMarket(marketId):
  
  // Same as resolveMarket with winningSide = 'REFUND', PLUS:
  // All positions get full stake back (not just unmatched orders)
  // Market status → 'refunded'
  // activation_state → 'refunded'
```

---

## PART 10: WALLET FLOW — COMPLETE

### 10.1 Balance Invariant

```
available_ngn_kobo + locked_ngn_kobo <= balance_ngn_kobo
```

This invariant is maintained by:
1. Atomic SQL operations (never read-then-write)
2. WHERE guards on every update
3. Database constraints (CHECK) where supported

### 10.2 Atomic Operations

All wallet operations are single SQL statements:

```sql
-- LOCK: available → locked (order placement)
UPDATE wallets SET
  available_ngn_kobo = available_ngn_kobo - $1,
  locked_ngn_kobo = locked_ngn_kobo + $1,
  updated_at = now()
WHERE user_id = $2
  AND available_ngn_kobo >= $1
  AND currency = 'NGN'
RETURNING *;
-- Empty result = insufficient balance

-- UNLOCK: locked → available (cancellation, expiration)
UPDATE wallets SET
  available_ngn_kobo = available_ngn_kobo + $1,
  locked_ngn_kobo = locked_ngn_kobo - $1,
  updated_at = now()
WHERE user_id = $2
  AND locked_ngn_kobo >= $1
  AND currency = 'NGN'
RETURNING *;

-- SETTLEMENT PAYOUT: credit winnings
UPDATE wallets SET
  available_ngn_kobo = available_ngn_kobo + $1,
  balance_ngn_kobo = balance_ngn_kobo + $2,  -- $2 = profit only
  total_winnings_ngn_kobo = total_winnings_ngn_kobo + $2,
  updated_at = now()
WHERE user_id = $3
  AND currency = 'NGN'
RETURNING *;

-- FILL TRANSFER (buyer side): locked → position (no cash movement)
-- The buyer's locked funds are consumed. They now hold contracts.
-- No wallet update needed — the lock is simply released.
UPDATE wallets SET
  locked_ngn_kobo = locked_ngn_kobo - $1,
  updated_at = now()
WHERE user_id = $2
  AND locked_ngn_kobo >= $1
  AND currency = 'NGN'
RETURNING *;

-- FILL TRANSFER (seller side): locked → available (seller receives cash)
UPDATE wallets SET
  locked_ngn_kobo = locked_ngn_kobo - $1,
  available_ngn_kobo = available_ngn_kobo + $1,
  updated_at = now()
WHERE user_id = $2
  AND locked_ngn_kobo >= $1
  AND currency = 'NGN'
RETURNING *;

-- DEPOSIT: external funds → wallet (unchanged from existing)
UPDATE wallets SET
  balance_ngn_kobo = balance_ngn_kobo + $1,
  available_ngn_kobo = available_ngn_kobo + $1,
  total_deposited_ngn_kobo = total_deposited_ngn_kobo + $1,
  updated_at = now()
WHERE user_id = $2
  AND currency = 'NGN'
RETURNING *;

-- WITHDRAWAL REQUEST: available → locked (unchanged from existing)
UPDATE wallets SET
  available_ngn_kobo = available_ngn_kobo - $1,
  locked_ngn_kobo = locked_ngn_kobo + $1,
  updated_at = now()
WHERE user_id = $2
  AND available_ngn_kobo >= $1
  AND currency = 'NGN'
RETURNING *;

-- WITHDRAWAL APPROVE: locked → total (unchanged from existing)
UPDATE wallets SET
  balance_ngn_kobo = balance_ngn_kobo - $1,
  locked_ngn_kobo = locked_ngn_kobo - $1,
  total_withdrawn_ngn_kobo = total_withdrawn_ngn_kobo + $1,
  updated_at = now()
WHERE user_id = $2
  AND locked_ngn_kobo >= $1
  AND currency = 'NGN'
RETURNING *;
```

### 10.3 Complete Balance Lifecycle

**Deposit → Place Order → Match → Win:**
```
START:           balance=0, available=0, locked=0

DEPOSIT:         balance+=1000, available+=1000
                 [balance=1000, available=1000, locked=0]

PLACE ORDER:     available-=500, locked+=500
                 [balance=1000, available=500, locked=500]

MATCH (buyer):   locked-=500 (contracts purchased)
                 [balance=1000, available=500, locked=0]
                 (user now holds YES contracts worth 500)

SETTLEMENT (win): available+=payout, balance+=profit
                 [balance=1500, available=1500, locked=0]
```

**Deposit → Place Order → Match → Lose:**
```
START:           balance=0, available=0, locked=0

DEPOSIT:         balance+=1000, available+=1000
                 [balance=1000, available=1000, locked=0]

PLACE ORDER:     available-=500, locked+=500
                 [balance=1000, available=500, locked=500]

MATCH (buyer):   locked-=500 (contracts purchased)
                 [balance=1000, available=500, locked=0]

SETTLEMENT (lose): (no wallet change — loss already reflected)
                 [balance=1000, available=500, locked=0]
                 (effectively: user deposited 1000, spent 500, has 500 left)
```

**Deposit → Place Order → Cancel → Withdraw:**
```
START:           balance=0, available=0, locked=0

DEPOSIT:         balance+=1000, available+=1000

PLACE ORDER:     available-=500, locked+=500
                 [balance=1000, available=500, locked=500]

CANCEL:          available+=500, locked-=500
                 [balance=1000, available=1000, locked=0]

WITHDRAWAL REQ:  available-=600, locked+=600
                 [balance=1000, available=400, locked=600]

WITHDRAWAL APPROVE: balance-=600, locked-=600
                 [balance=400, available=400, locked=0]
```

**Seller Side (receives cash from sale):**
```
SELL ORDER:      locked+=500 (locking existing position/value)

MATCH (seller):  locked-=500, available+=500 (receives cash)
                 [seller has cash instead of position]
```

### 10.4 Race Condition Prevention

**Problem:** Two concurrent requests try to place orders with the same available balance.

**Solution:** Atomic SQL with WHERE guard.

```
Request 1: UPDATE wallets SET available -= 1000 WHERE available >= 1000
  → Succeeds: available was 1500, now 500

Request 2: UPDATE wallets SET available -= 1000 WHERE available >= 1000
  → Fails: available is 500, which is < 1000
  → Returns empty result
  → Application returns INSUFFICIENT_BALANCE error
```

**No read-then-write. No JavaScript calculation. Single SQL statement.**

---

## PART 11: EXPOSURE PROTECTION — COMPLETE

### 11.1 Checks (All Must Pass)

```
FUNCTION checkExposure(userId, marketId, quantity, side):
  
  market = SELECT FROM markets WHERE id = marketId
  
  // 1. Order size limit
  IF market.max_order_size IS NOT NULL:
    IF quantity > market.max_order_size:
      RETURN REJECT("Order exceeds maximum size")

  // 2. Per-user exposure limit
  IF market.max_exposure_per_user IS NOT NULL:
    userExposure = SELECT SUM(quantity - filled_quantity)
      FROM orders
      WHERE user_id = $1 AND market_id = $2 AND status IN ('waiting', 'partial')
    IF userExposure + quantity > market.max_exposure_per_user:
      RETURN REJECT("Exceeds per-user exposure limit")

  // 3. Per-side exposure limit
  IF market.max_exposure_per_side IS NOT NULL:
    sideExposure = SELECT SUM(quantity - filled_quantity)
      FROM orders
      WHERE market_id = $2 AND side = $3 AND status IN ('waiting', 'partial')
    IF sideExposure + quantity > market.max_exposure_per_side:
      RETURN REJECT("Exceeds per-side exposure limit")

  // 4. Imbalance ratio limit
  IF market.max_imbalance_ratio IS NOT NULL:
    yesExposure = SELECT SUM(...) FROM orders WHERE side='YES' AND ...
    noExposure = SELECT SUM(...) FROM orders WHERE side='NO' AND ...
    ratio = MAX(yesExposure, noExposure) / MAX(MIN(yesExposure, noExposure), 1)
    IF ratio > market.max_imbalance_ratio AND newSide adds to larger side:
      RETURN REJECT("Would exceed imbalance ratio")

  // 5. Daily exposure limit
  IF market.max_daily_exposure IS NOT NULL:
    dailyExposure = SELECT SUM(quantity)
      FROM orders
      WHERE user_id = $1 AND market_id = $2 AND created_at > today_start
    IF dailyExposure + quantity > market.max_daily_exposure:
      RETURN REJECT("Exceeds daily exposure limit")

  RETURN PASS
```

### 11.2 Exposure Queries Use the Same Index as Matching

The partial index `idx_orders_match_queue` supports both matching queries and exposure queries, since both filter on `market_id + status IN ('waiting', 'partial')`.

---

## PART 12: PROTECTED MARKET INTEGRATION

### 12.1 Pre-Activation Behavior

When `protected_market_enabled = true` and `activation_state = 'pre_activation'`:
- Users CAN place orders (up to `protected_max_stake` per user)
- Matching CAN occur (to build liquidity)
- Market shows "pre-activation" status with progress bar

### 12.2 Activation Check (After Each Trade)

```
FUNCTION checkActivation(marketId):
  market = SELECT FROM markets WHERE id = marketId
  
  IF market.activation_state != 'pre_activation': RETURN
  
  matchedVolume = SELECT SUM(trade_quantity) FROM trades WHERE market_id = $1
  yesVolume = SELECT SUM(trade_quantity) FROM trades WHERE market_id = $1 AND side = 'YES'
  noVolume = SELECT SUM(trade_quantity) FROM trades WHERE market_id = $1 AND side = 'NO'
  participants = SELECT COUNT(DISTINCT user_id) FROM trades WHERE market_id = $1
  
  IF matchedVolume >= market.activation_threshold
     AND yesVolume >= market.activation_yes_min
     AND noVolume >= market.activation_no_min
     AND participants >= market.activation_min_participants:
    
    UPDATE markets SET activation_state = 'live', activated_at = now()
    -- Notify all participants: "Market is now live!"
```

### 12.3 Pre-Activation Failure

When `close_date` is reached and `activation_state` is still `'pre_activation'`:
```
1. Cancel ALL orders (waiting, partial)
2. Refund ALL matched positions (full stake back)
3. Refund ALL unmatched order quantities
4. Market status → 'refunded'
5. activation_state → 'refunded'
6. Notify all participants: "Market did not reach minimum liquidity. Full refund issued."
```

---

## PART 13: ADMIN CONTROLS

### 13.1 Super Admin Only

| Action | Endpoint | Condition |
|--------|----------|-----------|
| Pause matching | `POST /api/admin/markets/:id/matching/pause` | Only when market is `trading` |
| Resume matching | `POST /api/admin/markets/:id/matching/resume` | Only when matching is paused |
| Force resolve | `POST /api/admin/markets/:id/resolve` | Only when market is `closed` |
| Force refund | `POST /api/admin/markets/:id/refund` | Only when market is not resolved |

### 13.2 Admin Cannot

- Modify the matching algorithm
- Change match prices after execution
- Access user wallet balances (except via finance overview)
- Bypass exposure limits
- Place orders on behalf of users (except seed liquidity)

### 13.3 Emergency Pause

When matching is paused:
- New orders are REJECTED ("Matching is paused for this market")
- Existing waiting orders remain in the book (not cancelled)
- Admin can cancel orders individually if needed
- Resume to restart matching

### 13.4 Seed Liquidity (Admin)

Admin can add seed liquidity to bootstrap an order book:
```
POST /api/admin/markets/:id/seed-liquidity
{
  side: "YES",
  orderType: "SELL",
  price: 50,
  quantity: 10000000  // ₦100,000
}
```
This creates a SELL order from the system, providing a counterparty for early buyers.

---

## PART 14: RISK ANALYSIS

### 14.1 Identified Risks and Mitigations

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Race condition on wallet balance | CRITICAL | Atomic SQL with WHERE guard. No read-then-write. |
| 2 | Double settlement | CRITICAL | Settlement checks `positions.settled_at IS NULL`. Market checks `status != 'resolved'`. Both in same SERIALIZABLE transaction. |
| 3 | Double matching | CRITICAL | Order `filled_quantity` only increases. Status transitions are enforced. Matching engine processes one order at a time per market. |
| 4 | Locked funds lost | CRITICAL | Every expiration/cancellation/resolution path unlocks funds. No code path leaves funds locked without a matching state change. |
| 5 | Matching engine inconsistency | HIGH | Engine is pure function: same inputs → same outputs. All state changes go through database. No in-memory state between requests. |
| 6 | Market resolution before all matches settle | HIGH | Resolution cancels all waiting orders first, then settles positions. Order of operations is enforced. |
| 7 | Idempotency (duplicate orders from retries) | MEDIUM | `idempotency_key` unique index on orders table. Duplicate inserts fail gracefully. |
| 8 | Stale order book display | LOW | Frontend polls every 5 seconds. Order book depth computed on-demand. No cache invalidation needed. |
| 9 | Protected market activation race | LOW | Activation check runs in same transaction as trade. Only one activation transition possible. |
| 10 | Admin accidentally resolves active market | MEDIUM | Admin endpoint checks market status is 'closed' or 'pending_resolution'. Cannot resolve active/trading markets. |

### 14.2 Edge Cases Handled

| Edge Case | How Handled |
|-----------|-------------|
| Order placed at exact same price as opposing order | FIFO: earlier order matches first |
| Buyer and seller at exact same price | Trade executes at maker's price (the resting order) |
| Order quantity larger than all opposing orders | Partial fill against multiple orders |
| Order quantity exactly matches one opposing order | Full fill of both orders |
| User has exactly enough balance for one order | Atomic WHERE guard prevents overspend |
| Market closes while order is being processed | Order enters as 'pending', then expires on next cleanup |
| User cancels order while it's being matched | Cancel fails if order status changed to 'filled' or 'partial' during processing |
| Protected market fails with matched positions | Full refund (stake back) for all positions |
| Settlement with zero positions | Market resolves, no payouts, no errors |
| User tries to sell more than they hold | SELL order rejected (insufficient position) |

### 14.3 Failure Scenarios

| Scenario | System Behavior |
|----------|----------------|
| Database goes down mid-transaction | Transaction rolls back. Order stays in 'pending'. Funds remain locked. Admin can unlock manually. |
| Matching engine crashes after order created | Order stays in 'pending'. Background job picks up pending orders and runs matching. |
| Wallet service unavailable | Order creation fails with 500. User retries. No funds deducted (lock never happened). |
| Multiple rapid orders from same user | Each order atomic. Available balance decreases per order. If insufficient, later orders fail. |
| Admin resolves market while trades in progress | SERIALIZABLE transaction prevents this. Resolution waits for matching to complete. |

---

## PART 15: API SPECIFICATION

### 15.1 New Endpoints

```
POST /api/markets/:id/orders
  Body: { side: "YES"|"NO", orderType: "BUY"|"SELL", price: number, quantity: number, idempotencyKey?: string }
  Auth: Required
  Returns: { order: { id, status, filledQuantity, ... }, fills: [...], book: { bestBid, bestAsk, spread } }

GET /api/markets/:id/orderbook
  Auth: Required
  Returns: { bestBid, bestAsk, spread, midPrice, lastTradePrice, bids: [...], asks: [...] }

GET /api/markets/:id/orders
  Auth: Required (own orders)
  Returns: { orders: [...] }

DELETE /api/markets/:id/orders/:orderId
  Auth: Required (must own order)
  Returns: { success: true, refunded: number }

GET /api/markets/:id/trades
  Auth: Required
  Returns: { trades: [...], total: number }

GET /api/markets/:id/fills
  Auth: Required (own fills)
  Returns: { fills: [...] }

GET /api/orders
  Auth: Required
  Returns: { orders: [...] across all markets }

GET /api/orders/:orderId
  Auth: Required (must own order)
  Returns: { order: {...}, fills: [...], events: [...] }
```

### 15.2 Modified Endpoints

```
GET /api/markets/:id
  Added: bestBidPrice, bestAskPrice, lastTradePrice, spread, totalOrdersCount, matchedVolume, pricingModel

GET /api/wallet
  Added: lockedNgngKobo, lockedUsdCents

POST /api/admin/markets/:id/resolve
  Added: pricingModel check. If 'orderbook', uses new settlement. If 'pool', uses old settlement.

POST /api/admin/markets/:id/predictions (backward compat)
  If pricingModel = 'orderbook': converts {side, amount} to a BUY order at market price
  If pricingModel = 'pool': uses existing pool logic
```

### 15.3 Order Book Depth Response

```json
{
  "marketId": "will-btc-hit-100k",
  "bestBid": 62,
  "bestAsk": 65,
  "spread": 3,
  "midPrice": 63.5,
  "lastTradePrice": 63,
  "bids": [
    { "price": 62, "quantity": 15000, "orderCount": 3 },
    { "price": 61, "quantity": 8000, "orderCount": 2 },
    { "price": 60, "quantity": 25000, "orderCount": 5 }
  ],
  "asks": [
    { "price": 65, "quantity": 10000, "orderCount": 2 },
    { "price": 66, "quantity": 12000, "orderCount": 4 },
    { "price": 67, "quantity": 5000, "orderCount": 1 }
  ]
}
```

### 15.4 Order Response

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
  "createdAt": "2026-07-21T10:00:00Z"
}
```

---

## PART 16: FRONTEND CHANGES — SUMMARY

### 16.1 Prediction Slip (Order Form)

**Remove all instances of:**
- "Estimated Return" with fixed ₦ amount
- "Estimated Profit" with fixed ₦ amount
- Pool-ratio payout calculations
- "Returns may change as market activity changes"

**Replace with:**
```
Place Order

Side:        [YES] [NO]
Order Type:  [Limit]
Price:       ₦___ (1-99)
             ↳ Best ask: ₦65 | Best bid: ₦62

Amount:      ₦___
             ↳ ~___ shares at this price

── Order Summary ──
Order Value:      ₦10,000
Est. Entry Price: ₦62
Spread:           ₦3
Est. Shares:      ~16,129
Status:           Waiting to match

Settlement occurs after all orders
are matched and the market resolves.

[Place Order]
```

### 16.2 Market Card

```
Will BTC hit $100K?

[YES ₦62] [NO ₦38]

Last: ₦63 | Spread: ₦3
45 orders | ₦250K volume

████████░░░ 65% protected
Closes in 2 days
```

### 16.3 My Bets / Order Status

```
My Position: YES
Status: Partially Matched (60%)

Total Order:     ₦10,000
Matched:         ₦6,000 @ avg ₦62.50
Waiting:         ₦4,000 @ ₦60
Unrealized P/L:  +₦240 (est.)

Fills:
  ₦3,000 @ ₦62  (Jul 21, 10:05)
  ₦3,000 @ ₦63  (Jul 21, 10:12)

[Cancel Waiting Order]
```

### 16.4 Wallet Display

```
Wallet

Total Balance:    ₦50,000
Available:        ₦35,000
Locked (orders):  ₦15,000

[Deposit] [Withdraw]
```

### 16.5 Order Book Visualization (Market Detail)

```
Order Book              Last Trade: ₦63

SELL (NO side)  │  BUY (YES side)
────────────────│──────────────────
₦68  ▓▓░░  5K  │  ₦62  ▓▓▓▓▓▓  15K
₦67  ▓▓▓░  8K  │  ₦61  ▓▓░░░   8K
₦66  ▓▓▓▓ 12K  │  ₦60  ▓▓▓▓▓▓▓ 25K
₦65  ▓▓░░ 10K  │  ₦59  ▓░░      3K

Spread: ₦3
```

### 16.6 Files Modified

| File | Change |
|------|--------|
| `src/lib/api.ts` | Add order endpoints, remove pool-payout methods, add types |
| `src/lib/types.ts` | Add Order, Fill, Trade, OrderBook types |
| `src/lib/market-pricing.ts` | Replace pool pricing with order book mid-price |
| `src/lib/markets.ts` | Remove pool activation check for orderbook markets |
| `src/lib/positions.ts` | Remove `calculateEstimatedValue()` pool formula |
| `src/lib/market-state.tsx` | Add order book state, remove optimistic pool updates |
| `src/components/prediction/ForecastSlip.tsx` | Complete rewrite for order placement |
| `src/components/prediction/MarketCard.tsx` | Replace pool display with order book stats |
| `src/components/prediction/MyBetsCard.tsx` | Show order status, fills, waiting amounts |
| `src/components/prediction/PlaceBetModal.tsx` | Rewrite for order book |
| `src/pages/MarketDetail.tsx` | Add order book depth, replace pool UI |
| `src/pages/Dashboard.tsx` | Replace pool-based position values |
| `src/pages/Profile.tsx` | Update portfolio stats |
| `src/components/admin/MarketsView.tsx` | Add order book stats |
| `src/components/admin/MarketDetailView.tsx` | Add order book management, exposure |
| `src/components/admin/FinanceView.tsx` | Add locked balance tracking |
| `src/components/admin/types.ts` | Add order book admin types |

---

## PART 17: IMPLEMENTATION ROADMAP

### Sprint 1: Foundation (Days 1-3)
- Database migration (all new tables, columns, indexes)
- Atomic wallet operations (lock, unlock, credit, debit)
- Order repository (CRUD + priority queue queries)
- Event repository (write + query)

### Sprint 2: Matching Engine (Days 4-6)
- Matching engine service (pure algorithm)
- Fill and trade recording
- Position creation from fills
- Order book depth computation
- Unit tests (20+ cases)

### Sprint 3: Order Service + API (Days 7-9)
- Order service (validation → lock → match → update)
- Settlement service (resolve, refund, preview)
- All new API endpoints
- Feature flag integration
- Integration tests

### Sprint 4: Frontend — Order Placement (Days 10-12)
- Types + API layer updates
- ForecastSlip rewrite (order form)
- OrderBookDepth component
- MarketDetail updates
- MarketCard updates

### Sprint 5: Frontend — Portfolio & Display (Days 13-15)
- MyBetsCard rewrite (order status)
- Dashboard updates (order-based values)
- Profile updates
- Wallet locked balance display
- Notifications for fills/settlement

### Sprint 6: Admin & Migration (Days 16-18)
- Exposure monitor
- Matching pause/resume
- Settlement preview
- Market migration tool (pool → orderbook)
- Admin finance updates

### Sprint 7: Testing & Deployment (Days 19-21)
- End-to-end testing
- Race condition testing
- Security audit
- Load testing
- Staging deployment
- Production deployment

---

## PART 18: WHAT IS NOT CHANGED

The following systems are NOT modified by this architecture:

1. **Authentication** — JWT + cookies, unchanged
2. **Flutterwave integration** — deposits, webhooks, callbacks, unchanged
3. **Admin roles** — user/admin/super_admin, unchanged
4. **Notification system** — same table, same flow, new event types
5. **Audit trail** — admin_audit_log, unchanged
6. **Wallet deposits** — deposit_requests, approval flow, unchanged
7. **Wallet withdrawals** — withdrawal_requests, approval flow, unchanged
8. **Market creation** — admin creates markets, unchanged
9. **Market categories** — unchanged
10. **Comments** — market_comments, unchanged
11. **Saved bank details** — unchanged
12. **Leaderboard** — unchanged
13. **User profiles** — unchanged
14. **Username management** — unchanged
15. **Password management** — unchanged
16. **Avatar management** — unchanged

---

## PART 19: DEFINITIVE CHECKLIST

Before implementation begins, confirm:

- [ ] Database migration is reviewed and approved
- [ ] All atomic wallet operations are defined with exact SQL
- [ ] Order state machine is complete with all transitions
- [ ] Matching algorithm is deterministic and tested
- [ ] Settlement formula is correct for all outcomes
- [ ] Protected market integration is preserved
- [ ] Feature flag allows pool/orderbook coexistence
- [ ] Event log captures every lifecycle event
- [ ] No pool-payout displays remain for orderbook markets
- [ ] No read-then-write wallet operations exist
- [ ] Admin cannot manipulate matching engine
- [ ] Emergency pause is available
- [ ] All edge cases are handled
- [ ] All failure scenarios have defined behavior
- [ ] No existing functionality is broken

---

**END OF ARCHITECTURE SPECIFICATION**

This document is the definitive blueprint. Implementation begins with Sprint 1 after approval.
