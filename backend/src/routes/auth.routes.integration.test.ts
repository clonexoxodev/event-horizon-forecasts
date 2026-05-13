import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './auth.routes.js';

// Mock the database connection
vi.mock('../db/index.js', () => ({
  testConnection: vi.fn().mockResolvedValue(true),
  query: vi.fn(),
  transaction: vi.fn()
}));

// Mock the auth service
vi.mock('../services/auth.service.js', () => {
  return {
    AuthService: vi.fn().mockImplementation(() => ({
      register: vi.fn().mockResolvedValue({
        user: {
          id: 'test-user-id',
          username: 'testuser',
          email: 'test@example.com',
          created_at: new Date(),
          updated_at: new Date()
        },
        token: 'mock-jwt-token'
      }),
      login: vi.fn().mockResolvedValue({
        user: {
          id: 'test-user-id',
          username: 'testuser',
          email: 'test@example.com',
          created_at: new Date(),
          updated_at: new Date()
        },
        token: 'mock-jwt-token'
      }),
      verifyToken: vi.fn().mockReturnValue({
        userId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com'
      })
    }))
  };
});

describe('Auth Routes Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username', userData.username);
      expect(response.body.user).toHaveProperty('email', userData.email);

      // Check that httpOnly cookie is set
      expect(response.headers['set-cookie']).toBeDefined();
      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toContain('auth_token=');
      expect(cookieHeader).toContain('HttpOnly');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body.user).toHaveProperty('email', loginData.email);

      // Check that httpOnly cookie is set
      expect(response.headers['set-cookie']).toBeDefined();
      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toContain('auth_token=');
      expect(cookieHeader).toContain('HttpOnly');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logout successful');

      // Check that cookie is cleared
      expect(response.headers['set-cookie']).toBeDefined();
      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toContain('auth_token=;');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info when authenticated', async () => {
      // Set a mock cookie
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'auth_token=mock-jwt-token')
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', 'test-user-id');
      expect(response.body.user).toHaveProperty('username', 'testuser');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'MISSING_TOKEN');
    });
  });
});