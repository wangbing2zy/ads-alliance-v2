import { Router } from 'express';
import { TaskController } from '../controllers/taskController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * Create task routes with DB and TaskEngine dependency injection.
 * @param {import('better-sqlite3').Database} db
 * @param {object} taskEngine - TaskEngine instance
 * @returns {Router}
 */
export default function createTaskRoutes(db, taskEngine) {
  const controller = new TaskController(db, taskEngine);

  // Read operations - optional auth
  router.get('/', optionalAuth, controller.handleList);
  router.get('/:id', optionalAuth, controller.handleGetById);
  router.get('/:id/runtime', optionalAuth, controller.handleGetRuntime);
  router.get('/:id/logs', optionalAuth, controller.handleGetLogs);

  // Write operations - require auth
  router.post('/', requireAuth, controller.handleCreate);
  router.post('/:id/start', requireAuth, controller.handleStart);
  router.post('/:id/stop', requireAuth, controller.handleStop);
  router.post('/:id/pause', requireAuth, controller.handlePause);
  router.put('/:id', requireAuth, controller.handleUpdate);
  router.delete('/:id', requireAuth, controller.handleDelete);

  return router;
}
