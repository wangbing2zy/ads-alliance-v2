import { Router } from 'express';
import { ProxyController } from '../controllers/proxyController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * Create proxy routes with DB dependency injection.
 * @param {import('better-sqlite3').Database} db
 * @returns {Router}
 */
export default function createProxyRoutes(db) {
  const controller = new ProxyController(db);

  // Read operations - optional auth (guests can read)
  router.get('/', optionalAuth, controller.handleList);
  router.get('/kdl/fetch', optionalAuth, controller.handleKDLFetch);
  router.get('/:id', optionalAuth, controller.handleGetById);
  router.get('/:id/geo', optionalAuth, controller.handleGeoRefresh);

  // Write operations - require auth
  router.post('/', requireAuth, controller.handleCreate);
  router.post('/batch', requireAuth, controller.handleBatchImport);
  router.post('/batch-parse', requireAuth, controller.handleBatchParse);
  router.post('/health-check', requireAuth, controller.handleHealthCheck);
  router.post('/api-fetch', requireAuth, controller.handleApiFetch);
  router.post('/batch-verify-ip', requireAuth, controller.handleBatchVerifyIp);
  router.post('/:id/verify-ip', requireAuth, controller.handleVerifyIp);
  router.put('/:id', requireAuth, controller.handleUpdate);
  router.delete('/batch-delete', requireAuth, controller.handleBatchDelete);
  router.delete('/by-status/:status', requireAuth, controller.handleDeleteByStatus);
  router.delete('/:id', requireAuth, controller.handleDelete);

  return router;
}
