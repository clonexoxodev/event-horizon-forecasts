import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { testSupabaseConnection } from './db/supabase-client.js';
import authRoutes from './routes/auth.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import marketRoutes from './routes/market.routes.js';
import adminRoutes from './routes/admin.routes.js';
import adminMarketRoutes from './routes/admin-market.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';

dotenv.config();

const app = express();
const defaultAllowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://event-horizon-forecasts.vercel.app',
];
const allowedOrigins = (process.env.FRONTEND_URL || process.env.FRONTEND_URLS || defaultAllowedOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/markets', adminMarketRoutes);

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
      markets: '/api/markets/*',
      admin: '/api/admin/*'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Prediction Platform API is running' });
});

const PORT = process.env.PORT || 5000;

// Start server first so local health checks work even if Supabase is slow.
async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Supabase client ready`);
    });

    void testSupabaseConnection().then((dbConnected) => {
      if (!dbConnected) {
        console.error('Failed to connect to Supabase. Please check your Supabase configuration.');
      }
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
