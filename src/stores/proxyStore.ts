import { create } from 'zustand';
import type { Proxy, ProxyFilterParams, ProxyFormData, KDLFetchResult, BatchParseResult, VerifyIpResult, BatchVerifyIpResultItem, HealthResult } from '../types';
import * as proxyApi from '../api/proxyApi';

interface ProxyState {
  proxies: Proxy[];
  total: number;
  page: number;
  pageSize: number;
  filters: ProxyFilterParams;
  loading: boolean;
  error: string | null;

  loadProxies: (filters?: ProxyFilterParams) => Promise<void>;
  createProxy: (data: ProxyFormData) => Promise<void>;
  updateProxy: (id: number, data: ProxyFormData) => Promise<void>;
  deleteProxy: (id: number) => Promise<void>;
  batchImport: (proxies: ProxyFormData[]) => Promise<{ inserted: number; duplicates: number }>;
  batchDelete: (ids: number[]) => Promise<void>;
  deleteByStatus: (status: string) => Promise<number>;
  healthCheck: (ids?: number[]) => Promise<HealthResult[]>;
  fetchFromKDL: () => Promise<KDLFetchResult>;
  fetchFromExternalApi: (apiUrl: string) => Promise<KDLFetchResult>;
  batchParse: (text: string) => Promise<BatchParseResult>;
  verifyIp: (id: number) => Promise<VerifyIpResult>;
  batchVerifyIp: (ids: number[]) => Promise<BatchVerifyIpResultItem[]>;
  setFilters: (filters: Partial<ProxyFilterParams>) => void;
  clearError: () => void;
}

export const useProxyStore = create<ProxyState>((set, get) => ({
  proxies: [],
  total: 0,
  page: 1,
  pageSize: 20,
  filters: {},
  loading: false,
  error: null,

  loadProxies: async (filters?: ProxyFilterParams) => {
    set({ loading: true, error: null });
    try {
      const params = filters || get().filters;
      const result = await proxyApi.fetchProxies(params);
      set({
        proxies: result.items,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  createProxy: async (data: ProxyFormData) => {
    set({ loading: true, error: null });
    try {
      await proxyApi.createProxy(data);
      await get().loadProxies();
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  updateProxy: async (id: number, data: ProxyFormData) => {
    set({ loading: true, error: null });
    try {
      await proxyApi.updateProxy(id, data);
      await get().loadProxies();
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  deleteProxy: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await proxyApi.deleteProxy(id);
      await get().loadProxies();
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  batchImport: async (proxies: ProxyFormData[]) => {
    set({ loading: true, error: null });
    try {
      const result = await proxyApi.batchImportProxies(proxies);
      await get().loadProxies();
      set({ loading: false });
      return result;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  batchDelete: async (ids: number[]) => {
    set({ loading: true, error: null });
    try {
      await proxyApi.batchDeleteProxies(ids);
      await get().loadProxies();
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  deleteByStatus: async (status: string) => {
    set({ loading: true, error: null });
    try {
      const result = await proxyApi.deleteProxiesByStatus(status);
      await get().loadProxies();
      set({ loading: false });
      return result.deleted;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  healthCheck: async (ids?: number[]) => {
    set({ loading: true, error: null });
    try {
      const results = await proxyApi.healthCheckProxies(ids);
      await get().loadProxies();
      set({ loading: false });
      return results;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  fetchFromKDL: async () => {
    set({ loading: true, error: null });
    try {
      const result = await proxyApi.fetchFromKDL();
      await get().loadProxies();
      set({ loading: false });
      return result;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  fetchFromExternalApi: async (apiUrl: string) => {
    set({ loading: true, error: null });
    try {
      const result = await proxyApi.fetchFromExternalApi(apiUrl);
      await get().loadProxies();
      set({ loading: false });
      return result;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  batchParse: async (text: string) => {
    set({ loading: true, error: null });
    try {
      const result = await proxyApi.batchParseProxies(text);
      set({ loading: false });
      return result;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  verifyIp: async (id: number) => {
    try {
      const result = await proxyApi.verifyProxyIp(id);
      await get().loadProxies();
      return result;
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  batchVerifyIp: async (ids: number[]) => {
    try {
      const results = await proxyApi.batchVerifyProxyIps(ids);
      await get().loadProxies();
      return results;
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  setFilters: (filters: Partial<ProxyFilterParams>) => {
    const newFilters = { ...get().filters, ...filters };
    set({ filters: newFilters });
    get().loadProxies(newFilters);
  },

  clearError: () => set({ error: null }),
}));
