import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Create Express app
const app = express();

// CORS configuration - ALLOW YOUR FRONTEND
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://event-horizon-forecasts.vercel.app',
      'http://localhost:8080',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
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
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Load routes
let routesLoaded = false;

async function loadRoutes() {
  if (routesLoaded) return;
  
  try {
    const authRoutes = await import('../src/routes/auth.routes.js');
    app.use('/api/auth', authRoutes.default);
    
    const walletRoutes = await import('../src/routes/wallet.routes.js');
    app.use('/api/wallet', walletRoutes.default);
    
    const marketRoutes = await import('../src/routes/market.routes.js');
    app.use('/api/markets', marketRoutes.default);
    
    routesLoaded = true;
    console.log('Routes loaded successfully');
  } catch (error) {
    console.error('Failed to load routes:', error);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Prediction Platform API is running',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

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
    },
    timestamp: new Date().toISOString()
  });
});

// Vercel serverless function handler
export default async (req: VercelRequest, res: VercelResponse) => {
  // Load routes on first request
  await loadRoutes();
  
  // Handle the request with Express
  return app(req as any, res as any);
};
