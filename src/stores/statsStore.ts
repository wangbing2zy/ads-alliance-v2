import { create } from 'zustand';
import type { DashboardStats, PlayTrendData } from '../types';
import * as statsApi from '../api/statsApi';

interface StatsState {
  dashboard: DashboardStats | null;
  playTrend: PlayTrendData[];
  loading: boolean;
  error: string | null;

  loadDashboard: () => Promise<void>;
  loadPlayTrend: (days?: number, granularity?: string) => Promise<void>;
  clearError: () => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  dashboard: null,
  playTrend: [],
  loading: false,
  error: null,

  loadDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const dashboard = await statsApi.fetchDashboardStats();
      set({ dashboard, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  loadPlayTrend: async (days: number = 7, granularity: string = 'day') => {
    set({ loading: true, error: null });
    try {
      const playTrend = await statsApi.fetchPlayTrend(days, granularity);
      set({ playTrend, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  clearError: () => set({ error: null }),
}));
