import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import type { Video, VideoFormData, VideoMetaResult } from '../../types';
import { useVideoStore } from '../../stores/videoStore';

interface VideoFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: VideoFormData) => Promise<void>;
  editVideo?: Video | null;
}

/**
 * VideoFormDialog - Dialog for adding or editing a video.
 * Add mode: input URL -> fetch meta -> confirm
 * Edit mode: edit title only, URL is read-only
 */
export default function VideoFormDialog({ open, onClose, onSave, editVideo }: VideoFormDialogProps) {
  const [url, setUrl] = useState(editVideo?.url || '');
  const [title, setTitle] = useState(editVideo?.title || '');
  const [duration, setDuration] = useState<number | null>(editVideo?.duration || null);
  const [site, setSite] = useState<string | null>(editVideo?.site || null);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fetchMeta = useVideoStore((s) => s.fetchMeta);

  const isEditMode = !!editVideo;

  const handleFetchMeta = async () => {
    if (!url.trim()) return;
    setFetchingMeta(true);
    setFetchError(null);
    try {
      const meta: VideoMetaResult = await fetchMeta(url.trim());
      if (meta.title) setTitle(meta.title);
      if (meta.duration != null) setDuration(meta.duration);
      if (meta.site) setSite(meta.site);
    } catch (err) {
      setFetchError((err as Error).message || '获取视频信息失败，可手动输入标题');
    } finally {
      setFetchingMeta(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      await onSave({
        url: url.trim(),
        title: title.trim() || undefined,
        duration: duration || undefined,
        site: site || undefined,
      });
      handleClose();
    } catch (err) {
      // error handled by store
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!isEditMode) {
      setUrl('');
      setTitle('');
      setDuration(null);
      setSite(null);
      setFetchError(null);
    }
    onClose();
  };

  const formatDuration = (seconds: number | null): string => {
    if (seconds == null) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditMode ? '编辑视频' : '添加视频'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* URL input */}
          <TextField
            label="视频 URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            fullWidth
            required
            disabled={isEditMode}
            placeholder="https://upbolt.to/xxxxxx"
            size="small"
          />

          {/* Fetch meta button (add mode only) */}
          {!isEditMode && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={fetchingMeta ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
                onClick={handleFetchMeta}
                disabled={!url.trim() || fetchingMeta}
              >
                {fetchingMeta ? '获取中...' : '获取信息'}
              </Button>
              {site && (
                <Typography variant="caption" color="text.secondary">
                  站点: {site}
                </Typography>
              )}
            </Box>
          )}

          {fetchError && (
            <Alert severity="warning" onClose={() => setFetchError(null)}>
              {fetchError}
            </Alert>
          )}

          {/* Title */}
          <TextField
            label="视频标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            placeholder="输入或自动获取"
            size="small"
          />

          {/* Duration (read-only) */}
          <TextField
            label="时长"
            value={formatDuration(duration)}
            fullWidth
            disabled
            size="small"
            helperText="自动获取"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!url.trim() || saving}
        >
          {saving ? '保存中...' : isEditMode ? '保存' : '添加'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
