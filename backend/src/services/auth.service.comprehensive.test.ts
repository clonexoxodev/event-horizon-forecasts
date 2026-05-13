import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { WalletRepository } from '../repositories/wallet.repository.js';
import { transaction } from '../db/index.js';

// Mock dependencies
vi.mock('../repositories/user.repository.js');
vi.mock('../repositories/wallet.repository.js');
vi.mock('../db/index.js');
vi.mock('bcrypt');
vi.mock('jsonwebtoken');

describe('AuthService - Comprehensive Unit Tests', () => {
  let authService: AuthService;
  let mockUserRepository: any;
  let mockWalletRepository: any;
  let mockTransaction: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock instances
    mockUserRepository = {
      emailExists: vi.fn(),
      usernameExists: vi.fn(),
      findByEmail: vi.fn(),
      toUserResponse: vi.fn()
    };

    mockWalletRepository = {};

    mockTransaction = vi.fn();

    // Mock constructors
    vi.mocked(UserRepository).mockImplementation(() => mockUserRepository);
    vi.mocked(WalletRepository).mockImplementation(() => mockWalletRepository);
    vi.mocked(transaction).mockImplementation(mockTransaction);

    // Set up environment
    process.env.JWT_SECRET = 'test-secret-key';

    authService = new AuthService();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('Successful Signup with Wallet Creation', () => {
    it('should successfully register user and create zero-balance wallet', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockWallet = {
        id: 'wallet-123',
        user_id: 'user-123',
        balance_ngn_kobo: 0,
        balance_usd_cents: 0,
        available_ngn_kobo: 0,
        available_usd_cents: 0
      };

      const mockUserResponse = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockToken = 'mock-jwt-token';

      // Setup mocks
      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.usernameExists.mockResolvedValue(false);
      mockUserRepository.toUserResponse.mockReturnValue(mockUserResponse);

      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      vi.mocked(jwt.sign).mockReturnValue(mockToken as never);

      // Mock transaction to simulate database operations
      mockTransaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [mockUser] }) // User creation
            .mockResolvedValueOnce({ rows: [mockWallet] }) // Wallet creation
        };
        return await callback(mockClient);
      });

      // Execute
      const result = await authService.register(userData);

      // Verify
      expect(result).toEqual({
        user: mockUserResponse,
        token: mockToken
      });

      // Verify bcrypt was called with correct parameters
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);

      // Verify JWT was generated with correct payload
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          username: mockUser.username,
          email: mockUser.email
        },
        'test-secret-key',
        { expiresIn: '24h' }
      );

      // Verify database operations
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('should create wallet with zero balance during registration', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = { id: 'user-123', username: 'testuser', email: 'test@example.com' };
      const mockWallet = {
        id: 'wallet-123',
        user_id: 'user-123',
        balance_ngn_kobo: 0,
        balance_usd_cents: 0,
        available_ngn_kobo: 0,
        available_usd_cents: 0
      };

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.usernameExists.mockResolvedValue(false);
      mockUserRepository.toUserResponse.mockReturnValue(mockUser);

      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      vi.mocked(jwt.sign).mockReturnValue('mock-token' as never);

      let walletCreationQuery: string;
      let walletCreationParams: any[];

      mockTransaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: vi.fn()
            .mockImplementation((sql: string, params: any[]) => {
              if (sql.includes('INSERT INTO wallets')) {
                walletCreationQuery = sql;
                walletCreationParams = params;
                return { rows: [mockWallet] };
              }
              return { rows: [mockUser] };
            })
        };
        return await callback(mockClient);
      });

      await authService.register(userData);

      // Verify wallet was created with zero balance
      expect(walletCreationQuery!).toContain('INSERT INTO wallets');
      expect(walletCreationQuery!).toContain('balance_ngn_kobo');
      expect(walletCreationQuery!).toContain('balance_usd_cents');
      expect(walletCreationQuery!).toContain('available_ngn_kobo');
      expect(walletCreationQuery!).toContain('available_usd_cents');
      
      // Verify all balance values are 0
      expect(walletCreationParams).toEqual([mockUser.id, 0, 0, 0, 0]);
    });
  });

  describe('Login with Valid Credentials', () => {
    it('should successfully login with correct email and password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed-password'
      };

      const mockUserResponse = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com'
      };

      const mockToken = 'mock-jwt-token';

      // Setup mocks
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.toUserResponse.mockReturnValue(mockUserResponse);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(jwt.sign).mockReturnValue(mockToken as never);

      // Execute
      const result = await authService.login(loginData);

      // Verify
      expect(result).toEqual({
        user: mockUserResponse,
        token: mockToken
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password_hash);
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          username: mockUser.username,
          email: mockUser.email
        },
        'test-secret-key',
        { expiresIn: '24h' }
      );
    });
  });

  describe('Login with Invalid Credentials', () => {
    it('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
    });

    it('should reject login with incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed-password'
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password_hash);
    });

    it('should reject login with invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123'
      };

      await expect(authService.login(loginData)).rejects.toThrow('Invalid email format');
    });

    it('should reject login with empty password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: ''
      };

      await expect(authService.login(loginData)).rejects.toThrow('Password is required');
    });
  });

  describe('JWT Token Generation and Validation', () => {
    it('should generate JWT token with correct payload and expiration', () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com'
      };

      const expectedPayload = {
        userId: mockUser.id,
        username: mockUser.username,
        email: mockUser.email
      };

      const mockToken = 'mock-jwt-token';
      vi.mocked(jwt.sign).mockReturnValue(mockToken as never);

      const token = authService['generateToken'](mockUser);

      expect(jwt.sign).toHaveBeenCalledWith(
        expectedPayload,
        'test-secret-key',
        { expiresIn: '24h' }
      );
      expect(token).toBe(mockToken);
    });

    it('should verify valid JWT token', () => {
      const mockToken = 'valid-jwt-token';
      const mockDecoded = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        iat: 1234567890,
        exp: 1234654290
      };

      vi.mocked(jwt.verify).mockReturnValue(mockDecoded as never);

      const result = authService.verifyToken(mockToken);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret-key');
      expect(result).toEqual(mockDecoded);
    });

    it('should reject invalid JWT token', () => {
      const invalidToken = 'invalid-jwt-token';
      
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      expect(() => authService.verifyToken(invalidToken)).toThrow('Invalid token');
      expect(jwt.verify).toHaveBeenCalledWith(invalidToken, 'test-secret-key');
    });

    it('should reject expired JWT token', () => {
      const expiredToken = 'expired-jwt-token';
      
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => authService.verifyToken(expiredToken)).toThrow('Invalid token');
    });

    it('should use default JWT secret when environment variable is not set', () => {
      delete process.env.JWT_SECRET;
      
      const newAuthService = new AuthService();
      const mockUser = { id: 'user-123', username: 'testuser', email: 'test@example.com' };
      
      vi.mocked(jwt.sign).mockReturnValue('token' as never);
      
      newAuthService['generateToken'](mockUser);
      
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        'your-secret-key', // default secret
        { expiresIn: '24h' }
      );
    });
  });

  describe('Logout Functionality', () => {
    it('should handle logout (stateless JWT approach)', () => {
      // Since JWT is stateless, logout is handled by clearing the httpOnly cookie
      // on the client side. The AuthService doesn't need a logout method.
      // This test verifies that the service doesn't maintain any session state.
      
      const authService1 = new AuthService();
      const authService2 = new AuthService();
      
      // Both instances should be independent and stateless
      expect(authService1).toBeInstanceOf(AuthService);
      expect(authService2).toBeInstanceOf(AuthService);
      
      // No session state should be maintained
      expect(authService1).not.toHaveProperty('sessions');
      expect(authService1).not.toHaveProperty('activeTokens');
    });
  });

  describe('Password Hashing', () => {
    it('should hash password with correct salt rounds during registration', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.usernameExists.mockResolvedValue(false);
      mockUserRepository.toUserResponse.mockReturnValue({});

      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      vi.mocked(jwt.sign).mockReturnValue('token' as never);

      mockTransaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] })
            .mockResolvedValueOnce({ rows: [{}] })
        };
        return await callback(mockClient);
      });

      await authService.register(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
    });

    it('should verify password hash during login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 'user-123',
        password_hash: 'stored-hash'
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.toUserResponse.mockReturnValue({});
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(jwt.sign).mockReturnValue('token' as never);

      await authService.login(loginData);

      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password_hash);
    });
  });

  describe('Input Validation', () => {
    it('should validate registration data thoroughly', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Valid data should not throw
      expect(() => authService['validateRegistrationData'](validData)).not.toThrow();

      // Test username validation
      expect(() => authService['validateRegistrationData']({
        ...validData,
        username: 'ab' // too short
      })).toThrow('Username must be at least 3 characters long');

      expect(() => authService['validateRegistrationData']({
        ...validData,
        username: 'a'.repeat(51) // too long
      })).toThrow('Username must be less than 50 characters');

      expect(() => authService['validateRegistrationData']({
        ...validData,
        username: 'user@name' // invalid characters
      })).toThrow('Username can only contain letters, numbers, and underscores');

      // Test email validation
      expect(() => authService['validateRegistrationData']({
        ...validData,
        email: 'invalid-email'
      })).toThrow('Invalid email format');

      // Test password validation
      expect(() => authService['validateRegistrationData']({
        ...validData,
        password: '1234567' // too short
      })).toThrow('Password must be at least 8 characters long');
    });

    it('should validate login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Valid data should not throw
      expect(() => authService['validateLoginData'](validData)).not.toThrow();

      // Invalid email
      expect(() => authService['validateLoginData']({
        ...validData,
        email: 'invalid-email'
      })).toThrow('Invalid email format');

      // Missing password
      expect(() => authService['validateLoginData']({
        ...validData,
        password: ''
      })).toThrow('Password is required');
    });

    it('should validate email format correctly', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        'test@.com',
        'test@com',
        ''
      ];

      validEmails.forEach(email => {
        expect(authService['isValidEmail'](email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(authService['isValidEmail'](email)).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database transaction failures during registration', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.usernameExists.mockResolvedValue(false);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);

      // Mock transaction failure
      mockTransaction.mockRejectedValue(new Error('Database connection failed'));

      await expect(authService.register(userData)).rejects.toThrow('Database connection failed');
    });

    it('should handle user creation failure', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.usernameExists.mockResolvedValue(false);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);

      mockTransaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({ rows: [] }) // Empty result
        };
        return await callback(mockClient);
      });

      await expect(authService.register(userData)).rejects.toThrow('Failed to create user');
    });

    it('should handle wallet creation failure', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.usernameExists.mockResolvedValue(false);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);

      mockTransaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] }) // User creation succeeds
            .mockResolvedValueOnce({ rows: [] }) // Wallet creation fails
        };
        return await callback(mockClient);
      });

      await expect(authService.register(userData)).rejects.toThrow('Failed to create wallet');
    });

    it('should handle duplicate email registration', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      mockUserRepository.emailExists.mockResolvedValue(true);

      await expect(authService.register(userData)).rejects.toThrow('Email already exists');
    });

    it('should handle duplicate username registration', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.usernameExists.mockResolvedValue(true);

      await expect(authService.register(userData)).rejects.toThrow('Username already exists');
    });
  });
});