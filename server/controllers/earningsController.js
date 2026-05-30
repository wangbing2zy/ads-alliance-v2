import { EarningsModel } from '../models/earningsModel.js';

/**
 * EarningsController - 收益管理控制器
 * Handles earnings CRUD and summary queries.
 */
export class EarningsController {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.earningsModel = new EarningsModel(db);
  }

  /** Get earnings list with filters */
  handleList = (req, res) => {
    try {
      const { task_id, start_date, end_date } = req.query;
      const earnings = this.earningsModel.findByDateRange({
        task_id: task_id ? parseInt(task_id, 10) : undefined,
        start_date,
        end_date,
      });
      res.json({ code: 0, data: earnings, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Create an earnings record */
  handleCreate = (req, res) => {
    try {
      const { task_id, proxy_id, date, play_count, complete_count, earnings_amount, currency, note } = req.body;
      if (!date) {
        return res.status(400).json({ code: 1, data: null, message: 'date 为必填项' });
      }
      const earning = this.earningsModel.create({
        task_id: task_id || null,
        proxy_id: proxy_id || null,
        date,
        play_count: play_count || 0,
        complete_count: complete_count || 0,
        earnings_amount: earnings_amount || 0,
        currency: currency || 'USD',
        note: note || null,
      });
      res.status(201).json({ code: 0, data: earning, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Update an earnings record */
  handleUpdate = (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = this.earningsModel.update(id, req.body);
      res.json({ code: 0, data: updated, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Get earnings summary */
  handleSummary = (req, res) => {
    try {
      const { task_id, start_date, end_date } = req.query;
      const summary = this.earningsModel.getSummary({
        task_id: task_id ? parseInt(task_id, 10) : undefined,
        start_date,
        end_date,
      });
      res.json({ code: 0, data: summary, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };
}
