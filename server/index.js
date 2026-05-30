import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database.js';
import createAuthRoutes from './routes/authRoutes.js';
import createProxyRoutes from './routes/proxyRoutes.js';
import createTaskRoutes from './routes/taskRoutes.js';
import createStatsRoutes from './routes/statsRoutes.js';
import createEarningsRoutes from './routes/earningsRoutes.js';
import createSettingsRoutes from './routes/settingsRoutes.js';
import createVideoRoutes from './routes/videoRoutes.js';
import createUserRoutes from './routes/userRoutes.js';
import { TaskEngine } from './services/taskEngine.js';
import { LogService } from './services/logService.js';
import { AIDetectorService } from './services/aiDetectorService.js';
import { HealthCheckService } from './services/healthCheckService.js';
import { SettingsModel } from './models/settingsModel.js';
import { ProxyService } from './services/proxyService.js';
import createAIRoutes from './routes/aiRoutes.js';
import createLogRoutes from './routes/logRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = initDatabase();

// Initialize TaskEngine
const taskEngine = new TaskEngine(db);
taskEngine.init();

// Initialize LogService
const logService = new LogService(db);

// Initialize AIDetectorService
const aiDetectorService = new AIDetectorService(db, taskEngine, logService);

// Initialize ProxyService
const proxyService = new ProxyService(db, new SettingsModel(db));

// Initialize HealthCheckService
const healthCheckService = new HealthCheckService(proxyService, new SettingsModel(db));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes - inject db and taskEngine via factory functions
app.use('/api/auth', createAuthRoutes(db, logService));
app.use('/api/proxies', createProxyRoutes(db));
app.use('/api/tasks', createTaskRoutes(db, taskEngine));
app.use('/api/stats', createStatsRoutes(db));
app.use('/api/earnings', createEarningsRoutes(db));
app.use('/api/settings', createSettingsRoutes(db, taskEngine, healthCheckService));
app.use('/api/videos', createVideoRoutes(db));
app.use('/api/users', createUserRoutes(db));
app.use('/api/ai', createAIRoutes(db, aiDetectorService));
app.use('/api/logs', createLogRoutes(db, logService));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, 'public');
  app.use(express.static(staticPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(staticPath, 'index.html'));
    }
  });
}

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({
    code: 3,
    data: null,
    message: err.message || '服务器内部错误',
  });
});

// Auto-start AI detection if enabled
const aiSettingsModel = new SettingsModel(db);
if (aiSettingsModel.get('ai_enabled') === 'true') {
  aiDetectorService.start();
}

// Auto-start proxy health check
healthCheckService.start();

app.listen(PORT, () => {
  console.log(`[Ads Alliance V2] Server running on http://localhost:${PORT}`);
  console.log(`[Ads Alliance V2] Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Ads Alliance V2] Shutting down...');
  aiDetectorService.stop();
  taskEngine.shutdown();
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Ads Alliance V2] Received SIGTERM, shutting down...');
  aiDetectorService.stop();
  taskEngine.shutdown();
  db.close();
  process.exit(0);
});

export default app;
