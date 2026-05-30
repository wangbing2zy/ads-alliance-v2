import { create } from 'zustand';
import type { Video, VideoFilterParams, VideoFormData, VideoMetaResult } from '../types';
import * as videoApi from '../api/videoApi';

interface VideoState {
  videos: Video[];
  total: number;
  page: number;
  pageSize: number;
  filters: VideoFilterParams;
  loading: boolean;
  error: string | null;
  metaLoading: boolean;

  loadVideos: (filters?: VideoFilterParams) => Promise<void>;
  createVideo: (data: VideoFormData) => Promise<Video>;
  updateVideo: (id: number, data: Partial<VideoFormData>) => Promise<Video>;
  deleteVideo: (id: number) => Promise<void>;
  fetchMeta: (url: string) => Promise<VideoMetaResult>;
  setFilters: (filters: Partial<VideoFilterParams>) => void;
  clearError: () => void;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  total: 0,
  page: 1,
  pageSize: 20,
  filters: {},
  loading: false,
  error: null,
  metaLoading: false,

  loadVideos: async (filters?: VideoFilterParams) => {
    set({ loading: true, error: null });
    try {
      const params = filters || get().filters;
      const result = await videoApi.fetchVideos(params);
      set({
        videos: result.items,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  createVideo: async (data: VideoFormData) => {
    set({ loading: true, error: null });
    try {
      const video = await videoApi.createVideo(data);
      await get().loadVideos();
      set({ loading: false });
      return video;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  updateVideo: async (id: number, data: Partial<VideoFormData>) => {
    set({ loading: true, error: null });
    try {
      const video = await videoApi.updateVideo(id, data);
      await get().loadVideos();
      set({ loading: false });
      return video;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  deleteVideo: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await videoApi.deleteVideo(id);
      await get().loadVideos();
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  fetchMeta: async (url: string) => {
    set({ metaLoading: true, error: null });
    try {
      const meta = await videoApi.fetchVideoMeta(url);
      set({ metaLoading: false });
      return meta;
    } catch (err) {
      set({ metaLoading: false, error: (err as Error).message });
      throw err;
    }
  },

  setFilters: (filters: Partial<VideoFilterParams>) => {
    const newFilters = { ...get().filters, ...filters };
    set({ filters: newFilters });
    get().loadVideos(newFilters);
  },

  clearError: () => set({ error: null }),
}));
