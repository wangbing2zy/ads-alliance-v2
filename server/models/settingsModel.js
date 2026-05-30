/**
 * SettingsModel - Data access layer for the settings table.
 * Simple key-value configuration storage.
 */
export class SettingsModel {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Get a setting value by key.
   * @param {string} key
   * @returns {string|null} The setting value, or null if not found
   */
  get(key) {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  }

  /**
   * Set a setting value. Uses INSERT OR REPLACE for upsert.
   * @param {string} key
   * @param {string} value
   */
  set(key, value) {
    this.db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(key, value);
  }

  /**
   * Get all settings as a key-value object.
   * @returns {object} Settings map
   */
  getAll() {
    const rows = this.db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }
}
