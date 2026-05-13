# Implementation Plan: Prediction Platform Overhaul

## Overview

This implementation plan breaks down the Prediction Platform into discrete, actionable development tasks. The platform is a full-stack TypeScript application with React frontend and Node.js/Express backend, using PostgreSQL for data persistence and WebSocket for real-time updates.

**Technology Stack:**
- Frontend: React with TypeScript, TailwindCSS
- Backend: Node.js with Express, TypeScript
- Database: PostgreSQL
- Real-time: Socket.io
- Authentication: JWT with httpOnly cookies
- File Storage: AWS S3
- Currency Conversion: External API with caching

## Tasks

### 1. Project Setup and Infrastructure

- [x] 1.1 Initialize project structure and dependencies
  - Create monorepo structure with frontend and backend directories
  - Initialize TypeScript configuration for both frontend and backend
  - Set up package.json with all required dependencies
  - Configure TailwindCSS for frontend
  - Set up ESLint and Prettier for code quality
  - _Requirements: Infrastructure foundation_

- [x] 1.2 Set up PostgreSQL database and connection
  - Install and configure PostgreSQL
  - Create database connection module with connection pooling
  - Set up environment variables for database credentials
  - Create database initialization script
  - _Requirements: 25.1, 25.2, 25.3, 25.4_

- [x] 1.3 Create database schema and migrations
  - Create users table with constraints and indexes
  - Create wallets table with balance constraints
  - Create markets table with pool consistency checks
  - Create positions table with user and market foreign keys
  - Create transactions table with reference tracking
  - Create leaderboard_entries table with ranking logic
  - Create notifications table with user references
  - Add all necessary indexes for query performance
  - _Requirements: 25.1, 25.2, 25.3, 25.4_

- [x] 1.4 Write property test for database schema constraints
  - **Property 34: Data Persistence for All Entities**
  - **Validates: Requirements 25.1, 25.2, 25.3, 25.4**

### 2. Authentication System

- [x] 2.1 Implement user registration backend
  - Create user registration endpoint (POST /api/auth/signup)
  - Implement password hashing with bcrypt
  - Validate username uniqueness and email format
  - Create user record in database
  - Automatically create zero-balance wallet on user creation
  - Generate JWT token and set httpOnly cookie
  - _Requirements: 1.1, 2.1, 2.2, 2.3_

- [x] 2.2 Write property test for wallet zero-balance initialization
  - **Property 1: Wallet Zero-Balance Initialization**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 2.3 Implement user login backend
  - Create login endpoint (POST /api/auth/login)
  - Validate credentials against database
  - Generate JWT token with 24-hour expiration
  - Set httpOnly cookie for security
  - Return user data in response
  - _Requirements: 1.2_

- [x] 2.4 Implement authentication middleware
  - Create JWT verification middleware
  - Extract and validate token from httpOnly cookie
  - Attach user data to request object
  - Handle expired and invalid tokens with 401 responses
  - _Requirements: 1.2, 1.4_

- [x] 2.5 Implement logout endpoint
  - Create logout endpoint (POST /api/auth/logout)
  - Clear httpOnly cookie
  - Return success response
  - _Requirements: 1.2_

- [x] 2.6 Create authentication frontend components
  - Build SignupForm component with validation
  - Build LoginForm component with validation
  - Implement form submission with error handling
  - Display validation errors to users
  - _Requirements: 1.1, 1.2_

- [x] 2.7 Implement AuthContext and useAuth hook
  - Create AuthContext for global auth state
  - Implement login, signup, and logout actions
  - Store user data in context
  - Persist authentication state across page reloads
  - _Requirements: 1.3, 1.4_

- [x] 2.8 Write property test for session persistence
  - **Property 2: Session Persistence Across Navigation**
  - **Validates: Requirements 1.4**

- [x] 2.9 Create AuthGuard component for protected routes
  - Implement route protection logic
  - Redirect unauthenticated users to login
  - Allow authenticated users to access protected pages
  - _Requirements: 1.3_

- [x] 2.10 Write unit tests for authentication flow
  - Test successful signup with wallet creation
  - Test login with valid credentials
  - Test login with invalid credentials
  - Test JWT token generation and validation
  - Test logout functionality
  - _Requirements: 1.1, 1.2_

### 3. Wallet System Backend

- [x] 3.1 Create wallet repository layer
  - Implement findByUserId method
  - Implement update balance methods
  - Implement increment/decrement operations with atomic updates
  - Add transaction support for consistency
  - _Requirements: 3.1, 3.2_

- [x] 3.2 Implement wallet service layer
  - Create getWallet method
  - Create deposit processing method
  - Create withdrawal processing method
  - Implement balance validation logic
  - Add currency conversion support
  - _Requirements: 3.1, 3.2, 4.1, 5.1_

- [x] 3.3 Create wallet API endpoints
  - Implement GET /api/wallet endpoint
  - Implement POST /api/wallet/deposit endpoint
  - Implement POST /api/wallet/withdraw endpoint
  - Implement GET /api/wallet/transactions endpoint
  - Implement GET /api/wallet/convert endpoint for currency conversion
  - Add authentication middleware to all endpoints
  - _Requirements: 3.1, 3.2, 4.1, 5.1, 6.1_

- [x] 3.4 Implement currency conversion service
  - Integrate with external exchange rate API
  - Implement rate caching with 5-minute TTL
  - Create convert method for NGN/USD conversion
  - Handle API failures with fallback rates
  - _Requirements: 3.4_

- [x] 3.5 Write property test for currency conversion
  - **Property 3: Currency Conversion Display**
  - **Validates: Requirements 3.4**

- [x] 3.6 Create transaction repository and service
  - Implement transaction creation method
  - Implement transaction history retrieval
  - Add filtering by user and type
  - Support pagination for large histories
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3.7 Write property test for transaction direction indicators
  - **Property 4: Transaction History Direction Indicators**
  - **Validates: Requirements 6.2, 6.3, 6.4**

- [x] 3.8 Write property tests for wallet balance updates
  - **Property 30: Wallet Balance Update on Position Entry**
  - **Property 31: Wallet Balance Update on Position Win**
  - **Property 32: Wallet Balance Update on Deposit**
  - **Property 33: Wallet Balance Update on Withdrawal**
  - **Validates: Requirements 24.1, 24.2, 24.3, 24.4**

- [x] 3.9 Write unit tests for wallet operations
  - Test deposit processing with balance updates
  - Test withdrawal with insufficient balance
  - Test currency conversion accuracy
  - Test transaction record creation
  - _Requirements: 4.1, 5.1, 6.1_

### 4. Wallet System Frontend

- [x] 4.1 Create WalletContext and useWallet hook
  - Implement wallet state management
  - Create actions for deposit, withdraw, and refresh
  - Implement currency toggle functionality
  - Add real-time balance display with conversion
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.2 Build WalletBalance component
  - Display total balance with currency symbol
  - Display available balance
  - Implement currency toggle button (NGN/USD)
  - Show real-time conversion without page reload
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.3 Build DepositModal component
  - Create modal with deposit method options
  - Display bank transfer option
  - Display card payment option
  - Display crypto deposit with wallet address
  - Implement amount input with validation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 4.4 Build WithdrawModal component
  - Create modal with withdrawal form
  - Implement amount input with validation
  - Add confirmation mechanism
  - Display available balance
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4.5 Build TransactionHistory component
  - Display transaction list with pagination
  - Show transaction type, amount, and timestamp
  - Display IN indicator for deposits and payouts
  - Display OUT indicator for withdrawals and position entries
  - Update history within 1 second of new transactions
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4.6 Write unit tests for wallet components
  - Test currency toggle functionality
  - Test deposit modal interactions
  - Test withdrawal modal validation
  - Test transaction history display
  - _Requirements: 3.3, 4.1, 5.1, 6.1_

### 5. Market System Backend

- [x] 5.1 Create market repository layer
  - Implement findAll method with filtering
  - Implement findById method
  - Implement create method
  - Implement update pool amounts with atomic operations
  - Add state transition methods (active → closed → resolved)
  - _Requirements: 7.1, 8.1, 22.1, 22.2, 22.3_

- [x] 5.2 Implement market service layer
  - Create getActiveMarkets method
  - Create getMarketById method
  - Create getPopularMarkets method (>100 positions)
  - Implement market resolution logic
  - Add pool calculation methods
  - _Requirements: 7.1, 8.1, 19.1, 19.2, 22.1, 22.4, 22.5_

- [-] 5.3 Create market API endpoints
  - Implement GET /api/markets endpoint
  - Implement GET /api/markets/:id endpoint
  - Implement GET /api/markets/popular endpoint
  - Implement GET /api/markets/:id/positions endpoint
  - Add authentication middleware where needed
  - _Requirements: 7.1, 8.1, 15.1, 19.1_

- [ ] 5.4 Implement market parser
  - Create MarketParser class with parse method
  - Validate required fields (question, currency, minPosition, closesAt)
  - Validate currency is NGN or USD
  - Validate closesAt is future date
  - Convert amounts to smallest unit (kobo/cents)
  - Implement format method for serialization
  - _Requirements: 27.1, 27.2, 27.3, 27.4_

- [ ] 5.5 Write property tests for market parser
  - **Property 35: Market Configuration Round-Trip**
  - **Property 36: Market Configuration Parser Error Handling**
  - **Validates: Requirements 27.2, 27.4**

- [ ] 5.6 Write property test for closed market position prevention
  - **Property 26: Closed Market Position Prevention**
  - **Validates: Requirements 22.4, 23.3**

- [ ] 5.7 Write unit tests for market operations
  - Test market creation with valid data
  - Test market parser with invalid data
  - Test market state transitions
  - Test popular market calculation
  - _Requirements: 19.1, 22.1, 27.2_

### 6. Market System Frontend

- [ ] 6.1 Create MarketContext and useMarkets hook
  - Implement market state management
  - Create actions for fetching markets
  - Add active market selection
  - Implement market refresh functionality
  - _Requirements: 7.1, 8.1_

- [ ] 6.2 Build MarketCard component
  - Display market question
  - Display YES and NO buttons
  - Show percentage distribution with visual bar
  - Display pool amount with currency formatting
  - Implement countdown timer with auto-update
  - Show "closed" indicator when timer reaches zero
  - Add popularity indicator for markets with >100 positions
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 19.1, 19.2_

- [ ] 6.3 Write property test for market card display
  - **Property 5: Market Card Complete Display**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**

- [ ] 6.4 Write property test for popularity indicator
  - **Property 22: Popularity Indicator Calculation**
  - **Validates: Requirements 19.1, 19.2**

- [ ] 6.5 Build MarketList component
  - Display grid of MarketCard components
  - Show markets immediately on homepage
  - Display "no active markets" message when empty
  - Implement loading states
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 6.6 Build MarketDetails page
  - Display market question prominently
  - Show YES/NO distribution bar
  - Display pool amount
  - Show countdown timer
  - Display position entry panel
  - Show list of user positions on this market
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 6.7 Write property test for market details display
  - **Property 18: Market Details Page Complete Display**
  - **Validates: Requirements 15.2, 15.3, 15.4, 15.5**

- [ ] 6.8 Write unit tests for market components
  - Test countdown timer updates
  - Test market card click interactions
  - Test empty market list display
  - _Requirements: 7.1, 8.6, 8.7_

### 7. Position System Backend

- [ ] 7.1 Create position repository layer
  - Implement create method
  - Implement findByUserId method
  - Implement findByMarketId method
  - Implement findActivePositions method
  - Implement update for resolution (isWinner, payoutSmallestUnit)
  - _Requirements: 9.1, 11.2, 11.3_

- [ ] 7.2 Implement position service layer
  - Create createPosition method with transaction support
  - Validate market is active before position creation
  - Validate sufficient wallet balance
  - Validate position amount is positive
  - Validate position amount within market min/max limits
  - Calculate potential return based on pool distribution
  - Update wallet available balance
  - Update market pool amounts
  - Create transaction record
  - _Requirements: 9.5, 9.6, 9.7, 23.1, 23.2, 23.3, 23.4_

- [ ] 7.3 Write property tests for position validation
  - **Property 7: Position Entry Balance Validation**
  - **Property 28: Position Amount Positive Validation**
  - **Property 29: Position Amount Within Market Limits**
  - **Validates: Requirements 9.6, 23.1, 23.2, 23.4**

- [ ] 7.4 Implement bulk position creation
  - Create createBulkPositions method
  - Validate total required amount against wallet balance
  - Create all positions within single database transaction
  - Rollback all on any failure
  - _Requirements: 10.7, 10.8_

- [ ] 7.5 Create position API endpoints
  - Implement POST /api/positions endpoint
  - Implement POST /api/positions/bulk endpoint
  - Implement GET /api/positions/user/:userId endpoint
  - Implement GET /api/positions/active endpoint
  - Add authentication middleware to all endpoints
  - _Requirements: 9.5, 10.7, 11.2_

- [ ] 7.6 Implement position resolution logic
  - Create resolveMarket method
  - Update all positions with isWinner flag
  - Calculate payout amounts for winners
  - Update wallet balances for winners
  - Create payout transaction records
  - Update leaderboard entries
  - _Requirements: 22.5, 24.2_

- [ ] 7.7 Write unit tests for position operations
  - Test position creation with valid data
  - Test position creation with insufficient balance
  - Test position creation on closed market
  - Test bulk position creation
  - Test position resolution and payout
  - _Requirements: 9.5, 9.6, 9.7, 10.7, 22.4_

### 8. Position System Frontend

- [ ] 8.1 Build PositionPanel component
  - Display selected market question
  - Display selected side (YES or NO) with visual indicator
  - Implement amount input with validation
  - Show potential return calculation
  - Display confirm button
  - Show error message for insufficient balance
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7_

- [ ] 8.2 Write property test for position panel display
  - **Property 6: Position Panel Content Display**
  - **Validates: Requirements 9.2, 9.3**

- [ ] 8.3 Create CartContext and position cart state
  - Implement cart state management
  - Create addToCart action
  - Create removeFromCart action
  - Create updateAmount action
  - Create clearCart action
  - Create submitCart action for bulk creation
  - Calculate total amount dynamically
  - _Requirements: 10.1, 10.2, 10.6, 10.7_

- [ ] 8.4 Build PositionCart component
  - Display all selected markets
  - Show selected side for each market
  - Provide amount input for each market
  - Display total amount calculation
  - Show bulk confirmation button
  - Show individual confirmation buttons
  - Implement remove item functionality
  - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [ ] 8.5 Write property tests for cart functionality
  - **Property 8: Cart Item Addition**
  - **Property 9: Cart Total Calculation**
  - **Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6**

- [ ] 8.6 Implement optimistic UI updates for positions
  - Add position to UI immediately on submission
  - Deduct from wallet balance optimistically
  - Rollback on API error
  - Show pending state during API call
  - _Requirements: 9.5, 24.1_

- [ ] 8.7 Write unit tests for position components
  - Test position panel amount validation
  - Test cart item addition and removal
  - Test cart total calculation
  - Test optimistic update rollback
  - _Requirements: 9.4, 10.2, 10.6_

### 9. Dashboard and Profile

- [ ] 9.1 Build DashboardOverview component
  - Display wallet summary with balance
  - Show total wins count
  - Show total losses count
  - Display quick stats
  - _Requirements: 11.1, 11.4, 11.5_

- [ ] 9.2 Build ActivePositions component
  - Display list of active positions
  - Show market question for each position
  - Display side (YES/NO) and amount
  - Show potential return
  - Display "no active predictions" message when empty
  - _Requirements: 11.2, 11.6_

- [ ] 9.3 Write property test for dashboard active positions
  - **Property 10: Dashboard Active Positions Display**
  - **Validates: Requirements 11.2**

- [ ] 9.4 Build PastResults component
  - Display list of resolved positions
  - Show market question and outcome
  - Display win/loss indicator
  - Show payout amount for wins
  - _Requirements: 11.3_

- [ ] 9.5 Write property test for dashboard past results
  - **Property 11: Dashboard Past Results Display**
  - **Validates: Requirements 11.3**

- [ ] 9.6 Create user profile API endpoints
  - Implement GET /api/users/:id endpoint
  - Implement PATCH /api/users/:id endpoint
  - Implement POST /api/users/:id/profile-picture endpoint
  - Implement PATCH /api/users/:id/social-links endpoint
  - Add authentication and authorization middleware
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 9.7 Implement profile picture upload with S3
  - Set up AWS S3 client configuration
  - Create multer middleware for file uploads
  - Validate file type is image format
  - Validate file size (max 5MB)
  - Upload to S3 with unique key
  - Update user record with image URL
  - _Requirements: 12.1, 12.6_

- [ ] 9.8 Write property test for profile picture validation
  - **Property 12: Profile Picture File Validation**
  - **Validates: Requirements 12.6**

- [ ] 9.9 Build ProfileEditor component
  - Display current profile information
  - Implement username editing with validation
  - Show Instagram account linking field
  - Show Twitter/X account linking field
  - Show email linking field
  - Validate username uniqueness on change
  - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.7_

- [ ] 9.10 Write property test for username uniqueness
  - **Property 13: Username Uniqueness Validation**
  - **Validates: Requirements 12.7**

- [ ] 9.11 Build ProfilePictureUpload component
  - Implement file selection interface
  - Show image preview before upload
  - Display upload progress
  - Handle upload errors
  - Update profile picture display on success
  - _Requirements: 12.1, 12.6_

- [ ] 9.12 Write unit tests for profile components
  - Test profile picture upload flow
  - Test username validation
  - Test social links update
  - _Requirements: 12.1, 12.2, 12.7_

### 10. Leaderboard System

- [ ] 10.1 Create leaderboard repository layer
  - Implement findAll method with ranking
  - Implement findByUserId method
  - Implement upsert method for entry updates
  - Implement ranking calculation logic
  - _Requirements: 13.1, 13.3, 13.4, 13.5, 13.6_

- [ ] 10.2 Implement leaderboard service layer
  - Create getLeaderboard method with pagination
  - Create getUserLeaderboardEntry method
  - Implement updateUserStats method
  - Calculate accuracy percentage
  - Award points for correct predictions
  - Recalculate rankings after updates
  - _Requirements: 13.1, 13.2, 13.7_

- [ ] 10.3 Write property tests for leaderboard logic
  - **Property 14: Leaderboard Ranking Logic**
  - **Property 15: Points Award for Correct Predictions**
  - **Validates: Requirements 13.1, 13.2**

- [ ] 10.4 Create leaderboard API endpoints
  - Implement GET /api/leaderboard endpoint
  - Implement GET /api/leaderboard/:userId endpoint
  - Add pagination support
  - _Requirements: 13.1, 13.3, 13.4, 13.5, 13.6_

- [ ] 10.5 Build LeaderboardTable component
  - Display ranked list of users
  - Show rank, username, total points, accuracy percentage
  - Implement pagination controls
  - Highlight current user's entry
  - Update within 5 seconds of market resolution
  - _Requirements: 13.3, 13.4, 13.5, 13.6, 13.7_

- [ ] 10.6 Write property test for leaderboard entry display
  - **Property 16: Leaderboard Entry Complete Display**
  - **Validates: Requirements 13.3, 13.4, 13.5, 13.6**

- [ ] 10.7 Write unit tests for leaderboard operations
  - Test ranking calculation
  - Test points award on win
  - Test accuracy percentage calculation
  - Test leaderboard updates
  - _Requirements: 13.1, 13.2, 13.7_

### 11. Social Features

- [ ] 11.1 Implement share card generation backend
  - Install canvas library for image generation
  - Create generateShareCard function
  - Support "prediction" and "win" card types
  - Include market question, user prediction, and result
  - Upload generated image to S3
  - Return shareable URL
  - _Requirements: 14.3, 14.4, 14.5, 14.6_

- [ ] 11.2 Write property test for share card generation
  - **Property 17: Share Card Generation**
  - **Validates: Requirements 14.3, 14.4, 14.5, 14.6**

- [ ] 11.3 Create social sharing API endpoints
  - Implement POST /api/share/prediction endpoint
  - Implement POST /api/share/win endpoint
  - Add authentication middleware
  - _Requirements: 14.1, 14.2_

- [ ] 11.4 Build ShareButtons component
  - Implement Twitter share button
  - Implement Instagram share with copy link
  - Implement generic copy link button
  - Show success toast on copy
  - _Requirements: 14.1, 14.2_

- [ ] 11.5 Create activity feed backend
  - Implement getRecentActivity method
  - Fetch recent position entries
  - Fetch recent market resolutions
  - Sort by timestamp descending
  - _Requirements: 17.1, 17.2, 17.3_

- [ ] 11.6 Create activity feed API endpoint
  - Implement GET /api/activity endpoint
  - Add pagination support
  - _Requirements: 17.1_

- [ ] 11.7 Build ActivityFeed component
  - Display recent position entries
  - Display recent market resolutions
  - Show user, market, and action
  - Auto-refresh every 30 seconds
  - _Requirements: 17.1, 17.2, 17.3_

- [ ] 11.8 Write property test for activity feed content
  - **Property 20: Activity Feed Content Display**
  - **Validates: Requirements 17.2, 17.3**

- [ ] 11.9 Implement recent winners backend
  - Create getRecentWinners method
  - Fetch positions resolved as winners in last 24 hours
  - Include user, market, and payout information
  - Sort by resolution time descending
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [ ] 11.10 Create recent winners API endpoint
  - Implement GET /api/winners/recent endpoint
  - _Requirements: 18.1_

- [ ] 11.11 Build RecentWinners component
  - Display list of recent winners
  - Show username, market, and amount won
  - Update in real-time
  - _Requirements: 18.2, 18.3, 18.4, 18.5_

- [ ] 11.12 Write property test for recent winners display
  - **Property 21: Recent Winners Complete Display**
  - **Validates: Requirements 18.2, 18.3, 18.4, 18.5**

- [ ] 11.13 Write unit tests for social features
  - Test share card generation
  - Test activity feed retrieval
  - Test recent winners filtering
  - _Requirements: 14.3, 17.1, 18.1_

### 12. Notification System

- [ ] 12.1 Create notification repository layer
  - Implement create method
  - Implement findByUserId method
  - Implement markAsRead method
  - Implement markAllAsRead method
  - _Requirements: 20.1, 20.6_

- [ ] 12.2 Implement notification service layer
  - Create createNotification method
  - Support notification types: market_resolved, deposit_confirmed, withdrawal_confirmed, position_won, position_lost
  - Implement getUnreadCount method
  - _Requirements: 20.2, 20.3, 20.4_

- [ ] 12.3 Write property test for notification display by type
  - **Property 23: Notification Display by Type**
  - **Validates: Requirements 20.2, 20.3, 20.4**

- [ ] 12.4 Create notification API endpoints
  - Implement GET /api/notifications endpoint
  - Implement PATCH /api/notifications/:id/read endpoint
  - Implement PATCH /api/notifications/read-all endpoint
  - Add authentication middleware
  - _Requirements: 20.1, 20.6_

- [ ] 12.5 Build notification UI components
  - Create notification bell icon with badge
  - Display unread count badge
  - Build notification dropdown list
  - Show notification type, title, and message
  - Implement mark as read functionality
  - _Requirements: 20.1, 20.5, 20.6_

- [ ] 12.6 Write property test for new notification indicator
  - **Property 24: New Notification Visual Indicator**
  - **Validates: Requirements 20.5**

- [ ] 12.7 Write unit tests for notification system
  - Test notification creation
  - Test unread count calculation
  - Test mark as read functionality
  - _Requirements: 20.1, 20.5, 20.6_

### 13. Real-Time WebSocket Implementation

- [ ] 13.1 Set up Socket.io server
  - Install and configure Socket.io
  - Implement connection handler with authentication
  - Create user-specific rooms
  - Create market-specific rooms
  - _Requirements: Real-time updates foundation_

- [ ] 13.2 Implement WebSocket event handlers
  - Create market update event handler
  - Create wallet update event handler
  - Create leaderboard update event handler
  - Create activity update event handler
  - Implement subscribe/unsubscribe to market rooms
  - _Requirements: 3.5, 6.5, 13.7, 17.1_

- [ ] 13.3 Integrate WebSocket with backend services
  - Emit market updates on position creation
  - Emit wallet updates on balance changes
  - Emit leaderboard updates on market resolution
  - Emit activity updates on new positions
  - _Requirements: 3.5, 6.5, 13.7, 17.1_

- [ ] 13.4 Create useWebSocket hook for frontend
  - Implement WebSocket connection management
  - Create subscribeToMarket method
  - Create subscribeToWallet method
  - Create subscribeToLeaderboard method
  - Handle reconnection logic
  - _Requirements: Real-time updates frontend_

- [ ] 13.5 Integrate WebSocket with frontend components
  - Connect MarketCard to market updates
  - Connect WalletBalance to wallet updates
  - Connect LeaderboardTable to leaderboard updates
  - Connect ActivityFeed to activity updates
  - Update UI in real-time without page reload
  - _Requirements: 3.5, 6.5, 13.7, 17.1_

- [ ] 13.6 Write unit tests for WebSocket functionality
  - Test connection and authentication
  - Test room subscription
  - Test event emission
  - Test reconnection logic
  - _Requirements: Real-time updates_

### 14. UI/UX and Common Components

- [ ] 14.1 Create common UI components
  - Build Button component with variants
  - Build Input component with validation
  - Build Modal component
  - Build CountdownTimer component
  - Build LoadingSpinner component
  - Build Toast notification component
  - _Requirements: 8.6, 16.1, 16.2, 16.3, 16.4_

- [ ] 14.2 Implement hover effects for interactive elements
  - Add hover effects to buttons
  - Add hover effects to links
  - Add hover effects to cards
  - Use CSS transitions for smooth animations
  - _Requirements: 16.5_

- [ ] 14.3 Write property test for interactive element hover effects
  - **Property 19: Interactive Element Hover Effects**
  - **Validates: Requirements 16.5**

- [ ] 14.4 Build footer component
  - Create footer with all required links
  - Add About link
  - Add How it works link
  - Add Terms of Service link
  - Add Privacy Policy link
  - Add Risk Disclaimer link
  - Add Contact link
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7_

- [ ] 14.5 Write property test for footer links completeness
  - **Property 25: Footer Links Completeness**
  - **Validates: Requirements 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7**

- [ ] 14.6 Implement responsive design
  - Ensure mobile responsiveness for all components
  - Test on different screen sizes
  - Optimize touch interactions for mobile
  - _Requirements: 16.1, 16.2_

- [ ] 14.7 Write unit tests for common components
  - Test button variants and interactions
  - Test input validation
  - Test modal open/close
  - Test countdown timer accuracy
  - _Requirements: 8.6, 16.1_

### 15. API Response Parser

- [ ] 15.1 Implement API response parser
  - Create APIResponseParser class
  - Implement parse method with error handling
  - Implement format method for serialization
  - Handle empty responses
  - Handle malformed JSON
  - _Requirements: 28.1, 28.2, 28.3, 28.4_

- [ ] 15.2 Write property tests for API response parser
  - **Property 37: API Response Round-Trip**
  - **Property 38: API Response Parser Error Handling**
  - **Validates: Requirements 28.2, 28.4**

- [ ] 15.3 Write unit tests for API response parser
  - Test parsing valid JSON
  - Test parsing invalid JSON
  - Test parsing empty response
  - Test format method
  - _Requirements: 28.1, 28.2, 28.3_

### 16. Error Handling and Validation

- [ ] 16.1 Implement global error handling middleware
  - Create error handler middleware for Express
  - Handle validation errors (400)
  - Handle authentication errors (401)
  - Handle authorization errors (403)
  - Handle not found errors (404)
  - Handle business logic errors (422)
  - Handle server errors (500)
  - Return consistent error response format
  - _Requirements: Error handling foundation_

- [ ] 16.2 Implement frontend error handling
  - Create global API error handler
  - Display user-friendly error messages
  - Handle insufficient balance errors
  - Handle market closed errors
  - Handle authentication errors
  - Implement error toast notifications
  - _Requirements: 9.7, 23.2, 23.3_

- [ ] 16.3 Implement input validation
  - Create validation middleware for API endpoints
  - Validate email format
  - Validate username length and uniqueness
  - Validate password strength
  - Validate amount values (positive, within limits)
  - Validate currency values (NGN or USD)
  - _Requirements: 1.1, 9.4, 23.1, 23.4_

- [ ] 16.4 Implement retry logic for external services
  - Create withRetry utility function
  - Add retry logic for database operations
  - Add retry logic for currency conversion API
  - Add retry logic for S3 uploads
  - _Requirements: Reliability_

- [ ] 16.5 Write unit tests for error handling
  - Test error middleware responses
  - Test validation error handling
  - Test retry logic
  - _Requirements: Error handling_

### 17. Testing Infrastructure

- [ ] 17.1 Set up testing framework
  - Install Jest and testing libraries
  - Configure Jest for TypeScript
  - Set up test database
  - Create test utilities and helpers
  - Configure coverage reporting
  - _Requirements: Testing foundation_

- [ ] 17.2 Set up property-based testing
  - Install fast-check library
  - Configure property test runner
  - Create property test generators
  - Set minimum 100 iterations per property test
  - _Requirements: Property testing foundation_

- [ ] 17.3 Create test data factories
  - Create user factory
  - Create wallet factory
  - Create market factory
  - Create position factory
  - Create transaction factory
  - _Requirements: Testing utilities_

- [ ] 17.4 Set up integration test environment
  - Configure test database with migrations
  - Create database cleanup utilities
  - Set up test API server
  - Configure test authentication
  - _Requirements: Integration testing foundation_

- [ ] 17.5 Write integration tests for critical flows
  - Test complete user registration and wallet creation flow
  - Test deposit and position entry flow
  - Test position resolution and payout flow
  - Test bulk position creation flow
  - _Requirements: 1.1, 2.1, 4.1, 9.5, 10.7, 22.5_

### 18. Checkpoint - Core Functionality Complete

- [ ] 18.1 Verify all core features are working
  - Ensure all tests pass (unit, property, integration)
  - Verify authentication flow works end-to-end
  - Verify wallet operations work correctly
  - Verify position creation and resolution work
  - Verify real-time updates are functioning
  - Ask the user if questions arise

### 19. Performance Optimization

- [ ] 19.1 Implement database query optimization
  - Add missing indexes based on query patterns
  - Optimize N+1 query problems
  - Implement query result caching where appropriate
  - Use database connection pooling
  - _Requirements: Performance_

- [ ] 19.2 Implement frontend performance optimization
  - Add React.memo to expensive components
  - Implement code splitting for routes
  - Optimize bundle size
  - Add lazy loading for images
  - Implement virtual scrolling for long lists
  - _Requirements: Performance_

- [ ] 19.3 Implement API response caching
  - Cache currency conversion rates (5-minute TTL)
  - Cache leaderboard data (1-minute TTL)
  - Cache market list (30-second TTL)
  - Implement cache invalidation on updates
  - _Requirements: 3.4, Performance_

- [ ] 19.4 Write performance tests
  - Test API response times
  - Test database query performance
  - Test concurrent user load
  - _Requirements: Performance_

### 20. Security Hardening

- [ ] 20.1 Implement security best practices
  - Add rate limiting to API endpoints
  - Implement CORS configuration
  - Add helmet.js for security headers
  - Sanitize user inputs to prevent XSS
  - Use parameterized queries to prevent SQL injection
  - _Requirements: Security_

- [ ] 20.2 Implement secure file upload
  - Validate file types and sizes
  - Scan uploaded files for malware
  - Use signed URLs for S3 access
  - Implement upload rate limiting
  - _Requirements: 12.6, Security_

- [ ] 20.3 Implement secure authentication
  - Use bcrypt with appropriate cost factor
  - Implement password strength requirements
  - Add account lockout after failed attempts
  - Implement CSRF protection
  - _Requirements: 1.1, 1.2, Security_

- [ ] 20.4 Write security tests
  - Test SQL injection prevention
  - Test XSS prevention
  - Test authentication bypass attempts
  - Test rate limiting
  - _Requirements: Security_

### 21. Deployment and DevOps

- [ ] 21.1 Set up environment configuration
  - Create .env.example file
  - Document all environment variables
  - Set up different configs for dev/staging/prod
  - Implement config validation on startup
  - _Requirements: Deployment_

- [ ] 21.2 Create Docker configuration
  - Create Dockerfile for backend
  - Create Dockerfile for frontend
  - Create docker-compose.yml for local development
  - Include PostgreSQL service
  - Include Redis for caching (optional)
  - _Requirements: Deployment_

- [ ] 21.3 Set up CI/CD pipeline
  - Create GitHub Actions workflow
  - Run linter on every push
  - Run unit tests on every push
  - Run property tests on every push
  - Run integration tests on every push
  - Generate and upload coverage reports
  - _Requirements: CI/CD_

- [ ] 21.4 Create database migration scripts
  - Set up migration tool (e.g., node-pg-migrate)
  - Create initial schema migration
  - Document migration process
  - Test rollback procedures
  - _Requirements: Database management_

- [ ] 21.5 Set up production deployment
  - Configure production database
  - Set up AWS S3 bucket for file storage
  - Configure environment variables
  - Set up SSL certificates
  - Configure domain and DNS
  - Deploy backend to hosting service
  - Deploy frontend to hosting service or CDN
  - _Requirements: Deployment_

- [ ] 21.6 Implement logging and monitoring
  - Set up structured logging with Winston
  - Log all errors with stack traces
  - Log important business events
  - Set up application monitoring (e.g., Sentry)
  - Configure alerts for critical errors
  - _Requirements: Monitoring_

- [ ] 21.7 Create deployment documentation
  - Document deployment process
  - Document environment setup
  - Document database backup procedures
  - Document rollback procedures
  - _Requirements: Documentation_

### 22. Final Checkpoint and Launch Preparation

- [ ] 22.1 Comprehensive testing review
  - Verify all 38 property tests are implemented and passing
  - Verify unit test coverage is above 80%
  - Verify all integration tests pass
  - Run full test suite in CI/CD
  - Ask the user if questions arise

- [ ] 22.2 Code quality review
  - Run linter and fix all issues
  - Review and refactor complex code
  - Ensure consistent code style
  - Remove dead code and unused imports
  - Add missing documentation

- [ ] 22.3 User acceptance testing preparation
  - Create test user accounts
  - Seed database with sample markets
  - Test all user flows manually
  - Verify responsive design on multiple devices
  - Test cross-browser compatibility

- [ ] 22.4 Performance and security audit
  - Run performance tests
  - Check for security vulnerabilities
  - Verify all API endpoints are protected
  - Test rate limiting
  - Verify error handling is comprehensive

- [ ] 22.5 Production readiness checklist
  - Verify all environment variables are set
  - Verify database migrations are applied
  - Verify SSL certificates are configured
  - Verify monitoring and logging are active
  - Verify backup procedures are in place
  - Create incident response plan
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints (18.1, 22.1, 22.5) ensure incremental validation and provide opportunities for user feedback
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate end-to-end flows
- The implementation uses TypeScript for both frontend and backend
- All monetary values are stored as integers in smallest unit (kobo/cents) to avoid floating-point errors
- Real-time updates use WebSocket (Socket.io) for live data synchronization
- Authentication uses JWT tokens stored in httpOnly cookies for security
- File uploads use AWS S3 for scalable storage
- Currency conversion uses external API with caching to reduce API calls

## Implementation Order Rationale

1. **Infrastructure First**: Database and project setup provide foundation
2. **Authentication Early**: Required for all protected features
3. **Wallet Before Markets**: Users need wallets to participate in markets
4. **Markets Before Positions**: Positions depend on markets existing
5. **Core Features Before Social**: Essential functionality before engagement features
6. **Real-time After Core**: WebSocket integration after basic features work
7. **Testing Throughout**: Tests written alongside implementation
8. **Optimization and Security**: Performance and security hardening before launch
9. **Deployment Last**: Deploy after all features are complete and tested

## Success Criteria

- All 38 correctness properties have passing property tests
- Unit test coverage is above 80%
- All integration tests pass
- All user stories from requirements are implemented
- Application is deployed and accessible
- Real-time updates work correctly
- Security best practices are implemented
- Performance meets acceptable standards
