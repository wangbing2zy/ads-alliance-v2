import { EventEmitter } from 'events';
import { AIProviderService } from './aiProviderService.js';
import { LogService } from './logService.js';
import { SettingsModel } from '../models/settingsModel.js';
import { ProxyModel } from '../models/proxyModel.js';

// Allowed correction actions whitelist
const ACTION_WHITELIST = ['switch_proxy', 'retry_task', 'report_only', 'restart_task'];

// Debounce tracking: Map<taskId, lastAnalyzeTime>
const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

export class AIDetectorService extends EventEmitter {
  constructor(db, taskEngine, logService) {
    super();
    this.db = db;
    this.taskEngine = taskEngine;
    this.logService = logService;
    this.settingsModel = new SettingsModel(db);
    this.proxyModel = new ProxyModel(db);
    this.aiProvider = new AIProviderService(this.settingsModel);

    this.enabled = false;
    this.healthTimer = null;
    this.lastAnalyzeTime = new Map(); // taskId -> timestamp

    // Bind event handlers once for proper removeListener support
    this._onPlayErrorBound = this._onPlayError.bind(this);
    this._onProxyFailedBound = this._onProxyFailed.bind(this);
    this._onTaskErrorBound = this._onTaskError.bind(this);
  }

  /**
   * Start AI detection: register event listeners and start health timer.
   */
  start() {
    if (this.enabled) return;

    this.enabled = true;
    this.taskEngine.on('play:error', this._onPlayErrorBound);
    this.taskEngine.on('proxy:failed', this._onProxyFailedBound);
    this.taskEngine.on('task:error', this._onTaskErrorBound);

    // Start health check timer
    const intervalSec = parseInt(this.settingsModel.get('ai_check_interval_sec') || '60', 10);
    this.healthTimer = setInterval(this._onHealthTick.bind(this), intervalSec * 1000);

    console.log('[AIDetectorService] Started, health check interval:', intervalSec + 's');
  }

  /**
   * Stop AI detection: remove listeners and clear timer.
   */
  stop() {
    if (!this.enabled) return;

    this.enabled = false;
    this.taskEngine.removeListener('play:error', this._onPlayErrorBound);
    this.taskEngine.removeListener('proxy:failed', this._onProxyFailedBound);
    this.taskEngine.removeListener('task:error', this._onTaskErrorBound);

    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }

    this.lastAnalyzeTime.clear();
    console.log('[AIDetectorService] Stopped');
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Handle play:error event from TaskEngine.
   */
  async _onPlayError(eventData) {
    try {
      // Write basic logs
      this.logService.writeTaskLog({
        task_id: eventData.taskId,
        action: 'error',
        detail: `播放失败: ${eventData.error || '未知错误'}`,
        error_message: eventData.error,
        proxy_id: eventData.proxyId,
      });

      if (eventData.proxyId) {
        this.logService.writeProxyLog({
          proxy_id: eventData.proxyId,
          task_id: eventData.taskId,
          action: 'error_detected',
          detail: `任务 ${eventData.taskId} 播放失败`,
          error_message: eventData.error,
        });
      }

      // Trigger AI analysis if enabled
      if (this.enabled) {
        await this._analyzeWithContext('play:error', eventData);
      }
    } catch (err) {
      console.error('[AIDetectorService] Error in _onPlayError:', err.message);
    }
  }

  /**
   * Handle proxy:failed event.
   */
  async _onProxyFailed(eventData) {
    try {
      this.logService.writeProxyLog({
        proxy_id: eventData.proxyId,
        task_id: eventData.taskId,
        action: 'unavailable',
        detail: `代理转换失败: ${eventData.error || '未知错误'}`,
        error_message: eventData.error,
      });

      if (this.enabled) {
        await this._analyzeWithContext('proxy:failed', eventData);
      }
    } catch (err) {
      console.error('[AIDetectorService] Error in _onProxyFailed:', err.message);
    }
  }

  /**
   * Handle task:error event.
   */
  async _onTaskError(eventData) {
    try {
      this.logService.writeTaskLog({
        task_id: eventData.taskId,
        action: 'error',
        detail: `任务执行异常: ${eventData.error || '未知错误'}`,
        error_message: eventData.error,
      });

      if (this.enabled) {
        await this._analyzeWithContext('task:error', eventData);
      }
    } catch (err) {
      console.error('[AIDetectorService] Error in _onTaskError:', err.message);
    }
  }

  /**
   * Periodic health check.
   */
  async _onHealthTick() {
    if (!this.enabled) return;

    try {
      const runningTaskIds = this.taskEngine.getRunningTaskIds();

      for (const taskId of runningTaskIds) {
        const status = this.taskEngine.getTaskStatus(taskId);
        if (!status) continue;

        const errorRate = status.playCount > 0 ? status.errorCount / status.playCount : 0;

        // Only trigger if error rate > 50% and at least 5 plays
        if (errorRate > 0.5 && status.playCount > 5) {
          await this._analyzeWithContext('health:tick', {
            taskId,
            proxyId: status.currentProxyId,
            error: `高错误率: ${(errorRate * 100).toFixed(1)}% (${status.errorCount}/${status.playCount})`,
            playCount: status.playCount,
            errorCount: status.errorCount,
          });
        }
      }

      this.emit('health:tick:complete', { checkedTasks: runningTaskIds.length });
    } catch (err) {
      console.error('[AIDetectorService] Health check error:', err.message);
    }
  }

  /**
   * Core analysis method: build context, call AI, execute action.
   */
  async _analyzeWithContext(eventType, eventData) {
    const taskId = eventData.taskId;

    // Debounce: skip if same task was analyzed within DEBOUNCE_MS
    if (taskId) {
      const lastTime = this.lastAnalyzeTime.get(taskId) || 0;
      if (Date.now() - lastTime < DEBOUNCE_MS) {
        console.log(`[AIDetectorService] Skipping analysis for task ${taskId}, debounced`);
        return;
      }
    }

    // Build context
    const context = {
      eventType,
      taskId: eventData.taskId || null,
      proxyId: eventData.proxyId || null,
      proxyIp: eventData.proxyIp || null,
      errorMessage: eventData.error || null,
      proxyStatus: null,
      taskPlayCount: eventData.playCount || 0,
      taskErrorCount: eventData.errorCount || 0,
      recentErrors: [],
    };

    // Enrich context with proxy status
    if (context.proxyId) {
      try {
        const proxy = this.proxyModel.findById(context.proxyId);
        if (proxy) {
          context.proxyIp = proxy.actual_ip || proxy.host;
          context.proxyStatus = proxy.status;
        }
      } catch { /* ignore */ }
    }

    // Enrich context with task status
    if (context.taskId) {
      try {
        const taskStatus = this.taskEngine.getTaskStatus(context.taskId);
        if (taskStatus) {
          context.taskPlayCount = taskStatus.playCount;
          context.taskErrorCount = taskStatus.errorCount;
        }
      } catch { /* ignore */ }
    }

    // Call AI
    let aiResult = null;
    try {
      aiResult = await this.aiProvider.analyze(context);

      // Record debounce
      if (taskId) {
        this.lastAnalyzeTime.set(taskId, Date.now());
      }
    } catch (err) {
      // AI call failed — log error only, don't affect task
      this.logService.writeAILog({
        model: this.aiProvider.getActiveModel(),
        trigger_event: eventType,
        trigger_detail: JSON.stringify(context),
        diagnosis: null,
        action_taken: null,
        action_result: null,
        confidence: null,
        input_tokens: 0,
        output_tokens: 0,
        duration_ms: err.duration_ms || 0,
        error_message: `AI 调用失败: ${err.message}`,
        task_id: context.taskId,
        proxy_id: context.proxyId,
      });
      return;
    }

    // Check confidence and action validity
    const confidence = aiResult.confidence || 0;
    const action = aiResult.action || 'report_only';

    if (confidence < 0.6 || !ACTION_WHITELIST.includes(action)) {
      // Low confidence or invalid action — log only
      this.logService.writeAILog({
        model: this.aiProvider.getActiveModel(),
        trigger_event: eventType,
        trigger_detail: JSON.stringify(context),
        diagnosis: aiResult.diagnosis,
        action_taken: action,
        action_result: confidence < 0.6 ? 'skipped_low_confidence' : 'skipped_invalid_action',
        confidence,
        input_tokens: aiResult.inputTokens || 0,
        output_tokens: aiResult.outputTokens || 0,
        duration_ms: aiResult.duration_ms || 0,
        error_message: null,
        task_id: context.taskId,
        proxy_id: context.proxyId,
      });
      return;
    }

    // Execute correction action
    let actionResult = 'unknown';
    try {
      actionResult = await this._executeAction(action, context);
    } catch (err) {
      actionResult = `执行失败: ${err.message}`;
    }

    // Write AI log
    this.logService.writeAILog({
      model: this.aiProvider.getActiveModel(),
      trigger_event: eventType,
      trigger_detail: JSON.stringify(context),
      diagnosis: aiResult.diagnosis,
      action_taken: action,
      action_result: actionResult,
      confidence,
      input_tokens: aiResult.inputTokens || 0,
      output_tokens: aiResult.outputTokens || 0,
      duration_ms: aiResult.duration_ms || 0,
      error_message: null,
      task_id: context.taskId,
      proxy_id: context.proxyId,
    });
  }

  /**
   * Execute a correction action.
   * @param {string} action - The action to execute
   * @param {object} context - The context
   * @returns {Promise<string>} Action result description
   */
  async _executeAction(action, context) {
    switch (action) {
      case 'switch_proxy': {
        if (!context.proxyId) return 'skipped_no_proxy';
        try {
          const proxy = this.proxyModel.findById(context.proxyId);
          const oldStatus = proxy?.status || 'unknown';
          this.proxyModel.updateStatus(context.proxyId, 'unavailable');
          this.logService.writeProxyLog({
            proxy_id: context.proxyId,
            task_id: context.taskId,
            action: 'switched',
            detail: `AI 诊断后标记不可用`,
            old_status: oldStatus,
            new_status: 'unavailable',
          });
          return `代理 ${context.proxyId} 已标记为不可用，下一轮自动切换`;
        } catch (err) {
          return `切换代理失败: ${err.message}`;
        }
      }
      case 'retry_task': {
        this.logService.writeTaskLog({
          task_id: context.taskId,
          action: 'retry',
          detail: 'AI 建议重试，等待下一轮自然重试',
          proxy_id: context.proxyId,
        });
        return '已记录重试建议，等待下一轮播放';
      }
      case 'restart_task': {
        if (!context.taskId) return 'skipped_no_task';
        try {
          this.taskEngine.stopTask(context.taskId);
          // Brief delay before restarting
          await new Promise(resolve => setTimeout(resolve, 2000));
          this.taskEngine.startTask(context.taskId);
          this.logService.writeTaskLog({
            task_id: context.taskId,
            action: 'restart',
            detail: 'AI 诊断后重启任务',
          });
          return `任务 ${context.taskId} 已重启`;
        } catch (err) {
          return `重启任务失败: ${err.message}`;
        }
      }
      case 'report_only': {
        return '仅记录诊断，未执行纠错动作';
      }
      default:
        return `未知动作: ${action}`;
    }
  }
}
