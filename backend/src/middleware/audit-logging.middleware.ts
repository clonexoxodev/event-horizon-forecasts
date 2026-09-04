import { Request, Response, NextFunction } from 'express';
import { AuditTrailRepository, AuditActionType } from '../repositories/audit-trail.repository.js';
import { Market } from '../repositories/admin-market.repository.js';

// Extend Request interface to include audit context
declare global {
  namespace Express {
    interface Request {
      auditContext?: {
        marketId?: string;
        actionType?: AuditActionType;
        snapshotBefore?: Market;
      };
    }
  }
}

/**
 * Middleware to automatically log audit trail entries for market operations
 * 
 * This middleware intercepts all market operations and creates audit trail entries
 * with admin user ID, IP address, user agent, and before/after snapshots.
 * 
 * Usage:
 * - Apply to routes that modify markets
 * - Set req.auditContext before the route handler to provide context
 * - The middleware will automatically capture the response and log the audit entry
 */
export class AuditLoggingMiddleware {
  private auditRepo: AuditTrailRepository;

  constructor() {
    this.auditRepo = new AuditTrailRepository();
  }

  /**
   * Middleware to capture audit information
   * This should be applied AFTER the route handler executes
   */
  logAudit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only log for authenticated admin users
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      return next();
    }

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    const auditRepo = this.auditRepo;

    // Override res.json to capture response data
    res.json = function (body: any): Response {
      // Only log if we have audit context and the operation was successful
      if (req.auditContext && body.success !== false) {
        // Extract market data from response
        const snapshotAfter = body.market || null;
        const marketId = req.auditContext.marketId || snapshotAfter?.id || req.params.marketId;

        // Log audit entry asynchronously (don't block response)
        if (marketId && req.auditContext.actionType) {
          setImmediate(async () => {
            try {
              // Calculate changed fields for updates
              let changedFields: Record<string, { old: any; new: any }> | undefined;
              
              if (req.auditContext!.actionType === 'update' && req.auditContext!.snapshotBefore && snapshotAfter) {
                changedFields = auditRepo.calculateChangedFields(
                  req.auditContext!.snapshotBefore,
                  snapshotAfter
                );
              } else if (req.auditContext!.actionType === 'status_change' && req.auditContext!.snapshotBefore && snapshotAfter) {
                // For status changes, capture the status change
                changedFields = {
                  status: {
                    old: req.auditContext!.snapshotBefore.status,
                    new: snapshotAfter.status,
                  },
                };
                
                // Also capture outcome change if present
                if (snapshotAfter.outcome !== req.auditContext!.snapshotBefore.outcome) {
                  changedFields.outcome = {
                    old: req.auditContext!.snapshotBefore.outcome,
                    new: snapshotAfter.outcome,
                  };
                }
              }

              await auditRepo.create({
                market_id: marketId,
                admin_user_id: req.user!.userId,
                action_type: req.auditContext!.actionType!,
                changed_fields: changedFields,
                snapshot_before: req.auditContext!.snapshotBefore,
                snapshot_after: snapshotAfter,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
              });
            } catch (error) {
              // Log error but don't fail the request
              console.error('Failed to create audit entry:', error);
            }
          });
        }
      }

      // Call original res.json
      return originalJson(body);
    };

    next();
  };

  /**
   * Helper to set audit context for create operations
   */
  static forCreate(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, _res: Response, next: NextFunction) => {
      req.auditContext = {
        actionType: 'create',
      };
      next();
    };
  }

  /**
   * Helper to set audit context for update operations
   * Requires the existing market to be loaded first
   */
  static forUpdate(getExistingMarket: (req: Request) => Promise<Market | null>): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, _res: Response, next: NextFunction) => {
      try {
        const existingMarket = await getExistingMarket(req);
        
        if (existingMarket) {
          req.auditContext = {
            marketId: existingMarket.id,
            actionType: 'update',
            snapshotBefore: existingMarket,
          };
        }
        
        next();
      } catch (error) {
        // If we can't get the existing market, continue without audit context
        console.error('Failed to load existing market for audit:', error);
        next();
      }
    };
  }

  /**
   * Helper to set audit context for status change operations
   * Requires the existing market to be loaded first
   */
  static forStatusChange(getExistingMarket: (req: Request) => Promise<Market | null>): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, _res: Response, next: NextFunction) => {
      try {
        const existingMarket = await getExistingMarket(req);
        
        if (existingMarket) {
          req.auditContext = {
            marketId: existingMarket.id,
            actionType: 'status_change',
            snapshotBefore: existingMarket,
          };
        }
        
        next();
      } catch (error) {
        // If we can't get the existing market, continue without audit context
        console.error('Failed to load existing market for audit:', error);
        next();
      }
    };
  }

  /**
   * Helper to set audit context for delete operations
   * Requires the existing market to be loaded first
   */
  static forDelete(getExistingMarket: (req: Request) => Promise<Market | null>): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, _res: Response, next: NextFunction) => {
      try {
        const existingMarket = await getExistingMarket(req);
        
        if (existingMarket) {
          req.auditContext = {
            marketId: existingMarket.id,
            actionType: 'delete',
            snapshotBefore: existingMarket,
          };
        }
        
        next();
      } catch (error) {
        // If we can't get the existing market, continue without audit context
        console.error('Failed to load existing market for audit:', error);
        next();
      }
    };
  }
}

// Export singleton instance
export const auditLoggingMiddleware = new AuditLoggingMiddleware();
