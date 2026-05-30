import { Router } from 'express';
import { EarningsController } from '../controllers/earningsController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * Create earnings routes with DB dependency injection.
 * @param {import('better-sqlite3').Database} db
 * @returns {Router}
 */
export default function createEarningsRoutes(db) {
  const controller = new EarningsController(db);

  // Read operations - optional auth
  router.get('/summary', optionalAuth, controller.handleSummary);
  router.get('/', optionalAuth, controller.handleList);

  // Write operations - require auth
  router.post('/', requireAuth, controller.handleCreate);
  router.put('/:id', requireAuth, controller.handleUpdate);

  return router;
}
