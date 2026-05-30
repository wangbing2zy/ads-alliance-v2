import apiClient from './client';
import type { ApiResponse, User, UserFormData } from '../types';

/** Fetch all users (admin only) */
export async function fetchUsers(): Promise<User[]> {
  const res = await apiClient.get<ApiResponse<User[]>>('/users');
  return res.data.data;
}

/** Create a new user (admin only) */
export async function createUser(data: UserFormData): Promise<User> {
  const res = await apiClient.post<ApiResponse<User>>('/users', data);
  return res.data.data;
}

/** Update an existing user (admin only) */
export async function updateUser(id: number, data: Partial<UserFormData>): Promise<User> {
  const res = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data);
  return res.data.data;
}

/** Delete a user (admin only) */
export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
