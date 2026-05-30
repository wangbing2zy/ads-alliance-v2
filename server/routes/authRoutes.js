import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * Create auth routes with DB dependency injection.
 * @param {import('better-sqlite3').Database} db
 * @param {object} logService - LogService instance
 * @returns {Router}
 */
export default function createAuthRoutes(db, logService) {
  const controller = new AuthController(db, logService);

  router.post('/login', controller.handleLogin);
  router.post('/logout', requireAuth, controller.handleLogout);
  router.get('/me', optionalAuth, controller.handleMe);

  return router;
}
