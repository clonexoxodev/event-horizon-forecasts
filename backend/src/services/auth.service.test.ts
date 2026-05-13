import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { resetDatabase } from '../db/initialize.js';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    // Reset database before each test
    await resetDatabase();
    authService = new AuthService();
  });

  describe('register', () => {
    it('should register a new user with zero-balance wallet', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await authService.register(userData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('username', userData.username);
      expect(result.user).toHaveProperty('email', userData.email);
      expect(result.user).not.toHaveProperty('password_hash');
      expect(typeof result.token).toBe('string');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      await expect(authService.register(userData)).rejects.toThrow('Invalid email format');
    });

    it('should reject registration with short password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123'
      };

      await expect(authService.register(userData)).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should reject registration with short username', async () => {
      const userData = {
        username: 'ab',
        email: 'test@example.com',
        password: 'password123'
      };

      await expect(authService.register(userData)).rejects.toThrow('Username must be at least 3 characters');
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // First registration
      await authService.register(userData);

      // Second registration with same email
      const duplicateData = {
        username: 'testuser2',
        email: 'test@example.com',
        password: 'password123'
      };

      await expect(authService.register(duplicateData)).rejects.toThrow('Email already exists');
    });

    it('should reject duplicate username registration', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // First registration
      await authService.register(userData);

      // Second registration with same username
      const duplicateData = {
        username: 'testuser',
        email: 'test2@example.com',
        password: 'password123'
      };

      await expect(authService.register(duplicateData)).rejects.toThrow('Username already exists');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      await authService.register(userData);
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await authService.login(loginData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user).toHaveProperty('email', loginData.email);
      expect(typeof result.token).toBe('string');
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'password123'
      };

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const { token } = await authService.register(userData);
      const decoded = authService.verifyToken(token);

      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('username', userData.username);
      expect(decoded).toHaveProperty('email', userData.email);
    });

    it('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => authService.verifyToken(invalidToken)).toThrow('Invalid token');
    });
  });
});