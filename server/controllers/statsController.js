import { ExecutionLogModel } from '../models/executionLogModel.js';
import { ProxyModel } from '../models/proxyModel.js';
import { TaskModel } from '../models/taskModel.js';
import { EarningsModel } from '../models/earningsModel.js';
import dayjs from 'dayjs';

/**
 * StatsController - 统计数据控制器
 * Provides dashboard statistics and play trend data.
 */
export class StatsController {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.logModel = new ExecutionLogModel(db);
    this.proxyModel = new ProxyModel(db);
    this.taskModel = new TaskModel(db);
    this.earningsModel = new EarningsModel(db);
  }

  /** Get dashboard summary statistics */
  handleDashboard = (req, res) => {
    try {
      const todayStats = this.logModel.getTodayStats();
      const proxyCounts = this.proxyModel.countByStatus();
      const runningTasks = this.taskModel.findRunning();
      const earningsSummary = this.earningsModel.getSummary({
        start_date: dayjs().format('YYYY-MM-DD'),
        end_date: dayjs().format('YYYY-MM-DD'),
      });

      const data = {
        todayPlays: todayStats.today_plays,
        completeRate: todayStats.complete_rate,
        availableProxies: proxyCounts.available,
        runningTasks: runningTasks.length,
        totalEarnings: earningsSummary.totalEarnings,
      };

      res.json({ code: 0, data, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Get play trend data */
  handlePlayTrend = (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 7;
      const end = dayjs().format('YYYY-MM-DD');
      const start = dayjs().subtract(days - 1, 'day').format('YYYY-MM-DD');

      const trendData = this.logModel.countByDateRange(start, end);

      // Fill in missing dates with zero values
      const result = [];
      for (let i = 0; i < days; i++) {
        const date = dayjs().subtract(days - 1 - i, 'day').format('YYYY-MM-DD');
        const found = trendData.find((d) => d.date === date);
        result.push({
          date,
          plays: found ? found.plays : 0,
          completes: found ? found.completes : 0,
        });
      }

      res.json({ code: 0, data: result, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };
}
