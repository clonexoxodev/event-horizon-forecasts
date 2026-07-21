# IMPLEMENTATION PLAN — ORDER BOOK + MATCHING ENGINE

## Prerequisites
- SQL migration from `sql_chunks/01-24` must be run first
- Backend must be deployable (Vercel)
- Frontend must be deployable (Vercel)

---

## FILE CREATION MAP

### New Backend Files

```
backend/src/services/order-book.service.ts
├── createOrder(userId, marketId, side, orderType, price, quantity)
├── cancelOrder(userId, orderId)
├── getOrderBook(marketId) → { bids, asks, spread, midPrice }
├── getUserOrders(userId, marketId?)
├── getUserExposure(userId, marketId)
├── getMarketExposure(marketId)
└── getLiquiditySummary(marketId)

backend/src/services/matching.engine.ts
├── matchOrder(order) → FillResult[]
├── findOpposingOrders(order) → Order[]
├── pricesCompatible(buyOrder, sellOrder) → boolean
├── executeMatch(orderA, orderB, price, quantity) → Fill
├── updateOrderStatus(order, fillResult)
└── updateMarketOrderBook(marketId)

backend/src/services/settlement.service.ts
├── resolveMarket(marketId, winningSide) → SettlementResult
├── refundUnmatchedOrders(marketId) → RefundResult
├── calculateSettlementPreview(marketId, winningSide) → Preview
├── settlePosition(position, winningSide) → Settlement
└── createSettlementLedgerEntry(settlement)

backend/src/services/exposure.service.ts
├── checkUserExposure(userId, marketId, quantity) → boolean
├── checkSideExposure(marketId, side, quantity) → boolean
├── checkDailyExposure(userId, marketId, quantity) → boolean
├── checkOrderSize(marketId, quantity) → boolean
└── getUserExposureSummary(userId, marketId)

backend/src/repositories/order.repository.ts
├── create(order) → Order
├── findById(id) → Order
├── findByMarketAndStatus(marketId, status, side) → Order[]
├── findWaitingOrders(marketId, side) → Order[] (sorted by price, time)
├── updateFill(orderId, filledQuantity, status) → Order
├── cancel(orderId) → Order
├── getUserOrders(userId, marketId?) → Order[]
└── getUserExposure(userId, marketId) → number

backend/src/repositories/fill.repository.ts
├── create(fill) → Fill
├── findByOrderId(orderId) → Fill[]
├── findByMarketId(marketId) → Fill[]
└── findByUserId(userId) → Fill[]

backend/src/repositories/trade.repository.ts
├── create(trade) → Trade
├── findByMarketId(marketId, limit) → Trade[]
└── getRecentTrades(marketId, limit) → Trade[]

backend/src/repositories/settlement.repository.ts
├── create(settlement) → SettlementLedgerEntry
├── findByMarketId(marketId) → SettlementLedgerEntry[]
├── findByUserId(userId) → SettlementLedgerEntry[]
└── existsForOrder(orderId) → boolean (prevent double settlement)
```

### Modified Backend Files

```
backend/api/index.ts
├── POST /api/markets/:id/orders (NEW)
├── GET /api/markets/:id/orderbook (NEW)
├── GET /api/markets/:id/orders (NEW)
├── DELETE /api/markets/:id/orders/:orderId (NEW)
├── GET /api/markets/:id/trades (NEW)
├── GET /api/markets/:id/fills (NEW)
├── GET /api/orders (NEW)
├── GET /api/orders/:orderId (NEW)
├── POST /api/admin/markets/:id/matching/pause (NEW)
├── POST /api/admin/markets/:id/matching/resume (NEW)
├── GET /api/admin/markets/:id/exposure (NEW)
├── GET /api/admin/markets/:id/liquidity (NEW)
├── Modify: POST /api/markets/:id/predictions (backward compat)
├── Modify: POST /api/admin/markets/:id/resolve (new settlement)
├── Modify: GET /api/markets/:id (add order book data)
├── Modify: GET /api/wallet (add locked balance)
└── Modify: GET /api/admin/dashboard/stats (add order metrics)

backend/src/services/wallet.service.ts
├── lockBalanceForOrder(userId, currency, amount) → Wallet
├── unlockBalanceFromOrder(userId, currency, amount) → Wallet
├── transferLockedToAvailable(userId, currency, amount) → Wallet
└── getLockedBalance(userId) → number

backend/src/repositories/wallet.repository.ts
├── atomicDecrementAvailable(userId, currency, amount) → Wallet | null
├── atomicIncrementLocked(userId, currency, amount) → Wallet
├── atomicDecrementLocked(userId, currency, amount) → Wallet
└── atomicTransferLockedToAvailable(userId, currency, amount) → Wallet
```

### New Frontend Files

```
src/components/prediction/OrderBookDepth.tsx
├── Displays bid/ask depth visualization
├── Real-time updates via polling
└── Shows spread, mid price, last trade

src/components/prediction/OrderStatusCard.tsx
├── Shows individual order status
├── Displays fills, waiting amount, matched amount
└── Cancel button for waiting orders

src/components/prediction/OrderHistory.tsx
├── Lists all user orders for a market
├── Shows status, fills, timestamps
└── Filterable by status

src/components/admin/ExposureMonitor.tsx
├── Per-user exposure display
├── Per-side exposure display
├── Daily exposure tracking
└── Alerts for limit approaching
```

### Modified Frontend Files

```
src/lib/api.ts
├── add: placeOrder(marketId, side, price, quantity) → Order
├── add: getOrderBook(marketId) → OrderBookDepth
├── add: getUserOrders(marketId?) → Order[]
├── add: cancelOrder(marketId, orderId) → void
├── add: getRecentTrades(marketId) → Trade[]
├── add: getOrderFills(orderId) → Fill[]
├── modify: getMarket() → includes bestBid, bestAsk, spread
├── modify: getWallet() → includes lockedBalance
├── remove: calculatePotentialReturn()
└── remove: getPoolBasedPayout()

src/lib/types.ts
├── add: Order interface
├── add: Fill interface
├── add: Trade interface
├── add: OrderBookDepth interface
├── add: SettlementPreview interface
├── modify: ApiMarket → add order book fields
├── modify: ApiPosition → add order_id, fill_id
└── remove: pool-based payout fields

src/lib/market-pricing.ts
├── REPLACE: calculateMarketPrices() → use order book mid-price
├── REPLACE: calculatePriceImpact() → use order book depth
├── REPLACE: calculateSlippage() → use order book spread
├── REMOVE: All pool-based pricing functions
└── ADD: getOrderBookMidPrice(), getBestBid(), getBestAsk()

src/lib/markets.ts
├── MODIFY: updateMarketPricing() → use order book state
├── MODIFY: getMarketActivation() → use matched volume
├── REMOVE: Pool-based price calculations
└── ADD: Order book state management

src/lib/positions.ts
├── REMOVE: calculateEstimatedValue() pool formula
├── ADD: calculatePositionValue() from fills + current bid
└── ADD: getPositionOrderStatus()

src/lib/market-state.tsx
├── ADD: orderBook state (bids, asks, depth)
├── ADD: recentTrades state
├── MODIFY: optimistic updates → order book updates
└── REMOVE: optimistic pool updates

src/components/prediction/ForecastSlip.tsx
├── COMPLETE REWRITE:
│   ├── Price input (limit price)
│   ├── Amount input
│   ├── Order summary (value, est entry, spread)
│   ├── Status display (waiting/matched)
│   └── Settlement explanation
├── REMOVE: All "Estimated Return/Profit" displays
└── ADD: Order book context (best bid/ask)

src/components/prediction/MarketCard.tsx
├── REPLACE: Pool display → Order book stats
├── REPLACE: Fixed odds → Best bid/ask
├── REMOVE: "₦X pool" display
├── ADD: Spread, last trade, order count
└── ADD: Mini order book depth indicator

src/components/prediction/MyBetsCard.tsx
├── COMPLETE REWRITE:
│   ├── Order status (waiting/partial/filled)
│   ├── Matched amount vs waiting amount
│   ├── Individual fills list
│   ├── Cancel waiting button
│   └── No "projected payout" — show shares instead

src/components/prediction/PlaceBetModal.tsx
├── COMPLETE REWRITE for order book
├── Limit order form
├── Market order option (cross spread)
└── Order confirmation with book context

src/components/prediction/SellPositionModal.tsx
├── CREATE SELL ORDER instead of P2P listing
├── Set asking price
├── Submit to order book
└── Show estimated match time

src/pages/MarketDetail.tsx
├── ADD: Order book depth component
├── REPLACE: Pool-based prediction sheet → Order form
├── REPLACE: "Est. return/profit" → Order summary
├── ADD: Recent trades display
├── MODIFY: Stats → spread, volume, orders
├── ADD: Order book chart visualization
└── REMOVE: Pool-ratio price calculations

src/pages/Dashboard.tsx
├── REPLACE: Pool-based position values → Order-based
├── REPLACE: getPredictionInsight() → order fill data
├── MODIFY: Position card → order status + fills
├── MODIFY: P/L calculation → from fills + current bid
└── REMOVE: All pool formula fallbacks

src/pages/Profile.tsx
├── MODIFY: Active value → sum of matched order values
├── MODIFY: Position list → order-based display
└── ADD: Order history section

src/components/admin/MarketsView.tsx
├── ADD: Order book stats column
├── ADD: Exposure column
├── ADD: Best bid/ask display
└── MODIFY: Pool → matched volume

src/components/admin/MarketDetailView.tsx
├── ADD: Full order book depth display
├── ADD: Exposure limits configuration
├── ADD: Settlement preview (new logic)
├── ADD: Pending refunds queue
├── MODIFY: Resolution → order-based settlement
└── ADD: Matching engine status (paused/active)

src/components/admin/FinanceView.tsx
├── ADD: Locked balance tracking
├── ADD: Order-related financial metrics
└── MODIFY: Revenue → from matched trades

src/components/admin/DashboardView.tsx
├── ADD: Active orders count
├── ADD: Matched volume today
├── ADD: Pending settlements
└── MODIFY: Statistics → order book metrics

src/components/admin/types.ts
├── ADD: AdminOrderBook type
├── ADD: AdminExposure type
├── ADD: AdminSettlement type
└── MODIFY: ResolutionPreview → order-based
```

---

## IMPLEMENTATION SEQUENCE

### Sprint 1: Database + Atomic Operations (Days 1-3)

**Day 1: Database Migration**
1. Create `backend/src/migrations/20260721_order_book.sql`
2. All new tables (orders, order_fills, trades, order_book_snapshots, settlement_ledger)
3. All new columns on existing tables
4. Atomic balance update functions
5. Test migration on local Supabase

**Day 2: Atomic Wallet Operations**
1. Modify `wallet.repository.ts`:
   - Add `atomicDecrementAvailable()` — single SQL UPDATE with WHERE guard
   - Add `atomicIncrementLocked()`
   - Add `atomicDecrementLocked()`
   - Add `atomicTransferLockedToAvailable()`
2. Test each operation for race conditions
3. Modify `wallet.service.ts`:
   - Add `lockBalanceForOrder()`
   - Add `unlockBalanceFromOrder()`
   - Add `transferLockedToAvailable()`

**Day 3: Order Repository**
1. Create `order.repository.ts`
2. Full CRUD for orders
3. Priority queue queries (price DESC, time ASC)
4. Exposure calculation queries
5. Test with concurrent inserts

### Sprint 2: Matching Engine (Days 4-6)

**Day 4: Matching Engine Core**
1. Create `matching.engine.ts`
2. Implement `matchOrder()` algorithm
3. Implement `findOpposingOrders()` query
4. Implement `pricesCompatible()` logic
5. Implement `executeMatch()` with atomic updates

**Day 5: Fill + Trade Recording**
1. Create `fill.repository.ts`
2. Create `trade.repository.ts`
3. Implement fill creation (per order)
4. Implement trade creation (per match)
5. Test partial fills, multiple fills

**Day 6: Exposure Service**
1. Create `exposure.service.ts`
2. Implement per-user exposure check
3. Implement per-side exposure check
4. Implement daily exposure check
5. Implement order size check
6. Test rejection scenarios

### Sprint 3: Order Book Service + API (Days 7-9)

**Day 7: Order Book Service**
1. Create `order-book.service.ts`
2. Implement `createOrder()` (validate → lock → match → update)
3. Implement `cancelOrder()` (validate → unlock → remove)
4. Implement `getOrderBook()` (depth aggregation)
5. Implement `getUserOrders()` and exposure queries

**Day 8: Settlement Service**
1. Create `settlement.service.ts`
2. Implement `resolveMarket()` with order-based settlement
3. Implement `refundUnmatchedOrders()`
4. Implement `calculateSettlementPreview()`
5. Create `settlement.repository.ts`

**Day 9: API Endpoints**
1. Add all new endpoints to `api/index.ts`
2. Modify existing endpoints (predictions, resolve, wallet)
3. Backward compatibility for old prediction format
4. Test all endpoints with curl/Postman

### Sprint 4: Frontend - Order Placement (Days 10-12)

**Day 10: Types + API Layer**
1. Update `src/lib/types.ts` with Order, Fill, Trade types
2. Update `src/lib/api.ts` with order endpoints
3. Remove pool-payout methods
4. Add order book data fetching

**Day 11: ForecastSlip Rewrite**
1. Complete rewrite of `ForecastSlip.tsx`
2. Limit order form (price + amount)
3. Order summary (value, entry price, spread)
4. Remove all "Estimated Return/Profit"
5. Add order status display

**Day 12: MarketDetail Order Book**
1. Create `OrderBookDepth.tsx` component
2. Add to `MarketDetail.tsx`
3. Replace prediction sheet with order form
4. Add recent trades display
5. Add spread/mid-price stats

### Sprint 5: Frontend - Portfolio & Cards (Days 13-15)

**Day 13: MarketCard + MyBetsCard**
1. Rewrite `MarketCard.tsx` (order book stats)
2. Rewrite `MyBetsCard.tsx` (order status + fills)
3. Add mini order book depth indicator

**Day 14: Dashboard + Profile**
1. Update `Dashboard.tsx` (order-based position values)
2. Update `Profile.tsx` (portfolio stats)
3. Replace pool-based P/L calculations

**Day 15: Wallet + Notifications**
1. Update wallet display (locked balance)
2. Add order status notifications
3. Add fill notifications
4. Add settlement notifications

### Sprint 6: Admin + Polish (Days 16-18)

**Day 16: Admin Order Management**
1. Add exposure monitor to admin
2. Add order book management
3. Add settlement preview
4. Add matching engine controls (pause/resume)

**Day 17: Admin Finance + Dashboard**
1. Update finance view (locked balances)
2. Update dashboard (order metrics)
3. Add liquidity summary
4. Add pending refunds queue

**Day 18: Migration Tool**
1. Admin tool to migrate existing markets
2. Convert pool positions to synthetic orders
3. Verify migration correctness
4. Test edge cases

### Sprint 7: Testing + Security (Days 19-21)

**Day 19: Integration Testing**
1. End-to-end order placement flow
2. End-to-end matching flow
3. End-to-end settlement flow
4. End-to-end refund flow

**Day 20: Security Testing**
1. Race condition tests (concurrent orders)
2. Double-match prevention tests
3. Double-settlement prevention tests
4. Balance corruption tests
5. Exposure limit bypass tests

**Day 21: Performance + Deployment**
1. Load test with 100 concurrent users
2. Index optimization
3. Final security review
4. Deploy to staging
5. Deploy to production

---

## CRITICAL PATH ITEMS

1. **Atomic wallet operations** — must be first, everything depends on it
2. **Matching engine** — core business logic, must be bulletproof
3. **Settlement** — money calculations must be exact
4. **Frontend order slip** — primary user interaction
5. **Admin controls** — safety mechanism for emergencies

---

## TESTING STRATEGY

### Unit Tests
- Matching engine: 20+ test cases (basic match, partial, multiple, price priority, time priority)
- Exposure service: 15+ test cases (user limit, side limit, daily limit, order size)
- Settlement service: 10+ test cases (YES win, NO win, refund, mixed)

### Integration Tests
- Order placement → matching → fill → position creation
- Order cancellation → balance unlock
- Market resolution → settlement → balance credit
- Concurrent order placement (race condition)

### E2E Tests
- User places order → sees in book → gets matched → sees fill
- Admin resolves → user sees settlement → balance updated
- User cancels waiting order → balance restored

---

## DEPLOYMENT CHECKLIST

- [ ] Database migration runs without errors
- [ ] All new tables created
- [ ] All new columns added
- [ ] Atomic wallet operations work
- [ ] Matching engine passes all tests
- [ ] Settlement passes all tests
- [ ] New API endpoints respond correctly
- [ ] Old endpoints still work (backward compat)
- [ ] Frontend builds without errors
- [ ] Order placement flow works end-to-end
- [ ] Order book depth displays correctly
- [ ] Position display shows order status
- [ ] Wallet shows locked balance
- [ ] Admin can pause matching
- [ ] Admin can see exposure
- [ ] No pool-payout displays remain
- [ ] Protected Markets still work
- [ ] Flutterwave still works
- [ ] Notifications still work
- [ ] Audit trail still works
