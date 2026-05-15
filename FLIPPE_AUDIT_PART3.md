## 3. USER FLOW DIAGRAMS

### 3.1 Main User Flow

```
START
  ↓
User opens app (/)
  ↓
[Not logged in] → Login/Signup → [Logged in]
  ↓
Homepage shows 6 demo markets
  ↓
User clicks market card
  ↓
Market Detail page opens
  ↓
User clicks YES or NO button
  ↓
Forecast Slip opens (bottom sheet on mobile, right panel on desktop)
  ↓
User enters amount (manual or quick buttons)
  ↓
System shows:
  - Projected return
  - Projected profit
  - Insufficient balance warning (if applicable)
  ↓
User clicks "Confirm Forecast"
  ↓
System:
  - Shows loading spinner (1.5s)
  - Updates market pricing locally
  - Creates notification
  - Checks wallet balance
  - Creates wallet low notification (if balance < ₦5K)
  ↓
Success animation shows
  ↓
Forecast Slip closes after 2s
  ↓
User navigates to Portfolio
  ↓
Position appears in "Active Positions"
  - Shows current value
  - Shows P&L (profit/loss)
  - Shows Sell button
  ↓
User clicks "Sell" button
  ↓
Sell Position Modal opens
  ↓
User enters asking price
  ↓
User clicks "Create Listing"
  ↓
System:
  - Generates 8-char listing code
  - Creates shareable link
  - Shows success state
  ↓
Position moves to "Listed for Sale" section
  ↓
User can:
  - Copy listing link
  - Share listing
  - View in Marketplace
  ↓
Other users can:
  - Browse Marketplace
  - Search by code
  - Purchase listing
  ↓
User views Wallet
  - See balance
  - View transactions (empty)
  - Deposit (simulated)
  - Withdraw (simulated)
  ↓
User views Notifications
  - See forecast confirmations
  - See wallet warnings
  - Mark as read
  - Delete
END
```

### 3.2 Admin Flow

```
START
  ↓
Admin logs in (fehintoluwaolu@gmail.com or oluwasinaayomifetuga@gmail.com)
  ↓
Admin navigates to /admin
  ↓
Admin Dashboard shows:
  - Total Markets: 0
  - Active: 0
  - Closed: 0
  - Resolved: 0
  ↓
Admin clicks "Create Market"
  ↓
Create Market Modal opens
  ↓
Admin fills form:
  - Question
  - Description
  - Category
  - Close time
  - Initial pools
  ↓
Admin clicks "Create Market"
  ↓
Toast shows "Coming soon"
  ↓
[BLOCKED - Backend not implemented]
  ↓
Admin can also:
  - Edit Market → "Coming soon" toast
  - Delete Market → "Coming soon" toast
  - Close Market → "Coming soon" toast
  - Resolve Market (YES/NO) → "Coming soon" toast
  ↓
[IF BACKEND WAS WORKING]
  ↓
Market would be created
  ↓
Users would see new market on homepage
  ↓
Users could forecast on market
  ↓
Admin closes market
  ↓
No more forecasts accepted
  ↓
Admin resolves market (YES or NO)
  ↓
System would:
  - Calculate winners
  - Distribute payouts
  - Create notifications for all participants
  - Update leaderboard
END
```

### 3.3 Marketplace Flow

```
START
  ↓
User A has active position
  ↓
User A clicks "Sell" in Portfolio
  ↓
Sell Modal opens
  ↓
User A enters asking price (e.g., ₦15,000)
  ↓
User A clicks "Create Listing"
  ↓
System:
  - Generates code (e.g., "ABC123XY")
  - Creates shareable link
  - Marks position as listed
  ↓
User A shares link with User B
  ↓
User B opens link (/listing/ABC123XY)
  ↓
Listing Detail page shows:
  - Market question
  - Position side (YES/NO)
  - Entry price
  - Current price
  - Asking price
  - Discount (if any)
  ↓
User B clicks "Purchase Position"
  ↓
Confirmation modal opens
  ↓
User B clicks "Confirm"
  ↓
System:
  - Shows loading spinner
  - [BACKEND INCOMPLETE]
  - Would transfer position
  - Would transfer funds
  - Would update ownership
  ↓
Success toast shows
  ↓
User B redirected to Portfolio
  ↓
Position now appears in User B's portfolio
  ↓
User A receives funds in wallet
END
```
