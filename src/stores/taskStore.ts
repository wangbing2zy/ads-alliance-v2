import { create } from 'zustand';
import type { Task, TaskFormData, ExecutionLog } from '../types';
import * as taskApi from '../api/taskApi';

interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  taskLogs: ExecutionLog[];
  logsTotal: number;
  logsPage: number;
  loading: boolean;
  error: string | null;

  loadTasks: () => Promise<void>;
  loadTaskById: (id: number) => Promise<void>;
  createTask: (data: TaskFormData) => Promise<Task>;
  updateTask: (id: number, data: TaskFormData) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  startTask: (id: number) => Promise<void>;
  stopTask: (id: number) => Promise<void>;
  pauseTask: (id: number) => Promise<void>;
  loadTaskLogs: (taskId: number, params?: { page?: number; pageSize?: number; action?: string }) => Promise<void>;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  currentTask: null,
  taskLogs: [],
  logsTotal: 0,
  logsPage: 1,
  loading: false,
  error: null,

  loadTasks: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await taskApi.fetchTasks();
      set({ tasks, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  loadTaskById: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const task = await taskApi.fetchTaskById(id);
      set({ currentTask: task, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  createTask: async (data: TaskFormData) => {
    set({ loading: true, error: null });
    try {
      const task = await taskApi.createTask(data);
      await get().loadTasks();
      set({ loading: false });
      return task;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  updateTask: async (id: number, data: TaskFormData) => {
    set({ loading: true, error: null });
    try {
      const task = await taskApi.updateTask(id, data);
      await get().loadTasks();
      set({ loading: false });
      return task;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  deleteTask: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await taskApi.deleteTask(id);
      await get().loadTasks();
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  startTask: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await taskApi.startTask(id);
      await get().loadTasks();
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  stopTask: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await taskApi.stopTask(id);
      await get().loadTasks();
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  pauseTask: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await taskApi.pauseTask(id);
      await get().loadTasks();
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  loadTaskLogs: async (taskId: number, params = {}) => {
    set({ loading: true, error: null });
    try {
      const result = await taskApi.fetchTaskLogs(taskId, params);
      set({
        taskLogs: result.items,
        logsTotal: result.total,
        logsPage: result.page,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  clearError: () => set({ error: null }),
}));
