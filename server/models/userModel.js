import bcrypt from 'bcryptjs';

/**
 * UserModel - Data access layer for the users table.
 * Handles user CRUD and password verification.
 */
export class UserModel {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Find a user by username.
   * @param {string} username
   * @returns {object|undefined}
   */
  findByUsername(username) {
    return this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  }

  /**
   * Find a user by ID.
   * @param {number} id
   * @returns {object|undefined}
   */
  findById(id) {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  /**
   * Find all users (without password_hash).
   * @returns {object[]}
   */
  findAll() {
    return this.db.prepare('SELECT id, username, role, created_at, updated_at FROM users ORDER BY created_at ASC').all();
  }

  /**
   * Create a new user.
   * @param {object} data - { username, password, role }
   * @returns {object} Created user (without password_hash)
   */
  create(data) {
    const { username, password, role = 'user' } = data;
    const passwordHash = bcrypt.hashSync(password, 10);

    const stmt = this.db.prepare(`
      INSERT INTO users (username, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `);
    const info = stmt.run(username, passwordHash, role);

    return this.db.prepare('SELECT id, username, role, created_at, updated_at FROM users WHERE id = ?').get(info.lastInsertRowid);
  }

  /**
   * Update a user by ID.
   * @param {number} id
   * @param {object} data - { role?, password? }
   * @returns {object} Updated user (without password_hash)
   */
  update(id, data) {
    const fields = [];
    const params = [];

    if (data.role !== undefined) {
      fields.push('role = ?');
      params.push(data.role);
    }

    if (data.password !== undefined && data.password !== null && data.password !== '') {
      const passwordHash = bcrypt.hashSync(data.password, 10);
      fields.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push("updated_at = datetime('now')");
    params.push(id);

    this.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.db.prepare('SELECT id, username, role, created_at, updated_at FROM users WHERE id = ?').get(id);
  }

  /**
   * Delete (disable) a user by ID. Does not allow deleting id=1 (admin).
   * @param {number} id
   * @returns {boolean}
   */
  delete(id) {
    if (id === 1) {
      throw new Error('不能删除默认管理员账号');
    }
    const info = this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return info.changes > 0;
  }

  /**
   * Verify a user's password.
   * @param {string} username
   * @param {string} password
   * @returns {object|null} User object without password_hash if valid, null otherwise
   */
  verifyPassword(username, password) {
    const user = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return null;

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return null;

    // Return user without password_hash
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }
}
