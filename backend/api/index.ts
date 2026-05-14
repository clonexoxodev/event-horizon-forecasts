import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for every request
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://event-horizon-forecasts.vercel.app',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://event-horizon-forecasts.vercel.app');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check
  if (req.url === '/api/health' || req.url === '/health') {
    return res.status(200).json({
      status: 'ok',
      message: 'Prediction Platform API is running',
      timestamp: new Date().toISOString()
    });
  }

  // Root endpoint
  if (req.url === '/api' || req.url === '/api/' || req.url === '/') {
    return res.status(200).json({
      message: 'Prediction Platform API',
      status: 'running',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth/*',
        wallet: '/api/wallet/*',
        markets: '/api/markets/*'
      },
      timestamp: new Date().toISOString()
    });
  }

  // Load Express app for other routes
  try {
    const express = (await import('express')).default;
    const cors = (await import('cors')).default;
    const cookieParser = (await import('cookie-parser')).default;

    const app = express();

    app.use(cors({
      origin: allowedOrigins,
      credentials: true
    }));
    app.use(express.json());
    app.use(cookieParser());

    // Load routes
    try {
      const authRoutes = (await import('../src/routes/auth.routes.js')).default;
      app.use('/api/auth', authRoutes);
    } catch (err) {
      console.error('Failed to load auth routes:', err);
    }

    try {
      const walletRoutes = (await import('../src/routes/wallet.routes.js')).default;
      app.use('/api/wallet', walletRoutes);
    } catch (err) {
      console.error('Failed to load wallet routes:', err);
    }

    try {
      const marketRoutes = (await import('../src/routes/market.routes.js')).default;
      app.use('/api/markets', marketRoutes);
    } catch (err) {
      console.error('Failed to load market routes:', err);
    }

    // Handle with Express
    return new Promise((resolve) => {
      app(req as any, res as any, () => {
        resolve(undefined);
      });
    });
  } catch (error) {
    console.error('Error loading Express:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
