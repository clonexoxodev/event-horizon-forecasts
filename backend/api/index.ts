import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import authRoutes from '../src/routes/auth.routes.js';
import walletRoutes from '../src/routes/wallet.routes.js';
import marketRoutes from '../src/routes/market.routes.js';

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
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
app.get('/api', (req, res) => {
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

// Vercel serverless function handler
export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};
