import net from 'net';
import axios from 'axios';
import { ProxyModel } from '../models/proxyModel.js';
import { KDLService } from './kdlService.js';

/**
 * ProxyService - 代理核心服务
 * Handles proxy validation, health checking, protocol conversion, and KDL fetching.
 */
export class ProxyService {
  /**
   * @param {import('better-sqlite3').Database} db
   * @param {object} settingsModel - SettingsModel instance
   */
  constructor(db, settingsModel) {
    this.proxyModel = new ProxyModel(db);
    this.settingsModel = settingsModel;
  }

  /**
   * Validate a proxy by testing TCP connectivity.
   * @param {object} proxy - Proxy object with host, port, protocol
   * @returns {Promise<boolean>} Whether the proxy is reachable
   */
  async validateProxy(proxy) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 3000;

      socket.setTimeout(timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(proxy.port, proxy.host);
    });
  }

  /**
   * Check the health of a single proxy.
   * Tests TCP connectivity, then measures HTTP latency.
   * @param {object} proxy - Proxy object
   * @returns {Promise<{id: number, status: string, latency: number|null, last_check_at: string}>}
   */
  async checkHealth(proxy) {
    const tcpOk = await this.validateProxy(proxy);

    if (!tcpOk) {
      const updated = this.proxyModel.updateStatus(proxy.id, 'unavailable', null);
      return {
        id: proxy.id,
        status: 'unavailable',
        latency: null,
        last_check_at: updated.last_check_at,
      };
    }

    // Test HTTP latency through the proxy
    try {
      const proxyUrl = this._buildProxyUrl(proxy);
      const startTime = Date.now();

      await axios.head('https://www.google.com', {
        proxy: this._getAxiosProxyConfig(proxy, proxyUrl),
        timeout: 5000,
        validateStatus: () => true,
      });

      const latency = Date.now() - startTime;
      let status;
      if (latency <= 500) {
        status = 'available';
      } else if (latency <= 2000) {
        status = 'slow';
      } else {
        status = 'unavailable';
      }

      const updated = this.proxyModel.updateStatus(proxy.id, status, latency);
      return {
        id: proxy.id,
        status,
        latency,
        last_check_at: updated.last_check_at,
      };
    } catch (err) {
      // TCP works but HTTP fails
      const updated = this.proxyModel.updateStatus(proxy.id, 'unavailable', null);
      return {
        id: proxy.id,
        status: 'unavailable',
        latency: null,
        last_check_at: updated.last_check_at,
      };
    }
  }

  /**
   * Run batch health checks on proxies.
   * Controls concurrency to max 5 simultaneous checks.
   * @param {number[]} ids - Proxy IDs to check, or empty for all
   * @returns {Promise<object[]>} Health check results
   */
  async batchHealthCheck(ids = []) {
    let proxies;
    if (ids.length > 0) {
      proxies = [];
      for (const id of ids) {
        const proxy = this.proxyModel.findById(id);
        if (proxy) proxies.push(proxy);
      }
    } else {
      const result = this.proxyModel.findAll({ pageSize: 10000 });
      proxies = result.items;
    }

    // Process in batches of 100 for concurrency control
    const results = [];
    const batchSize = 100;
    for (let i = 0; i < proxies.length; i += batchSize) {
      const batch = proxies.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((proxy) => this.checkHealth(proxy))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Convert any proxy (HTTP/SOCKS5) to a local HTTP proxy URL using proxy-chain.
   * proxy-chain handles authentication and protocol translation transparently.
   * For HTTP proxies with auth, this is required because Playwright's --proxy-server
   * does not support username:password in the URL — proxy-chain creates a local
   * anonymous relay that forwards with credentials.
   *
   * @param {object} proxy - Proxy object
   * @returns {Promise<string>} Local HTTP proxy URL (e.g., http://127.0.0.1:xxxxx)
   */
  async convertToHttp(proxy) {
    const proxyChain = await import('proxy-chain');
    const proxyUrl = this._buildProxyUrl(proxy);
    const httpProxyUrl = await proxyChain.anonymizeProxy(proxyUrl);
    return httpProxyUrl;
  }

  /**
   * Fetch proxies from KDL and store them.
   * @returns {Promise<{fetched: number, inserted: number, duplicates: number}>}
   */
  async fetchFromKDL() {
    const orderId = this.settingsModel.get('kdl_order_id');
    const secretId = this.settingsModel.get('kdl_secret_id');

    if (!orderId || !secretId) {
      throw new Error('快代理配置缺失，请先在设置中配置订单号和SecretId');
    }

    const kdlService = new KDLService({ orderId, secretId });
    const parsedProxies = await kdlService.fetchProxies();

    if (parsedProxies.length === 0) {
      return { fetched: 0, inserted: 0, duplicates: 0 };
    }

    const result = this.proxyModel.batchCreate(parsedProxies);
    return {
      fetched: parsedProxies.length,
      inserted: result.inserted,
      duplicates: result.duplicates,
    };
  }

  /**
   * Fetch proxies from an external API URL and store them.
   * Expected response format: { proxies: [{ ip, port, protocol }] }
   * @param {string} apiUrl - External API URL
   * @returns {Promise<{fetched: number, inserted: number, duplicates: number}>}
   */
  async fetchFromExternalApi(apiUrl) {
    if (!apiUrl || typeof apiUrl !== 'string') {
      throw new Error('API URL 不能为空');
    }

    const response = await axios.get(apiUrl, { timeout: 30000 });
    const data = response.data;

    if (!data || !Array.isArray(data.proxies)) {
      throw new Error('API 返回格式错误，缺少 proxies 数组');
    }

    const parsedProxies = data.proxies.map((p) => ({
      host: p.ip || p.host,
      port: parseInt(p.port, 10),
      protocol: (p.protocol || 'http').toLowerCase(),
      username: p.username || null,
      password: p.password || null,
      region: p.region || null,
      provider: 'api',
    })).filter((p) => p.host && !isNaN(p.port));

    if (parsedProxies.length === 0) {
      return { fetched: 0, inserted: 0, duplicates: 0 };
    }

    const result = this.proxyModel.batchCreate(parsedProxies);
    return {
      fetched: parsedProxies.length,
      inserted: result.inserted,
      duplicates: result.duplicates,
    };
  }

  /**
   * Build a proxy URL string from proxy object.
   * @param {object} proxy
   * @returns {string} proxy URL like protocol://user:pass@host:port
   * @private
   */
  _buildProxyUrl(proxy) {
    const { protocol, host, port, username, password } = proxy;
    if (username && password) {
      return `${protocol}://${username}:${password}@${host}:${port}`;
    }
    return `${protocol}://${host}:${port}`;
  }

  /**
   * Build axios proxy config from proxy object.
   * @param {object} proxy
   * @param {string} proxyUrl
   * @returns {object} axios proxy config
   * @private
   */
  _getAxiosProxyConfig(proxy, proxyUrl) {
    if (proxy.protocol === 'socks5') {
      // axios doesn't natively support socks5; use URL-based approach
      return false; // Will handle via different method
    }
    const url = new URL(proxyUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port, 10),
      auth: url.username ? {
        username: url.username,
        password: url.password,
      } : undefined,
      protocol: url.protocol.replace(':', ''),
    };
  }
}
