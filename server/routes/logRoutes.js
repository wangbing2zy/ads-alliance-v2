import { Router } from 'express';
import { LogController } from '../controllers/logController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

export default function createLogRoutes(db, logService) {
  const controller = new LogController(db, logService);

  router.get('/proxy', requireAuth, controller.handleQueryProxyLogs);
  router.get('/task', requireAuth, controller.handleQueryTaskLogs);
  router.get('/login', requireAuth, controller.handleQueryLoginLogs);
  router.get('/ai', requireAuth, controller.handleQueryAILogs);
  router.get('/stats', requireAuth, controller.handleGetStats);

  return router;
}
