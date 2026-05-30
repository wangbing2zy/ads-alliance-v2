/**
 * VideoModel - Data access layer for the videos table.
 * Handles video CRUD with pagination and filtering.
 */
export class VideoModel {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Find all videos with optional filters and pagination.
   * @param {object} filters - { site, status, search, page, pageSize, user_id }
   * @returns {{ items: object[], total: number, page: number, pageSize: number }}
   */
  findAll(filters = {}) {
    const { site, status, search, page = 1, pageSize = 20, user_id } = filters;
    const conditions = [];
    const params = [];

    if (site) {
      conditions.push('site = ?');
      params.push(site);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(title LIKE ? OR url LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (user_id) {
      conditions.push('user_id = ?');
      params.push(user_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRow = this.db.prepare(`SELECT COUNT(*) as total FROM videos ${whereClause}`).get(...params);
    const total = countRow.total;

    const offset = (page - 1) * pageSize;
    const rows = this.db
      .prepare(`SELECT * FROM videos ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, offset);

    return { items: rows, total, page, pageSize };
  }

  /**
   * Find a single video by ID.
   * @param {number} id
   * @returns {object|undefined}
   */
  findById(id) {
    return this.db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
  }

  /**
   * Create a new video.
   * @param {object} data - { user_id, url, title, duration, site, status }
   * @returns {object} Created video
   */
  create(data) {
    const {
      user_id = 1, url, title = null, duration = null,
      site = null, status = 'active',
    } = data;

    const stmt = this.db.prepare(`
      INSERT INTO videos (user_id, url, title, duration, site, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    const info = stmt.run(user_id, url, title, duration, site, status);
    return this.findById(info.lastInsertRowid);
  }

  /**
   * Update a video by ID.
   * @param {number} id
   * @param {object} data - Fields to update
   * @returns {object} Updated video
   */
  update(id, data) {
    const fields = [];
    const params = [];

    const allowedFields = ['url', 'title', 'duration', 'site', 'status'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push("updated_at = datetime('now')");
    params.push(id);

    this.db.prepare(`UPDATE videos SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  }

  /**
   * Delete a video by ID (soft delete by setting status to 'invalid').
   * @param {number} id
   * @returns {boolean}
   */
  delete(id) {
    // Soft delete
    const info = this.db.prepare("UPDATE videos SET status = 'invalid', updated_at = datetime('now') WHERE id = ?").run(id);
    return info.changes > 0;
  }
}
