import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Grid } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TaskCard from '../components/task/TaskCard';
import { useTaskStore } from '../stores/taskStore';
import { TASK_POLL_INTERVAL } from '../utils/constants';

/**
 * TaskPage - Task list page with cards showing task overview and controls.
 * Running tasks poll every 5 seconds for status updates.
 */
export default function TaskPage() {
  const { tasks, loadTasks, startTask, stopTask, pauseTask, deleteTask } = useTaskStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Poll for status updates if any tasks are running
  useEffect(() => {
    const hasRunning = tasks.some((t) => t.status === 'running' || t.status === 'paused');
    if (!hasRunning) return;

    const interval = setInterval(() => {
      loadTasks();
    }, TASK_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [tasks, loadTasks]);

  const handleStart = async (id: number) => {
    try {
      await startTask(id);
    } catch (err) {
      alert(`启动失败：${(err as Error).message}`);
    }
  };

  const handleStop = async (id: number) => {
    if (confirm('确定停止该任务？')) {
      try {
        await stopTask(id);
      } catch (err) {
        alert(`停止失败：${(err as Error).message}`);
      }
    }
  };

  const handlePause = async (id: number) => {
    try {
      await pauseTask(id);
    } catch (err) {
      alert(`暂停失败：${(err as Error).message}`);
    }
  };

  const handleEdit = (id: number) => {
    navigate(`/tasks/${id}/edit`);
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定删除该任务？')) {
      await deleteTask(id);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          任务管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/tasks/new')}
        >
          创建任务
        </Button>
      </Box>

      {tasks.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            暂无任务，点击上方按钮创建
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {tasks.map((task) => (
            <Grid item xs={12} sm={6} md={4} key={task.id}>
              <TaskCard
                task={task}
                onStart={handleStart}
                onStop={handleStop}
                onPause={handlePause}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
