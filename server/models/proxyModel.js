/**
 * ProxyModel - Data access layer for the proxies table.
 * Handles CRUD operations, batch operations, and status queries.
 */
export class ProxyModel {
  /**
   * @param {import('better-sqlite3').Database} db - better-sqlite3 database instance
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Find all proxies with optional filters and pagination.
   * @param {object} filters - { protocol, status, region, page, pageSize, user_id }
   * @returns {{ items: object[], total: number, page: number, pageSize: number }}
   */
  findAll(filters = {}) {
    const { protocol, status, region, page = 1, pageSize = 20, user_id } = filters;
    const conditions = [];
    const params = [];

    if (protocol) {
      conditions.push('protocol = ?');
      params.push(protocol);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (region) {
      conditions.push('region = ?');
      params.push(region);
    }
    if (user_id) {
      conditions.push('user_id = ?');
      params.push(user_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = this.db.prepare(`SELECT COUNT(*) as total FROM proxies ${whereClause}`).get(...params);
    const total = countRow.total;

    const offset = (page - 1) * pageSize;
    const rows = this.db
      .prepare(`SELECT * FROM proxies ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, offset);

    return { items: rows, total, page, pageSize };
  }

  /**
   * Find a single proxy by ID.
   * @param {number} id
   * @returns {object|undefined}
   */
  findById(id) {
    return this.db.prepare('SELECT * FROM proxies WHERE id = ?').get(id);
  }

  /**
   * Create a new proxy. Uses INSERT OR IGNORE for dedup by (host, port, protocol).
   * @param {object} data - { host, port, protocol, username, password, region, provider }
   * @returns {object} The created proxy
   */
  create(data) {
    const { host, port, protocol = 'http', username = null, password = null, region = null, provider = 'manual' } = data;
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO proxies (host, port, protocol, username, password, region, provider, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'unchecked', datetime('now'), datetime('now'))
    `);
    const info = stmt.run(host, port, protocol, username, password, region, provider);
    if (info.changes === 0) {
      // Duplicate - return existing record
      return this.db.prepare('SELECT * FROM proxies WHERE host = ? AND port = ? AND protocol = ?').get(host, port, protocol);
    }
    return this.findById(info.lastInsertRowid);
  }

  /**
   * Update a proxy by ID.
   * @param {number} id
   * @param {object} data - Fields to update
   * @returns {object} Updated proxy
   */
  update(id, data) {
    const fields = [];
    const params = [];

    const allowedFields = ['host', 'port', 'protocol', 'username', 'password', 'region', 'provider', 'country', 'city', 'actual_ip', 'user_id'];
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

    this.db.prepare(`UPDATE proxies SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  }

  /**
   * Delete a proxy by ID.
   * @param {number} id
   * @returns {boolean} Whether the deletion was successful
   */
  delete(id) {
    const info = this.db.prepare('DELETE FROM proxies WHERE id = ?').run(id);
    return info.changes > 0;
  }

  /**
   * Batch create proxies. Uses INSERT OR IGNORE for dedup.
   * @param {object[]} proxies - Array of proxy data objects
   * @returns {{ inserted: number, duplicates: number }}
   */
  batchCreate(proxies) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO proxies (host, port, protocol, username, password, region, provider, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'unchecked', datetime('now'), datetime('now'))
    `);

    const batchInsert = this.db.transaction((items) => {
      let inserted = 0;
      let duplicates = 0;
      for (const item of items) {
        const {
          host, port, protocol = 'http', username = null,
          password = null, region = null, provider = 'kdl'
        } = item;
        const info = stmt.run(host, port, protocol, username, password, region, provider);
        if (info.changes > 0) {
          inserted++;
        } else {
          duplicates++;
        }
      }
      return { inserted, duplicates };
    });

    return batchInsert(proxies);
  }

  /**
   * Update the status and latency of a proxy.
   * @param {number} id
   * @param {string} status - New status
   * @param {number|null} latency - Measured latency in ms
   * @returns {object} Updated proxy
   */
  updateStatus(id, status, latency) {
    this.db.prepare(`
      UPDATE proxies SET status = ?, latency = ?, last_check_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(status, latency, id);
    return this.findById(id);
  }

  /**
   * Find all available proxies.
   * @returns {object[]}
   */
  findAvailable() {
    return this.db.prepare("SELECT * FROM proxies WHERE status = 'available' ORDER BY latency ASC").all();
  }

  /**
   * Delete proxies by a list of IDs.
   * @param {number[]} ids
   * @returns {number} Number of deleted rows
   */
  deleteByIds(ids) {
    if (ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const info = this.db.prepare(`DELETE FROM proxies WHERE id IN (${placeholders})`).run(...ids);
    return info.changes;
  }

  /**
   * Delete proxies by status.
   * @param {string} status - Proxy status to delete (e.g. 'unavailable')
   * @returns {number} Number of deleted rows
   */
  deleteByStatus(status) {
    const info = this.db.prepare('DELETE FROM proxies WHERE status = ?').run(status);
    return info.changes;
  }

  /**
   * Count proxies grouped by status.
   * @returns {object} { unchecked, available, slow, unavailable }
   */
  countByStatus() {
    const rows = this.db.prepare('SELECT status, COUNT(*) as count FROM proxies GROUP BY status').all();
    const result = { unchecked: 0, available: 0, slow: 0, unavailable: 0 };
    for (const row of rows) {
      if (result.hasOwnProperty(row.status)) {
        result[row.status] = row.count;
      }
    }
    return result;
  }

  /**
   * Update GeoIP information for a proxy.
   * @param {number} id
   * @param {string|null} country
   * @param {string|null} city
   * @returns {object} Updated proxy
   */
  updateGeo(id, country, city) {
    this.db.prepare(`
      UPDATE proxies SET country = ?, city = ?, updated_at = datetime('now') WHERE id = ?
    `).run(country, city, id);
    return this.findById(id);
  }

  /**
   * Update the actual exit IP for a proxy.
   * @param {number} id
   * @param {string} actualIp
   * @returns {object} Updated proxy
   */
  updateActualIp(id, actualIp) {
    this.db.prepare(`
      UPDATE proxies SET actual_ip = ?, updated_at = datetime('now') WHERE id = ?
    `).run(actualIp, id);
    return this.findById(id);
  }

  /**
   * Find proxies by user ID.
   * @param {number} userId
   * @returns {object[]}
   */
  findByUserId(userId) {
    return this.db.prepare('SELECT * FROM proxies WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  }
}
