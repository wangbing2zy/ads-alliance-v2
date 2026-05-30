/**
 * ExecutionLogModel - Data access layer for the execution_logs table.
 * Handles log creation, queries, and statistical aggregations.
 */
export class ExecutionLogModel {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new execution log entry.
   * @param {object} data - { task_id, proxy_id, video_url, action, result, duration_ms, error_message }
   * @returns {object} Created log entry
   */
  create(data) {
    const {
      task_id, proxy_id = null, video_url, action, result,
      duration_ms = null, error_message = null, proxy_ip = null,
    } = data;

    const stmt = this.db.prepare(`
      INSERT INTO execution_logs (task_id, proxy_id, video_url, action, result, duration_ms, error_message, proxy_ip, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const info = stmt.run(task_id, proxy_id, video_url, action, result, duration_ms, error_message, proxy_ip);
    return this.db.prepare('SELECT * FROM execution_logs WHERE id = ?').get(info.lastInsertRowid);
  }

  /**
   * Find logs by task ID with pagination.
   * @param {number} taskId
   * @param {object} filters - { page, pageSize, action }
   * @returns {{ items: object[], total: number, page: number, pageSize: number }}
   */
  findByTask(taskId, filters = {}) {
    const { page = 1, pageSize = 20, action } = filters;
    const conditions = ['task_id = ?'];
    const params = [taskId];

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const countRow = this.db.prepare(`SELECT COUNT(*) as total FROM execution_logs ${whereClause}`).get(...params);
    const total = countRow.total;

    const offset = (page - 1) * pageSize;
    const rows = this.db
      .prepare(`SELECT * FROM execution_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, offset);

    return { items: rows, total, page, pageSize };
  }

  /**
   * Count logs by task and date.
   * @param {number} taskId
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {{ play_count: number, complete_count: number, error_count: number }}
   */
  countByTaskAndDate(taskId, date) {
    const row = this.db.prepare(`
      SELECT
        COUNT(CASE WHEN action IN ('click_play', 'play_complete') THEN 1 END) as play_count,
        COUNT(CASE WHEN action = 'play_complete' AND result = 'success' THEN 1 END) as complete_count,
        COUNT(CASE WHEN action = 'error' THEN 1 END) as error_count
      FROM execution_logs
      WHERE task_id = ? AND DATE(created_at) = ?
    `).get(taskId, date);

    return {
      play_count: row.play_count || 0,
      complete_count: row.complete_count || 0,
      error_count: row.error_count || 0,
    };
  }

  /**
   * Count logs by date range for trend data.
   * @param {string} start - Start date YYYY-MM-DD
   * @param {string} end - End date YYYY-MM-DD
   * @returns {object[]} Array of { date, plays, completes }
   */
  countByDateRange(start, end) {
    const rows = this.db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(CASE WHEN action IN ('click_play', 'play_complete') THEN 1 END) as plays,
        COUNT(CASE WHEN action = 'play_complete' AND result = 'success' THEN 1 END) as completes
      FROM execution_logs
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(start, end);

    return rows;
  }

  /**
   * Get today's statistics.
   * @returns {{ today_plays: number, today_completes: number, today_errors: number, complete_rate: number }}
   */
  getTodayStats() {
    const row = this.db.prepare(`
      SELECT
        COUNT(CASE WHEN action IN ('click_play', 'play_complete') THEN 1 END) as today_plays,
        COUNT(CASE WHEN action = 'play_complete' AND result = 'success' THEN 1 END) as today_completes,
        COUNT(CASE WHEN action = 'error' THEN 1 END) as today_errors
      FROM execution_logs
      WHERE DATE(created_at) = DATE('now')
    `).get();

    const todayPlays = row.today_plays || 0;
    const todayCompletes = row.today_completes || 0;
    const completeRate = todayPlays > 0 ? todayCompletes / todayPlays : 0;

    return {
      today_plays: todayPlays,
      today_completes: todayCompletes,
      today_errors: row.today_errors || 0,
      complete_rate: completeRate,
    };
  }
}
