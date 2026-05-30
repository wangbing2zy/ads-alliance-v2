import bcrypt from 'bcryptjs';

/**
 * Database Migration 001: Add user system
 * - Create users table
 * - Create videos table
 * - Add columns to existing tables (country, city, actual_ip, user_id, proxy_ip)
 * - Insert default admin user
 * - Backfill existing data with user_id = 1
 */
export function runMigration001(db) {
  console.log('[Migration 001] Starting add_user_system migration...');

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'guest')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);

  // Create videos table
  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      title TEXT,
      duration INTEGER,
      site TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invalid')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
    CREATE INDEX IF NOT EXISTS idx_videos_site ON videos(site);
    CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
  `);

  // Insert default admin user (if not exists)
  const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, role, created_at, updated_at)
      VALUES ('admin', ?, 'admin', datetime('now'), datetime('now'))
    `).run(passwordHash);
    console.log('[Migration 001] Default admin user created (admin/admin123)');
  }

  // Add columns to existing tables with try/catch for column-already-exists
  const alterStatements = [
    { table: 'proxies', column: 'country', type: 'TEXT' },
    { table: 'proxies', column: 'city', type: 'TEXT' },
    { table: 'proxies', column: 'actual_ip', type: 'TEXT' },
    { table: 'proxies', column: 'user_id', type: 'INTEGER REFERENCES users(id)' },
    { table: 'tasks', column: 'user_id', type: 'INTEGER REFERENCES users(id)' },
    { table: 'execution_logs', column: 'proxy_ip', type: 'TEXT' },
    { table: 'earnings', column: 'user_id', type: 'INTEGER REFERENCES users(id)' },
  ];

  for (const alter of alterStatements) {
    try {
      db.exec(`ALTER TABLE ${alter.table} ADD COLUMN ${alter.column} ${alter.type}`);
      console.log(`[Migration 001] Added column ${alter.column} to ${alter.table}`);
    } catch (err) {
      // Column already exists — safe to ignore
      if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
        console.log(`[Migration 001] Column ${alter.column} already exists in ${alter.table}, skipping`);
      } else {
        console.error(`[Migration 001] Error adding column ${alter.column} to ${alter.table}:`, err.message);
      }
    }
  }

  // Create indexes for new columns (idempotent)
  const indexStatements = [
    'CREATE INDEX IF NOT EXISTS idx_proxies_user_id ON proxies(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_proxies_country ON proxies(country)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON earnings(user_id)',
  ];

  for (const sql of indexStatements) {
    try {
      db.exec(sql);
    } catch (err) {
      console.error('[Migration 001] Index creation warning:', err.message);
    }
  }

  // Backfill existing data: set user_id = 1 (admin) for all records
  const updateStatements = [
    'UPDATE proxies SET user_id = 1 WHERE user_id IS NULL',
    'UPDATE tasks SET user_id = 1 WHERE user_id IS NULL',
    'UPDATE earnings SET user_id = 1 WHERE user_id IS NULL',
  ];

  for (const sql of updateStatements) {
    try {
      const info = db.prepare(sql).run();
      if (info.changes > 0) {
        console.log(`[Migration 001] Updated ${info.changes} rows with user_id = 1`);
      }
    } catch (err) {
      console.error('[Migration 001] Backfill warning:', err.message);
    }
  }

  console.log('[Migration 001] add_user_system migration completed');
}
