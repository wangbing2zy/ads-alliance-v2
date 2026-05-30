import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import StatsCards from '../components/dashboard/StatsCards';
import PlayTrendChart from '../components/dashboard/PlayTrendChart';
import TaskStatusList from '../components/dashboard/TaskStatusList';
import { useStatsStore } from '../stores/statsStore';
import { useTaskStore } from '../stores/taskStore';
import { DASHBOARD_REFRESH_INTERVAL } from '../utils/constants';

/**
 * DashboardPage - Main dashboard with stats, trends, and task status.
 */
export default function DashboardPage() {
  const { dashboard, playTrend, loadDashboard, loadPlayTrend } = useStatsStore();
  const { tasks, loadTasks } = useTaskStore();

  useEffect(() => {
    loadDashboard();
    loadPlayTrend(7);
    loadTasks();

    const interval = setInterval(() => {
      loadDashboard();
      loadPlayTrend(7);
      loadTasks();
    }, DASHBOARD_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [loadDashboard, loadPlayTrend, loadTasks]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        仪表盘
      </Typography>

      <Box sx={{ mb: 3 }}>
        <StatsCards
          todayPlays={dashboard?.todayPlays || 0}
          completeRate={dashboard?.completeRate || 0}
          availableProxies={dashboard?.availableProxies || 0}
          runningTasks={dashboard?.runningTasks || 0}
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <PlayTrendChart data={playTrend} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TaskStatusList tasks={tasks} />
        </Grid>
      </Grid>
    </Box>
  );
}
