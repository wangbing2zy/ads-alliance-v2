/**
 * LoginLogModel - Data access layer for the login_logs table.
 */
export class LoginLogModel {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a login log entry.
   * @param {object} data - { user_id, username, action, ip, user_agent, detail }
   * @returns {import('better-sqlite3').RunResult}
   */
  create(data) {
    const stmt = this.db.prepare(`
      INSERT INTO login_logs (user_id, username, action, ip, user_agent, detail)
      VALUES (@user_id, @username, @action, @ip, @user_agent, @detail)
    `);
    // Ensure all named parameters have values (better-sqlite3 requires them)
    return stmt.run({
      user_id: data.user_id ?? null,
      username: data.username,
      action: data.action,
      ip: data.ip ?? null,
      user_agent: data.user_agent ?? null,
      detail: data.detail ?? null,
    });
  }

  /**
   * Query login logs with filters and pagination.
   * @param {object} filters - { page, pageSize, action, user_id, start_date, end_date }
   * @returns {{ items: object[], total: number, page: number, pageSize: number }}
   */
  findAll(filters = {}) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let where = ['1=1'];
    let params = [];

    if (filters.action) { where.push('action = ?'); params.push(filters.action); }
    if (filters.user_id) { where.push('user_id = ?'); params.push(filters.user_id); }
    if (filters.start_date) { where.push("created_at >= ?"); params.push(filters.start_date); }
    if (filters.end_date) { where.push("created_at <= ?"); params.push(filters.end_date + ' 23:59:59'); }

    const whereClause = where.join(' AND ');

    const total = this.db.prepare(`SELECT COUNT(*) as count FROM login_logs WHERE ${whereClause}`).get(...params).count;
    const items = this.db.prepare(`SELECT * FROM login_logs WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);

    return { items, total, page, pageSize };
  }

  /**
   * Count login logs by date.
   * @param {string} date - Date string in YYYY-MM-DD format
   * @returns {number}
   */
  countByDate(date) {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM login_logs WHERE date(created_at) = ?").get(date);
    return row ? row.count : 0;
  }
}
