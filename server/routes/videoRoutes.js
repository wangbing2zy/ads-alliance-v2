import { Router } from 'express';
import { VideoController } from '../controllers/videoController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * Create video routes with DB dependency injection.
 * @param {import('better-sqlite3').Database} db
 * @returns {Router}
 */
export default function createVideoRoutes(db) {
  const controller = new VideoController(db);

  // Read operations - optional auth (guests can read)
  router.get('/', optionalAuth, controller.handleList);
  router.get('/:id', optionalAuth, controller.handleGetById);

  // Write operations - require auth
  router.post('/', requireAuth, controller.handleCreate);
  router.post('/fetch-meta', requireAuth, controller.handleFetchMeta);
  router.put('/:id', requireAuth, controller.handleUpdate);
  router.delete('/:id', requireAuth, controller.handleDelete);

  return router;
}
