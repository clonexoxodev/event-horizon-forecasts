# Transaction Service

The Transaction Service provides business logic for managing transaction operations in the Prediction Platform.

## Features

### Transaction History Retrieval

Get transaction history for a user with optional filtering and pagination.

```typescript
const transactions = await transactionService.getTransactionHistory(userId, {
  limit: 50,        // Number of transactions to return (default: 50)
  offset: 0,        // Number of transactions to skip (default: 0)
  type: 'deposit',  // Filter by transaction type (optional)
  currency: 'NGN'   // Filter by currency (optional)
});
```

#### Supported Transaction Types
- `deposit` - Funds added to wallet
- `withdrawal` - Funds removed from wallet
- `position_entry` - Funds used to enter a market position
- `position_payout` - Winnings from a successful position

#### Supported Currencies
- `NGN` - Nigerian Naira (stored as kobo)
- `USD` - US Dollar (stored as cents)

### Transaction Statistics

Get comprehensive statistics about a user's transactions:

```typescript
const stats = await transactionService.getTransactionStats(userId);

// Returns:
// {
//   totalDepositsNGN: number,
//   totalDepositsUSD: number,
//   totalWithdrawalsNGN: number,
//   totalWithdrawalsUSD: number,
//   totalPositionEntriesNGN: number,
//   totalPositionEntriesUSD: number,
//   totalPayoutsNGN: number,
//   totalPayoutsUSD: number,
//   transactionCount: number
// }
```

### Recent Transactions

Get the most recent transactions for a user:

```typescript
const recentTransactions = await transactionService.getRecentTransactions(userId, 10);
```

## API Endpoints

### GET /api/wallet/transactions

Retrieve transaction history with optional filtering.

**Query Parameters:**
- `limit` (optional): Number of transactions to return (1-100, default: 50)
- `offset` (optional): Number of transactions to skip (default: 0)
- `type` (optional): Filter by transaction type (`deposit`, `withdrawal`, `position_entry`, `position_payout`)
- `currency` (optional): Filter by currency (`NGN`, `USD`)

**Examples:**

```bash
# Get all transactions (default pagination)
GET /api/wallet/transactions

# Get deposits only
GET /api/wallet/transactions?type=deposit

# Get NGN transactions only
GET /api/wallet/transactions?currency=NGN

# Get NGN deposits with custom pagination
GET /api/wallet/transactions?type=deposit&currency=NGN&limit=20&offset=10

# Get position entries
GET /api/wallet/transactions?type=position_entry

# Get position payouts
GET /api/wallet/transactions?type=position_payout
```

**Response:**

```json
{
  "transactions": [
    {
      "id": "txn-123",
      "userId": "user-123",
      "walletId": "wallet-123",
      "type": "deposit",
      "amountSmallestUnit": 100000,
      "currency": "NGN",
      "direction": "IN",
      "referenceId": null,
      "referenceType": null,
      "status": "completed",
      "metadata": { "method": "bank_transfer" },
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "count": 1
  },
  "filters": {
    "type": "deposit",
    "currency": "NGN"
  }
}
```

## Implementation Details

### Repository Layer

The `TransactionRepository` provides data access methods:

- `create()` - Create a new transaction
- `createInTransaction()` - Create transaction within a database transaction
- `findByUserId()` - Get all transactions for a user
- `findByType()` - Get transactions filtered by type
- `findById()` - Get a specific transaction
- `updateStatus()` - Update transaction status
- `getTransactionCount()` - Get total transaction count
- `getTotalDeposits()` - Get total deposit amount
- `getTotalWithdrawals()` - Get total withdrawal amount

### Service Layer

The `TransactionService` provides business logic:

- `getTransactionHistory()` - Get transactions with filtering
- `getTransactionById()` - Get a specific transaction
- `getTransactionCount()` - Get transaction count
- `getTransactionStats()` - Get comprehensive statistics
- `getRecentTransactions()` - Get recent transactions

### Integration with Wallet Service

The `WalletService` uses the `TransactionRepository` to create transaction records for:

- Deposits (`processDeposit`)
- Withdrawals (`processWithdrawal`)
- Position entries (`reserveBalanceForPosition`)
- Position payouts (`processPositionPayout`)

All transaction creation is done within database transactions to ensure consistency.

## Testing

### Unit Tests

- `transaction.repository.test.ts` - Repository layer tests
- `transaction.service.test.ts` - Service layer tests
- `wallet.routes.test.ts` - API endpoint tests (includes transaction history)

### Test Coverage

- ✅ Transaction creation
- ✅ Transaction history retrieval
- ✅ Filtering by user ID
- ✅ Filtering by transaction type
- ✅ Filtering by currency
- ✅ Pagination support
- ✅ Transaction statistics
- ✅ Error handling

## Requirements Validation

This implementation satisfies the following requirements from the spec:

**Requirement 6: Transaction History**
- ✅ 6.1 - Display transaction history section
- ✅ 6.2 - Display deposits with IN indicator
- ✅ 6.3 - Display withdrawals with OUT indicator
- ✅ 6.4 - Display Market entries
- ✅ 6.5 - Add transactions to history within 1 second

**Additional Features:**
- ✅ Filtering by transaction type
- ✅ Filtering by currency
- ✅ Pagination for large histories
- ✅ Transaction statistics
- ✅ Support for all transaction types (deposit, withdrawal, position_entry, position_payout)
