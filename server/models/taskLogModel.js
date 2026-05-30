/**
 * TaskLogModel - Data access layer for the task_logs table.
 */
export class TaskLogModel {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a task log entry.
   * @param {object} data - { task_id, action, detail, error_message, proxy_id, retry_count }
   * @returns {import('better-sqlite3').RunResult}
   */
  create(data) {
    const stmt = this.db.prepare(`
      INSERT INTO task_logs (task_id, action, detail, error_message, proxy_id, retry_count)
      VALUES (@task_id, @action, @detail, @error_message, @proxy_id, @retry_count)
    `);
    return stmt.run({
      task_id: data.task_id,
      action: data.action,
      detail: data.detail ?? null,
      error_message: data.error_message ?? null,
      proxy_id: data.proxy_id ?? null,
      retry_count: data.retry_count ?? 0,
    });
  }

  /**
   * Query task logs with filters and pagination.
   * @param {object} filters - { page, pageSize, action, task_id, start_date, end_date }
   * @returns {{ items: object[], total: number, page: number, pageSize: number }}
   */
  findAll(filters = {}) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let where = ['1=1'];
    let params = [];

    if (filters.action) { where.push('action = ?'); params.push(filters.action); }
    if (filters.task_id) { where.push('task_id = ?'); params.push(filters.task_id); }
    if (filters.start_date) { where.push("created_at >= ?"); params.push(filters.start_date); }
    if (filters.end_date) { where.push("created_at <= ?"); params.push(filters.end_date + ' 23:59:59'); }

    const whereClause = where.join(' AND ');

    const total = this.db.prepare(`SELECT COUNT(*) as count FROM task_logs WHERE ${whereClause}`).get(...params).count;
    const items = this.db.prepare(`SELECT * FROM task_logs WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);

    return { items, total, page, pageSize };
  }

  /**
   * Count task logs by date.
   * @param {string} date - Date string in YYYY-MM-DD format
   * @returns {number}
   */
  countByDate(date) {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM task_logs WHERE date(created_at) = ?").get(date);
    return row ? row.count : 0;
  }
}
