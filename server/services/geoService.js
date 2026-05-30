import axios from 'axios';

/**
 * GeoService - GeoIP lookup service with rate limiting.
 * Uses ip-api.com free tier (45 requests/60 seconds).
 */
export class GeoService {
  constructor() {
    /** @type {{ tokens: number, lastRefill: number }} Token bucket rate limiter */
    this.rateLimiter = {
      tokens: 45,
      lastRefill: Date.now(),
      maxTokens: 45,
      refillRate: 45, // tokens per 60 seconds
      refillInterval: 60000, // 60 seconds in ms
    };

    /** @type {Array<{ip: string, resolve: Function, reject: Function}>} Queue for batch lookups */
    this.queue = [];
    this.processing = false;
  }

  /**
   * Refill tokens based on elapsed time.
   * @private
   */
  _refillTokens() {
    const now = Date.now();
    const elapsed = now - this.rateLimiter.lastRefill;
    const tokensToAdd = Math.floor((elapsed / this.rateLimiter.refillInterval) * this.rateLimiter.refillRate);
    if (tokensToAdd > 0) {
      this.rateLimiter.tokens = Math.min(
        this.rateLimiter.maxTokens,
        this.rateLimiter.tokens + tokensToAdd
      );
      this.rateLimiter.lastRefill = now;
    }
  }

  /**
   * Consume a token. Returns true if a token was available.
   * @returns {boolean}
   * @private
   */
  _consumeToken() {
    this._refillTokens();
    if (this.rateLimiter.tokens > 0) {
      this.rateLimiter.tokens--;
      return true;
    }
    return false;
  }

  /**
   * Wait until a token is available.
   * @private
   */
  async _waitForToken() {
    while (!this._consumeToken()) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  /**
   * Look up geo information for a single IP address.
   * @param {string} ip - IP address to look up
   * @returns {Promise<{country: string, city: string}>}
   */
  async lookup(ip) {
    if (!ip || ip === '0.0.0.0' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return { country: null, city: null };
    }

    await this._waitForToken();

    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`, {
        timeout: 10000,
        params: { fields: 'status,countryCode,city' },
      });

      const data = response.data;
      if (data && data.status === 'success') {
        return {
          country: data.countryCode || null,
          city: data.city || null,
        };
      }
      return { country: null, city: null };
    } catch (err) {
      console.error(`[GeoService] Lookup failed for ${ip}:`, err.message);
      return { country: null, city: null };
    }
  }

  /**
   * Batch look up geo information for multiple IP addresses.
   * Processes through rate-limited queue.
   * @param {string[]} ips - Array of IP addresses
   * @returns {Promise<Array<{ip: string, country: string|null, city: string|null}>>}
   */
  async batchLookup(ips) {
    const results = [];
    for (const ip of ips) {
      const geo = await this.lookup(ip);
      results.push({ ip, ...geo });
    }
    return results;
  }
}

/** Singleton instance for sharing across controllers */
export const geoService = new GeoService();
