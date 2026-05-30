import { LogService } from '../services/logService.js';

export class LogController {
  constructor(db, logService) {
    this.db = db;
    this.logService = logService;
  }

  handleQueryProxyLogs = (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20,
        action: req.query.action || undefined,
        proxy_id: req.query.proxy_id ? parseInt(req.query.proxy_id) : undefined,
        task_id: req.query.task_id ? parseInt(req.query.task_id) : undefined,
        start_date: req.query.start_date || undefined,
        end_date: req.query.end_date || undefined,
      };
      const result = this.logService.queryProxyLogs(filters);
      res.json({ code: 0, data: result, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  handleQueryTaskLogs = (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20,
        action: req.query.action || undefined,
        task_id: req.query.task_id ? parseInt(req.query.task_id) : undefined,
        start_date: req.query.start_date || undefined,
        end_date: req.query.end_date || undefined,
      };
      const result = this.logService.queryTaskLogs(filters);
      res.json({ code: 0, data: result, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  handleQueryLoginLogs = (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20,
        action: req.query.action || undefined,
        user_id: req.query.user_id ? parseInt(req.query.user_id) : undefined,
        start_date: req.query.start_date || undefined,
        end_date: req.query.end_date || undefined,
      };
      const result = this.logService.queryLoginLogs(filters);
      res.json({ code: 0, data: result, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  handleQueryAILogs = (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20,
        model: req.query.model || undefined,
        trigger_event: req.query.trigger_event || undefined,
        task_id: req.query.task_id ? parseInt(req.query.task_id) : undefined,
        start_date: req.query.start_date || undefined,
        end_date: req.query.end_date || undefined,
      };
      const result = this.logService.queryAILogs(filters);
      res.json({ code: 0, data: result, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  handleGetStats = (req, res) => {
    try {
      const stats = this.logService.getLogStats();
      res.json({ code: 0, data: stats, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };
}
