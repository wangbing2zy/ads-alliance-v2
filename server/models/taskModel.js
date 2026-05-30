/**
 * TaskModel - Data access layer for the tasks table.
 * Handles CRUD operations with JSON serialization for video_urls, proxy_ids, ad_rule_json.
 */
export class TaskModel {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Parse JSON fields of a task row.
   * @param {object} row
   * @returns {object} Parsed task
   * @private
   */
  _parseRow(row) {
    if (!row) return null;
    return {
      ...row,
      video_urls: JSON.parse(row.video_urls || '[]'),
      proxy_ids: JSON.parse(row.proxy_ids || '[]'),
      ad_rule_json: row.ad_rule_json ? JSON.parse(row.ad_rule_json) : null,
    };
  }

  /**
   * Stringify JSON fields for storage.
   * @param {object} data
   * @returns {object} Data with stringified JSON fields
   * @private
   */
  _stringifyData(data) {
    const result = { ...data };
    if (result.video_urls !== undefined) {
      result.video_urls = JSON.stringify(result.video_urls);
    }
    if (result.proxy_ids !== undefined) {
      result.proxy_ids = JSON.stringify(result.proxy_ids);
    }
    if (result.ad_rule_json !== undefined) {
      result.ad_rule_json = result.ad_rule_json ? JSON.stringify(result.ad_rule_json) : null;
    }
    return result;
  }

  /**
   * Find all tasks.
   * @param {object} filters - Optional filters
   * @returns {object[]} Array of tasks
   */
  findAll(filters = {}) {
    const { status, userId } = filters;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.db.prepare(`SELECT * FROM tasks ${whereClause} ORDER BY created_at DESC`).all(...params);
    return rows.map((row) => this._parseRow(row));
  }

  /**
   * Find a single task by ID.
   * @param {number} id
   * @returns {object|null}
   */
  findById(id) {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    return this._parseRow(row);
  }

  /**
   * Create a new task.
   * @param {object} data - Task data with video_urls/proxy_ids as arrays, ad_rule_json as object
   * @returns {object} Created task
   */
  create(data) {
    const stringified = this._stringifyData(data);
    const {
      name, video_urls = '[]', ad_rule_json = null, proxy_ids = '[]',
      rotate_mode = 'sequential', concurrency = 1,
      interval_min_sec = 30, interval_max_sec = 120,
      user_id = null,
    } = stringified;

    const stmt = this.db.prepare(`
      INSERT INTO tasks (name, video_urls, ad_rule_json, proxy_ids, rotate_mode, concurrency, interval_min_sec, interval_max_sec, user_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'stopped', datetime('now'), datetime('now'))
    `);
    const info = stmt.run(name, video_urls, ad_rule_json, proxy_ids, rotate_mode, concurrency, interval_min_sec, interval_max_sec, user_id);
    return this.findById(info.lastInsertRowid);
  }

  /**
   * Update a task by ID.
   * @param {number} id
   * @param {object} data - Fields to update
   * @returns {object} Updated task
   */
  update(id, data) {
    const stringified = this._stringifyData(data);
    const fields = [];
    const params = [];

    const allowedFields = ['name', 'video_urls', 'ad_rule_json', 'proxy_ids', 'rotate_mode', 'concurrency', 'interval_min_sec', 'interval_max_sec'];
    for (const field of allowedFields) {
      if (stringified[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(stringified[field]);
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push("updated_at = datetime('now')");
    params.push(id);

    this.db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  }

  /**
   * Delete a task by ID.
   * @param {number} id
   * @returns {boolean}
   */
  delete(id) {
    const info = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return info.changes > 0;
  }

  /**
   * Update the status of a task.
   * @param {number} id
   * @param {string} status
   * @returns {object} Updated task
   */
  updateStatus(id, status) {
    this.db.prepare("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    return this.findById(id);
  }

  /**
   * Find all running tasks.
   * @returns {object[]}
   */
  findRunning() {
    const rows = this.db.prepare("SELECT * FROM tasks WHERE status IN ('running', 'paused') ORDER BY created_at DESC").all();
    return rows.map((row) => this._parseRow(row));
  }
}
