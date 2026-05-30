import { ProxyModel } from '../models/proxyModel.js';
import { ProxyService } from '../services/proxyService.js';
import { SettingsModel } from '../models/settingsModel.js';
import { geoService } from '../services/geoService.js';
import axios from 'axios';

/**
 * ProxyController - 代理管理控制器
 * Handles HTTP requests for proxy CRUD, health checks, KDL fetching, batch parse, verify IP, and GeoIP.
 */
export class ProxyController {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.proxyModel = new ProxyModel(db);
    this.settingsModel = new SettingsModel(db);
    this.proxyService = new ProxyService(db, this.settingsModel);
  }

  /** Get paginated proxy list */
  handleList = (req, res) => {
    try {
      const { protocol, status, region, page, pageSize } = req.query;
      const result = this.proxyModel.findAll({
        protocol,
        status,
        region,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      });
      res.json({ code: 0, data: result, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Get a single proxy by ID */
  handleGetById = (req, res) => {
    try {
      const proxy = this.proxyModel.findById(parseInt(req.params.id, 10));
      if (!proxy) {
        return res.status(404).json({ code: 1, data: null, message: '代理不存在' });
      }
      res.json({ code: 0, data: proxy, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Create a new proxy */
  handleCreate = (req, res) => {
    try {
      const { host, port, protocol, username, password, region } = req.body;
      if (!host || !port) {
        return res.status(400).json({ code: 1, data: null, message: 'host 和 port 为必填项' });
      }
      const proxy = this.proxyModel.create({
        host,
        port: parseInt(port, 10),
        protocol: protocol || 'http',
        username: username || null,
        password: password || null,
        region: region || null,
      });
      res.status(201).json({ code: 0, data: proxy, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Update a proxy */
  handleUpdate = (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const proxy = this.proxyModel.findById(id);
      if (!proxy) {
        return res.status(404).json({ code: 1, data: null, message: '代理不存在' });
      }
      const updated = this.proxyModel.update(id, req.body);
      res.json({ code: 0, data: updated, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Delete a proxy */
  handleDelete = (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = this.proxyModel.delete(id);
      if (!success) {
        return res.status(404).json({ code: 1, data: null, message: '代理不存在' });
      }
      res.json({ code: 0, data: null, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Batch import proxies */
  handleBatchImport = (req, res) => {
    try {
      const { proxies } = req.body;
      if (!Array.isArray(proxies) || proxies.length === 0) {
        return res.status(400).json({ code: 1, data: null, message: 'proxies 数组不能为空' });
      }
      const formattedProxies = proxies.map((p) => ({
        host: p.host,
        port: parseInt(p.port, 10),
        protocol: p.protocol || 'http',
        username: p.username || null,
        password: p.password || null,
        region: p.region || null,
        provider: 'manual',
      }));
      const result = this.proxyModel.batchCreate(formattedProxies);
      res.json({ code: 0, data: result, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Batch health check */
  handleHealthCheck = async (req, res) => {
    try {
      const { ids } = req.body;
      const results = await this.proxyService.batchHealthCheck(ids || []);
      res.json({ code: 0, data: results, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Fetch proxies from KDL */
  handleKDLFetch = async (req, res) => {
    try {
      const result = await this.proxyService.fetchFromKDL();
      res.json({ code: 0, data: result, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Fetch proxies from external API */
  handleApiFetch = async (req, res) => {
    try {
      const { apiUrl } = req.body;
      if (!apiUrl) {
        return res.status(400).json({ code: 1, data: null, message: 'apiUrl 不能为空' });
      }
      const result = await this.proxyService.fetchFromExternalApi(apiUrl);
      res.json({ code: 0, data: result, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Batch delete proxies */
  handleBatchDelete = (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ code: 1, data: null, message: 'ids 数组不能为空' });
      }
      const deleted = this.proxyModel.deleteByIds(ids);
      res.json({ code: 0, data: { deleted }, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Delete proxies by status (e.g. delete all unavailable proxies) */
  handleDeleteByStatus = (req, res) => {
    try {
      const { status } = req.params;
      if (!status) {
        return res.status(400).json({ code: 1, data: null, message: 'status 参数不能为空' });
      }
      const deleted = this.proxyModel.deleteByStatus(status);
      res.json({ code: 0, data: { deleted }, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Batch parse proxy text (preview only, does not write to DB) */
  handleBatchParse = (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ code: 1, data: null, message: 'text 字段不能为空' });
      }

      const lines = text.trim().split('\n').filter((l) => l.trim());
      const parsed = [];
      const errors = [];

      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;

        // Format: protocol://ip:port:user:pass
        const protocolFullMatch = trimmed.match(/^(https?|socks5):\/\/([^:]+):(\d+):([^:]+):(.+)$/i);
        if (protocolFullMatch) {
          parsed.push({
            host: protocolFullMatch[2],
            port: parseInt(protocolFullMatch[3], 10),
            protocol: protocolFullMatch[1].toLowerCase(),
            username: protocolFullMatch[4],
            password: protocolFullMatch[5],
          });
          continue;
        }

        // Format: ip:port:user:pass
        const fourPartMatch = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+):([^:]+):(.+)$/);
        if (fourPartMatch) {
          parsed.push({
            host: fourPartMatch[1],
            port: parseInt(fourPartMatch[2], 10),
            protocol: 'http',
            username: fourPartMatch[3],
            password: fourPartMatch[4],
          });
          continue;
        }

        // Format: ip:port
        const simpleMatch = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)$/);
        if (simpleMatch) {
          parsed.push({
            host: simpleMatch[1],
            port: parseInt(simpleMatch[2], 10),
            protocol: 'http',
            username: null,
            password: null,
          });
          continue;
        }

        // Could not parse
        errors.push({ line: i + 1, raw: trimmed, reason: '无法解析格式' });
      }

      res.json({ code: 0, data: { parsed, errors }, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Verify a single proxy's actual exit IP */
  handleVerifyIp = async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const proxy = this.proxyModel.findById(id);
      if (!proxy) {
        return res.status(404).json({ code: 1, data: null, message: '代理不存在' });
      }

      const actualIp = await this._verifyProxyIp(proxy);
      if (actualIp) {
        this.proxyModel.updateActualIp(id, actualIp);
      }

      res.json({
        code: 0,
        data: {
          id,
          actual_ip: actualIp,
          verified_at: new Date().toISOString(),
        },
        message: 'ok',
      });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Batch verify proxy exit IPs */
  handleBatchVerifyIp = async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ code: 1, data: null, message: 'ids 数组不能为空' });
      }

      const results = [];
      // Process in batches of 5 for concurrency control
      const batchSize = 5;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (id) => {
            try {
              const proxy = this.proxyModel.findById(id);
              if (!proxy) {
                return { id, actual_ip: null, status: 'failed', error: '代理不存在' };
              }
              const actualIp = await this._verifyProxyIp(proxy);
              if (actualIp) {
                this.proxyModel.updateActualIp(id, actualIp);
                return { id, actual_ip: actualIp, status: 'success' };
              }
              return { id, actual_ip: null, status: 'failed', error: '无法获取出口IP' };
            } catch (err) {
              return { id, actual_ip: null, status: 'failed', error: err.message };
            }
          })
        );
        results.push(...batchResults);
      }

      res.json({ code: 0, data: results, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Refresh GeoIP for a specific proxy */
  handleGeoRefresh = async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const proxy = this.proxyModel.findById(id);
      if (!proxy) {
        return res.status(404).json({ code: 1, data: null, message: '代理不存在' });
      }

      const geo = await geoService.lookup(proxy.host);
      if (geo.country || geo.city) {
        this.proxyModel.updateGeo(id, geo.country, geo.city);
      }

      res.json({
        code: 0,
        data: {
          id,
          country: geo.country,
          city: geo.city,
          ip: proxy.host,
        },
        message: 'ok',
      });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /**
   * Verify proxy exit IP by making a request through the proxy.
   * @param {object} proxy
   * @returns {Promise<string|null>} The actual exit IP, or null if failed
   * @private
   */
  async _verifyProxyIp(proxy) {
    try {
      const proxyUrl = this.proxyService._buildProxyUrl(proxy);
      const response = await axios.get('http://httpbin.org/ip', {
        proxy: this.proxyService._getAxiosProxyConfig(proxy, proxyUrl),
        timeout: 10000,
      });
      return response.data?.origin || null;
    } catch (err) {
      console.error(`[ProxyController] Verify IP failed for proxy ${proxy.id}:`, err.message);
      return null;
    }
  }
}
