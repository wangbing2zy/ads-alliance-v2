import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  LinearProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LanguageIcon from '@mui/icons-material/Language';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_POLL_INTERVAL } from '../../utils/constants';
import type { Task, TaskRuntimeInfo } from '../../types';
import apiClient from '../../api/client';

/** Get country flag emoji from country code */
function getCountryFlag(countryCode: string | null): string {
  if (!countryCode) return '';
  const codePoints = countryCode.toUpperCase().split('').map(
    (char) => 0x1f1e6 + char.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
}

interface TaskCardProps {
  task: Task;
  onStart: (id: number) => void;
  onStop: (id: number) => void;
  onPause: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

/**
 * TaskCard - Card component showing task overview with stats and action buttons.
 * Includes current proxy IP display for running tasks.
 */
export default function TaskCard({ task, onStart, onStop, onPause, onEdit, onDelete }: TaskCardProps) {
  const isRunning = task.status === 'running';
  const isPaused = task.status === 'paused';
  const [runtimeInfo, setRuntimeInfo] = useState<TaskRuntimeInfo | null>(null);

  // Poll runtime info for running tasks
  useEffect(() => {
    if (!isRunning && !isPaused) {
      setRuntimeInfo(null);
      return;
    }

    const fetchRuntime = async () => {
      try {
        const res = await apiClient.get<{ code: number; data: { runtime?: TaskRuntimeInfo } }>(`/tasks/${task.id}`);
        if (res.data?.data?.runtime) {
          setRuntimeInfo(res.data.data.runtime);
        }
      } catch { /* ignore */ }
    };

    fetchRuntime();
    const interval = setInterval(fetchRuntime, TASK_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [task.id, isRunning, isPaused]);

  return (
    <Card sx={{ position: 'relative', overflow: 'visible' }}>
      {isRunning && (
        <LinearProgress
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            borderRadius: '3px 3px 0 0',
          }}
        />
      )}
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" fontWeight={600} fontSize={16}>
            {task.name}
          </Typography>
          <Chip
            label={TASK_STATUS_LABELS[task.status]}
            size="small"
            sx={{
              bgcolor: `${TASK_STATUS_COLORS[task.status]}20`,
              color: TASK_STATUS_COLORS[task.status],
              fontWeight: 600,
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          <Chip label={`视频: ${task.video_urls.length}`} size="small" variant="outlined" />
          <Chip label={`代理: ${task.proxy_ids.length}`} size="small" variant="outlined" />
          <Chip
            label={task.rotate_mode === 'sequential' ? '顺序轮换' : '随机轮换'}
            size="small"
            variant="outlined"
          />
          <Chip label={`并发: ${task.concurrency}`} size="small" variant="outlined" />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          间隔: {task.interval_min_sec}s ~ {task.interval_max_sec}s
        </Typography>

        {/* Runtime info - show current proxy IP for running/paused tasks */}
        {(isRunning || isPaused) && runtimeInfo && (
          <Box sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            mb: 1.5,
            p: 1,
            bgcolor: '#f8f9fa',
            borderRadius: 1,
            alignItems: 'center',
          }}>
            {runtimeInfo.currentProxyIp && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LanguageIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 16 }} />
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  当前IP：{runtimeInfo.currentProxyIp}
                </Typography>
                {runtimeInfo.currentProxyGeo?.country && (
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    ({getCountryFlag(runtimeInfo.currentProxyGeo.country)} {runtimeInfo.currentProxyGeo.country})
                  </Typography>
                )}
              </Box>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              播放：{runtimeInfo.playCount}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              错误：{runtimeInfo.errorCount}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          {!isRunning && !isPaused && (
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<PlayArrowIcon />}
              onClick={() => onStart(task.id)}
            >
              启动
            </Button>
          )}
          {isRunning && (
            <Button
              size="small"
              variant="contained"
              color="warning"
              startIcon={<PauseIcon />}
              onClick={() => onPause(task.id)}
            >
              暂停
            </Button>
          )}
          {(isRunning || isPaused) && (
            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={() => onStop(task.id)}
            >
              停止
            </Button>
          )}
          {!isRunning && (
            <>
              <IconButton size="small" onClick={() => onEdit(task.id)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => onDelete(task.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
