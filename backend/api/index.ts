import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Create Express app once
const app = express();

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://event-horizon-forecasts.vercel.app',
      'http://localhost:8080',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Still allow but log it
      console.log('Origin not in whitelist:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Prediction Platform API is running',
    timestamp: new Date().toISOString()
  });
});

// Root
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

// Load routes dynamically
let routesLoaded = false;

async function loadRoutes() {
  if (routesLoaded) return;
  
  try {
    // Try multiple import strategies
    let authRoutes;
    try {
      authRoutes = await import('../src/routes/auth.routes.js');
    } catch {
      authRoutes = await import('../src/routes/auth.routes');
    }
    app.use('/api/auth', authRoutes.default || authRoutes);
    console.log('✓ Auth routes loaded');
  } catch (err) {
    console.error('✗ Failed to load auth routes:', err);
    // Create fallback route
    app.post('/api/auth/login', (req, res) => {
      res.status(503).json({ error: { message: 'Auth service temporarily unavailable' } });
    });
  }

  try {
    let walletRoutes;
    try {
      walletRoutes = await import('../src/routes/wallet.routes.js');
    } catch {
      walletRoutes = await import('../src/routes/wallet.routes');
    }
    app.use('/api/wallet', walletRoutes.default || walletRoutes);
    console.log('✓ Wallet routes loaded');
  } catch (err) {
    console.error('✗ Failed to load wallet routes:', err);
  }

  try {
    let marketRoutes;
    try {
      marketRoutes = await import('../src/routes/market.routes.js');
    } catch {
      marketRoutes = await import('../src/routes/market.routes');
    }
    app.use('/api/markets', marketRoutes.default || marketRoutes);
    console.log('✓ Market routes loaded');
  } catch (err) {
    console.error('✗ Failed to load market routes:', err);
  }

  routesLoaded = true;
}

// Vercel serverless handler
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Load routes on first request
    await loadRoutes();
    
    // Log request for debugging
    console.log(`${req.method} ${req.url}`);
    
    // Handle request with Express
    return app(req as any, res as any);
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      }
    });
  }
};
