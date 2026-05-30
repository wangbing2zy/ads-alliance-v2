import { SettingsModel } from '../models/settingsModel.js';

/**
 * SettingsController - 系统设置控制器
 * Handles reading and updating system settings.
 */
export class SettingsController {
  /**
   * @param {import('better-sqlite3').Database} db
   * @param {object} taskEngine - TaskEngine instance (for updating config)
   * @param {object} healthCheckService - HealthCheckService instance (for auto-verify)
   */
  constructor(db, taskEngine, healthCheckService) {
    this.settingsModel = new SettingsModel(db);
    this.taskEngine = taskEngine;
    this.healthCheckService = healthCheckService;
  }

  /** Get all settings */
  handleGetAll = (req, res) => {
    try {
      const settings = this.settingsModel.getAll();
      res.json({ code: 0, data: settings, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Batch update settings */
  handleUpdate = (req, res) => {
    try {
      const allowedKeys = [
        'kdl_order_id', 'kdl_secret_id', 'headless', 'max_global_concurrent',
        'proxy_auto_verify_interval',
        'ai_enabled', 'ai_model', 'ai_deepseek_api_key', 'ai_deepseek_base_url',
        'ai_chatgpt_api_key', 'ai_chatgpt_base_url', 'ai_check_interval_sec',
        'ai_max_token_per_request',
      ];
      const updates = req.body;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedKeys.includes(key)) {
          this.settingsModel.set(key, String(value));
        }
      }

      // Update TaskEngine config if relevant settings changed
      if (updates.max_global_concurrent !== undefined) {
        const maxConc = parseInt(String(updates.max_global_concurrent), 10);
        if (!isNaN(maxConc) && maxConc > 0) {
          this.taskEngine.maxGlobalConcurrent = maxConc;
        }
      }

      // Restart HealthCheckService if auto-verify interval changed
      if (updates.proxy_auto_verify_interval !== undefined && this.healthCheckService) {
        this.healthCheckService.restart();
      }

      const settings = this.settingsModel.getAll();
      res.json({ code: 0, data: settings, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };
}
