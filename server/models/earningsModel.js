/**
 * EarningsModel - Data access layer for the earnings table.
 * Handles earnings CRUD and aggregation queries.
 */
export class EarningsModel {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new earnings record.
   * @param {object} data - { task_id, proxy_id, date, play_count, complete_count, earnings_amount, currency, note }
   * @returns {object} Created earnings record
   */
  create(data) {
    const {
      task_id = null, proxy_id = null, date, play_count = 0,
      complete_count = 0, earnings_amount = 0, currency = 'USD', note = null,
    } = data;

    const stmt = this.db.prepare(`
      INSERT INTO earnings (task_id, proxy_id, date, play_count, complete_count, earnings_amount, currency, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const info = stmt.run(task_id, proxy_id, date, play_count, complete_count, earnings_amount, currency, note);
    return this.db.prepare('SELECT * FROM earnings WHERE id = ?').get(info.lastInsertRowid);
  }

  /**
   * Update an earnings record by ID.
   * @param {number} id
   * @param {object} data - Fields to update
   * @returns {object} Updated record
   */
  update(id, data) {
    const fields = [];
    const params = [];

    const allowedFields = ['task_id', 'proxy_id', 'date', 'play_count', 'complete_count', 'earnings_amount', 'currency', 'note'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (fields.length === 0) {
      return this.db.prepare('SELECT * FROM earnings WHERE id = ?').get(id);
    }

    params.push(id);
    this.db.prepare(`UPDATE earnings SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.db.prepare('SELECT * FROM earnings WHERE id = ?').get(id);
  }

  /**
   * Find earnings by task ID.
   * @param {number} taskId
   * @returns {object[]}
   */
  findByTask(taskId) {
    return this.db.prepare('SELECT * FROM earnings WHERE task_id = ? ORDER BY date DESC').all(taskId);
  }

  /**
   * Find earnings by date range with optional task filter.
   * @param {object} filters - { task_id, start_date, end_date }
   * @returns {object[]}
   */
  findByDateRange(filters = {}) {
    const { task_id, start_date, end_date } = filters;
    const conditions = [];
    const params = [];

    if (task_id) {
      conditions.push('task_id = ?');
      params.push(task_id);
    }
    if (start_date) {
      conditions.push('date >= ?');
      params.push(start_date);
    }
    if (end_date) {
      conditions.push('date <= ?');
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return this.db.prepare(`SELECT * FROM earnings ${whereClause} ORDER BY date DESC`).all(...params);
  }

  /**
   * Get daily earnings summary for a date range.
   * @param {string} start - Start date YYYY-MM-DD
   * @param {string} end - End date YYYY-MM-DD
   * @returns {object[]} Array of { date, total_earnings, total_plays, total_completes }
   */
  getDailySummary(start, end) {
    return this.db.prepare(`
      SELECT
        date,
        SUM(earnings_amount) as total_earnings,
        SUM(play_count) as total_plays,
        SUM(complete_count) as total_completes
      FROM earnings
      WHERE date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date ASC
    `).all(start, end);
  }

  /**
   * Get overall earnings summary.
   * @param {object} filters - { start_date, end_date, task_id }
   * @returns {{ totalEarnings: number, totalPlays: number, totalCompletes: number, avgDaily: number }}
   */
  getSummary(filters = {}) {
    const { start_date, end_date, task_id } = filters;
    const conditions = [];
    const params = [];

    if (task_id) {
      conditions.push('task_id = ?');
      params.push(task_id);
    }
    if (start_date) {
      conditions.push('date >= ?');
      params.push(start_date);
    }
    if (end_date) {
      conditions.push('date <= ?');
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const row = this.db.prepare(`
      SELECT
        COALESCE(SUM(earnings_amount), 0) as totalEarnings,
        COALESCE(SUM(play_count), 0) as totalPlays,
        COALESCE(SUM(complete_count), 0) as totalCompletes,
        COUNT(DISTINCT date) as dayCount
      FROM earnings
      ${whereClause}
    `).get(...params);

    const dayCount = row.dayCount || 1;
    return {
      totalEarnings: row.totalEarnings,
      totalPlays: row.totalPlays,
      totalCompletes: row.totalCompletes,
      avgDaily: row.totalEarnings / dayCount,
    };
  }
}
