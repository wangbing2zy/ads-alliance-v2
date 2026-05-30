import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Box,
  Checkbox,
  TablePagination,
  Typography,
} from '@mui/material';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SiteAdapterBadge from './SiteAdapterBadge';
import type { Video } from '../../types';

interface VideoTableProps {
  videos: Video[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEdit: (video: Video) => void;
  onDelete: (video: Video) => void;
  onPreview: (video: Video) => void;
  selectedIds: number[];
  onSelectChange: (ids: number[]) => void;
}

/**
 * Format seconds to mm:ss or h:mm:ss
 */
function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * VideoTable - Displays video list with selection, preview, edit, and delete.
 */
export default function VideoTable({
  videos,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onPreview,
  selectedIds,
  onSelectChange,
}: VideoTableProps) {
  const allSelected = videos.length > 0 && videos.every((v) => selectedIds.includes(v.id));
  const someSelected = videos.some((v) => selectedIds.includes(v.id)) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectChange([]);
    } else {
      onSelectChange(videos.map((v) => v.id));
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectChange([...selectedIds, id]);
    }
  };

  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={someSelected}
                  checked={allSelected}
                  onChange={handleSelectAll}
                  size="small"
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>标题</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 120 }}>站点</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 80 }}>时长</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 80 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 140 }} align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {videos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    暂无视频，点击"添加视频"开始
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              videos.map((video) => (
                <TableRow key={video.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(video.id)}
                      onChange={() => handleSelectOne(video.id)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                      {video.title || video.url}
                    </Typography>
                    {video.title && (
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 300 }}>
                        {video.url}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <SiteAdapterBadge site={video.site} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDuration(video.duration)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={video.status === 'active' ? '正常' : '失效'}
                      size="small"
                      color={video.status === 'active' ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ fontSize: 12 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      <Tooltip title="预览">
                        <IconButton size="small" color="primary" onClick={() => onPreview(video)}>
                          <PlayCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="编辑">
                        <IconButton size="small" onClick={() => onEdit(video)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton size="small" color="error" onClick={() => onDelete(video)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page - 1}
        onPageChange={(_, p) => onPageChange(p + 1)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="每页"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count} 条`}
      />
    </Paper>
  );
}
