/** Proxy protocol enum */
export const ProxyProtocol = {
  HTTP: 'http',
  HTTPS: 'https',
  SOCKS5: 'socks5',
} as const;

/** Proxy status enum */
export const ProxyStatus = {
  UNCHECKED: 'unchecked',
  AVAILABLE: 'available',
  SLOW: 'slow',
  UNAVAILABLE: 'unavailable',
} as const;

/** Task status enum */
export const TaskStatus = {
  STOPPED: 'stopped',
  RUNNING: 'running',
  PAUSED: 'paused',
} as const;

/** Execution log action types */
export const ActionType = {
  LOAD_PAGE: 'load_page',
  CLICK_PLAY: 'click_play',
  AD_SHOW: 'ad_show',
  AD_CLOSE: 'ad_close',
  PLAY_COMPLETE: 'play_complete',
  ERROR: 'error',
} as const;

/** Execution log result types */
export const ResultType = {
  SUCCESS: 'success',
  FAIL: 'fail',
  TIMEOUT: 'timeout',
} as const;

/** Rotate mode enum */
export const RotateMode = {
  SEQUENTIAL: 'sequential',
  RANDOM: 'random',
} as const;

/** Ad close mode enum */
export const AdCloseMode = {
  AUTO: 'auto',
  SELECTOR: 'selector',
} as const;

/** Currency enum */
export const Currency = {
  USD: 'USD',
  CNY: 'CNY',
  EUR: 'EUR',
} as const;

/** Default API base URL */
export const API_BASE_URL = '/api';

/** Dashboard auto-refresh interval (ms) */
export const DASHBOARD_REFRESH_INTERVAL = 30000;

/** Task status polling interval (ms) */
export const TASK_POLL_INTERVAL = 5000;

/** Default page size */
export const DEFAULT_PAGE_SIZE = 20;

/** Proxy latency thresholds (ms) */
export const LATENCY_THRESHOLDS = {
  AVAILABLE: 500,
  SLOW: 2000,
} as const;

/** Proxy status color mapping */
export const PROXY_STATUS_COLORS: Record<string, string> = {
  unchecked: '#9e9e9e',
  available: '#4caf50',
  slow: '#ff9800',
  unavailable: '#f44336',
};

/** Task status color mapping */
export const TASK_STATUS_COLORS: Record<string, string> = {
  stopped: '#9e9e9e',
  running: '#4caf50',
  paused: '#ff9800',
};

/** Proxy status label mapping */
export const PROXY_STATUS_LABELS: Record<string, string> = {
  unchecked: '未检测',
  available: '可用',
  slow: '较慢',
  unavailable: '不可用',
};

/** Task status label mapping */
export const TASK_STATUS_LABELS: Record<string, string> = {
  stopped: '已停止',
  running: '运行中',
  paused: '已暂停',
};
