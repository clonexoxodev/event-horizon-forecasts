import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

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

    // Dynamically import and initialize Express app
    const express = await import('express');
    const cors = await import('cors');
    const cookieParser = await import('cookie-parser');
    
    const app = express.default();

    // Middleware
    app.use(cors.default({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    }));
    app.use(express.json());
    app.use(cookieParser.default());

    // Try to load routes, but don't fail if they don't load
    try {
      const authRoutes = await import('../src/routes/auth.routes.js');
      app.use('/api/auth', authRoutes.default);
    } catch (err) {
      console.error('Failed to load auth routes:', err);
    }

    try {
      const walletRoutes = await import('../src/routes/wallet.routes.js');
      app.use('/api/wallet', walletRoutes.default);
    } catch (err) {
      console.error('Failed to load wallet routes:', err);
    }

    try {
      const marketRoutes = await import('../src/routes/market.routes.js');
      app.use('/api/markets', marketRoutes.default);
    } catch (err) {
      console.error('Failed to load market routes:', err);
    }

    // Handle the request with Express
    return new Promise((resolve, reject) => {
      app(req as any, res as any, (err: any) => {
        if (err) {
          console.error('Express error:', err);
          reject(err);
        } else {
          resolve(undefined);
        }
      });
    });

  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
};
