/**
 * HealthCheckService - 代理自动定时验证服务
 * Periodically runs batch health checks on all proxies.
 */
export class HealthCheckService {
  /**
   * @param {import('./proxyService.js').ProxyService} proxyService
   * @param {import('../models/settingsModel.js').SettingsModel} settingsModel
   */
  constructor(proxyService, settingsModel) {
    this.proxyService = proxyService;
    this.settingsModel = settingsModel;
    this.timer = null;
    this.running = false;
  }

  /**
   * Start the auto-verify timer based on settings.
   */
  start() {
    const intervalMin = parseInt(this.settingsModel.get('proxy_auto_verify_interval') || '0', 10);
    if (intervalMin <= 0) {
      console.log('[HealthCheckService] Auto-verify disabled (interval <= 0)');
      return;
    }

    if (this.timer) {
      clearInterval(this.timer);
    }

    console.log(`[HealthCheckService] Auto-verify enabled, interval: ${intervalMin}min`);
    this.timer = setInterval(() => this.run(), intervalMin * 60 * 1000);

    // Run immediately on start
    this.run();
  }

  /**
   * Stop the auto-verify timer.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Restart with new settings (called when config changes).
   */
  restart() {
    this.stop();
    this.start();
  }

  /**
   * Execute a batch health check.
   */
  async run() {
    if (this.running) {
      console.log('[HealthCheckService] Previous run still in progress, skipping');
      return;
    }

    this.running = true;
    console.log('[HealthCheckService] Starting auto-verify...');

    try {
      const startTime = Date.now();
      const results = await this.proxyService.batchHealthCheck([]);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      const available = results.filter(r => r.status === 'available').length;
      const slow = results.filter(r => r.status === 'slow').length;
      const unavailable = results.filter(r => r.status === 'unavailable').length;

      console.log(
        `[HealthCheckService] Auto-verify completed in ${elapsed}s: ` +
        `可用=${available}, 较慢=${slow}, 不可用=${unavailable}, 共=${results.length}`
      );
    } catch (err) {
      console.error('[HealthCheckService] Auto-verify error:', err.message);
    } finally {
      this.running = false;
    }
  }
}
