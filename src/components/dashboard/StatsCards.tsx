import React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LanguageIcon from '@mui/icons-material/Language';
import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote';
import { formatNumber, formatPercent } from '../../utils/format';

interface StatsCardsProps {
  todayPlays: number;
  completeRate: number;
  availableProxies: number;
  runningTasks: number;
}

const cards = [
  { key: 'todayPlays', label: '今日播放', icon: <PlayArrowIcon />, color: '#1976d2' },
  { key: 'completeRate', label: '完成率', icon: <CheckCircleIcon />, color: '#2e7d32' },
  { key: 'availableProxies', label: '可用代理', icon: <LanguageIcon />, color: '#ed6c02' },
  { key: 'runningTasks', label: '运行任务', icon: <SettingsRemoteIcon />, color: '#9c27b0' },
];

/**
 * StatsCards - Dashboard statistics cards showing key metrics.
 */
export default function StatsCards({ todayPlays, completeRate, availableProxies, runningTasks }: StatsCardsProps) {
  const values: Record<string, string> = {
    todayPlays: formatNumber(todayPlays),
    completeRate: formatPercent(completeRate),
    availableProxies: formatNumber(availableProxies),
    runningTasks: formatNumber(runningTasks),
  };

  return (
    <Grid container spacing={2}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={3} key={card.key}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: `${card.color}15`,
                  color: card.color,
                }}
              >
                {card.icon}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {card.label}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {values[card.key]}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
