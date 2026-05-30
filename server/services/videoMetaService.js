import { chromium } from 'playwright';
import { UpboltAdapter } from './siteAdapters/upboltAdapter.js';

/**
 * VideoMetaService - 视频元数据提取服务
 * Uses Site Adapter pattern to extract metadata from video pages.
 */
export class VideoMetaService {
  constructor() {
    /** @type {Map<string, import('./siteAdapters/upboltAdapter').UpboltAdapter>} */
    this.adapters = new Map();

    // Register built-in adapters
    this.registerAdapter('upbolt.to', new UpboltAdapter());
  }

  /**
   * Register a site adapter.
   * @param {string} site - Site domain
   * @param {object} adapter - Adapter instance with canHandle() and extractMeta() methods
   */
  registerAdapter(site, adapter) {
    this.adapters.set(site, adapter);
  }

  /**
   * Detect which site a URL belongs to.
   * @param {string} url
   * @returns {string|null} Site name or null
   */
  detectSite(url) {
    for (const [siteName, adapter] of this.adapters) {
      if (adapter.canHandle(url)) {
        return siteName;
      }
    }
    return null;
  }

  /**
   * Fetch video metadata from a URL.
   * @param {string} url - Video URL
   * @returns {Promise<{title: string|null, duration: number|null, site: string|null}>}
   */
  async fetchMeta(url) {
    const siteName = this.detectSite(url);
    const adapter = siteName ? this.adapters.get(siteName) : null;

    let browser = null;
    let context = null;
    let page = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      });

      page = await context.newPage();

      // Navigate to the URL with timeout
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait a bit for dynamic content to load
      await page.waitForTimeout(3000);

      let title = null;
      let duration = null;

      if (adapter) {
        const meta = await adapter.extractMeta(page);
        title = meta.title;
        duration = meta.duration;
      } else {
        // Fallback: try basic extraction
        try {
          title = await page.title();
          if (title) title = title.trim();
        } catch { /* ignore */ }

        try {
          const dur = await page.evaluate(() => {
            const video = document.querySelector('video');
            if (video && video.duration && isFinite(video.duration)) {
              return Math.round(video.duration);
            }
            return null;
          });
          duration = dur;
        } catch { /* ignore */ }
      }

      return {
        title: title || null,
        duration: duration || null,
        site: siteName,
      };
    } catch (err) {
      console.error('[VideoMetaService] Fetch meta error:', err.message);
      return {
        title: null,
        duration: null,
        site: siteName,
      };
    } finally {
      try {
        if (page) await page.close();
      } catch { /* ignore */ }
      try {
        if (context) await context.close();
      } catch { /* ignore */ }
      try {
        if (browser) await browser.close();
      } catch { /* ignore */ }
    }
  }
}
