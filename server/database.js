import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { runMigration001 } from './migrations/001_add_user_system.js';
import { runMigration002 } from './migrations/002_add_ai_detection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize SQLite database with all tables, indexes, and preset settings.
 * Uses WAL mode for better concurrent read/write performance.
 * @returns {Database} better-sqlite3 database instance
 */
export function initDatabase() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'ads_alliance.db');
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create proxies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS proxies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      protocol TEXT NOT NULL DEFAULT 'http',
      username TEXT,
      password TEXT,
      region TEXT,
      status TEXT NOT NULL DEFAULT 'unchecked',
      latency INTEGER,
      provider TEXT DEFAULT 'manual',
      last_check_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(status);
    CREATE INDEX IF NOT EXISTS idx_proxies_protocol ON proxies(protocol);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_proxies_host_port ON proxies(host, port, protocol);
  `);

  // Create tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      video_urls TEXT NOT NULL,
      ad_rule_json TEXT,
      proxy_ids TEXT NOT NULL DEFAULT '[]',
      rotate_mode TEXT NOT NULL DEFAULT 'sequential',
      concurrency INTEGER NOT NULL DEFAULT 1,
      interval_min_sec INTEGER DEFAULT 30,
      interval_max_sec INTEGER DEFAULT 120,
      status TEXT NOT NULL DEFAULT 'stopped',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `);

  // Create execution_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS execution_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      proxy_id INTEGER,
      video_url TEXT NOT NULL,
      action TEXT NOT NULL,
      result TEXT NOT NULL,
      duration_ms INTEGER,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_logs_task_id ON execution_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON execution_logs(created_at);
  `);

  // Create earnings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      proxy_id INTEGER,
      date TEXT NOT NULL,
      play_count INTEGER DEFAULT 0,
      complete_count INTEGER DEFAULT 0,
      earnings_amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_earnings_task_date ON earnings(task_id, date);
    CREATE INDEX IF NOT EXISTS idx_earnings_date ON earnings(date);
  `);

  // Create settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Insert preset settings
  const insertSetting = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`
  );

  const presetSettings = [
    ['kdl_order_id', '977936593601291'],
    ['kdl_secret_id', 'ozl28zbu8tcd4cgiuapf'],
    ['headless', 'true'],
    ['max_global_concurrent', '10'],
    ['proxy_auto_verify_interval', '30'],
  ];

  const insertSettings = db.transaction((settings) => {
    for (const [key, value] of settings) {
      insertSetting.run(key, value);
    }
  });

  insertSettings(presetSettings);

  // Run migrations
  runMigration001(db);
  runMigration002(db);

  console.log('[Database] Initialized successfully at', dbPath);
  return db;
}

export default initDatabase;
