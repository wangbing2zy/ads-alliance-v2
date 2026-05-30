import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController.js';

const router = Router();

/**
 * Create settings routes with DB and TaskEngine dependency injection.
 * @param {import('better-sqlite3').Database} db
 * @param {object} taskEngine - TaskEngine instance
 * @param {object} healthCheckService - HealthCheckService instance
 * @returns {Router}
 */
export default function createSettingsRoutes(db, taskEngine, healthCheckService) {
  const controller = new SettingsController(db, taskEngine, healthCheckService);

  router.get('/', controller.handleGetAll);
  router.put('/', controller.handleUpdate);

  return router;
}
