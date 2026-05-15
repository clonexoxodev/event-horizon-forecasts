## 4. DATABASE / DATA STRUCTURE

### 4.1 Backend Database (Supabase PostgreSQL)

#### Tables Defined in Schema:

1. **users**
   - Purpose: Store user accounts
   - Fields: id, username, email, password_hash, profile_picture_url, instagram_handle, twitter_handle, created_at, updated_at
   - Status: ✅ Schema defined, ⚠️ Minimal usage

2. **wallets**
   - Purpose: Store user wallet balances
   - Fields: id, user_id, balance_ngn_kobo, balance_usd_cents, available_ngn_kobo, available_usd_cents, created_at, updated_at
   - Status: ✅ Schema defined, ⚠️ Minimal usage

3. **markets**
   - Purpose: Store prediction markets
   - Fields: id, question, description, currency, pool_amount_smallest_unit, yes_pool_smallest_unit, no_pool_smallest_unit, min_position_smallest_unit, max_position_smallest_unit, state, winning_side, closes_at, resolved_at, created_at, updated_at
   - Status: ✅ Schema defined, ❌ No data

4. **positions**
   - Purpose: Store user forecast positions
   - Fields: id, user_id, market_id, side, amount_smallest_unit, currency, potential_return_smallest_unit, is_winner, payout_smallest_unit, created_at, resolved_at
   - Status: ✅ Schema defined, ❌ No data

5. **transactions**
   - Purpose: Store wallet transactions
   - Fields: id, user_id, wallet_id, type, amount_smallest_unit, currency, direction, reference_id, reference_type, status, metadata, created_at
   - Status: ✅ Schema defined, ❌ No data

6. **leaderboard_entries**
   - Purpose: Store user rankings
   - Fields: id, user_id, total_points, total_predictions, correct_predictions, accuracy_percentage, rank, updated_at
   - Status: ✅ Schema defined, ❌ No data

7. **notifications**
   - Purpose: Store user notifications (backend)
   - Fields: id, user_id, type, title, message, is_read, reference_id, reference_type, created_at
   - Status: ✅ Schema defined, ❌ Not used (frontend uses localStorage)

8. **position_listings**
   - Purpose: Store marketplace listings
   - Fields: id, position_id, listing_code, asking_price, status, buyer_id, sold_at, created_at, updated_at
   - Status: ✅ Schema defined, ⚠️ Partial usage

### 4.2 Frontend State Management

#### Context Providers:

1. **AuthContext** (`auth.tsx`)
   - Purpose: Manage user authentication
   - State: user (AuthUser | null), session
   - Methods: login, signup, loginWithGoogle, logout
   - Storage: In-memory (lost on refresh)
   - Status: ✅ Working

2. **NotificationContext** (`notification-context.tsx`)
   - Purpose: Manage user notifications
   - State: notifications (Notification[]), unreadCount
   - Methods: addNotification, markAsRead, markAllAsRead, deleteNotification, clearAll
   - Storage: localStorage (`notifications_${userId}`)
   - Status: ✅ Working

3. **MarketStateContext** (`market-state.tsx`)
   - Purpose: Manage market pricing updates
   - State: markets (Market[]), userParticipation
   - Methods: setMarkets, updateMarket, getMarket
   - Storage: In-memory
   - Status: ✅ Working

4. **ForecastSlipContext** (`forecast-slip.tsx`)
   - Purpose: Manage forecast slip state
   - State: selection (ForecastSelection | null)
   - Methods: openForecastSlip, closeForecastSlip
   - Storage: In-memory
   - Status: ✅ Working

#### Data Types:

1. **AuthUser**
   ```typescript
   {
     id: string;
     email: string;
     username: string;
     name: string;
     balance: number;
   }
   ```

2. **Market**
   ```typescript
   {
     id: string;
     question: string;
     category: string;
     yesPercent: number;
     pool: number;
     closesIn: string;
     description: string;
     source: string;
     icon: string;
     yesPool: number;
     noPool: number;
     totalPool: number;
     participants: number;
     yesPrice: number;
     noPrice: number;
     closeTime: string;
     status: "active" | "closed" | "resolved";
   }
   ```

3. **Position**
   ```typescript
   {
     id: string;
     userId: string;
     marketId: string;
     side: "YES" | "NO";
     stake: number;
     entryPrice: number;
     currentPrice: number;
     currentValue: number;
     marketQuestion: string;
     marketIcon: string;
     marketStatus: "active" | "closed" | "resolved";
     createdAt: string;
     isListed: boolean;
     listingCode?: string;
     askingPrice?: number;
     listedAt?: string;
   }
   ```

4. **Notification**
   ```typescript
   {
     id: string;
     userId: string;
     type: NotificationType;
     title: string;
     message: string;
     read: boolean;
     createdAt: string;
     metadata?: {
       marketId?: string;
       marketQuestion?: string;
       side?: "YES" | "NO";
       amount?: number;
       priceChange?: number;
       outcome?: "YES" | "NO";
       won?: boolean;
       payout?: number;
       balance?: number;
       category?: string;
     };
   }
   ```

### 4.3 Demo Data

**Demo Markets** (`demo-markets.ts`):
- 6 pre-configured markets
- Used as fallback when backend is empty
- Includes: Bitcoin, Nigeria World Cup, Inflation, Apple AR, Tinubu Election, Burna Boy Grammy
- Each has realistic pool amounts and pricing

**No Other Fake Data**:
- Portfolio: Empty arrays
- Wallet transactions: Empty arrays
- Notifications: Created dynamically by user actions
- Positions: Fetched from backend (empty)
