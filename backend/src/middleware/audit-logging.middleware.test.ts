import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AuditLoggingMiddleware } from './audit-logging.middleware.js';
import { AuditTrailRepository } from '../repositories/audit-trail.repository.js';
import { Market } from '../repositories/admin-market.repository.js';

// Mock the AuditTrailRepository
vi.mock('../repositories/audit-trail.repository.js', () => {
  return {
    AuditTrailRepository: vi.fn().mockImplementation(() => ({
      create: vi.fn().mockResolvedValue({ id: 'audit-123' }),
      calculateChangedFields: vi.fn().mockReturnValue({
        question: { old: 'Old question', new: 'New question' },
      }),
    })),
  };
});

describe('AuditLoggingMiddleware', () => {
  let middleware: AuditLoggingMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;

  const mockUser = {
    userId: 'user-123',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin' as const,
  };

  const mockMarket: Market = {
    id: 'market-123',
    question: 'Test question',
    description: 'Test description',
    category: 'sports',
    country_filter: null,
    market_type: 'binary',
    yes_label: 'Yes',
    no_label: 'No',
    yes_price: 50,
    no_price: 50,
    close_date: '2024-12-31T23:59:59Z',
    resolution_date: '2025-01-01T23:59:59Z',
    resolution_source: null,
    outcome: null,
    status: 'draft',
    pool_amount_smallest_unit: 0,
    participant_count: 0,
    currency: 'NGN',
    image_url: null,
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    resolved_at: null,
    archived_at: null,
    version: 1,
  };

  beforeEach(() => {
    middleware = new AuditLoggingMiddleware();
    
    jsonSpy = vi.fn().mockReturnThis();
    
    mockRequest = {
      user: mockUser,
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Mozilla/5.0',
      },
      params: {},
    };

    mockResponse = {
      json: jsonSpy,
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('logAudit', () => {
    test('should skip audit logging for non-authenticated users', async () => {
      mockRequest.user = undefined;

      await middleware.logAudit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    test('should skip audit logging for regular users', async () => {
      mockRequest.user = { ...mockUser, role: 'user' as const };

      await middleware.logAudit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    test('should intercept res.json for admin users', async () => {
      await middleware.logAudit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.json).toBeDefined();
      expect(typeof mockResponse.json).toBe('function');
    });

    test('should log audit entry for successful create operation', async () => {
      mockRequest.auditContext = {
        actionType: 'create',
      };

      await middleware.logAudit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Simulate successful response
      const responseBody = {
        success: true,
        market: mockMarket,
      };

      mockResponse.json!(responseBody);

      // Wait for async audit logging
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify audit entry was created
      const auditRepo = (middleware as any).auditRepo as AuditTrailRepository;
      expect(auditRepo.create).toHaveBeenCalledWith({
        market_id: mockMarket.id,
        admin_user_id: mockUser.userId,
        action_type: 'create',
        changed_fields: undefined,
        snapshot_before: undefined,
        snapshot_after: mockMarket,
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0',
      });
    });

    test('should log audit entry for successful update operation with changed fields', async () => {
      const updatedMarket = { ...mockMarket, question: 'New question' };
      
      mockRequest.auditContext = {
        marketId: mockMarket.id,
        actionType: 'update',
        snapshotBefore: mockMarket,
      };

      await middleware.logAudit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Simulate successful response
      const responseBody = {
        success: true,
        market: updatedMarket,
      };

      mockResponse.json!(responseBody);

      // Wait for async audit logging
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify audit entry was created with changed fields
      const auditRepo = (middleware as any).auditRepo as AuditTrailRepository;
      expect(auditRepo.calculateChangedFields).toHaveBeenCalledWith(
        mockMarket,
        updatedMarket
      );
      expect(auditRepo.create).toHaveBeenCalledWith({
        market_id: mockMarket.id,
        admin_user_id: mockUser.userId,
        action_type: 'update',
        changed_fields: {
          question: { old: 'Old question', new: 'New question' },
        },
        snapshot_before: mockMarket,
        snapshot_after: updatedMarket,
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0',
      });
    });

    test('should log audit entry for status change operation', async () => {
      const updatedMarket = { ...mockMarket, status: 'active' as const };
      
      mockRequest.auditContext = {
        marketId: mockMarket.id,
        actionType: 'status_change',
        snapshotBefore: mockMarket,
      };

      await middleware.logAudit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Simulate successful response
      const responseBody = {
        success: true,
        market: updatedMarket,
      };

      mockResponse.json!(responseBody);

      // Wait for async audit logging
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify audit entry was created with status change
      const auditRepo = (middleware as any).auditRepo as AuditTrailRepository;
      expect(auditRepo.create).toHaveBeenCalledWith({
        market_id: mockMarket.id,
        admin_user_id: mockUser.userId,
        action_type: 'status_change',
        changed_fields: {
          status: { old: 'draft', new: 'active' },
        },
        snapshot_before: mockMarket,
        snapshot_after: updatedMarket,
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0',
      });
    });

    test('should not log audit entry for failed operations', async () => {
      mockRequest.auditContext = {
        actionType: 'create',
      };

      await middleware.logAudit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Simulate failed response
      const responseBody = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid data',
        },
      };

      mockResponse.json!(responseBody);

      // Wait for async audit logging
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify audit entry was NOT created
      const auditRepo = (middleware as any).auditRepo as AuditTrailRepository;
      expect(auditRepo.create).not.toHaveBeenCalled();
    });

    test('should handle audit logging errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock audit repo to throw error
      const auditRepo = (middleware as any).auditRepo as AuditTrailRepository;
      (auditRepo.create as any).mockRejectedValueOnce(new Error('Database error'));

      mockRequest.auditContext = {
        actionType: 'create',
      };

      await middleware.logAudit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Simulate successful response
      const responseBody = {
        success: true,
        market: mockMarket,
      };

      mockResponse.json!(responseBody);

      // Wait for async audit logging
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify error was logged but response was still sent
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create audit entry:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Helper methods', () => {
    test('forCreate should set audit context for create operations', () => {
      const createMiddleware = AuditLoggingMiddleware.forCreate();

      createMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.auditContext).toEqual({
        actionType: 'create',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    test('forUpdate should set audit context with existing market', async () => {
      const getExistingMarket = vi.fn().mockResolvedValue(mockMarket);
      const updateMiddleware = AuditLoggingMiddleware.forUpdate(getExistingMarket);

      await updateMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(getExistingMarket).toHaveBeenCalledWith(mockRequest);
      expect(mockRequest.auditContext).toEqual({
        marketId: mockMarket.id,
        actionType: 'update',
        snapshotBefore: mockMarket,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    test('forUpdate should handle errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const getExistingMarket = vi.fn().mockRejectedValue(new Error('Database error'));
      const updateMiddleware = AuditLoggingMiddleware.forUpdate(getExistingMarket);

      await updateMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load existing market for audit:',
        expect.any(Error)
      );
      expect(mockNext).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test('forStatusChange should set audit context with existing market', async () => {
      const getExistingMarket = vi.fn().mockResolvedValue(mockMarket);
      const statusChangeMiddleware = AuditLoggingMiddleware.forStatusChange(getExistingMarket);

      await statusChangeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(getExistingMarket).toHaveBeenCalledWith(mockRequest);
      expect(mockRequest.auditContext).toEqual({
        marketId: mockMarket.id,
        actionType: 'status_change',
        snapshotBefore: mockMarket,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    test('forDelete should set audit context with existing market', async () => {
      const getExistingMarket = vi.fn().mockResolvedValue(mockMarket);
      const deleteMiddleware = AuditLoggingMiddleware.forDelete(getExistingMarket);

      await deleteMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(getExistingMarket).toHaveBeenCalledWith(mockRequest);
      expect(mockRequest.auditContext).toEqual({
        marketId: mockMarket.id,
        actionType: 'delete',
        snapshotBefore: mockMarket,
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
