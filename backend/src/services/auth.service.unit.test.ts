import { describe, it, expect } from 'vitest';
import { AuthService } from './auth.service.js';

describe('AuthService Unit Tests (No Database)', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('Token Generation and Verification', () => {
    it('should generate and verify JWT token', () => {
      const mockUser = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com'
      };

      // Generate token using private method (we'll test through public interface)
      const token = authService['generateToken'](mockUser);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      // Verify token
      const decoded = authService.verifyToken(token);
      expect(decoded).toHaveProperty('userId', mockUser.id);
      expect(decoded).toHaveProperty('username', mockUser.username);
      expect(decoded).toHaveProperty('email', mockUser.email);
    });

    it('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';
      expect(() => authService.verifyToken(invalidToken)).toThrow('Invalid token');
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com'
      ];

      validEmails.forEach(email => {
        expect(authService['isValidEmail'](email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(authService['isValidEmail'](email)).toBe(false);
      });
    });

    it('should validate registration data', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Should not throw for valid data
      expect(() => authService['validateRegistrationData'](validData)).not.toThrow();

      // Should throw for invalid username
      expect(() => authService['validateRegistrationData']({
        ...validData,
        username: 'ab'
      })).toThrow('Username must be at least 3 characters long');

      // Should throw for invalid email
      expect(() => authService['validateRegistrationData']({
        ...validData,
        email: 'invalid-email'
      })).toThrow('Invalid email format');

      // Should throw for short password
      expect(() => authService['validateRegistrationData']({
        ...validData,
        password: '123'
      })).toThrow('Password must be at least 8 characters long');
    });

    it('should validate login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Should not throw for valid data
      expect(() => authService['validateLoginData'](validData)).not.toThrow();

      // Should throw for invalid email
      expect(() => authService['validateLoginData']({
        ...validData,
        email: 'invalid-email'
      })).toThrow('Invalid email format');

      // Should throw for missing password
      expect(() => authService['validateLoginData']({
        ...validData,
        password: ''
      })).toThrow('Password is required');
    });
  });
});