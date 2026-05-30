/**
 * AILogModel - Data access layer for the ai_logs table.
 */
export class AILogModel {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Create an AI log entry.
   * @param {object} data - { model, trigger_event, trigger_detail, diagnosis, action_taken, action_result, confidence, input_tokens, output_tokens, duration_ms, error_message, task_id, proxy_id }
   * @returns {import('better-sqlite3').RunResult}
   */
  create(data) {
    const stmt = this.db.prepare(`
      INSERT INTO ai_logs (model, trigger_event, trigger_detail, diagnosis, action_taken, action_result, confidence, input_tokens, output_tokens, duration_ms, error_message, task_id, proxy_id)
      VALUES (@model, @trigger_event, @trigger_detail, @diagnosis, @action_taken, @action_result, @confidence, @input_tokens, @output_tokens, @duration_ms, @error_message, @task_id, @proxy_id)
    `);
    return stmt.run({
      model: data.model,
      trigger_event: data.trigger_event,
      trigger_detail: data.trigger_detail ?? null,
      diagnosis: data.diagnosis ?? null,
      action_taken: data.action_taken ?? null,
      action_result: data.action_result ?? null,
      confidence: data.confidence ?? null,
      input_tokens: data.input_tokens ?? 0,
      output_tokens: data.output_tokens ?? 0,
      duration_ms: data.duration_ms ?? null,
      error_message: data.error_message ?? null,
      task_id: data.task_id ?? null,
      proxy_id: data.proxy_id ?? null,
    });
  }

  /**
   * Query AI logs with filters and pagination.
   * @param {object} filters - { page, pageSize, model, trigger_event, task_id, start_date, end_date }
   * @returns {{ items: object[], total: number, page: number, pageSize: number }}
   */
  findAll(filters = {}) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let where = ['1=1'];
    let params = [];

    if (filters.model) { where.push('model = ?'); params.push(filters.model); }
    if (filters.trigger_event) { where.push('trigger_event = ?'); params.push(filters.trigger_event); }
    if (filters.task_id) { where.push('task_id = ?'); params.push(filters.task_id); }
    if (filters.start_date) { where.push("created_at >= ?"); params.push(filters.start_date); }
    if (filters.end_date) { where.push("created_at <= ?"); params.push(filters.end_date + ' 23:59:59'); }

    const whereClause = where.join(' AND ');

    const total = this.db.prepare(`SELECT COUNT(*) as count FROM ai_logs WHERE ${whereClause}`).get(...params).count;
    const items = this.db.prepare(`SELECT * FROM ai_logs WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);

    return { items, total, page, pageSize };
  }

  /**
   * Get token usage statistics within a date range.
   * @param {object} dateRange - { start_date, end_date }
   * @returns {{ total_input_tokens: number, total_output_tokens: number, total_calls: number }}
   */
  getTokenStats(dateRange = {}) {
    let where = ['1=1'];
    let params = [];
    if (dateRange.start_date) { where.push("created_at >= ?"); params.push(dateRange.start_date); }
    if (dateRange.end_date) { where.push("created_at <= ?"); params.push(dateRange.end_date + ' 23:59:59'); }
    const whereClause = where.join(' AND ');

    const row = this.db.prepare(`
      SELECT COALESCE(SUM(input_tokens), 0) as total_input_tokens,
             COALESCE(SUM(output_tokens), 0) as total_output_tokens,
             COUNT(*) as total_calls
      FROM ai_logs WHERE ${whereClause}
    `).get(...params);
    return row;
  }

  /**
   * Count AI logs by date.
   * @param {string} date - Date string in YYYY-MM-DD format
   * @returns {number}
   */
  countByDate(date) {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM ai_logs WHERE date(created_at) = ?").get(date);
    return row ? row.count : 0;
  }
}
