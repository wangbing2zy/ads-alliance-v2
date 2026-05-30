/** Proxy interface - represents a proxy server entry */
export interface Proxy {
  id: number;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks5';
  username: string | null;
  password: string | null;
  region: string | null;
  status: 'unchecked' | 'available' | 'slow' | 'unavailable';
  latency: number | null;
  provider: 'manual' | 'kdl';
  last_check_at: string | null;
  country: string | null;
  city: string | null;
  actual_ip: string | null;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

/** Task interface - represents an ad interaction task */
export interface Task {
  id: number;
  name: string;
  video_urls: string[];
  ad_rule_json: AdRule | null;
  proxy_ids: number[];
  rotate_mode: 'sequential' | 'random';
  concurrency: number;
  interval_min_sec: number;
  interval_max_sec: number;
  status: 'stopped' | 'running' | 'paused';
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

/** AdRule interface - ad interaction configuration */
export interface AdRule {
  playButtonSelector: string;
  adWaitMinSec: number;
  adWaitMaxSec: number;
  adCloseMode: 'auto' | 'selector';
  adCloseSelector: string;
  videoCompleteSelector: string;
  pageLoadTimeout: number;
}

/** ExecutionLog interface - task execution record */
export interface ExecutionLog {
  id: number;
  task_id: number;
  proxy_id: number | null;
  video_url: string;
  action: 'load_page' | 'click_play' | 'ad_show' | 'ad_close' | 'play_complete' | 'error';
  result: 'success' | 'fail' | 'timeout';
  duration_ms: number | null;
  error_message: string | null;
  proxy_ip: string | null;
  created_at: string;
}

/** Earnings interface - revenue record */
export interface Earnings {
  id: number;
  task_id: number | null;
  proxy_id: number | null;
  date: string;
  play_count: number;
  complete_count: number;
  earnings_amount: number;
  currency: string;
  note: string | null;
  user_id: number | null;
  created_at: string;
}

/** Settings interface - system configuration key-value pair */
export interface Settings {
  id: number;
  key: string;
  value: string;
  updated_at: string;
}

/** Health check result for a proxy */
export interface HealthResult {
  id: number;
  status: 'available' | 'slow' | 'unavailable';
  latency: number | null;
  last_check_at: string;
}

/** Video play result */
export interface PlayResult {
  success: boolean;
  duration: number;
  error?: string;
}

/** Ad interaction result */
export interface AdResult {
  adShown: boolean;
  adClosed: boolean;
  duration: number;
}

/** Task runtime info from engine */
export interface TaskRuntimeInfo {
  taskId: number;
  status: 'running' | 'paused';
  currentProxyId: number | null;
  currentProxyIp: string | null;
  currentProxyGeo: { country: string | null; city: string | null } | null;
  playCount: number;
  errorCount: number;
  startTime: string;
}

/** Dashboard statistics */
export interface DashboardStats {
  todayPlays: number;
  completeRate: number;
  availableProxies: number;
  runningTasks: number;
  totalEarnings: number;
}

/** Play trend data point */
export interface PlayTrendData {
  date: string;
  plays: number;
  completes: number;
}

/** Pagination params */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** API response wrapper */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/** Proxy filter params */
export interface ProxyFilterParams extends PaginationParams {
  protocol?: string;
  status?: string;
  region?: string;
}

/** Proxy form data for create/update */
export interface ProxyFormData {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks5';
  username?: string;
  password?: string;
  region?: string;
}

/** Task form data for create/update */
export interface TaskFormData {
  name: string;
  video_urls: string[];
  ad_rule_json: AdRule | null;
  proxy_ids: number[];
  rotate_mode: 'sequential' | 'random';
  concurrency: number;
  interval_min_sec: number;
  interval_max_sec: number;
}

/** Earnings filter params */
export interface EarningsFilterParams {
  task_id?: number;
  start_date?: string;
  end_date?: string;
}

/** Earnings form data */
export interface EarningsFormData {
  task_id?: number;
  proxy_id?: number;
  date: string;
  play_count: number;
  complete_count: number;
  earnings_amount: number;
  currency?: string;
  note?: string;
}

/** Earnings summary */
export interface EarningsSummary {
  totalEarnings: number;
  totalPlays: number;
  totalCompletes: number;
  avgDaily: number;
}

/** Daily earnings summary */
export interface DailyEarningsSummary {
  date: string;
  total_earnings: number;
  total_plays: number;
  total_completes: number;
}

/** KDL fetch result */
export interface KDLFetchResult {
  fetched: number;
  inserted: number;
  duplicates: number;
}

/** Proxy count by status */
export interface ProxyCountByStatus {
  unchecked: number;
  available: number;
  slow: number;
  unavailable: number;
}

/** All settings as key-value map */
export type SettingsMap = Record<string, string>;

/** Settings form data */
export interface SettingsFormData {
  kdl_order_id?: string;
  kdl_secret_id?: string;
  headless?: string;
  max_global_concurrent?: string;
}

// ==================== V2 New Types ====================

/** User interface */
export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user' | 'guest';
  created_at: string;
  updated_at: string;
}

/** Video interface */
export interface Video {
  id: number;
  user_id: number;
  url: string;
  title: string | null;
  duration: number | null;
  site: string | null;
  status: 'active' | 'invalid';
  created_at: string;
  updated_at: string;
}

/** Login form data */
export interface LoginFormData {
  username: string;
  password: string;
}

/** Login response data */
export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

/** Video filter params */
export interface VideoFilterParams extends PaginationParams {
  site?: string;
  status?: string;
  search?: string;
}

/** Video form data */
export interface VideoFormData {
  url: string;
  title?: string;
  duration?: number;
  site?: string;
}

/** Video metadata fetch result */
export interface VideoMetaResult {
  url: string;
  title: string | null;
  duration: number | null;
  site: string | null;
}

/** Batch parse result */
export interface BatchParseResult {
  parsed: Array<{
    host: string;
    port: number;
    protocol: string;
    username: string | null;
    password: string | null;
  }>;
  errors: Array<{
    line: number;
    raw: string;
    reason: string;
  }>;
}

/** Verify IP result */
export interface VerifyIpResult {
  id: number;
  actual_ip: string | null;
  verified_at: string;
}

/** Batch verify IP result item */
export interface BatchVerifyIpResultItem {
  id: number;
  actual_ip: string | null;
  status: 'success' | 'failed';
  error?: string;
}

/** Geo refresh result */
export interface GeoRefreshResult {
  id: number;
  country: string | null;
  city: string | null;
  ip: string;
}

/** User form data for create/edit */
export interface UserFormData {
  username: string;
  password?: string;
  role: 'admin' | 'user';
}
