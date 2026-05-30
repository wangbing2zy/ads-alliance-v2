import { create } from 'zustand';
import type { Earnings, EarningsFormData, EarningsFilterParams, EarningsSummary } from '../types';
import * as earningsApi from '../api/earningsApi';

interface EarningsState {
  earnings: Earnings[];
  summary: EarningsSummary | null;
  filters: EarningsFilterParams;
  loading: boolean;
  error: string | null;

  loadEarnings: (filters?: EarningsFilterParams) => Promise<void>;
  createEarnings: (data: EarningsFormData) => Promise<void>;
  updateEarnings: (id: number, data: EarningsFormData) => Promise<void>;
  loadSummary: (filters?: EarningsFilterParams) => Promise<void>;
  setFilters: (filters: Partial<EarningsFilterParams>) => void;
  clearError: () => void;
}

export const useEarningsStore = create<EarningsState>((set, get) => ({
  earnings: [],
  summary: null,
  filters: {},
  loading: false,
  error: null,

  loadEarnings: async (filters?: EarningsFilterParams) => {
    set({ loading: true, error: null });
    try {
      const params = filters || get().filters;
      const earnings = await earningsApi.fetchEarnings(params);
      set({ earnings, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  createEarnings: async (data: EarningsFormData) => {
    set({ loading: true, error: null });
    try {
      await earningsApi.createEarnings(data);
      await get().loadEarnings();
      await get().loadSummary();
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  updateEarnings: async (id: number, data: EarningsFormData) => {
    set({ loading: true, error: null });
    try {
      await earningsApi.updateEarnings(id, data);
      await get().loadEarnings();
      await get().loadSummary();
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  loadSummary: async (filters?: EarningsFilterParams) => {
    set({ loading: true, error: null });
    try {
      const params = filters || get().filters;
      const summary = await earningsApi.fetchEarningsSummary(params);
      set({ summary, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  setFilters: (filters: Partial<EarningsFilterParams>) => {
    const newFilters = { ...get().filters, ...filters };
    set({ filters: newFilters });
    get().loadEarnings(newFilters);
    get().loadSummary(newFilters);
  },

  clearError: () => set({ error: null }),
}));
