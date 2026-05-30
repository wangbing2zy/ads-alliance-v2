/**
 * Database Migration 002: Add AI detection system
 * - Create proxy_logs table
 * - Create task_logs table
 * - Create login_logs table
 * - Create ai_logs table
 * - Insert AI preset settings
 */
export function runMigration002(db) {
  console.log('[Migration 002] Starting add_ai_detection migration...');

  // Create proxy_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS proxy_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proxy_id INTEGER,
      task_id INTEGER,
      action TEXT NOT NULL,
      detail TEXT,
      old_status TEXT,
      new_status TEXT,
      proxy_ip TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_proxy_logs_proxy_id ON proxy_logs(proxy_id);
    CREATE INDEX IF NOT EXISTS idx_proxy_logs_task_id ON proxy_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_proxy_logs_created_at ON proxy_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_proxy_logs_action ON proxy_logs(action);
  `);

  // Create task_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      detail TEXT,
      error_message TEXT,
      proxy_id INTEGER,
      retry_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_logs_created_at ON task_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_task_logs_action ON task_logs(action);
  `);

  // Create login_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_login_logs_action ON login_logs(action);
  `);

  // Create ai_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      trigger_event TEXT NOT NULL,
      trigger_detail TEXT,
      diagnosis TEXT,
      action_taken TEXT,
      action_result TEXT,
      confidence REAL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      duration_ms INTEGER,
      error_message TEXT,
      task_id INTEGER,
      proxy_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
      FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_logs_model ON ai_logs(model);
    CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_logs_trigger_event ON ai_logs(trigger_event);
    CREATE INDEX IF NOT EXISTS idx_ai_logs_task_id ON ai_logs(task_id);
  `);

  // Insert AI preset settings
  const insertSetting = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`
  );

  const aiPresetSettings = [
    ['ai_enabled', 'false'],
    ['ai_model', 'deepseek'],
    ['ai_deepseek_api_key', ''],
    ['ai_deepseek_base_url', 'https://api.deepseek.com'],
    ['ai_chatgpt_api_key', ''],
    ['ai_chatgpt_base_url', 'https://api.openai.com'],
    ['ai_check_interval_sec', '60'],
    ['ai_max_token_per_request', '1000'],
  ];

  const insertSettings = db.transaction((settings) => {
    for (const [key, value] of settings) {
      insertSetting.run(key, value);
    }
  });

  insertSettings(aiPresetSettings);

  console.log('[Migration 002] add_ai_detection migration completed');
}
