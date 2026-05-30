import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * Create user management routes with DB dependency injection.
 * All routes require admin role.
 * @param {import('better-sqlite3').Database} db
 * @returns {Router}
 */
export default function createUserRoutes(db) {
  const controller = new UserController(db);

  router.get('/', requireAdmin, controller.handleList);
  router.post('/', requireAdmin, controller.handleCreate);
  router.put('/:id', requireAdmin, controller.handleUpdate);
  router.delete('/:id', requireAdmin, controller.handleDelete);

  return router;
}
