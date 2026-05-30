import { ProxyLogModel } from '../models/proxyLogModel.js';
import { TaskLogModel } from '../models/taskLogModel.js';
import { LoginLogModel } from '../models/loginLogModel.js';
import { AILogModel } from '../models/aiLogModel.js';

/**
 * LogService - Unified facade for all log models.
 */
export class LogService {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.proxyLogModel = new ProxyLogModel(db);
    this.taskLogModel = new TaskLogModel(db);
    this.loginLogModel = new LoginLogModel(db);
    this.aiLogModel = new AILogModel(db);
  }

  writeProxyLog(data) { return this.proxyLogModel.create(data); }
  writeTaskLog(data) { return this.taskLogModel.create(data); }
  writeLoginLog(data) { return this.loginLogModel.create(data); }
  writeAILog(data) { return this.aiLogModel.create(data); }

  queryProxyLogs(filters) { return this.proxyLogModel.findAll(filters); }
  queryTaskLogs(filters) { return this.taskLogModel.findAll(filters); }
  queryLoginLogs(filters) { return this.loginLogModel.findAll(filters); }
  queryAILogs(filters) { return this.aiLogModel.findAll(filters); }

  /**
   * Get aggregated log statistics.
   * @returns {object} Stats for proxy, task, login, and ai logs
   */
  getLogStats() {
    const today = new Date().toISOString().slice(0, 10);

    const todayTokenStats = this.aiLogModel.getTokenStats({ start_date: today });
    const totalTokenStats = this.aiLogModel.getTokenStats();

    return {
      proxy: {
        today: this.proxyLogModel.countByDate(today),
        total: this.proxyLogModel.findAll({ page: 1, pageSize: 1 }).total,
      },
      task: {
        today: this.taskLogModel.countByDate(today),
        total: this.taskLogModel.findAll({ page: 1, pageSize: 1 }).total,
      },
      login: {
        today: this.loginLogModel.countByDate(today),
        total: this.loginLogModel.findAll({ page: 1, pageSize: 1 }).total,
      },
      ai: {
        today: this.aiLogModel.countByDate(today),
        total: this.aiLogModel.findAll({ page: 1, pageSize: 1 }).total,
        todayTokens: todayTokenStats.total_input_tokens + todayTokenStats.total_output_tokens,
        totalTokens: totalTokenStats.total_input_tokens + totalTokenStats.total_output_tokens,
      },
    };
  }
}
