import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection configuration
const poolConfig: PoolConfig = process.env.DATABASE_URL 
  ? { 
      connectionString: process.env.DATABASE_URL
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'prediction_platform',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    };

// Add pool configuration
Object.assign(poolConfig, {
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection cannot be established
});

// Create connection pool
const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    console.log('Attempting to connect to PostgreSQL...');
    console.log('Connection config:', {
      host: poolConfig.host || 'using connection string',
      port: poolConfig.port,
      database: poolConfig.database,
      user: poolConfig.user ? poolConfig.user.substring(0, 10) + '...' : 'using connection string'
    });
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('PostgreSQL connected successfully at:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('PostgreSQL connection error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname
    });
    return false;
  }
}

// Query helper with retry logic
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await pool.query(text, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
      };
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Query failed (attempt ${attempt}/${maxRetries}):`,
        error
      );

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * attempt)
        );
      }
    }
  }

  console.error('Query failed after all retries:', lastError);
  throw lastError;
}

// Transaction helper
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get a client from the pool for manual transaction management
export async function getClient() {
  return await pool.connect();
}

// Close all connections in the pool
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Database connections closed');
}

export default pool;
