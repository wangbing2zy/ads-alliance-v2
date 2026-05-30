import { Router } from 'express';
import { StatsController } from '../controllers/statsController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * Create stats routes with DB dependency injection.
 * @param {import('better-sqlite3').Database} db
 * @returns {Router}
 */
export default function createStatsRoutes(db) {
  const controller = new StatsController(db);

  // Read operations - optional auth (guests can read)
  router.get('/dashboard', optionalAuth, controller.handleDashboard);
  router.get('/play-trend', optionalAuth, controller.handlePlayTrend);

  return router;
}
