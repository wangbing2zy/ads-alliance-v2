import { EventEmitter } from 'events';
import { ProxyModel } from '../models/proxyModel.js';
import { TaskModel } from '../models/taskModel.js';
import { ExecutionLogModel } from '../models/executionLogModel.js';
import { SettingsModel } from '../models/settingsModel.js';
import { ProxyService } from './proxyService.js';
import { BrowserService } from './browserService.js';
import { AdInteractionService } from './adInteractionService.js';

/**
 * TaskEngine - 任务调度引擎
 * Event-driven task scheduling with concurrency control and proxy rotation.
 *
 * Key optimization: Each _executeSinglePlay creates a fully ISOLATED browser instance
 * with unique fingerprint per IP. When the browser is closed, ALL session data
 * (cookies, cache, localStorage) is destroyed — zero cross-session contamination.
 */
export class TaskEngine extends EventEmitter {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    super();
    this.db = db;
    this.taskModel = new TaskModel(db);
    this.proxyModel = new ProxyModel(db);
    this.logModel = new ExecutionLogModel(db);
    this.settingsModel = new SettingsModel(db);

    this.proxyService = new ProxyService(db, this.settingsModel);
    this.browserService = new BrowserService();
    this.adInteractionService = new AdInteractionService(this.browserService);

    /** @type {Map<number, object>} Running task executors */
    this.tasks = new Map();
    this.maxGlobalConcurrent = 10;
    this.currentGlobalCount = 0;

    /** @type {Map<number, number>} Per-task proxy rotation index */
    this.proxyIndexMap = new Map();

    /** @type {Map<number, boolean>} Task abort flags */
    this.abortFlags = new Map();

    /** @type {Map<string, object>} Per-IP fingerprint cache — ensures same IP always gets same fingerprint in a session */
    this.ipFingerprintMap = new Map();
  }

  /**
   * Initialize the task engine. Restore running tasks from DB.
   */
  async init() {
    const maxConc = this.settingsModel.get('max_global_concurrent');
    if (maxConc) {
      this.maxGlobalConcurrent = parseInt(maxConc, 10) || 10;
    }

    // Reset any tasks that were running when server stopped (crash recovery)
    const runningTasks = this.taskModel.findRunning();
    for (const task of runningTasks) {
      this.taskModel.updateStatus(task.id, 'stopped');
    }

    console.log('[TaskEngine] Initialized, max global concurrent:', this.maxGlobalConcurrent);
  }

  /**
   * Start a task.
   * @param {number} taskId
   */
  async startTask(taskId) {
    const task = this.taskModel.findById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }
    if (task.status === 'running') {
      throw new Error('任务正在运行');
    }
    if (task.status === 'paused') {
      throw new Error('任务已暂停，请使用恢复功能');
    }

    // Get available proxies for this task
    const allProxies = this.proxyModel.findAvailable();
    const taskProxies = allProxies.filter((p) => task.proxy_ids.includes(p.id));

    if (taskProxies.length === 0 && task.proxy_ids.length > 0) {
      throw new Error('绑定的代理均不可用，请先进行健康检测');
    }

    // Update task status
    this.taskModel.updateStatus(taskId, 'running');

    // Initialize task executor
    const executor = {
      taskId,
      task,
      proxies: taskProxies.length > 0 ? taskProxies : allProxies,
      playCount: 0,
      errorCount: 0,
      startTime: new Date().toISOString(),
      currentProxyId: null,
      currentProxyIp: null,
    };

    this.tasks.set(taskId, executor);
    this.proxyIndexMap.set(taskId, 0);
    this.abortFlags.set(taskId, false);

    // Start execution loop (non-blocking)
    this._executeTask(executor).catch((err) => {
      console.log(`[TaskEngine] Task ${taskId} FATAL error: ${err.message}`);
      console.log(`[TaskEngine] Task ${taskId} stack: ${err.stack}`);
      this._stopTaskInternal(taskId);
    });

    this.emit('task:started', { taskId });
    console.log(`[TaskEngine] Task ${taskId} started`);
  }

  /**
   * Stop a task.
   * @param {number} taskId
   */
  stopTask(taskId) {
    const task = this.taskModel.findById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }
    if (task.status === 'stopped') {
      throw new Error('任务已处于停止状态');
    }

    // If task is in memory, abort the execution loop
    if (this.tasks.has(taskId)) {
      this._stopTaskInternal(taskId);
    } else {
      // Ghost state: DB says running/paused but not in memory (e.g. after crash/restart)
      this.taskModel.updateStatus(taskId, 'stopped');
      this.abortFlags.delete(taskId);
      this.proxyIndexMap.delete(taskId);
    }

    this.emit('task:stopped', { taskId });
    console.log(`[TaskEngine] Task ${taskId} stopped`);
  }

  /**
   * Pause a running task.
   * @param {number} taskId
   */
  pauseTask(taskId) {
    const task = this.taskModel.findById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }
    if (task.status !== 'running') {
      throw new Error('只有运行中的任务才能暂停');
    }

    // If task is in memory, pause the execution loop
    if (this.tasks.has(taskId)) {
      const executor = this.tasks.get(taskId);
      executor.paused = true;
    }
    // Always update DB status (handles ghost state too)
    this.taskModel.updateStatus(taskId, 'paused');
    this.emit('task:paused', { taskId });
    console.log(`[TaskEngine] Task ${taskId} paused`);
  }

  /**
   * Resume a paused task.
   * @param {number} taskId
   */
  resumeTask(taskId) {
    const task = this.taskModel.findById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }
    if (task.status !== 'paused') {
      throw new Error('任务未暂停');
    }

    // If task executor is still in memory, just unpause it
    const executor = this.tasks.get(taskId);
    if (executor) {
      executor.paused = false;
      this.taskModel.updateStatus(taskId, 'running');
    } else {
      // Ghost paused state — not in memory, need to restart from scratch
      this.taskModel.updateStatus(taskId, 'stopped');
      throw new Error('任务执行器已丢失（可能因服务重启），请重新启动任务');
    }

    this.emit('task:resumed', { taskId });
    console.log(`[TaskEngine] Task ${taskId} resumed`);
  }

  /**
   * Get runtime info for a task.
   * @param {number} taskId
   * @returns {object|null}
   */
  getTaskStatus(taskId) {
    const executor = this.tasks.get(taskId);
    if (!executor) return null;

    // Get GeoIP info for current proxy
    let currentProxyGeo = null;
    if (executor.currentProxyId) {
      const proxy = this.proxyModel.findById(executor.currentProxyId);
      if (proxy && (proxy.country || proxy.city)) {
        currentProxyGeo = { country: proxy.country, city: proxy.city };
      }
    }

    return {
      taskId: executor.taskId,
      status: executor.paused ? 'paused' : 'running',
      currentProxyId: executor.currentProxyId,
      currentProxyIp: executor.currentProxyIp,
      currentProxyGeo,
      playCount: executor.playCount,
      errorCount: executor.errorCount,
      startTime: executor.startTime,
    };
  }

  /**
   * Get all running task IDs.
   * @returns {number[]}
   */
  getRunningTaskIds() {
    return Array.from(this.tasks.keys());
  }

  /**
   * Internal task execution loop.
   * @param {object} executor
   * @private
   */
  async _executeTask(executor) {
    const { taskId, task, proxies } = executor;

    while (!this.abortFlags.get(taskId)) {
      // Check if paused
      if (executor.paused) {
        await this._waitForInterval(1, 2);
        continue;
      }

      // Check global concurrency
      if (this.currentGlobalCount >= this.maxGlobalConcurrent) {
        await this._waitForInterval(1, 3);
        continue;
      }

      if (proxies.length === 0) {
        console.log(`[TaskEngine] Task ${taskId}: no proxies available, waiting...`);
        await this._waitForInterval(5, 10);
        continue;
      }

      // Select next proxy
      const proxy = this._selectNextProxy(task, proxies);
      executor.currentProxyId = proxy.id;
      executor.currentProxyIp = proxy.actual_ip || proxy.host;

      // Build proxy URL
      // ALL proxies (HTTP and SOCKS5) go through proxy-chain for anonymization.
      // This ensures: 1) Playwright gets a clean http://127.0.0.1:xxxx URL (no auth in server param)
      //               2) proxy-chain handles authentication transparently
      let proxyUrl = null;
      try {
        proxyUrl = await this.proxyService.convertToHttp(proxy);
      } catch (err) {
        console.log(`[TaskEngine] Proxy conversion failed for ${proxy.id}: ${err.message}`);
        executor.errorCount++;
        continue;
      }

      // Execute concurrent plays (up to task.concurrency)
      const concurrency = Math.min(task.concurrency || 1, 20);
      const videoUrl = task.video_urls[executor.playCount % task.video_urls.length];

      const playPromises = [];
      for (let i = 0; i < concurrency; i++) {
        if (this.abortFlags.get(taskId)) break;
        this.currentGlobalCount++;
        const currentVideo = task.video_urls[(executor.playCount + i) % task.video_urls.length];
        playPromises.push(
          this._executeSinglePlay(executor, proxy, proxyUrl, currentVideo)
            .finally(() => {
              this.currentGlobalCount = Math.max(0, this.currentGlobalCount - 1);
            })
        );
      }

      await Promise.allSettled(playPromises);

      // Wait for interval between rounds
      if (!this.abortFlags.get(taskId)) {
        const minSec = task.interval_min_sec || 30;
        const maxSec = task.interval_max_sec || 120;
        await this._waitForInterval(minSec, maxSec);
      }
    }
  }

  /**
   * Execute a single video play with full IP isolation and fingerprint randomization.
   *
   * Key optimizations:
   * 1. Creates a completely isolated browser instance per play (no shared state)
   * 2. Generates a unique fingerprint per IP (same IP → same fingerprint within session)
   * 3. New fingerprint when IP changes (prevents cross-IP fingerprint correlation)
   * 4. All session data (cookies, cache, localStorage) is destroyed when browser closes
   * 5. Passes context to adInteractionService for new-tab ad capture
   *
   * @param {object} executor
   * @param {object} proxy
   * @param {string} proxyUrl
   * @param {string} videoUrl
   * @private
   */
  async _executeSinglePlay(executor, proxy, proxyUrl, videoUrl) {
    const { taskId } = executor;
    const proxyIp = proxy.actual_ip || proxy.host;
    let browser = null;
    let context = null;

    try {
      // ── Get or create fingerprint for this IP ────────────────────────
      // Same IP always gets the same fingerprint within the engine lifecycle.
      // When IP changes, a new fingerprint is generated — preventing cross-IP correlation.
      let fingerprint = this.ipFingerprintMap.get(proxyIp);
      if (!fingerprint) {
        fingerprint = BrowserService.generateFingerprint();
        this.ipFingerprintMap.set(proxyIp, fingerprint);
        console.log(`[TaskEngine] New fingerprint generated for IP ${proxyIp}: UA=${fingerprint.userAgent.substring(0, 50)}..., viewport=${fingerprint.viewport.width}x${fingerprint.viewport.height}, tz=${fingerprint.timezoneId}`);
      } else {
        console.log(`[TaskEngine] Reusing fingerprint for IP ${proxyIp}: UA=${fingerprint.userAgent.substring(0, 50)}..., viewport=${fingerprint.viewport.width}x${fingerprint.viewport.height}`);
      }

      // ── Create fully isolated browser + context ──────────────────────
      // Each play gets its own browser instance — closing it destroys ALL session data.
      // This ensures: cookies, cache, localStorage, sessionStorage are all wiped after each play.
      const isolated = await this.browserService.createIsolatedContext(proxyUrl, fingerprint);
      browser = isolated.browser;
      context = isolated.context;

      const page = await context.newPage();

      const rule = executor.task.ad_rule_json || {
        playButtonSelector: '.play-btn, button[aria-label*="play"]',
        adWaitMinSec: 3,
        adWaitMaxSec: 10,
        adCloseMode: 'auto',
        adCloseSelector: '',
        videoCompleteSelector: '.video-ended',
        pageLoadTimeout: 30000,
      };

      // ── Execute play with context-aware ad interaction ───────────────
      // Pass both page AND context — adInteractionService needs context
      // to capture new-tab pop-up ads via context.on('page')
      const result = await this.adInteractionService.playVideo(page, context, rule, videoUrl);

      if (result.success) {
        executor.playCount++;
        this.logModel.create({
          task_id: taskId,
          proxy_id: proxy.id,
          video_url: videoUrl,
          action: 'play_complete',
          result: 'success',
          duration_ms: result.duration,
          proxy_ip: proxyIp,
        });
        this.emit('play:complete', { taskId, proxyId: proxy.id, duration: result.duration });
      } else {
        executor.errorCount++;
        this.logModel.create({
          task_id: taskId,
          proxy_id: proxy.id,
          video_url: videoUrl,
          action: 'error',
          result: 'fail',
          duration_ms: result.duration,
          error_message: result.error,
          proxy_ip: proxyIp,
        });
        this.emit('play:error', { taskId, proxyId: proxy.id, error: result.error });
      }

      await page.close();
    } catch (err) {
      executor.errorCount++;
      this.logModel.create({
        task_id: taskId,
        proxy_id: proxy.id,
        video_url: videoUrl,
        action: 'error',
        result: 'fail',
        error_message: err.message,
        proxy_ip: proxyIp,
      });
      this.emit('play:error', { taskId, proxyId: proxy.id, error: err.message });
    } finally {
      // ── Destroy the entire browser instance ──────────────────────────
      // This is the critical step for IP isolation:
      // - Closing the browser destroys ALL contexts, pages, and their data
      // - Cookies, localStorage, sessionStorage, cache — all gone
      // - No trace left from this play session
      // - Next play with a different IP starts with a completely clean slate
      try {
        if (context) await context.close();
      } catch { /* ignore */ }
      try {
        if (browser) await browser.close();
      } catch { /* ignore */ }

      console.log(`[TaskEngine] Isolated browser for IP ${proxyIp} destroyed — session data wiped`);
    }
  }

  /**
   * Select the next proxy based on rotation mode.
   * @param {object} task
   * @param {object[]} proxyList
   * @returns {object} Selected proxy
   * @private
   */
  _selectNextProxy(task, proxyList) {
    if (proxyList.length === 0) return null;

    if (task.rotate_mode === 'random') {
      return proxyList[Math.floor(Math.random() * proxyList.length)];
    }

    // Sequential mode
    const currentIndex = this.proxyIndexMap.get(task.id) || 0;
    const proxy = proxyList[currentIndex % proxyList.length];
    this.proxyIndexMap.set(task.id, (currentIndex + 1) % proxyList.length);
    return proxy;
  }

  /**
   * Wait for a random interval between min and max seconds.
   * @param {number} min - Minimum seconds
   * @param {number} max - Maximum seconds
   * @returns {Promise<void>}
   * @private
   */
  async _waitForInterval(min, max) {
    const delay = (Math.random() * (max - min) + min) * 1000;
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, delay);
      // Check abort flag periodically
      const checkInterval = setInterval(() => {
        // If aborted, resolve immediately
        for (const [, aborted] of this.abortFlags) {
          if (aborted) {
            clearTimeout(timer);
            clearInterval(checkInterval);
            resolve();
          }
        }
      }, 1000);
      // Clean up interval when timer fires
      timer.unref?.();
    });
  }

  /**
   * Internal stop task handler.
   * @param {number} taskId
   * @private
   */
  _stopTaskInternal(taskId) {
    this.abortFlags.set(taskId, true);
    this.tasks.delete(taskId);
    this.proxyIndexMap.delete(taskId);
    this.taskModel.updateStatus(taskId, 'stopped');
  }

  /**
   * Graceful shutdown - stop all tasks, clear fingerprint cache, close browser.
   */
  async shutdown() {
    console.log('[TaskEngine] Shutting down...');

    // Stop all running tasks
    for (const taskId of this.tasks.keys()) {
      this._stopTaskInternal(taskId);
    }

    // Clear the IP→fingerprint cache
    this.ipFingerprintMap.clear();
    console.log('[TaskEngine] IP fingerprint cache cleared');

    // Close browser
    await this.browserService.closeBrowser();
    this.removeAllListeners();
    console.log('[TaskEngine] Shutdown complete');
  }
}
