import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple CORS handler
function setCORSHeaders(res: VercelResponse, origin?: string) {
  const allowedOrigins = [
    'https://event-horizon-forecasts.vercel.app',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  const requestOrigin = origin || '';
  const allowOrigin = allowedOrigins.includes(requestOrigin) 
    ? requestOrigin 
    : 'https://event-horizon-forecasts.vercel.app';

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  setCORSHeaders(res, req.headers.origin as string);

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;
  console.log(`${method} ${url}`);

  try {
    // Health check
    if (url === '/api/health' || url === '/health') {
      return res.status(200).json({
        status: 'ok',
        message: 'Prediction Platform API is running',
        timestamp: new Date().toISOString()
      });
    }

    // Root API info
    if (url === '/api' || url === '/') {
      return res.status(200).json({
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
    }

    // Auth routes
    if (url?.startsWith('/api/auth')) {
      const { AuthService } = await import('../src/services/auth.service.js');
      const authService = new AuthService();

      // Login
      if (url === '/api/auth/login' && method === 'POST') {
        try {
          const { email, password } = req.body;

          if (!email || !password) {
            return res.status(400).json({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Email and password are required',
                timestamp: new Date().toISOString()
              }
            });
          }

          const authResponse = await authService.login({ email, password });

          // Set cookie
          res.setHeader('Set-Cookie', `auth_token=${authResponse.token}; HttpOnly; Secure; SameSite=None; Max-Age=86400; Path=/`);

          return res.status(200).json({
            user: authResponse.user,
            message: 'Login successful'
          });
        } catch (error: any) {
          console.error('Login error:', error);
          return res.status(401).json({
            error: {
              code: 'INVALID_CREDENTIALS',
              message: error.message || 'Invalid email or password',
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      // Signup
      if (url === '/api/auth/signup' && method === 'POST') {
        try {
          const { username, email, password } = req.body;

          if (!username || !email || !password) {
            return res.status(400).json({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Username, email, and password are required',
                timestamp: new Date().toISOString()
              }
            });
          }

          const authResponse = await authService.register({ username, email, password });

          // Set cookie
          res.setHeader('Set-Cookie', `auth_token=${authResponse.token}; HttpOnly; Secure; SameSite=None; Max-Age=86400; Path=/`);

          return res.status(201).json({
            user: authResponse.user,
            message: 'User registered successfully'
          });
        } catch (error: any) {
          console.error('Signup error:', error);
          
          if (error.message === 'Email already exists') {
            return res.status(409).json({
              error: {
                code: 'EMAIL_EXISTS',
                message: 'An account with this email already exists',
                timestamp: new Date().toISOString()
              }
            });
          }

          if (error.message === 'Username already exists') {
            return res.status(409).json({
              error: {
                code: 'USERNAME_EXISTS',
                message: 'This username is already taken',
                timestamp: new Date().toISOString()
              }
            });
          }

          return res.status(500).json({
            error: {
              code: 'REGISTRATION_FAILED',
              message: error.message || 'Failed to register user',
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      // Logout
      if (url === '/api/auth/logout' && method === 'POST') {
        res.setHeader('Set-Cookie', `auth_token=; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/`);
        return res.status(200).json({ message: 'Logout successful' });
      }
    }

    // Wallet routes
    if (url?.startsWith('/api/wallet')) {
      return res.status(200).json({
        message: 'Wallet endpoint',
        note: 'Wallet functionality coming soon'
      });
    }

    // Markets routes
    if (url?.startsWith('/api/markets')) {
      return res.status(200).json({
        message: 'Markets endpoint',
        note: 'Markets functionality coming soon'
      });
    }

    // 404 for unknown routes
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Handler error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}
