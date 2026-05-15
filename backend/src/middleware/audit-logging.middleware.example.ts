/**
 * Example usage of the audit logging middleware
 * 
 * This file demonstrates how to apply the audit logging middleware to market routes.
 * The middleware automatically captures audit information without requiring manual
 * audit trail creation in each route handler.
 */

import { Router } from 'express';
import { auditLoggingMiddleware, AuditLoggingMiddleware } from './audit-logging.middleware.js';
import { AdminMarketRepository } from '../repositories/admin-market.repository.js';

const router = Router();
const marketRepo = new AdminMarketRepository();

/**
 * Example 1: POST /api/admin/markets (Create)
 * 
 * For create operations, use AuditLoggingMiddleware.forCreate() before the route handler
 * and auditLoggingMiddleware.logAudit after the route handler.
 */
router.post(
  '/',
  AuditLoggingMiddleware.forCreate(),  // Set audit context for create
  async (req, res) => {
    // Your route handler logic
    const market = await marketRepo.create(req.body, req.user!.userId);
    
    res.status(201).json({
      success: true,
      market,
    });
  },
  auditLoggingMiddleware.logAudit  // Automatically log audit entry
);

/**
 * Example 2: PUT /api/admin/markets/:marketId (Update)
 * 
 * For update operations, use AuditLoggingMiddleware.forUpdate() with a function
 * that loads the existing market. This captures the before snapshot.
 */
router.put(
  '/:marketId',
  AuditLoggingMiddleware.forUpdate(async (req) => {
    return await marketRepo.findById(req.params.marketId);
  }),
  async (req, res) => {
    // Your route handler logic
    const updatedMarket = await marketRepo.update(
      req.params.marketId,
      req.body,
      req.auditContext?.snapshotBefore?.version
    );
    
    res.json({
      success: true,
      market: updatedMarket,
    });
  },
  auditLoggingMiddleware.logAudit  // Automatically log audit entry with changed fields
);

/**
 * Example 3: PATCH /api/admin/markets/:marketId/status (Status Change)
 * 
 * For status change operations, use AuditLoggingMiddleware.forStatusChange()
 */
router.patch(
  '/:marketId/status',
  AuditLoggingMiddleware.forStatusChange(async (req) => {
    return await marketRepo.findById(req.params.marketId);
  }),
  async (req, res) => {
    // Your route handler logic
    const updatedMarket = await marketRepo.updateStatus(
      req.params.marketId,
      req.body.status,
      req.body.outcome,
      req.body.resolution_source
    );
    
    res.json({
      success: true,
      market: updatedMarket,
    });
  },
  auditLoggingMiddleware.logAudit  // Automatically log audit entry
);

/**
 * Example 4: DELETE /api/admin/markets/:marketId (Delete)
 * 
 * For delete operations, use AuditLoggingMiddleware.forDelete()
 */
router.delete(
  '/:marketId',
  AuditLoggingMiddleware.forDelete(async (req) => {
    return await marketRepo.findById(req.params.marketId);
  }),
  async (req, res) => {
    // Your route handler logic
    await marketRepo.delete(req.params.marketId);
    
    res.json({
      success: true,
      message: 'Market deleted successfully',
    });
  },
  auditLoggingMiddleware.logAudit  // Automatically log audit entry with before snapshot
);

/**
 * Benefits of using the middleware:
 * 
 * 1. Automatic audit logging - no need to manually call auditRepo.create()
 * 2. Consistent audit data - IP address, user agent, timestamps captured automatically
 * 3. Error handling - audit failures don't block the main operation
 * 4. Before/after snapshots - automatically captured for updates and status changes
 * 5. Changed fields calculation - automatically computed for updates
 * 6. Cleaner route handlers - less boilerplate code
 * 
 * Migration from manual audit logging:
 * 
 * Before:
 * ```typescript
 * router.post('/', async (req, res) => {
 *   const market = await marketRepo.create(req.body, req.user!.userId);
 *   
 *   await auditRepo.create({
 *     market_id: market.id,
 *     admin_user_id: req.user!.userId,
 *     action_type: 'create',
 *     snapshot_after: market,
 *     ip_address: req.ip,
 *     user_agent: req.headers['user-agent'],
 *   });
 *   
 *   res.status(201).json({ success: true, market });
 * });
 * ```
 * 
 * After:
 * ```typescript
 * router.post(
 *   '/',
 *   AuditLoggingMiddleware.forCreate(),
 *   async (req, res) => {
 *     const market = await marketRepo.create(req.body, req.user!.userId);
 *     res.status(201).json({ success: true, market });
 *   },
 *   auditLoggingMiddleware.logAudit
 * );
 * ```
 */

export default router;
