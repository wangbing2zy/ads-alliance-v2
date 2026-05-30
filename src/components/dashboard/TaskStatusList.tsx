import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
} from '@mui/material';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '../../utils/constants';
import type { Task } from '../../types';

interface TaskStatusListProps {
  tasks: Task[];
}

/**
 * TaskStatusList - Real-time task execution status list for the dashboard.
 */
export default function TaskStatusList({ tasks }: TaskStatusListProps) {
  const activeTasks = tasks.filter((t) => t.status !== 'stopped');

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          任务状态
        </Typography>
        {activeTasks.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">暂无运行中的任务</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {activeTasks.map((task) => (
              <ListItem
                key={task.id}
                sx={{
                  px: 0,
                  py: 1,
                  borderBottom: '1px solid #f0f0f0',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <ListItemText
                  primary={task.name}
                  secondary={`并发: ${task.concurrency} | 代理: ${task.proxy_ids.length} | 轮换: ${task.rotate_mode === 'sequential' ? '顺序' : '随机'}`}
                  primaryTypographyProps={{ fontWeight: 500, fontSize: 14 }}
                  secondaryTypographyProps={{ fontSize: 12 }}
                />
                <Chip
                  label={TASK_STATUS_LABELS[task.status] || task.status}
                  size="small"
                  sx={{
                    bgcolor: `${TASK_STATUS_COLORS[task.status]}20`,
                    color: TASK_STATUS_COLORS[task.status],
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
