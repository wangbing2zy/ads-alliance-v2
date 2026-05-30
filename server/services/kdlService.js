import crypto from 'crypto';
import axios from 'axios';

/**
 * KDLService - 快代理 API 对接服务
 * Handles authentication, API calls, and proxy list parsing for KDL.
 */
export class KDLService {
  /**
   * @param {object} config - { orderId, secretId }
   */
  constructor(config = {}) {
    this.orderId = config.orderId || '';
    this.secretId = config.secretId || '';
    this.baseUrl = 'https://fps.kdlapi.com/api/getfps/';
  }

  /**
   * Generate HMAC-SHA1 signature for KDL API.
   * @param {string} orderId
   * @param {string} secretId
   * @returns {string} Hex digest signature
   */
  _generateSignature(orderId, secretId) {
    return crypto.createHmac('sha1', secretId).update(orderId).digest('hex');
  }

  /**
   * Fetch proxy list from KDL API.
   * @param {object} params - Optional additional params
   * @returns {object[]} Parsed proxy list
   */
  async fetchProxies(params = {}) {
    const signature = this._generateSignature(this.orderId, this.secretId);
    const queryParams = {
      orderid: this.orderId,
      signature: signature,
      ...params,
    };

    try {
      const response = await axios.get(this.baseUrl, {
        params: queryParams,
        timeout: 15000,
      });

      if (response.data && response.data.code === 0) {
        const rawList = response.data.data.proxy_list || [];
        return this.parseProxyList(rawList);
      }
      throw new Error(response.data?.message || 'KDL API 返回错误');
    } catch (err) {
      if (err.response) {
        throw new Error(`KDL API 请求失败: ${err.response.status}`);
      }
      throw err;
    }
  }

  /**
   * Parse KDL proxy list format: ip:port:protocol:region:username:password
   * @param {string[]} rawList - Raw proxy strings from KDL
   * @returns {object[]} Parsed proxy objects
   */
  parseProxyList(rawList) {
    const proxies = [];
    for (const raw of rawList) {
      const parts = raw.split(':');
      if (parts.length >= 6) {
        proxies.push({
          host: parts[0],
          port: parseInt(parts[1], 10),
          protocol: parts[2].toLowerCase(),
          region: parts[3],
          username: parts[4],
          password: parts[5],
          provider: 'kdl',
        });
      } else if (parts.length >= 2) {
        // Minimal format: host:port
        proxies.push({
          host: parts[0],
          port: parseInt(parts[1], 10),
          protocol: 'http',
          region: null,
          username: parts[2] || null,
          password: parts[3] || null,
          provider: 'kdl',
        });
      }
    }
    return proxies;
  }

  /**
   * Get order information from KDL.
   * @returns {object} Order info
   */
  async getOrderInfo() {
    const signature = this._generateSignature(this.orderId, this.secretId);
    try {
      const response = await axios.get('https://fps.kdlapi.com/api/getorderinfo/', {
        params: {
          orderid: this.orderId,
          signature: signature,
        },
        timeout: 10000,
      });
      return response.data;
    } catch (err) {
      throw new Error(`获取订单信息失败: ${err.message}`);
    }
  }
}
