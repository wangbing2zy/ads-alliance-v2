import apiClient from './client';
import type {
  ApiResponse,
  Earnings,
  EarningsFormData,
  EarningsFilterParams,
  EarningsSummary,
  DailyEarningsSummary,
} from '../types';

/** Fetch earnings list with optional filters */
export async function fetchEarnings(params: EarningsFilterParams = {}): Promise<Earnings[]> {
  const res = await apiClient.get<ApiResponse<Earnings[]>>('/earnings', { params });
  return res.data.data;
}

/** Create an earnings record */
export async function createEarnings(data: EarningsFormData): Promise<Earnings> {
  const res = await apiClient.post<ApiResponse<Earnings>>('/earnings', data);
  return res.data.data;
}

/** Update an earnings record */
export async function updateEarnings(id: number, data: EarningsFormData): Promise<Earnings> {
  const res = await apiClient.put<ApiResponse<Earnings>>(`/earnings/${id}`, data);
  return res.data.data;
}

/** Fetch earnings summary */
export async function fetchEarningsSummary(params: EarningsFilterParams = {}): Promise<EarningsSummary> {
  const res = await apiClient.get<ApiResponse<EarningsSummary>>('/earnings/summary', { params });
  return res.data.data;
}
