/**
 * ProxyLogModel - Data access layer for the proxy_logs table.
 */
export class ProxyLogModel {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a proxy log entry.
   * @param {object} data - { proxy_id, task_id, action, detail, old_status, new_status, proxy_ip, error_message }
   * @returns {import('better-sqlite3').RunResult}
   */
  create(data) {
    const stmt = this.db.prepare(`
      INSERT INTO proxy_logs (proxy_id, task_id, action, detail, old_status, new_status, proxy_ip, error_message)
      VALUES (@proxy_id, @task_id, @action, @detail, @old_status, @new_status, @proxy_ip, @error_message)
    `);
    return stmt.run({
      proxy_id: data.proxy_id ?? null,
      task_id: data.task_id ?? null,
      action: data.action,
      detail: data.detail ?? null,
      old_status: data.old_status ?? null,
      new_status: data.new_status ?? null,
      proxy_ip: data.proxy_ip ?? null,
      error_message: data.error_message ?? null,
    });
  }

  /**
   * Query proxy logs with filters and pagination.
   * @param {object} filters - { page, pageSize, action, proxy_id, task_id, start_date, end_date }
   * @returns {{ items: object[], total: number, page: number, pageSize: number }}
   */
  findAll(filters = {}) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let where = ['1=1'];
    let params = [];

    if (filters.action) { where.push('action = ?'); params.push(filters.action); }
    if (filters.proxy_id) { where.push('proxy_id = ?'); params.push(filters.proxy_id); }
    if (filters.task_id) { where.push('task_id = ?'); params.push(filters.task_id); }
    if (filters.start_date) { where.push("created_at >= ?"); params.push(filters.start_date); }
    if (filters.end_date) { where.push("created_at <= ?"); params.push(filters.end_date + ' 23:59:59'); }

    const whereClause = where.join(' AND ');

    const total = this.db.prepare(`SELECT COUNT(*) as count FROM proxy_logs WHERE ${whereClause}`).get(...params).count;
    const items = this.db.prepare(`SELECT * FROM proxy_logs WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);

    return { items, total, page, pageSize };
  }

  /**
   * Count proxy logs by date.
   * @param {string} date - Date string in YYYY-MM-DD format
   * @returns {number}
   */
  countByDate(date) {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM proxy_logs WHERE date(created_at) = ?").get(date);
    return row ? row.count : 0;
  }
}
