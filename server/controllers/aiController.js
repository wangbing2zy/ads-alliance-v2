import { SettingsModel } from '../models/settingsModel.js';
import { AIProviderService } from '../services/aiProviderService.js';

const AI_SETTING_KEYS = [
  'ai_enabled', 'ai_model', 'ai_deepseek_api_key', 'ai_deepseek_base_url',
  'ai_chatgpt_api_key', 'ai_chatgpt_base_url', 'ai_check_interval_sec',
  'ai_max_token_per_request',
];

/**
 * Mask API key for safe display: show only last 4 chars.
 */
function maskApiKey(key) {
  if (!key || key.length <= 8) return key ? '****' : '';
  return '****' + key.slice(-4);
}

export class AIController {
  constructor(db, aiDetectorService) {
    this.db = db;
    this.settingsModel = new SettingsModel(db);
    this.aiDetectorService = aiDetectorService;
  }

  /** Get AI settings (with masked API keys) */
  handleGetSettings = (req, res) => {
    try {
      const allSettings = this.settingsModel.getAll();
      const aiSettings = {};
      for (const key of AI_SETTING_KEYS) {
        if (key.includes('api_key')) {
          aiSettings[key] = maskApiKey(allSettings[key]);
        } else {
          aiSettings[key] = allSettings[key] || '';
        }
      }
      res.json({ code: 0, data: aiSettings, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Update AI settings */
  handleUpdateSettings = (req, res) => {
    try {
      const updates = req.body;

      for (const [key, value] of Object.entries(updates)) {
        if (!AI_SETTING_KEYS.includes(key)) continue;

        // Don't overwrite API key with masked value
        if (key.includes('api_key') && typeof value === 'string' && value.startsWith('****')) {
          continue;
        }

        this.settingsModel.set(key, String(value));
      }

      // Start/stop AI detector based on ai_enabled
      const aiEnabled = this.settingsModel.get('ai_enabled') === 'true';
      if (aiEnabled && !this.aiDetectorService.isEnabled()) {
        this.aiDetectorService.start();
      } else if (!aiEnabled && this.aiDetectorService.isEnabled()) {
        this.aiDetectorService.stop();
      }

      // Return updated settings (masked)
      return this.handleGetSettings(req, res);
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Test AI model connection */
  handleTestConnection = async (req, res) => {
    try {
      const provider = new AIProviderService(this.settingsModel);
      provider.reloadConfig();
      const ok = await provider.testConnection();
      res.json({ code: 0, data: { connected: ok, model: provider.getActiveModel() }, message: ok ? '连接成功' : '连接失败' });
    } catch (err) {
      res.json({ code: 0, data: { connected: false, model: null, error: err.message }, message: '连接失败' });
    }
  };

  /** Get AI detection status */
  handleGetStatus = (req, res) => {
    try {
      const enabled = this.aiDetectorService.isEnabled();
      const model = this.settingsModel.get('ai_model') || 'deepseek';

      // Get stats from log service
      const stats = this.aiDetectorService.logService.getLogStats();

      res.json({
        code: 0,
        data: {
          enabled,
          model,
          lastCheckAt: null, // Could be tracked if needed
          totalDetections: stats.ai.total,
          totalCorrections: 0, // Could be tracked separately
          connectionOk: enabled, // Simplified
        },
        message: 'ok',
      });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };
}
