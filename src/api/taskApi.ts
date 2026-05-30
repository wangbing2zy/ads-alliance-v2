import apiClient from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  Task,
  TaskFormData,
  ExecutionLog,
} from '../types';

/** Fetch all tasks */
export async function fetchTasks(): Promise<Task[]> {
  const res = await apiClient.get<ApiResponse<Task[]>>('/tasks');
  return res.data.data;
}

/** Fetch a single task by ID with recent logs */
export async function fetchTaskById(id: number): Promise<Task> {
  const res = await apiClient.get<ApiResponse<Task>>(`/tasks/${id}`);
  return res.data.data;
}

/** Create a new task */
export async function createTask(data: TaskFormData): Promise<Task> {
  const res = await apiClient.post<ApiResponse<Task>>('/tasks', data);
  return res.data.data;
}

/** Update an existing task */
export async function updateTask(id: number, data: TaskFormData): Promise<Task> {
  const res = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, data);
  return res.data.data;
}

/** Delete a task */
export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/tasks/${id}`);
}

/** Start a task */
export async function startTask(id: number): Promise<{ status: string }> {
  const res = await apiClient.post<ApiResponse<{ status: string }>>(`/tasks/${id}/start`);
  return res.data.data;
}

/** Stop a task */
export async function stopTask(id: number): Promise<{ status: string }> {
  const res = await apiClient.post<ApiResponse<{ status: string }>>(`/tasks/${id}/stop`);
  return res.data.data;
}

/** Pause a task */
export async function pauseTask(id: number): Promise<{ status: string }> {
  const res = await apiClient.post<ApiResponse<{ status: string }>>(`/tasks/${id}/pause`);
  return res.data.data;
}

/** Fetch execution logs for a task */
export async function fetchTaskLogs(
  taskId: number,
  params: { page?: number; pageSize?: number; action?: string } = {}
): Promise<PaginatedResponse<ExecutionLog>> {
  const res = await apiClient.get<ApiResponse<PaginatedResponse<ExecutionLog>>>(`/tasks/${taskId}/logs`, { params });
  return res.data.data;
}
