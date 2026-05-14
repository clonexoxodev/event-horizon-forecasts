import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { testSupabaseConnection } from './db/supabase-client.js';
import authRoutes from './routes/auth.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import marketRoutes from './routes/market.routes.js';

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/markets', marketRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Prediction Platform API', 
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      wallet: '/api/wallet/*',
      markets: '/api/markets/*'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Prediction Platform API is running' });
});

const PORT = process.env.PORT || 5000;

// Start server with database connection check
async function startServer() {
  try {
    // Test Supabase connection
    const dbConnected = await testSupabaseConnection();
    if (!dbConnected) {
      console.error('Failed to connect to Supabase. Please check your Supabase configuration.');
      // Don't exit - continue with server startup
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Supabase client ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if not in serverless environment
if (process.env.VERCEL !== '1') {
  startServer();
}

export { app };
