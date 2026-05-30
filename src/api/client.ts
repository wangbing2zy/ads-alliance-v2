import axios from 'axios';
import type { ApiResponse } from '../types';

const TOKEN_KEY = 'ads_token';

/**
 * Axios instance with base configuration and interceptors.
 * All API calls go through this instance.
 */
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: inject token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: unwrap ApiResponse and handle errors
apiClient.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse<unknown>;
    if (data && data.code !== undefined && data.code !== 0) {
      const error = new Error(data.message || '请求失败');
      (error as any).code = data.code;
      return Promise.reject(error);
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as ApiResponse<unknown>;

      // Handle 401 - clear token and redirect to login
      if (status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      const message = data?.message || `服务器错误 (${status})`;
      const err = new Error(message);
      (err as any).code = data?.code || 3;
      return Promise.reject(err);
    }
    if (error.request) {
      return Promise.reject(new Error('网络错误，请检查连接'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { TOKEN_KEY };
