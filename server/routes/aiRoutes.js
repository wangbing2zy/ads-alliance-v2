import { Router } from 'express';
import { AIController } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

export default function createAIRoutes(db, aiDetectorService) {
  const controller = new AIController(db, aiDetectorService);

  router.get('/settings', requireAuth, controller.handleGetSettings);
  router.put('/settings', requireAuth, controller.handleUpdateSettings);
  router.post('/test-connection', requireAuth, controller.handleTestConnection);
  router.get('/status', requireAuth, controller.handleGetStatus);

  return router;
}
