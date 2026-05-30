import apiClient from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  Video,
  VideoFormData,
  VideoFilterParams,
  VideoMetaResult,
} from '../types';

/** Fetch paginated video list with optional filters */
export async function fetchVideos(params: VideoFilterParams = {}): Promise<PaginatedResponse<Video>> {
  const res = await apiClient.get<ApiResponse<PaginatedResponse<Video>>>('/videos', { params });
  return res.data.data;
}

/** Fetch a single video by ID */
export async function fetchVideoById(id: number): Promise<Video> {
  const res = await apiClient.get<ApiResponse<Video>>(`/videos/${id}`);
  return res.data.data;
}

/** Create a new video */
export async function createVideo(data: VideoFormData): Promise<Video> {
  const res = await apiClient.post<ApiResponse<Video>>('/videos', data);
  return res.data.data;
}

/** Update an existing video */
export async function updateVideo(id: number, data: Partial<VideoFormData>): Promise<Video> {
  const res = await apiClient.put<ApiResponse<Video>>(`/videos/${id}`, data);
  return res.data.data;
}

/** Delete a video */
export async function deleteVideo(id: number): Promise<void> {
  await apiClient.delete(`/videos/${id}`);
}

/** Fetch video metadata from URL */
export async function fetchVideoMeta(url: string): Promise<VideoMetaResult> {
  const res = await apiClient.post<ApiResponse<VideoMetaResult>>('/videos/fetch-meta', { url });
  return res.data.data;
}
