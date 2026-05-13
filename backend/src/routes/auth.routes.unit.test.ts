import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './auth.routes.js';
import { AuthService } from '../services/auth.service.js';

// Mock the AuthService
vi.mock('../services/auth.service.js');

describe('Authentication Routes - Unit Tests', () => {
  let app: express.Application;
  let mockAuthService: any;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock AuthService
    mockAuthService = {
      register: vi.fn(),
      login: vi.fn(),
      verifyToken: vi.fn()
    };

    // Mock the AuthService constructor
    vi.mocked(AuthService).mockImplementation(() => mockAuthService);

    // Create Express app with middleware
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('should successfully register user and set httpOnly cookie', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockAuthResponse = {
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          created_at: new Date(),
          updated_at: new Date()
        },
        token: 'mock-jwt-token'
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Verify response body
      expect(response.body).toEqual({
        user: mockAuthResponse.user,
        message: 'User registered successfully'
      });

      // Verify token is not in response body (security)
      expect(response.body).not.toHaveProperty('token');

      // Verify httpOnly cookie is set
      expect(response.headers['set-cookie']).toBeDefined();
      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toContain('auth_token=mock-jwt-token');
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('SameSite=Strict');

      // Verify service was called correctly
      expect(mockAuthService.register).toHaveBeenCalledWith(userData);
    });

    it('should handle email already exists error', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthService.register.mockRejectedValue(new Error('Email already exists'));

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(409);

      expect(response.body).toEqual({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle username already exists error', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthService.register.mockRejectedValue(new Error('Username already exists'));

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(409);

      expect(response.body).toEqual({
        error: {
          code: 'USERNAME_EXISTS',
          message: 'This username is already taken',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle validation errors', async () => {
      const userData = {
        username: 'ab', // too short
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthService.register.mockRejectedValue(new Error('Username must be at least 3 characters long'));

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username must be at least 3 characters long',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle generic server errors', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthService.register.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(500);

      expect(response.body).toEqual({
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to register user. Please try again.',
          timestamp: expect.any(String)
        }
      });
    });

    it('should set secure cookie in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockAuthResponse = {
        user: { id: 'user-123', username: 'testuser', email: 'test@example.com' },
        token: 'mock-jwt-token'
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toContain('Secure');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login user and set httpOnly cookie', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockAuthResponse = {
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com'
        },
        token: 'mock-jwt-token'
      };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Verify response body
      expect(response.body).toEqual({
        user: mockAuthResponse.user,
        message: 'Login successful'
      });

      // Verify token is not in response body
      expect(response.body).not.toHaveProperty('token');

      // Verify httpOnly cookie is set
      expect(response.headers['set-cookie']).toBeDefined();
      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toContain('auth_token=mock-jwt-token');
      expect(cookieHeader).toContain('HttpOnly');

      // Verify service was called correctly
      expect(mockAuthService.login).toHaveBeenCalledWith(loginData);
    });

    it('should handle invalid credentials error', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toEqual({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle validation errors', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123'
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid email format'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle generic server errors', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthService.login.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(500);

      expect(response.body).toEqual({
        error: {
          code: 'LOGIN_FAILED',
          message: 'Login failed. Please try again.',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout and clear cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logout successful'
      });

      // Verify cookie is cleared
      expect(response.headers['set-cookie']).toBeDefined();
      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toContain('auth_token=;');
      expect(cookieHeader).toContain('HttpOnly');
    });

    it('should handle logout errors gracefully', async () => {
      // Mock a scenario where clearing cookie might fail
      // This is more of a theoretical test since logout is simple
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info when authenticated', async () => {
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com'
      };

      mockAuthService.verifyToken.mockReturnValue(mockUser);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['auth_token=valid-jwt-token'])
        .expect(200);

      expect(response.body).toEqual({
        user: {
          id: mockUser.userId,
          username: mockUser.username,
          email: mockUser.email
        }
      });
    });

    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toEqual({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 401 when token is invalid', async () => {
      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['auth_token=invalid-token'])
        .expect(401);

      expect(response.body).toEqual({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('Cookie Configuration', () => {
    it('should set cookie with correct attributes in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockAuthResponse = {
        user: { id: 'user-123', username: 'testuser', email: 'test@example.com' },
        token: 'mock-jwt-token'
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('SameSite=Strict');
      expect(cookieHeader).toContain('Max-Age=86400'); // 24 hours
      expect(cookieHeader).not.toContain('Secure'); // Not secure in development

      process.env.NODE_ENV = originalEnv;
    });

    it('should set cookie with secure flag in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockAuthResponse = {
        user: { id: 'user-123', username: 'testuser', email: 'test@example.com' },
        token: 'mock-jwt-token'
      };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toContain('Secure');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Request Body Validation', () => {
    it('should handle missing request body for signup', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle missing request body for login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express will handle malformed JSON and return 400
      expect(response.status).toBe(400);
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(typeof response.body.error.timestamp).toBe('string');
    });

    it('should include timestamp in ISO format', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      const timestamp = response.body.error.timestamp;
      expect(() => new Date(timestamp)).not.toThrow();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });
});