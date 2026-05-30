import apiClient from './client';
import type { ApiResponse, LoginFormData, LoginResponse, User } from '../types';

/** Login with username and password */
export async function login(data: LoginFormData): Promise<LoginResponse> {
  const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data);
  return res.data.data;
}

/** Logout (client-side token clearing) */
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

/** Get current user info */
export async function getMe(): Promise<User | { id: null; username: '访客'; role: 'guest' }> {
  const res = await apiClient.get<ApiResponse<User | { id: null; username: '访客'; role: 'guest' }>>('/auth/me');
  return res.data.data;
}
