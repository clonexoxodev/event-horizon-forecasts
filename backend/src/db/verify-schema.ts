import pool, { testConnection, closePool } from './connection.js';

/**
 * Verify that all required tables exist with proper structure
 */
async function verifySchema(): Promise<void> {
  try {
    console.log('Verifying database schema...\n');

    // Test connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Define expected tables and their key columns
    const expectedTables = {
      users: [
        'id',
        'username',
        'email',
        'password_hash',
        'profile_picture_url',
        'instagram_handle',
        'twitter_handle',
        'created_at',
        'updated_at',
      ],
      wallets: [
        'id',
        'user_id',
        'balance_ngn_kobo',
        'balance_usd_cents',
        'available_ngn_kobo',
        'available_usd_cents',
        'created_at',
        'updated_at',
      ],
      markets: [
        'id',
        'question',
        'description',
        'currency',
        'pool_amount_smallest_unit',
        'yes_pool_smallest_unit',
        'no_pool_smallest_unit',
        'min_position_smallest_unit',
        'max_position_smallest_unit',
        'state',
        'winning_side',
        'closes_at',
        'resolved_at',
        'created_at',
        'updated_at',
      ],
      positions: [
        'id',
        'user_id',
        'market_id',
        'side',
        'amount_smallest_unit',
        'currency',
        'potential_return_smallest_unit',
        'is_winner',
        'payout_smallest_unit',
        'created_at',
        'resolved_at',
      ],
      transactions: [
        'id',
        'user_id',
        'wallet_id',
        'type',
        'amount_smallest_unit',
        'currency',
        'direction',
        'reference_id',
        'reference_type',
        'status',
        'metadata',
        'created_at',
      ],
      leaderboard_entries: [
        'id',
        'user_id',
        'total_points',
        'total_predictions',
        'correct_predictions',
        'accuracy_percentage',
        'rank',
        'updated_at',
      ],
      notifications: [
        'id',
        'user_id',
        'type',
        'title',
        'message',
        'is_read',
        'reference_id',
        'reference_type',
        'created_at',
      ],
    };

    // Check each table
    let allTablesExist = true;
    let allColumnsExist = true;

    for (const [tableName, expectedColumns] of Object.entries(expectedTables)) {
      // Check if table exists
      const tableResult = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      );

      const tableExists = tableResult.rows[0].exists;

      if (!tableExists) {
        console.log(`✗ Table '${tableName}' does NOT exist`);
        allTablesExist = false;
        continue;
      }

      console.log(`✓ Table '${tableName}' exists`);

      // Check columns
      const columnsResult = await pool.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = $1`,
        [tableName]
      );

      const actualColumns = columnsResult.rows.map((row) => row.column_name);
      const missingColumns = expectedColumns.filter(
        (col) => !actualColumns.includes(col)
      );

      if (missingColumns.length > 0) {
        console.log(`  ✗ Missing columns: ${missingColumns.join(', ')}`);
        allColumnsExist = false;
      } else {
        console.log(`  ✓ All expected columns present (${expectedColumns.length})`);
      }
    }

    // Check indexes
    console.log('\nVerifying indexes...');
    const expectedIndexes = [
      'idx_users_username',
      'idx_users_email',
      'idx_wallets_user_id',
      'idx_markets_state',
      'idx_markets_closes_at',
      'idx_markets_created_at',
      'idx_positions_user_id',
      'idx_positions_market_id',
      'idx_positions_created_at',
      'idx_positions_user_market',
      'idx_transactions_user_id',
      'idx_transactions_wallet_id',
      'idx_transactions_created_at',
      'idx_transactions_reference',
      'idx_leaderboard_rank',
      'idx_leaderboard_points',
      'idx_leaderboard_user_id',
      'idx_notifications_user_id',
      'idx_notifications_created_at',
      'idx_notifications_is_read',
    ];

    const indexResult = await pool.query(
      `SELECT indexname 
       FROM pg_indexes 
       WHERE schemaname = 'public'`
    );

    const actualIndexes = indexResult.rows.map((row) => row.indexname);
    const missingIndexes = expectedIndexes.filter(
      (idx) => !actualIndexes.includes(idx)
    );

    if (missingIndexes.length > 0) {
      console.log(`✗ Missing indexes: ${missingIndexes.join(', ')}`);
    } else {
      console.log(`✓ All expected indexes present (${expectedIndexes.length})`);
    }

    // Check constraints
    console.log('\nVerifying constraints...');
    const constraintResult = await pool.query(
      `SELECT conname, contype 
       FROM pg_constraint 
       WHERE connamespace = 'public'::regnamespace`
    );

    const constraints = constraintResult.rows;
    console.log(`✓ Found ${constraints.length} constraints`);

    // Summary
    console.log('\n' + '='.repeat(50));
    if (allTablesExist && allColumnsExist && missingIndexes.length === 0) {
      console.log('✓ Schema verification PASSED');
      console.log('All required tables, columns, and indexes are present');
    } else {
      console.log('✗ Schema verification FAILED');
      if (!allTablesExist) {
        console.log('  - Some tables are missing');
      }
      if (!allColumnsExist) {
        console.log('  - Some columns are missing');
      }
      if (missingIndexes.length > 0) {
        console.log('  - Some indexes are missing');
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('Schema verification failed:', error);
    throw error;
  }
}

// Run verification if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await verifySchema();
    } catch (error) {
      console.error('Verification failed:', error);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}

export { verifySchema };
