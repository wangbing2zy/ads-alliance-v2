import apiClient from './client';
import type { ApiResponse, DashboardStats, PlayTrendData } from '../types';

/** Fetch dashboard summary statistics */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get<ApiResponse<DashboardStats>>('/stats/dashboard');
  return res.data.data;
}

/** Fetch play trend data */
export async function fetchPlayTrend(
  days: number = 7,
  granularity: string = 'day'
): Promise<PlayTrendData[]> {
  const res = await apiClient.get<ApiResponse<PlayTrendData[]>>('/stats/play-trend', {
    params: { days, granularity },
  });
  return res.data.data;
}
