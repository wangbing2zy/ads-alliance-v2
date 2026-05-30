import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  InputAdornment,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import SearchIcon from '@mui/icons-material/Search';
import { useVideoStore } from '../stores/videoStore';
import type { Video, VideoFormData } from '../types';

/** Format duration in seconds to mm:ss or h:mm:ss */
function formatVideoDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Get country flag emoji from country code */
function getCountryFlag(countryCode: string | null): string {
  if (!countryCode) return '';
  const codePoints = countryCode.toUpperCase().split('').map(
    (char) => 0x1f1e6 + char.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
}

/**
 * VideoPage - Video management page with CRUD and metadata fetching.
 */
export default function VideoPage() {
  const {
    videos, total, page, pageSize, filters, loading,
    loadVideos, createVideo, updateVideo, deleteVideo, fetchMeta, setFilters,
  } = useVideoStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [formUrl, setFormUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDuration, setFormDuration] = useState<number | null>(null);
  const [formSite, setFormSite] = useState<string | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleOpenCreate = () => {
    setEditVideo(null);
    setFormUrl('');
    setFormTitle('');
    setFormDuration(null);
    setFormSite(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (video: Video) => {
    setEditVideo(video);
    setFormUrl(video.url);
    setFormTitle(video.title || '');
    setFormDuration(video.duration);
    setFormSite(video.site);
    setDialogOpen(true);
  };

  const handleFetchMeta = async () => {
    if (!formUrl) return;
    setMetaLoading(true);
    try {
      const meta = await fetchMeta(formUrl);
      if (meta.title) setFormTitle(meta.title);
      if (meta.duration) setFormDuration(meta.duration);
      if (meta.site) setFormSite(meta.site);
      showSnackbar('元数据获取成功', 'success');
    } catch (err) {
      showSnackbar('元数据获取失败: ' + (err as Error).message, 'error');
    }
    setMetaLoading(false);
  };

  const handleSave = async () => {
    try {
      const data: VideoFormData = {
        url: formUrl,
        title: formTitle || undefined,
        duration: formDuration || undefined,
        site: formSite || undefined,
      };

      if (editVideo) {
        await updateVideo(editVideo.id, data);
        showSnackbar('视频更新成功', 'success');
      } else {
        await createVideo(data);
        showSnackbar('视频添加成功', 'success');
      }
      setDialogOpen(false);
    } catch (err) {
      showSnackbar((err as Error).message, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除该视频吗？')) return;
    try {
      await deleteVideo(id);
      showSnackbar('视频已删除', 'success');
    } catch (err) {
      showSnackbar((err as Error).message, 'error');
    }
  };

  const handlePreview = (video: Video) => {
    setPreviewVideo(video);
    setPreviewOpen(true);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          视频管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={() => loadVideos()} disabled={loading}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            添加视频
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            select
            size="small"
            label="站点"
            value={filters.site || ''}
            onChange={(e) => setFilters({ site: e.target.value || undefined })}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="upbolt.to">upbolt.to</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="状态"
            value={filters.status || ''}
            onChange={(e) => setFilters({ status: e.target.value || undefined })}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="active">有效</MenuItem>
            <MenuItem value="invalid">失效</MenuItem>
          </TextField>
          <TextField
            size="small"
            placeholder="搜索标题或URL..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />
        </Box>
      </Paper>

      {/* Video Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>视频标题</TableCell>
              <TableCell>站点</TableCell>
              <TableCell>时长</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {videos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">暂无视频数据</Typography>
                </TableCell>
              </TableRow>
            ) : (
              videos.map((video) => (
                <TableRow key={video.id} hover>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                      {video.title || '未获取标题'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 300 }}>
                      {video.url}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {video.site ? (
                      <Chip label={video.site} size="small" variant="outlined" color="primary" />
                    ) : '-'}
                  </TableCell>
                  <TableCell>{formatVideoDuration(video.duration)}</TableCell>
                  <TableCell>
                    <Chip
                      label={video.status === 'active' ? '有效' : '失效'}
                      size="small"
                      color={video.status === 'active' ? 'success' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>{new Date(video.created_at).toLocaleString('zh-CN')}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handlePreview(video)} title="预览">
                      <PlayCircleIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleOpenEdit(video)} title="编辑">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(video.id)} title="删除">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page - 1}
          onPageChange={(_, p) => setFilters({ page: p + 1 })}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => setFilters({ pageSize: parseInt(e.target.value, 10) })}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页行数"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </TableContainer>

      {/* Add/Edit Video Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editVideo ? '编辑视频' : '添加视频'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 1 }}>
            <TextField
              fullWidth
              label="视频 URL"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              size="small"
              required
              disabled={!!editVideo}
            />
            {!editVideo && (
              <Button
                variant="outlined"
                onClick={handleFetchMeta}
                disabled={!formUrl || metaLoading}
                sx={{ minWidth: 100, mt: 0 }}
              >
                {metaLoading ? '获取中...' : '获取信息'}
              </Button>
            )}
          </Box>
          <TextField
            fullWidth
            label="标题"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            margin="normal"
            size="small"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="时长（秒）"
              value={formDuration ?? ''}
              margin="normal"
              size="small"
              type="number"
              InputProps={{ readOnly: true }}
              sx={{ width: 150 }}
              helperText={formDuration ? formatVideoDuration(formDuration) : ''}
            />
            <TextField
              label="站点"
              value={formSite || ''}
              margin="normal"
              size="small"
              InputProps={{ readOnly: true }}
              sx={{ width: 150 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={!formUrl}>
            {editVideo ? '更新' : '添加'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {previewVideo?.title || '视频预览'}
          <Typography variant="body2" color="text.secondary">
            {previewVideo?.url}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {previewVideo && (
            <Box sx={{ width: '100%', height: '70vh' }}>
              <iframe
                src={previewVideo.url}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Video Preview"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
