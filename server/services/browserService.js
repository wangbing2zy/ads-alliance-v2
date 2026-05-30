import { chromium } from 'playwright';

// ============================================================================
// Fingerprint & Device Pools — 随机化设备参数，防指纹关联
// ============================================================================

/** User-Agent 池：涵盖 Windows / macOS / Linux 三大平台，Chrome 120-126 */
const USER_AGENT_POOL = [
  // Windows Chrome
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  // macOS Chrome
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  // Linux Chrome
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

/** 屏幕分辨率池：覆盖主流桌面分辨率 */
const VIEWPORT_POOL = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1600, height: 900 },
  { width: 1680, height: 1050 },
  { width: 2560, height: 1440 },
  { width: 1280, height: 800 },
  { width: 1360, height: 768 },
];

/** 时区池：按流量来源覆盖常见时区 */
const TIMEZONE_POOL = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Shanghai',
];

/** 语言-地区池 */
const LOCALE_POOL = [
  'en-US',
  'en-GB',
  'en-CA',
  'en-AU',
  'de-DE',
  'fr-FR',
  'ja-JP',
  'zh-CN',
];

/** 平台标识池（navigator.platform） */
const PLATFORM_POOL = [
  'Win32',
  'Win32',
  'Win32',
  'MacIntel',
  'MacIntel',
  'Linux x86_64',
];

/** WebGPU/Canvas 噪声种子范围 */
const NOISE_SEED_MIN = 1000;
const NOISE_SEED_MAX = 9999;

// ============================================================================
// BrowserService Class
// ============================================================================

/**
 * BrowserService - Playwright 浏览器生命周期管理
 * Singleton browser instance shared across the application.
 *
 * Features:
 * - Anti-detection: Stealth-like args to bypass bot detection (Cloudflare, etc.)
 * - Cloudflare challenge: Auto-wait for CF verification pages
 * - Fingerprint randomization: Each context gets unique UA, viewport, timezone, etc.
 */
export class BrowserService {
  constructor() {
    /** @type {import('playwright').Browser|null} */
    this.browser = null;
    this.headless = true;
  }

  // --------------------------------------------------------------------------
  // Randomization Utilities
  // --------------------------------------------------------------------------

  /**
   * Pick a random element from an array.
   * @template T
   * @param {T[]} arr
   * @returns {T}
   */
  static _pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Generate a random integer in [min, max] (inclusive).
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  static _randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a complete set of randomized fingerprint parameters for one session.
   * Each call produces a unique combination — no two sessions share the same fingerprint.
   * @returns {{ userAgent: string, viewport: {width:number,height:number}, locale: string, timezoneId: string, platform: string, colorDepth: number, deviceMemory: number, hardwareConcurrency: number, noiseSeed: number, webglVendor: string, webglRenderer: string }}
   */
  static generateFingerprint() {
    const ua = BrowserService._pickRandom(USER_AGENT_POOL);
    const viewport = BrowserService._pickRandom(VIEWPORT_POOL);
    const locale = BrowserService._pickRandom(LOCALE_POOL);
    const timezoneId = BrowserService._pickRandom(TIMEZONE_POOL);
    const platform = BrowserService._pickRandom(PLATFORM_POOL);
    const colorDepth = BrowserService._pickRandom([24, 24, 24, 32]);
    const deviceMemory = BrowserService._pickRandom([2, 4, 8, 8, 16]);
    const hardwareConcurrency = BrowserService._pickRandom([2, 4, 4, 8, 12, 16]);
    const noiseSeed = BrowserService._randInt(NOISE_SEED_MIN, NOISE_SEED_MAX);
    const webglVendor = BrowserService._pickRandom([
      'Google Inc. (NVIDIA)',
      'Google Inc. (Intel)',
      'Google Inc. (AMD)',
      'Google Inc. (Apple)',
    ]);
    const webglRenderer = BrowserService._pickRandom([
      'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
      'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)',
      'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)',
      'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)',
      'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)',
      'ANGLE (Apple, Apple M1 Direct3D11 vs_5_0 ps_5_0)',
    ]);

    return {
      userAgent: ua,
      viewport,
      locale,
      timezoneId,
      platform,
      colorDepth,
      deviceMemory,
      hardwareConcurrency,
      noiseSeed,
      webglVendor,
      webglRenderer,
    };
  }

  // --------------------------------------------------------------------------
  // Browser Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Launch the browser instance (singleton pattern).
   * @param {boolean} headless - Whether to run in headless mode
   * @returns {Promise<import('playwright').Browser>} The browser instance
   */
  async launch(headless = true) {
    this.headless = headless;
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    // Anti-detection browser args - help bypass Cloudflare and similar bot detection
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',  // Key: hide webdriver flag
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-infobars',
      '--lang=en-US,en',
    ];

    // On Linux servers without X11, always use headless mode
    const headlessMode = this.headless ? true : false;

    this.browser = await chromium.launch({
      headless: headlessMode,
      args,
    });

    console.log(`[BrowserService] Launched browser (headless: ${this.headless})`);
    return this.browser;
  }

  /**
   * Create a new browser context with optional proxy and randomized fingerprint.
   * Each context gets a unique fingerprint to prevent cross-session correlation.
   * @param {string} proxyUrl - Proxy server URL (optional)
   * @param {object} [fingerprintOverride] - Pre-generated fingerprint to use (optional)
   * @returns {Promise<{context: import('playwright').BrowserContext, fingerprint: object}>}
   */
  async createContext(proxyUrl = null, fingerprintOverride = null) {
    if (!this.browser || !this.browser.isConnected()) {
      await this.launch(this.headless);
    }

    const fp = fingerprintOverride || BrowserService.generateFingerprint();

    console.log(`[BrowserService] Creating context with fingerprint: UA=${fp.userAgent.substring(0, 60)}..., viewport=${fp.viewport.width}x${fp.viewport.height}, tz=${fp.timezoneId}, locale=${fp.locale}, platform=${fp.platform}`);

    const contextOptions = {
      viewport: fp.viewport,
      locale: fp.locale,
      timezoneId: fp.timezoneId,
      userAgent: fp.userAgent,
      extraHTTPHeaders: {
        'Accept-Language': `${fp.locale},en;q=0.9`,
      },
      // Bypass CSP for better ad interaction handling
      bypassCSP: true,
    };

    if (proxyUrl) {
      contextOptions.proxy = { server: proxyUrl };
    }

    const context = await this.browser.newContext(contextOptions);

    // Inject comprehensive anti-detection scripts before any page is created
    // Each context gets unique values based on its fingerprint
    await context.addInitScript((fingerprint) => {
      // 1. Remove webdriver flag — most important for Cloudflare bypass
      Object.defineProperty(navigator, 'webdriver', { get: () => false });

      // 2. Override navigator.platform to match UA
      Object.defineProperty(navigator, 'platform', {
        get: () => fingerprint.platform,
      });

      // 3. Override plugins to look like a real browser with realistic plugin list
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
          ];
          plugins.length = 3;
          return plugins;
        },
      });

      // 4. Override languages to match fingerprint locale
      Object.defineProperty(navigator, 'languages', {
        get: () => [fingerprint.locale, 'en'],
      });

      // 5. Override hardware concurrency (CPU core count)
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => fingerprint.hardwareConcurrency,
      });

      // 6. Override device memory (GB)
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => fingerprint.deviceMemory,
      });

      // 7. Override chrome runtime (headless Chrome doesn't have this)
      window.chrome = {
        runtime: {
          connect: function() {},
          sendMessage: function() {},
        },
        loadTimes: function() { return {}; },
        csi: function() { return {}; },
        app: { isInstalled: false },
      };

      // 8. Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);

      // 9. Override screen properties to match viewport
      const screenWidth = fingerprint.viewport.width;
      const screenHeight = fingerprint.viewport.height;
      Object.defineProperty(screen, 'width', { get: () => screenWidth });
      Object.defineProperty(screen, 'height', { get: () => screenHeight });
      Object.defineProperty(screen, 'availWidth', { get: () => screenWidth });
      Object.defineProperty(screen, 'availHeight', { get: () => screenHeight - 40 }); // Taskbar
      Object.defineProperty(screen, 'colorDepth', { get: () => fingerprint.colorDepth });
      Object.defineProperty(screen, 'pixelDepth', { get: () => fingerprint.colorDepth });

      // 10. WebGL fingerprint randomization
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(param) {
        // UNMASKED_VENDOR_WEBGL
        if (param === 0x9245) return fingerprint.webglVendor;
        // UNMASKED_RENDERER_WEBGL
        if (param === 0x9246) return fingerprint.webglRenderer;
        return getParameter.call(this, param);
      };

      // Also for WebGL2
      if (typeof WebGL2RenderingContext !== 'undefined') {
        const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(param) {
          if (param === 0x9245) return fingerprint.webglVendor;
          if (param === 0x9246) return fingerprint.webglRenderer;
          return getParameter2.call(this, param);
        };
      }

      // 11. Canvas fingerprint noise — add subtle random noise to canvas rendering
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        const ctx = this.getContext('2d');
        if (ctx && this.width > 0 && this.height > 0) {
          // Inject a tiny, invisible noise pixel
          const imageData = ctx.getImageData(0, 0, 1, 1);
          imageData.data[3] = imageData.data[3] ^ (fingerprint.noiseSeed & 0xFF);
          ctx.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, arguments);
      };

      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
        const ctx = this.getContext('2d');
        if (ctx && this.width > 0 && this.height > 0) {
          const imageData = ctx.getImageData(0, 0, 1, 1);
          imageData.data[3] = imageData.data[3] ^ (fingerprint.noiseSeed & 0xFF);
          ctx.putImageData(imageData, 0, 0);
        }
        return originalToBlob.apply(this, arguments);
      };

      // 12. AudioContext fingerprint noise
      if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        const AudioCtx = typeof AudioContext !== 'undefined' ? AudioContext : webkitAudioContext;
        const originalGetFloatFreqData = AnalyserNode.prototype.getFloatFrequencyData;
        AnalyserNode.prototype.getFloatFrequencyData = function(float32Array) {
          originalGetFloatFreqData.call(this, float32Array);
          // Add subtle noise to audio fingerprint
          for (let i = 0; i < float32Array.length; i++) {
            float32Array[i] += ((fingerprint.noiseSeed * (i + 1)) % 3 - 1) * 0.0001;
          }
        };
      }

      // 13. Fake iframe contentWindow to avoid detection
      const originalAttachShadow = Element.prototype.attachShadow;
      if (originalAttachShadow) {
        Element.prototype.attachShadow = function (...args) {
          const shadow = originalAttachShadow.apply(this, args);
          shadow.mode = 'open';
          return shadow;
        };
      }

      // 14. Override navigator.connection for realistic network info
      if (navigator.connection) {
        Object.defineProperty(navigator.connection, 'rtt', { get: () => fingerprint.noiseSeed % 50 + 50 });
      }

      // 15. Prevent toString detection of overridden functions
      const nativeToString = Function.prototype.toString;
      const overriddenFunctions = new Map();
      const originalDescriptors = {};

      // Patch Function.prototype.toString to return native-looking strings
      // for our overridden functions
      const fakeToString = function() {
        if (overriddenFunctions.has(this)) {
          return overriddenFunctions.get(this);
        }
        return nativeToString.call(this);
      };
      overriddenFunctions.set(fakeToString, 'function toString() { [native code] }');
      Function.prototype.toString = fakeToString;

    }, fp);

    return { context, fingerprint: fp };
  }

  /**
   * Create a fully isolated browser context with its own browser instance.
   * Used for per-IP session isolation — each play gets its own browser + context.
   * When the context is closed, ALL session data (cookies, cache, localStorage) is destroyed.
   * @param {string} proxyUrl - Proxy server URL
   * @param {object} [fingerprintOverride] - Pre-generated fingerprint
   * @returns {Promise<{browser: import('playwright').Browser, context: import('playwright').BrowserContext, fingerprint: object}>}
   */
  async createIsolatedContext(proxyUrl = null, fingerprintOverride = null) {
    const fp = fingerprintOverride || BrowserService.generateFingerprint();

    console.log(`[BrowserService] Creating ISOLATED context with fingerprint: UA=${fp.userAgent.substring(0, 60)}..., viewport=${fp.viewport.width}x${fp.viewport.height}, tz=${fp.timezoneId}`);

    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-infobars',
      '--lang=en-US,en',
    ];

    const browser = await chromium.launch({
      headless: this.headless ? true : false,
      args,
    });

    const contextOptions = {
      viewport: fp.viewport,
      locale: fp.locale,
      timezoneId: fp.timezoneId,
      userAgent: fp.userAgent,
      extraHTTPHeaders: {
        'Accept-Language': `${fp.locale},en;q=0.9`,
      },
      bypassCSP: true,
    };

    if (proxyUrl) {
      contextOptions.proxy = { server: proxyUrl };
    }

    const context = await browser.newContext(contextOptions);

    // Inject the same comprehensive anti-detection scripts
    await context.addInitScript((fingerprint) => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'platform', { get: () => fingerprint.platform });
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
          ];
          plugins.length = 3;
          return plugins;
        },
      });
      Object.defineProperty(navigator, 'languages', { get: () => [fingerprint.locale, 'en'] });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => fingerprint.hardwareConcurrency });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => fingerprint.deviceMemory });
      window.chrome = {
        runtime: { connect: function() {}, sendMessage: function() {} },
        loadTimes: function() { return {}; },
        csi: function() { return {}; },
        app: { isInstalled: false },
      };
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);
      const screenWidth = fingerprint.viewport.width;
      const screenHeight = fingerprint.viewport.height;
      Object.defineProperty(screen, 'width', { get: () => screenWidth });
      Object.defineProperty(screen, 'height', { get: () => screenHeight });
      Object.defineProperty(screen, 'availWidth', { get: () => screenWidth });
      Object.defineProperty(screen, 'availHeight', { get: () => screenHeight - 40 });
      Object.defineProperty(screen, 'colorDepth', { get: () => fingerprint.colorDepth });
      Object.defineProperty(screen, 'pixelDepth', { get: () => fingerprint.colorDepth });
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(param) {
        if (param === 0x9245) return fingerprint.webglVendor;
        if (param === 0x9246) return fingerprint.webglRenderer;
        return getParameter.call(this, param);
      };
      if (typeof WebGL2RenderingContext !== 'undefined') {
        const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(param) {
          if (param === 0x9245) return fingerprint.webglVendor;
          if (param === 0x9246) return fingerprint.webglRenderer;
          return getParameter2.call(this, param);
        };
      }
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        const ctx = this.getContext('2d');
        if (ctx && this.width > 0 && this.height > 0) {
          const imageData = ctx.getImageData(0, 0, 1, 1);
          imageData.data[3] = imageData.data[3] ^ (fingerprint.noiseSeed & 0xFF);
          ctx.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, arguments);
      };
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
        const ctx = this.getContext('2d');
        if (ctx && this.width > 0 && this.height > 0) {
          const imageData = ctx.getImageData(0, 0, 1, 1);
          imageData.data[3] = imageData.data[3] ^ (fingerprint.noiseSeed & 0xFF);
          ctx.putImageData(imageData, 0, 0);
        }
        return originalToBlob.apply(this, arguments);
      };
      if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        const AudioCtx = typeof AudioContext !== 'undefined' ? AudioContext : webkitAudioContext;
        const originalGetFloatFreqData = AnalyserNode.prototype.getFloatFrequencyData;
        AnalyserNode.prototype.getFloatFrequencyData = function(float32Array) {
          originalGetFloatFreqData.call(this, float32Array);
          for (let i = 0; i < float32Array.length; i++) {
            float32Array[i] += ((fingerprint.noiseSeed * (i + 1)) % 3 - 1) * 0.0001;
          }
        };
      }
      const originalAttachShadow = Element.prototype.attachShadow;
      if (originalAttachShadow) {
        Element.prototype.attachShadow = function (...args) {
          const shadow = originalAttachShadow.apply(this, args);
          shadow.mode = 'open';
          return shadow;
        };
      }
      if (navigator.connection) {
        Object.defineProperty(navigator.connection, 'rtt', { get: () => fingerprint.noiseSeed % 50 + 50 });
      }
      const nativeToString = Function.prototype.toString;
      const overriddenFunctions = new Map();
      const fakeToString = function() {
        if (overriddenFunctions.has(this)) {
          return overriddenFunctions.get(this);
        }
        return nativeToString.call(this);
      };
      overriddenFunctions.set(fakeToString, 'function toString() { [native code] }');
      Function.prototype.toString = fakeToString;
    }, fp);

    return { browser, context, fingerprint: fp };
  }

  // --------------------------------------------------------------------------
  // Cloudflare Challenge
  // --------------------------------------------------------------------------

  /**
   * Wait for Cloudflare challenge to complete on a page.
   * Detects "Just a moment..." / CF challenge pages and waits for redirect.
   * @param {import('playwright').Page} page
   * @param {number} timeout - Max wait in ms (default 60s)
   * @returns {Promise<boolean>} true if challenge passed, false if not a CF page
   */
  async waitForCloudflareChallenge(page, timeout = 60000) {
    try {
      // Check if current page is a Cloudflare challenge
      const isCFChallenge = await page.evaluate(() => {
        const bodyText = document.body?.innerText || '';
        return (
          bodyText.includes('Just a moment') ||
          bodyText.includes('Checking your browser') ||
          bodyText.includes('Please Wait') ||
          document.querySelector('#challenge-running') !== null ||
          document.querySelector('#challenge-stage') !== null ||
          document.querySelector('iframe[src*="challenges.cloudflare.com"]') !== null ||
          document.querySelector('#cf-challenge-running') !== null
        );
      });

      if (!isCFChallenge) {
        return false; // Not a CF page, proceed normally
      }

      console.log('[BrowserService] Cloudflare challenge detected, waiting for resolution...');

      // Wait for CF challenge to complete - page will auto-redirect
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        await page.waitForTimeout(2000);

        const stillOnChallenge = await page.evaluate(() => {
          const bodyText = document.body?.innerText || '';
          return (
            bodyText.includes('Just a moment') ||
            bodyText.includes('Checking your browser') ||
            document.querySelector('#challenge-running') !== null ||
            document.querySelector('#challenge-stage') !== null
          );
        });

        if (!stillOnChallenge) {
          console.log('[BrowserService] Cloudflare challenge passed!');
          // Wait a bit more for page to fully load after challenge
          await page.waitForTimeout(2000);
          return true;
        }
      }

      console.warn('[BrowserService] Cloudflare challenge timeout after', timeout, 'ms');
      return false;
    } catch (err) {
      console.error('[BrowserService] Error checking Cloudflare challenge:', err.message);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  /**
   * Close a browser context safely.
   * @param {import('playwright').BrowserContext} context
   */
  async closeContext(context) {
    try {
      if (context && !context.browser()?.isClosed?.()) {
        await context.close();
      }
    } catch (err) {
      console.error('[BrowserService] Error closing context:', err.message);
    }
  }

  /**
   * Close the browser instance.
   */
  async closeBrowser() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        console.log('[BrowserService] Browser closed');
      }
    } catch (err) {
      console.error('[BrowserService] Error closing browser:', err.message);
      this.browser = null;
    }
  }

  /**
   * Check if the browser is running.
   * @returns {boolean}
   */
  isRunning() {
    return this.browser !== null && this.browser.isConnected();
  }
}
