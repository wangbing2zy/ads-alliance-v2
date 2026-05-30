import apiClient from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  Proxy,
  ProxyFormData,
  ProxyFilterParams,
  HealthResult,
  KDLFetchResult,
  BatchParseResult,
  VerifyIpResult,
  BatchVerifyIpResultItem,
  GeoRefreshResult,
} from '../types';

/** Fetch paginated proxy list with optional filters */
export async function fetchProxies(params: ProxyFilterParams = {}): Promise<PaginatedResponse<Proxy>> {
  const res = await apiClient.get<ApiResponse<PaginatedResponse<Proxy>>>('/proxies', { params });
  return res.data.data;
}

/** Fetch a single proxy by ID */
export async function fetchProxyById(id: number): Promise<Proxy> {
  const res = await apiClient.get<ApiResponse<Proxy>>(`/proxies/${id}`);
  return res.data.data;
}

/** Create a new proxy */
export async function createProxy(data: ProxyFormData): Promise<Proxy> {
  const res = await apiClient.post<ApiResponse<Proxy>>('/proxies', data);
  return res.data.data;
}

/** Update an existing proxy */
export async function updateProxy(id: number, data: ProxyFormData): Promise<Proxy> {
  const res = await apiClient.put<ApiResponse<Proxy>>(`/proxies/${id}`, data);
  return res.data.data;
}

/** Delete a proxy */
export async function deleteProxy(id: number): Promise<void> {
  await apiClient.delete(`/proxies/${id}`);
}

/** Batch import proxies */
export async function batchImportProxies(proxies: ProxyFormData[]): Promise<{ inserted: number; duplicates: number }> {
  const res = await apiClient.post<ApiResponse<{ inserted: number; duplicates: number }>>('/proxies/batch', { proxies });
  return res.data.data;
}

/** Run health check on specified proxies or all */
export async function healthCheckProxies(ids: number[] = []): Promise<HealthResult[]> {
  const res = await apiClient.post<ApiResponse<HealthResult[]>>('/proxies/health-check', { ids }, { timeout: 600000 });
  return res.data.data;
}

/** Fetch proxies from KDL (快代理) API */
export async function fetchFromKDL(): Promise<KDLFetchResult> {
  const res = await apiClient.get<ApiResponse<KDLFetchResult>>('/proxies/kdl/fetch');
  return res.data.data;
}

/** Fetch proxies from external API */
export async function fetchFromExternalApi(apiUrl: string): Promise<KDLFetchResult> {
  const res = await apiClient.post<ApiResponse<KDLFetchResult>>('/proxies/api-fetch', { apiUrl });
  return res.data.data;
}

/** Batch delete proxies */
export async function batchDeleteProxies(ids: number[]): Promise<void> {
  await apiClient.delete('/proxies/batch-delete', { data: { ids } });
}

/** Delete proxies by status */
export async function deleteProxiesByStatus(status: string): Promise<{ deleted: number }> {
  const res = await apiClient.delete<ApiResponse<{ deleted: number }>>(`/proxies/by-status/${status}`);
  return res.data.data;
}

/** Batch parse proxy text (preview only) */
export async function batchParseProxies(text: string): Promise<BatchParseResult> {
  const res = await apiClient.post<ApiResponse<BatchParseResult>>('/proxies/batch-parse', { text });
  return res.data.data;
}

/** Verify a single proxy's exit IP */
export async function verifyProxyIp(id: number): Promise<VerifyIpResult> {
  const res = await apiClient.post<ApiResponse<VerifyIpResult>>(`/proxies/${id}/verify-ip`);
  return res.data.data;
}

/** Batch verify proxy exit IPs */
export async function batchVerifyProxyIps(ids: number[]): Promise<BatchVerifyIpResultItem[]> {
  const res = await apiClient.post<ApiResponse<BatchVerifyIpResultItem[]>>('/proxies/batch-verify-ip', { ids });
  return res.data.data;
}

/** Refresh GeoIP for a proxy */
export async function refreshProxyGeo(id: number): Promise<GeoRefreshResult> {
  const res = await apiClient.get<ApiResponse<GeoRefreshResult>>(`/proxies/${id}/geo`);
  return res.data.data;
}
