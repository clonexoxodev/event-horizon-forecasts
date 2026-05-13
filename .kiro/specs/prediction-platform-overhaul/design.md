# Design Document: Prediction Platform Overhaul

## Overview

The Prediction Platform is a full-stack web application enabling users to make predictions on binary outcome markets. The system emphasizes clean architecture, transparent wallet management with zero-balance initialization, multi-currency support (NGN/USD), and social engagement through leaderboards and sharing.

### Core Features
- Zero-balance wallet initialization with multi-currency support
- Real-time market updates and position tracking
- Multi-market cart for bulk position entry
- Social features (leaderboards, sharing, activity feeds)
- Profile management with social media integration
- Comprehensive transaction history

### Technology Stack
- **Frontend**: React with TypeScript, TailwindCSS for styling
- **State Management**: React Context API + Custom hooks for wallet/market state
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL for relational data integrity
- **Real-time**: WebSocket (Socket.io) for live updates
- **Authentication**: JWT-based authentication with httpOnly cookies
- **File Storage**: AWS S3 or Cloudinary for profile pictures
- **Currency Conversion**: External API (e.g., exchangerate-api.io) with caching

## Architecture

### System Architecture

The platform follows a three-tier architecture with clear separation of concerns:

```
Client Layer (React) → API Layer (Express) → Database (PostgreSQL)
       ↓                      ↓
  State Management      Business Logic
  (Context + Hooks)     (Services)
       ↓                      ↓
  WebSocket Client      WebSocket Server
```

### Key Architectural Decisions

1. **Zero-Balance Wallet Design**: Wallets initialize with 0.00 balance
2. **Multi-Currency Support**: Store amounts in smallest unit (kobo/cents) as integers
3. **Real-time Updates**: WebSocket connections for live data
4. **Optimistic UI Updates**: Frontend updates immediately with rollback on error
5. **Transaction Atomicity**: Database transactions ensure consistency
6. **Stateless API**: JWT tokens enable horizontal scaling

## Components and Interfaces

### Frontend Component Structure

```
src/
├── components/
│   ├── auth/           # LoginForm, SignupForm, AuthGuard
│   ├── wallet/         # WalletBalance, CurrencyToggle, DepositModal, WithdrawModal, TransactionHistory
│   ├── markets/        # MarketCard, MarketList, MarketDetails, PositionPanel, PositionCart
│   ├── dashboard/      # DashboardOverview, ActivePositions, PastResults
│   ├── profile/        # ProfileEditor, ProfilePictureUpload, SocialLinks
│   ├── leaderboard/    # LeaderboardTable, LeaderboardEntry
│   ├── social/         # ShareCard, ActivityFeed, RecentWinners
│   └── common/         # Button, Input, Modal, CountdownTimer
├── contexts/           # AuthContext, WalletContext, MarketContext
├── hooks/              # useAuth, useWallet, useMarkets, useWebSocket, useCurrencyConversion
├── services/           # api, websocket, storage
└── types/              # user, wallet, market, transaction
```

### Backend Component Structure

```
src/
├── routes/             # auth, user, wallet, market, position, leaderboard
├── services/           # auth, wallet, market, position, transaction, leaderboard, currency, notification
├── repositories/       # user, wallet, market, position, transaction
├── middleware/         # auth, validation, error
├── websocket/          # handlers, events
├── parsers/            # market.parser, api.parser
└── types/              # user, wallet, market, transaction
```

### API Endpoints

#### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - End user session
- `GET /api/auth/me` - Get current user info

#### User Profile
- `GET /api/users/:id` - Get user profile
- `PATCH /api/users/:id` - Update user profile
- `POST /api/users/:id/profile-picture` - Upload profile picture
- `PATCH /api/users/:id/social-links` - Update social media links

#### Wallet
- `GET /api/wallet` - Get wallet balance and info
- `POST /api/wallet/deposit` - Initiate deposit
- `POST /api/wallet/withdraw` - Initiate withdrawal
- `GET /api/wallet/transactions` - Get transaction history
- `GET /api/wallet/convert` - Get currency conversion rate

#### Markets
- `GET /api/markets` - List all active markets
- `GET /api/markets/:id` - Get market details
- `GET /api/markets/:id/positions` - Get positions for a market
- `GET /api/markets/popular` - Get popular markets

#### Positions
- `POST /api/positions` - Create single position
- `POST /api/positions/bulk` - Create multiple positions (cart)
- `GET /api/positions/user/:userId` - Get user's positions
- `GET /api/positions/active` - Get user's active positions

#### Leaderboard
- `GET /api/leaderboard` - Get leaderboard rankings
- `GET /api/leaderboard/:userId` - Get user's leaderboard entry

#### Social
- `GET /api/activity` - Get recent activity feed
- `GET /api/winners/recent` - Get recent winners
- `POST /api/share/prediction` - Generate share card for prediction
- `POST /api/share/win` - Generate share card for win

#### Notifications
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all` - Mark all as read


## Data Models

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_picture_url VARCHAR(500),
  instagram_handle VARCHAR(100),
  twitter_handle VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

#### Wallets Table
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance_ngn_kobo BIGINT NOT NULL DEFAULT 0,
  balance_usd_cents BIGINT NOT NULL DEFAULT 0,
  available_ngn_kobo BIGINT NOT NULL DEFAULT 0,
  available_usd_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT balance_non_negative CHECK (balance_ngn_kobo >= 0 AND balance_usd_cents >= 0),
  CONSTRAINT available_non_negative CHECK (available_ngn_kobo >= 0 AND available_usd_cents >= 0),
  CONSTRAINT available_lte_balance CHECK (
    available_ngn_kobo <= balance_ngn_kobo AND 
    available_usd_cents <= balance_usd_cents
  )
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
```


#### Markets Table
```sql
CREATE TABLE markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  description TEXT,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'USD')),
  pool_amount_smallest_unit BIGINT NOT NULL DEFAULT 0,
  yes_pool_smallest_unit BIGINT NOT NULL DEFAULT 0,
  no_pool_smallest_unit BIGINT NOT NULL DEFAULT 0,
  min_position_smallest_unit BIGINT NOT NULL,
  max_position_smallest_unit BIGINT,
  state VARCHAR(20) NOT NULL CHECK (state IN ('active', 'closed', 'resolved')),
  winning_side VARCHAR(3) CHECK (winning_side IN ('YES', 'NO')),
  closes_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pool_consistency CHECK (
    pool_amount_smallest_unit = yes_pool_smallest_unit + no_pool_smallest_unit
  )
);

CREATE INDEX idx_markets_state ON markets(state);
CREATE INDEX idx_markets_closes_at ON markets(closes_at);
CREATE INDEX idx_markets_created_at ON markets(created_at DESC);
```

#### Positions Table
```sql
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  side VARCHAR(3) NOT NULL CHECK (side IN ('YES', 'NO')),
  amount_smallest_unit BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'USD')),
  potential_return_smallest_unit BIGINT NOT NULL,
  is_winner BOOLEAN,
  payout_smallest_unit BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  CONSTRAINT amount_positive CHECK (amount_smallest_unit > 0)
);

CREATE INDEX idx_positions_user_id ON positions(user_id);
CREATE INDEX idx_positions_market_id ON positions(market_id);
CREATE INDEX idx_positions_created_at ON positions(created_at DESC);
CREATE INDEX idx_positions_user_market ON positions(user_id, market_id);
```


#### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'position_entry', 'position_payout')),
  amount_smallest_unit BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'USD')),
  direction VARCHAR(3) NOT NULL CHECK (direction IN ('IN', 'OUT')),
  reference_id UUID,
  reference_type VARCHAR(20) CHECK (reference_type IN ('position', 'deposit', 'withdrawal')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT amount_positive CHECK (amount_smallest_unit > 0)
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_reference ON transactions(reference_id, reference_type);
```

#### Leaderboard Table
```sql
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  correct_predictions INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  rank INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT accuracy_range CHECK (accuracy_percentage >= 0 AND accuracy_percentage <= 100),
  CONSTRAINT predictions_consistency CHECK (correct_predictions <= total_predictions)
);

CREATE INDEX idx_leaderboard_rank ON leaderboard_entries(rank);
CREATE INDEX idx_leaderboard_points ON leaderboard_entries(total_points DESC);
CREATE INDEX idx_leaderboard_user_id ON leaderboard_entries(user_id);
```

#### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('market_resolved', 'deposit_confirmed', 'withdrawal_confirmed', 'position_won', 'position_lost')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  reference_id UUID,
  reference_type VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
```


### TypeScript Interfaces

#### User Types
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  profilePictureUrl?: string;
  instagramHandle?: string;
  twitterHandle?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthResponse {
  user: User;
  token: string;
}
```

#### Wallet Types
```typescript
interface Wallet {
  id: string;
  userId: string;
  balanceNgnKobo: number;
  balanceUsdCents: number;
  availableNgnKobo: number;
  availableUsdCents: number;
  createdAt: Date;
  updatedAt: Date;
}

interface WalletDisplay {
  totalBalance: string;
  availableBalance: string;
  currency: 'NGN' | 'USD';
}

interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: 'deposit' | 'withdrawal' | 'position_entry' | 'position_payout';
  amountSmallestUnit: number;
  currency: 'NGN' | 'USD';
  direction: 'IN' | 'OUT';
  referenceId?: string;
  referenceType?: 'position' | 'deposit' | 'withdrawal';
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  createdAt: Date;
}
```

#### Market Types
```typescript
interface Market {
  id: string;
  question: string;
  description?: string;
  currency: 'NGN' | 'USD';
  poolAmountSmallestUnit: number;
  yesPoolSmallestUnit: number;
  noPoolSmallestUnit: number;
  minPositionSmallestUnit: number;
  maxPositionSmallestUnit?: number;
  state: 'active' | 'closed' | 'resolved';
  winningSide?: 'YES' | 'NO';
  closesAt: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface MarketDisplay {
  id: string;
  question: string;
  yesPercentage: number;
  noPercentage: number;
  poolAmount: string;
  timeRemaining: string;
  isPopular: boolean;
  positionCount: number;
}

interface Position {
  id: string;
  userId: string;
  marketId: string;
  side: 'YES' | 'NO';
  amountSmallestUnit: number;
  currency: 'NGN' | 'USD';
  potentialReturnSmallestUnit: number;
  isWinner?: boolean;
  payoutSmallestUnit?: number;
  createdAt: Date;
  resolvedAt?: Date;
}

interface PositionCartItem {
  marketId: string;
  marketQuestion: string;
  side: 'YES' | 'NO';
  amountSmallestUnit: number;
  currency: 'NGN' | 'USD';
}
```


## Authentication Flow

### Registration and Login Process

```
User → Frontend → API → Database
  1. User submits credentials
  2. Frontend validates input format
  3. API validates credentials
  4. API hashes password (bcrypt)
  5. API creates user record
  6. API creates wallet with zero balance
  7. API generates JWT token
  8. API sets httpOnly cookie
  9. Frontend stores user in context
  10. Frontend redirects to dashboard
```

### JWT Token Structure
```typescript
interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  iat: number;  // issued at
  exp: number;  // expires at (24 hours)
}
```

### Session Management
- JWT stored in httpOnly cookie (prevents XSS attacks)
- Token expires after 24 hours
- Refresh token mechanism for extended sessions
- Logout clears cookie and client-side state

### Protected Routes
- Frontend: `AuthGuard` component wraps protected routes
- Backend: `authMiddleware` validates JWT on protected endpoints
- Unauthorized requests return 401 status

## Wallet System Implementation

### Zero-Balance Initialization

When a user account is created:
```typescript
async function createUserWallet(userId: string): Promise<Wallet> {
  return await db.wallets.create({
    userId,
    balanceNgnKobo: 0,
    balanceUsdCents: 0,
    availableNgnKobo: 0,
    availableUsdCents: 0
  });
}
```

### Currency Storage Strategy

All monetary values stored as integers in smallest unit:
- NGN: stored as kobo (1 NGN = 100 kobo)
- USD: stored as cents (1 USD = 100 cents)

Benefits:
- Eliminates floating-point precision errors
- Ensures accurate calculations
- Simplifies database queries

### Currency Conversion

```typescript
interface CurrencyService {
  getExchangeRate(from: 'NGN' | 'USD', to: 'NGN' | 'USD'): Promise<number>;
  convert(amount: number, from: 'NGN' | 'USD', to: 'NGN' | 'USD'): Promise<number>;
}

// Implementation with caching
class CurrencyServiceImpl implements CurrencyService {
  private cache: Map<string, { rate: number; timestamp: number }>;
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getExchangeRate(from: string, to: string): Promise<number> {
    const cacheKey = `${from}_${to}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.rate;
    }

    const rate = await this.fetchFromAPI(from, to);
    this.cache.set(cacheKey, { rate, timestamp: Date.now() });
    return rate;
  }
}
```

### Balance Display Logic

```typescript
function formatBalance(amountSmallestUnit: number, currency: 'NGN' | 'USD'): string {
  const divisor = 100;
  const amount = amountSmallestUnit / divisor;
  const symbol = currency === 'NGN' ? '₦' : '$';
  return `${symbol}${amount.toFixed(2)}`;
}
```


### Transaction Processing

#### Deposit Flow
```typescript
async function processDeposit(
  userId: string,
  amountSmallestUnit: number,
  currency: 'NGN' | 'USD',
  method: 'bank_transfer' | 'card' | 'crypto'
): Promise<Transaction> {
  return await db.transaction(async (trx) => {
    // Create transaction record
    const transaction = await trx.transactions.create({
      userId,
      type: 'deposit',
      amountSmallestUnit,
      currency,
      direction: 'IN',
      status: 'pending',
      metadata: { method }
    });

    // Update wallet balance (after payment confirmation)
    if (currency === 'NGN') {
      await trx.wallets.increment('balanceNgnKobo', amountSmallestUnit);
      await trx.wallets.increment('availableNgnKobo', amountSmallestUnit);
    } else {
      await trx.wallets.increment('balanceUsdCents', amountSmallestUnit);
      await trx.wallets.increment('availableUsdCents', amountSmallestUnit);
    }

    return transaction;
  });
}
```

#### Position Entry Flow
```typescript
async function createPosition(
  userId: string,
  marketId: string,
  side: 'YES' | 'NO',
  amountSmallestUnit: number
): Promise<Position> {
  return await db.transaction(async (trx) => {
    // 1. Validate market is active
    const market = await trx.markets.findById(marketId);
    if (market.state !== 'active') {
      throw new Error('Market is not active');
    }

    // 2. Validate sufficient balance
    const wallet = await trx.wallets.findByUserId(userId);
    const availableBalance = market.currency === 'NGN' 
      ? wallet.availableNgnKobo 
      : wallet.availableUsdCents;
    
    if (availableBalance < amountSmallestUnit) {
      throw new Error('Insufficient balance');
    }

    // 3. Calculate potential return
    const potentialReturn = calculatePotentialReturn(
      amountSmallestUnit,
      side,
      market.yesPoolSmallestUnit,
      market.noPoolSmallestUnit
    );

    // 4. Create position
    const position = await trx.positions.create({
      userId,
      marketId,
      side,
      amountSmallestUnit,
      currency: market.currency,
      potentialReturnSmallestUnit: potentialReturn
    });

    // 5. Update wallet (deduct from available)
    if (market.currency === 'NGN') {
      await trx.wallets.decrement('availableNgnKobo', amountSmallestUnit);
    } else {
      await trx.wallets.decrement('availableUsdCents', amountSmallestUnit);
    }

    // 6. Update market pool
    await trx.markets.increment('poolAmountSmallestUnit', amountSmallestUnit);
    if (side === 'YES') {
      await trx.markets.increment('yesPoolSmallestUnit', amountSmallestUnit);
    } else {
      await trx.markets.increment('noPoolSmallestUnit', amountSmallestUnit);
    }

    // 7. Create transaction record
    await trx.transactions.create({
      userId,
      walletId: wallet.id,
      type: 'position_entry',
      amountSmallestUnit,
      currency: market.currency,
      direction: 'OUT',
      referenceId: position.id,
      referenceType: 'position',
      status: 'completed'
    });

    return position;
  });
}
```


## Multi-Market Cart Implementation

### Cart State Management

```typescript
interface CartState {
  items: PositionCartItem[];
  totalAmountSmallestUnit: number;
  currency: 'NGN' | 'USD';
}

interface CartActions {
  addToCart: (market: Market, side: 'YES' | 'NO', amount: number) => void;
  removeFromCart: (marketId: string) => void;
  updateAmount: (marketId: string, amount: number) => void;
  clearCart: () => void;
  submitCart: () => Promise<void>;
}

// React Context implementation
const CartContext = createContext<CartState & CartActions | null>(null);

function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PositionCartItem[]>([]);

  const addToCart = (market: Market, side: 'YES' | 'NO', amount: number) => {
    setItems(prev => {
      const existing = prev.find(item => item.marketId === market.id);
      if (existing) {
        return prev.map(item =>
          item.marketId === market.id
            ? { ...item, amountSmallestUnit: amount, side }
            : item
        );
      }
      return [...prev, {
        marketId: market.id,
        marketQuestion: market.question,
        side,
        amountSmallestUnit: amount,
        currency: market.currency
      }];
    });
  };

  const submitCart = async () => {
    try {
      await api.post('/positions/bulk', { positions: items });
      clearCart();
    } catch (error) {
      // Handle error
    }
  };

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateAmount, clearCart, submitCart }}>
      {children}
    </CartContext.Provider>
  );
}
```

### Bulk Position Creation

```typescript
async function createBulkPositions(
  userId: string,
  positions: PositionCartItem[]
): Promise<Position[]> {
  return await db.transaction(async (trx) => {
    const wallet = await trx.wallets.findByUserId(userId);
    const createdPositions: Position[] = [];

    // Calculate total required
    const totalRequired = positions.reduce((sum, p) => sum + p.amountSmallestUnit, 0);
    
    // Validate sufficient balance
    const currency = positions[0].currency;
    const availableBalance = currency === 'NGN' 
      ? wallet.availableNgnKobo 
      : wallet.availableUsdCents;
    
    if (availableBalance < totalRequired) {
      throw new Error('Insufficient balance for bulk positions');
    }

    // Create each position
    for (const item of positions) {
      const position = await createPositionInTransaction(trx, userId, item);
      createdPositions.push(position);
    }

    return createdPositions;
  });
}
```

## State Management Approach

### Context Structure

```typescript
// AuthContext
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

// WalletContext
interface WalletContextType {
  wallet: Wallet | null;
  displayCurrency: 'NGN' | 'USD';
  displayBalance: WalletDisplay;
  transactions: Transaction[];
  toggleCurrency: () => void;
  deposit: (amount: number, method: string) => Promise<void>;
  withdraw: (amount: number) => Promise<void>;
  refreshWallet: () => Promise<void>;
  loading: boolean;
}

// MarketContext
interface MarketContextType {
  markets: Market[];
  activeMarket: Market | null;
  popularMarkets: Market[];
  setActiveMarket: (marketId: string) => void;
  refreshMarkets: () => Promise<void>;
  loading: boolean;
}
```

### Custom Hooks

```typescript
// useAuth hook
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// useWallet hook with currency conversion
function useWallet() {
  const context = useContext(WalletContext);
  const { convertAmount } = useCurrencyConversion();

  const getDisplayBalance = useCallback(() => {
    if (!context.wallet) return { totalBalance: '0.00', availableBalance: '0.00', currency: context.displayCurrency };

    const balanceSmallestUnit = context.displayCurrency === 'NGN'
      ? context.wallet.balanceNgnKobo
      : context.wallet.balanceUsdCents;

    const availableSmallestUnit = context.displayCurrency === 'NGN'
      ? context.wallet.availableNgnKobo
      : context.wallet.availableUsdCents;

    return {
      totalBalance: formatBalance(balanceSmallestUnit, context.displayCurrency),
      availableBalance: formatBalance(availableSmallestUnit, context.displayCurrency),
      currency: context.displayCurrency
    };
  }, [context.wallet, context.displayCurrency]);

  return { ...context, displayBalance: getDisplayBalance() };
}
```


## Real-Time Updates Strategy

### WebSocket Architecture

```typescript
// Server-side WebSocket events
enum WebSocketEvent {
  MARKET_UPDATE = 'market:update',
  MARKET_CLOSED = 'market:closed',
  MARKET_RESOLVED = 'market:resolved',
  POSITION_CREATED = 'position:created',
  WALLET_UPDATE = 'wallet:update',
  LEADERBOARD_UPDATE = 'leaderboard:update',
  ACTIVITY_UPDATE = 'activity:update'
}

// WebSocket server setup
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;

  // Join user-specific room
  socket.join(`user:${userId}`);

  // Subscribe to market updates
  socket.on('subscribe:market', (marketId) => {
    socket.join(`market:${marketId}`);
  });

  socket.on('unsubscribe:market', (marketId) => {
    socket.leave(`market:${marketId}`);
  });
});

// Emit market update
function broadcastMarketUpdate(marketId: string, market: Market) {
  io.to(`market:${marketId}`).emit(WebSocketEvent.MARKET_UPDATE, market);
}

// Emit wallet update to specific user
function notifyWalletUpdate(userId: string, wallet: Wallet) {
  io.to(`user:${userId}`).emit(WebSocketEvent.WALLET_UPDATE, wallet);
}
```

### Client-side WebSocket Hook

```typescript
function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const newSocket = io(WS_URL, {
      auth: { userId: user.id }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  const subscribeToMarket = useCallback((marketId: string, callback: (market: Market) => void) => {
    if (!socket) return;

    socket.emit('subscribe:market', marketId);
    socket.on(WebSocketEvent.MARKET_UPDATE, callback);

    return () => {
      socket.emit('unsubscribe:market', marketId);
      socket.off(WebSocketEvent.MARKET_UPDATE, callback);
    };
  }, [socket]);

  const subscribeToWallet = useCallback((callback: (wallet: Wallet) => void) => {
    if (!socket) return;

    socket.on(WebSocketEvent.WALLET_UPDATE, callback);

    return () => {
      socket.off(WebSocketEvent.WALLET_UPDATE, callback);
    };
  }, [socket]);

  return { socket, subscribeToMarket, subscribeToWallet };
}
```

### Optimistic UI Updates

```typescript
// Example: Optimistic position creation
async function createPositionOptimistic(
  marketId: string,
  side: 'YES' | 'NO',
  amount: number
) {
  // 1. Optimistically update UI
  const tempPosition = {
    id: 'temp-' + Date.now(),
    marketId,
    side,
    amountSmallestUnit: amount,
    status: 'pending'
  };
  
  setPositions(prev => [...prev, tempPosition]);
  setWallet(prev => ({
    ...prev,
    availableBalance: prev.availableBalance - amount
  }));

  try {
    // 2. Send request to server
    const position = await api.post('/positions', { marketId, side, amount });
    
    // 3. Replace temp with real data
    setPositions(prev => 
      prev.map(p => p.id === tempPosition.id ? position : p)
    );
  } catch (error) {
    // 4. Rollback on error
    setPositions(prev => prev.filter(p => p.id !== tempPosition.id));
    setWallet(prev => ({
      ...prev,
      availableBalance: prev.availableBalance + amount
    }));
    
    throw error;
  }
}
```

## File Upload Handling

### Profile Picture Upload

```typescript
// Frontend: File upload component
async function uploadProfilePicture(file: File): Promise<string> {
  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    throw new Error('File size must be less than 5MB');
  }

  // Create form data
  const formData = new FormData();
  formData.append('profilePicture', file);

  // Upload
  const response = await api.post('/users/profile-picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return response.data.url;
}

// Backend: File upload handler
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

router.post('/profile-picture', 
  authMiddleware,
  upload.single('profilePicture'),
  async (req, res) => {
    const file = req.file;
    const userId = req.user.id;

    // Upload to S3
    const key = `profile-pictures/${userId}/${Date.now()}-${file.originalname}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    }));

    const url = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;

    // Update user record
    await db.users.update(userId, { profilePictureUrl: url });

    res.json({ url });
  }
);
```


## Social Sharing Implementation

### Share Card Generation

```typescript
// Backend: Generate share card image
import { createCanvas, loadImage } from 'canvas';

async function generateShareCard(
  type: 'prediction' | 'win',
  data: {
    username: string;
    marketQuestion: string;
    side: 'YES' | 'NO';
    amount?: string;
    result?: 'won' | 'lost';
  }
): Promise<Buffer> {
  const canvas = createCanvas(1200, 630); // Open Graph size
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 1200, 630);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.fillText(data.username, 60, 100);

  // Market question
  ctx.font = '36px Arial';
  ctx.fillText(data.marketQuestion, 60, 200);

  // Prediction
  ctx.fillStyle = data.side === 'YES' ? '#10b981' : '#ef4444';
  ctx.font = 'bold 72px Arial';
  ctx.fillText(data.side, 60, 320);

  // Result (if win)
  if (type === 'win' && data.result === 'won') {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('🎉 WON!', 60, 420);
  }

  return canvas.toBuffer('image/png');
}

// API endpoint
router.post('/share/prediction', authMiddleware, async (req, res) => {
  const { positionId } = req.body;
  const position = await db.positions.findById(positionId);
  const market = await db.markets.findById(position.marketId);
  const user = await db.users.findById(position.userId);

  const imageBuffer = await generateShareCard('prediction', {
    username: user.username,
    marketQuestion: market.question,
    side: position.side
  });

  // Upload to S3
  const key = `share-cards/${positionId}.png`;
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/png'
  }));

  const url = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
  res.json({ url });
});
```

### Social Media Integration

```typescript
// Frontend: Share buttons
function ShareButtons({ shareUrl, shareText }: { shareUrl: string; shareText: string }) {
  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const shareToInstagram = () => {
    // Instagram doesn't support direct sharing via URL
    // Copy link to clipboard and show instructions
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied! Open Instagram and paste in your story or post.');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className="flex gap-2">
      <button onClick={shareToTwitter}>Share on Twitter</button>
      <button onClick={shareToInstagram}>Share on Instagram</button>
      <button onClick={copyLink}>Copy Link</button>
    </div>
  );
}
```

## Market Data Parser

### Parser Implementation

```typescript
interface MarketConfig {
  question: string;
  description?: string;
  currency: 'NGN' | 'USD';
  minPosition: number;
  maxPosition?: number;
  closesAt: string; // ISO 8601 date string
}

class MarketParser {
  parse(config: string): Market {
    try {
      const data = JSON.parse(config) as MarketConfig;
      
      // Validate required fields
      if (!data.question || !data.currency || !data.minPosition || !data.closesAt) {
        throw new Error('Missing required fields');
      }

      // Validate currency
      if (!['NGN', 'USD'].includes(data.currency)) {
        throw new Error('Invalid currency');
      }

      // Validate dates
      const closesAt = new Date(data.closesAt);
      if (isNaN(closesAt.getTime())) {
        throw new Error('Invalid closesAt date');
      }

      if (closesAt <= new Date()) {
        throw new Error('closesAt must be in the future');
      }

      // Convert to smallest unit
      const minPositionSmallestUnit = data.minPosition * 100;
      const maxPositionSmallestUnit = data.maxPosition ? data.maxPosition * 100 : undefined;

      return {
        id: '', // Generated by database
        question: data.question,
        description: data.description,
        currency: data.currency,
        minPositionSmallestUnit,
        maxPositionSmallestUnit,
        poolAmountSmallestUnit: 0,
        yesPoolSmallestUnit: 0,
        noPoolSmallestUnit: 0,
        state: 'active',
        closesAt,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to parse market config: ${error.message}`);
    }
  }

  format(market: Market): string {
    const config: MarketConfig = {
      question: market.question,
      description: market.description,
      currency: market.currency,
      minPosition: market.minPositionSmallestUnit / 100,
      maxPosition: market.maxPositionSmallestUnit ? market.maxPositionSmallestUnit / 100 : undefined,
      closesAt: market.closesAt.toISOString()
    };

    return JSON.stringify(config, null, 2);
  }
}
```

### API Response Parser

```typescript
class APIResponseParser {
  parse<T>(response: string): T {
    try {
      const data = JSON.parse(response);
      
      if (!data) {
        throw new Error('Empty response');
      }

      return data as T;
    } catch (error) {
      throw new Error(`Failed to parse API response: ${error.message}`);
    }
  }

  format<T>(data: T): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      throw new Error(`Failed to format API response: ${error.message}`);
    }
  }
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas of redundancy:

1. **Wallet Zero-Balance Properties (2.1, 2.2, 2.3)**: All three criteria express the same requirement that new wallets start at zero. These can be consolidated into a single property.

2. **Market Card Display Properties (8.1-8.6)**: These can be combined into a single comprehensive property that validates all required elements are present on a market card.

3. **Leaderboard Display Properties (13.3-13.6)**: These can be combined into a single property that validates all required fields are displayed for leaderboard entries.

4. **Footer Link Properties (21.2-21.7)**: These can be combined into a single property that validates all required footer links are present.

5. **Transaction Display Properties (6.2, 6.3, 6.4)**: These can be combined into a single property about transaction history display.

6. **Share Card Content Properties (14.4-14.6)**: These can be combined into a single property about share card content.

7. **Market Details Display Properties (15.2-15.5)**: These can be combined into a single property about market details page content.

8. **Position Panel Display Properties (9.2, 9.3)**: These can be combined into a single property about position panel content.

9. **Cart Display Properties (10.3-10.5)**: These can be combined into a single property about cart item display.

10. **Recent Winners Display Properties (18.2-18.4)**: These can be combined into a single property about winner display.

11. **Balance Update Properties (24.1, 24.2, 24.3, 24.4)**: These can be combined into a single property about wallet balance updates.

12. **Data Persistence Properties (25.1-25.4)**: These can be combined into a single property about data persistence.

### Property 1: Wallet Zero-Balance Initialization

*For any* newly created user account, the associated wallet SHALL initialize with exactly zero balance in both NGN (kobo) and USD (cents), with both total and available balances set to zero.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 2: Session Persistence Across Navigation

*For any* authenticated user, navigating between different pages of the platform SHALL maintain their authentication session state without requiring re-login.

**Validates: Requirements 1.4**

### Property 3: Currency Conversion Display

*For any* wallet balance and any currency selection (NGN or USD), toggling the display currency SHALL show the correctly converted amount using the current exchange rate.

**Validates: Requirements 3.4**

### Property 4: Transaction History Direction Indicators

*For any* transaction in the wallet history, deposits and position payouts SHALL display an "IN" indicator, while withdrawals and position entries SHALL display an "OUT" indicator.

**Validates: Requirements 6.2, 6.3, 6.4**

### Property 5: Market Card Complete Display

*For any* active market, the market card SHALL display all required elements: the market question, YES button, NO button, percentage distribution between YES and NO, pool amount, and countdown timer.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**

### Property 6: Position Panel Content Display

*For any* market and side (YES or NO) selected for position entry, the position panel SHALL display the selected market's question and the selected side.

**Validates: Requirements 9.2, 9.3**

### Property 7: Position Entry Balance Validation

*For any* position entry attempt, the system SHALL validate that the user's available wallet balance (in the market's currency) is greater than or equal to the position amount before allowing the position to be created.

**Validates: Requirements 9.6, 23.2**

### Property 8: Cart Item Addition

*For any* market selected for the position cart, the market SHALL appear in the cart with its question, selected side, and amount input field.

**Validates: Requirements 10.2, 10.3, 10.4, 10.5**

### Property 9: Cart Total Calculation

*For any* set of items in the position cart, the displayed total amount SHALL equal the sum of all individual position amounts.

**Validates: Requirements 10.6**

### Property 10: Dashboard Active Positions Display

*For any* user with active positions (positions on markets that are not yet resolved), those positions SHALL be displayed on the user's dashboard.

**Validates: Requirements 11.2**

### Property 11: Dashboard Past Results Display

*For any* user with positions on resolved markets, those past results SHALL be displayed on the user's dashboard.

**Validates: Requirements 11.3**

### Property 12: Profile Picture File Validation

*For any* file uploaded as a profile picture, the system SHALL validate that the file is in an image format (e.g., JPEG, PNG, GIF) before accepting the upload.

**Validates: Requirements 12.6**

### Property 13: Username Uniqueness Validation

*For any* username change attempt, the system SHALL validate that the new username is not already taken by another user before allowing the change.

**Validates: Requirements 12.7**

### Property 14: Leaderboard Ranking Logic

*For any* set of users with prediction history, the leaderboard SHALL rank them based on a combination of prediction accuracy percentage and total points, with higher values resulting in better ranks.

**Validates: Requirements 13.1**

### Property 15: Points Award for Correct Predictions

*For any* position that is resolved as a winner (user's predicted side matches the market's winning side), the system SHALL award points to the user.

**Validates: Requirements 13.2**

### Property 16: Leaderboard Entry Complete Display

*For any* user on the leaderboard, their entry SHALL display all required fields: rank, username, total points, and accuracy percentage.

**Validates: Requirements 13.3, 13.4, 13.5, 13.6**

### Property 17: Share Card Generation

*For any* prediction or win shared by a user, the system SHALL generate a shareable card containing the market question, the user's prediction (YES or NO), and (if resolved) the result.

**Validates: Requirements 14.3, 14.4, 14.5, 14.6**

### Property 18: Market Details Page Complete Display

*For any* market details page, it SHALL display all required elements: the market question, YES/NO distribution bar, pool amount, and countdown timer.

**Validates: Requirements 15.2, 15.3, 15.4, 15.5**

### Property 19: Interactive Element Hover Effects

*For any* interactive element (buttons, links, cards), the element SHALL have hover effects that provide visual feedback when the user's cursor is over the element.

**Validates: Requirements 16.5**

### Property 20: Activity Feed Content Display

*For any* recent position entry or market resolution, it SHALL appear in the platform's activity feed.

**Validates: Requirements 17.2, 17.3**

### Property 21: Recent Winners Complete Display

*For any* recent winner (user who won a position in the last 24 hours), the winners section SHALL display their username, the market they won, and the amount won.

**Validates: Requirements 18.2, 18.3, 18.4, 18.5**

### Property 22: Popularity Indicator Calculation

*For any* market, the popularity indicator SHALL be calculated based on the number of positions entered on that market, with markets having more than 100 positions marked as highly popular.

**Validates: Requirements 19.1, 19.2**

### Property 23: Notification Display by Type

*For any* notification event (market resolution, deposit confirmation, withdrawal confirmation), the system SHALL create and display a corresponding notification in the user's notification interface.

**Validates: Requirements 20.2, 20.3, 20.4**

### Property 24: New Notification Visual Indicator

*For any* new unread notification, the notification interface SHALL display a visual indicator (such as a badge or dot) to alert the user.

**Validates: Requirements 20.5**

### Property 25: Footer Links Completeness

*For any* page footer, it SHALL contain links to all required information pages: About, How it works, Terms of Service, Privacy Policy, Risk Disclaimer, and Contact.

**Validates: Requirements 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7**

### Property 26: Closed Market Position Prevention

*For any* market in the "closed" state, the system SHALL prevent new position entries and return an error if attempted.

**Validates: Requirements 22.4, 23.3**

### Property 27: Resolved Market Winning Outcome Display

*For any* market in the "resolved" state, the system SHALL display the winning outcome (YES or NO).

**Validates: Requirements 22.5**

### Property 28: Position Amount Positive Validation

*For any* position entry attempt, the system SHALL validate that the position amount is greater than zero before allowing the position to be created.

**Validates: Requirements 23.1**

### Property 29: Position Amount Within Market Limits

*For any* position entry attempt, the system SHALL validate that the position amount is greater than or equal to the market's minimum position amount and (if a maximum is set) less than or equal to the market's maximum position amount.

**Validates: Requirements 23.4**

### Property 30: Wallet Balance Update on Position Entry

*For any* successful position entry, the system SHALL deduct the position amount from the user's available wallet balance in the corresponding currency.

**Validates: Requirements 24.1**

### Property 31: Wallet Balance Update on Position Win

*For any* position resolved as a winner, the system SHALL add the payout amount to the user's available wallet balance in the corresponding currency.

**Validates: Requirements 24.2**

### Property 32: Wallet Balance Update on Deposit

*For any* completed deposit, the system SHALL add the deposit amount to both the user's total and available wallet balance in the corresponding currency.

**Validates: Requirements 24.3**

### Property 33: Wallet Balance Update on Withdrawal

*For any* completed withdrawal, the system SHALL deduct the withdrawal amount from both the user's total and available wallet balance in the corresponding currency.

**Validates: Requirements 24.4**

### Property 34: Data Persistence for All Entities

*For any* entity created in the system (user account, wallet transaction, position, or market), the entity's data SHALL be persisted to the database and retrievable in subsequent queries.

**Validates: Requirements 25.1, 25.2, 25.3, 25.4**

### Property 35: Market Configuration Round-Trip

*For any* valid Market object, serializing it to a market configuration string and then parsing that string back SHALL produce an equivalent Market object with all fields preserved.

**Validates: Requirements 27.4**

### Property 36: Market Configuration Parser Error Handling

*For any* invalid market configuration string (missing required fields, invalid currency, invalid date format, or past close date), the parser SHALL return a descriptive error message indicating the specific validation failure.

**Validates: Requirements 27.2**

### Property 37: API Response Round-Trip

*For any* valid API response object, serializing it to JSON and then parsing that JSON back SHALL produce an equivalent object with all fields and types preserved.

**Validates: Requirements 28.4**

### Property 38: API Response Parser Error Handling

*For any* invalid JSON string (malformed JSON syntax or empty response), the parser SHALL return a descriptive error message indicating the parsing failure.

**Validates: Requirements 28.2**


## Error Handling

### Error Categories

#### 1. Validation Errors (400 Bad Request)
- Invalid input format (email, username, amounts)
- Missing required fields
- Amount validation failures (negative, exceeds limits)
- File type validation failures

#### 2. Authentication Errors (401 Unauthorized)
- Invalid credentials
- Expired JWT token
- Missing authentication token

#### 3. Authorization Errors (403 Forbidden)
- Attempting to access another user's resources
- Attempting operations without sufficient permissions

#### 4. Resource Not Found Errors (404 Not Found)
- User not found
- Market not found
- Position not found
- Wallet not found

#### 5. Business Logic Errors (422 Unprocessable Entity)
- Insufficient wallet balance
- Market is closed or resolved
- Position amount below minimum or above maximum
- Username already taken

#### 6. Server Errors (500 Internal Server Error)
- Database connection failures
- External API failures (currency conversion, file storage)
- Unexpected exceptions

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
  };
}

// Example error responses
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Wallet balance is insufficient for this position",
    "details": {
      "required": 50000,
      "available": 30000,
      "currency": "NGN"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

{
  "error": {
    "code": "MARKET_CLOSED",
    "message": "Cannot create position on closed market",
    "details": {
      "marketId": "abc-123",
      "marketState": "closed"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Handling Strategy

#### Frontend Error Handling
```typescript
// Global error handler
function handleAPIError(error: AxiosError<ErrorResponse>) {
  const errorData = error.response?.data?.error;
  
  if (!errorData) {
    toast.error('An unexpected error occurred');
    return;
  }

  switch (errorData.code) {
    case 'INSUFFICIENT_BALANCE':
      toast.error('Insufficient balance. Please deposit funds.');
      break;
    case 'MARKET_CLOSED':
      toast.error('This market is no longer accepting positions.');
      break;
    case 'INVALID_CREDENTIALS':
      toast.error('Invalid email or password.');
      break;
    default:
      toast.error(errorData.message);
  }
}

// Optimistic update rollback
async function createPositionWithRollback(position: PositionInput) {
  const tempId = `temp-${Date.now()}`;
  
  // Optimistic update
  addPositionToUI({ ...position, id: tempId });
  deductFromWalletUI(position.amount);
  
  try {
    const result = await api.createPosition(position);
    replacePositionInUI(tempId, result);
  } catch (error) {
    // Rollback
    removePositionFromUI(tempId);
    addToWalletUI(position.amount);
    handleAPIError(error);
  }
}
```

#### Backend Error Handling
```typescript
// Global error middleware
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString()
      }
    });
  }

  if (err instanceof InsufficientBalanceError) {
    return res.status(422).json({
      error: {
        code: 'INSUFFICIENT_BALANCE',
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Default to 500 for unexpected errors
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  });
}
```

### Retry Logic

#### Database Operations
```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      logger.warn(`Operation failed (attempt ${attempt}/${maxRetries})`, { error });
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  logger.error('Operation failed after all retries', { error: lastError });
  throw lastError;
}

// Usage
await withRetry(() => db.transactions.create(transactionData));
```

#### External API Calls
```typescript
async function fetchExchangeRateWithRetry(from: string, to: string): Promise<number> {
  return await withRetry(
    async () => {
      const response = await axios.get(`${EXCHANGE_API_URL}/${from}/${to}`);
      return response.data.rate;
    },
    3,
    2000
  );
}
```


## Testing Strategy

### Dual Testing Approach

The platform will employ both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit Tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property Tests**: Verify universal properties across all inputs through randomization

Together, these approaches provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing

#### Framework Selection
- **JavaScript/TypeScript**: fast-check library
- Minimum 100 iterations per property test
- Each property test references its design document property

#### Property Test Configuration
```typescript
import fc from 'fast-check';

// Example property test
describe('Feature: prediction-platform-overhaul, Property 1: Wallet Zero-Balance Initialization', () => {
  it('should initialize all new wallets with zero balance', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 50 }),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8 })
        }),
        async (userData) => {
          // Create user
          const user = await createUser(userData);
          
          // Get wallet
          const wallet = await getWallet(user.id);
          
          // Assert zero balance
          expect(wallet.balanceNgnKobo).toBe(0);
          expect(wallet.balanceUsdCents).toBe(0);
          expect(wallet.availableNgnKobo).toBe(0);
          expect(wallet.availableUsdCents).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Example: Currency conversion property
describe('Feature: prediction-platform-overhaul, Property 3: Currency Conversion Display', () => {
  it('should correctly convert balances between currencies', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1000000 }), // balance in kobo
        fc.double({ min: 0.01, max: 2000 }), // exchange rate
        async (balanceKobo, exchangeRate) => {
          const balanceNGN = balanceKobo / 100;
          const expectedUSD = balanceNGN / exchangeRate;
          
          const convertedUSD = await convertCurrency(balanceNGN, 'NGN', 'USD', exchangeRate);
          
          // Allow small floating point difference
          expect(Math.abs(convertedUSD - expectedUSD)).toBeLessThan(0.01);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Example: Round-trip property
describe('Feature: prediction-platform-overhaul, Property 35: Market Configuration Round-Trip', () => {
  it('should preserve market data through parse-format-parse cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          question: fc.string({ minLength: 10, maxLength: 200 }),
          currency: fc.constantFrom('NGN', 'USD'),
          minPosition: fc.integer({ min: 100, max: 10000 }),
          closesAt: fc.date({ min: new Date() })
        }),
        async (marketData) => {
          // Create market object
          const market = createMarket(marketData);
          
          // Format to config string
          const configString = marketParser.format(market);
          
          // Parse back
          const parsedMarket = marketParser.parse(configString);
          
          // Assert equivalence
          expect(parsedMarket.question).toBe(market.question);
          expect(parsedMarket.currency).toBe(market.currency);
          expect(parsedMarket.minPositionSmallestUnit).toBe(market.minPositionSmallestUnit);
          expect(parsedMarket.closesAt.getTime()).toBe(market.closesAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing

#### Test Organization
```
tests/
├── unit/
│   ├── services/
│   │   ├── auth.service.test.ts
│   │   ├── wallet.service.test.ts
│   │   ├── market.service.test.ts
│   │   └── position.service.test.ts
│   ├── repositories/
│   │   ├── user.repository.test.ts
│   │   └── wallet.repository.test.ts
│   ├── parsers/
│   │   ├── market.parser.test.ts
│   │   └── api.parser.test.ts
│   └── utils/
│       ├── currency.test.ts
│       └── validation.test.ts
├── integration/
│   ├── auth.integration.test.ts
│   ├── wallet.integration.test.ts
│   ├── market.integration.test.ts
│   └── position.integration.test.ts
├── e2e/
│   ├── user-journey.test.ts
│   ├── position-flow.test.ts
│   └── wallet-flow.test.ts
└── property/
    ├── wallet.property.test.ts
    ├── market.property.test.ts
    ├── position.property.test.ts
    └── parser.property.test.ts
```

#### Unit Test Examples
```typescript
// Example: Specific edge case
describe('Wallet Service', () => {
  describe('createPosition', () => {
    it('should reject position when balance is insufficient', async () => {
      const user = await createTestUser();
      const wallet = await getWallet(user.id);
      const market = await createTestMarket({ currency: 'NGN' });
      
      // Wallet has 0 balance
      expect(wallet.availableNgnKobo).toBe(0);
      
      // Attempt to create position
      await expect(
        createPosition(user.id, market.id, 'YES', 10000)
      ).rejects.toThrow('Insufficient balance');
    });

    it('should reject position on closed market', async () => {
      const user = await createTestUser();
      await depositToWallet(user.id, 100000, 'NGN');
      const market = await createTestMarket({ 
        state: 'closed',
        currency: 'NGN'
      });
      
      await expect(
        createPosition(user.id, market.id, 'YES', 10000)
      ).rejects.toThrow('Market is not active');
    });

    it('should create position and update wallet balance', async () => {
      const user = await createTestUser();
      await depositToWallet(user.id, 100000, 'NGN');
      const market = await createTestMarket({ currency: 'NGN' });
      
      const initialBalance = (await getWallet(user.id)).availableNgnKobo;
      
      const position = await createPosition(user.id, market.id, 'YES', 10000);
      
      expect(position.amountSmallestUnit).toBe(10000);
      expect(position.side).toBe('YES');
      
      const finalBalance = (await getWallet(user.id)).availableNgnKobo;
      expect(finalBalance).toBe(initialBalance - 10000);
    });
  });
});

// Example: Integration test
describe('Position Flow Integration', () => {
  it('should complete full position entry flow', async () => {
    // 1. Create user
    const user = await createUser({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    
    // 2. Verify wallet initialized at zero
    const wallet = await getWallet(user.id);
    expect(wallet.balanceNgnKobo).toBe(0);
    
    // 3. Deposit funds
    await processDeposit(user.id, 100000, 'NGN', 'bank_transfer');
    
    // 4. Verify balance updated
    const walletAfterDeposit = await getWallet(user.id);
    expect(walletAfterDeposit.availableNgnKobo).toBe(100000);
    
    // 5. Create market
    const market = await createMarket({
      question: 'Will it rain tomorrow?',
      currency: 'NGN',
      minPositionSmallestUnit: 1000,
      closesAt: new Date(Date.now() + 86400000)
    });
    
    // 6. Create position
    const position = await createPosition(user.id, market.id, 'YES', 50000);
    
    // 7. Verify position created
    expect(position.userId).toBe(user.id);
    expect(position.marketId).toBe(market.id);
    expect(position.amountSmallestUnit).toBe(50000);
    
    // 8. Verify wallet balance deducted
    const walletAfterPosition = await getWallet(user.id);
    expect(walletAfterPosition.availableNgnKobo).toBe(50000);
    
    // 9. Verify transaction recorded
    const transactions = await getTransactions(user.id);
    expect(transactions).toHaveLength(2); // deposit + position entry
    expect(transactions[1].type).toBe('position_entry');
    expect(transactions[1].amountSmallestUnit).toBe(50000);
  });
});
```

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage
- **Property Test Coverage**: All 38 correctness properties implemented
- **Integration Test Coverage**: All major user flows covered
- **E2E Test Coverage**: Critical paths (signup → deposit → position → win)

### Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run property tests
        run: npm run test:property
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

### Testing Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data after each test
3. **Mocking**: Mock external dependencies (APIs, file storage) in unit tests
4. **Realistic Data**: Use realistic test data that matches production patterns
5. **Edge Cases**: Explicitly test boundary conditions and error cases
6. **Performance**: Keep unit tests fast (<100ms each), integration tests reasonable (<5s each)
7. **Determinism**: Avoid flaky tests by controlling time, randomness, and async operations
8. **Documentation**: Comment complex test scenarios to explain what's being tested

