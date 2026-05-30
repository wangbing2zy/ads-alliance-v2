import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface PlayTrendData {
  date: string;
  plays: number;
  completes: number;
}

interface PlayTrendChartProps {
  data: PlayTrendData[];
}

/**
 * PlayTrendChart - Area chart showing play and complete trends over time.
 */
export default function PlayTrendChart({ data }: PlayTrendChartProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          播放趋势
        </Typography>
        <Box sx={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(val: string) => val.substring(5)}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0' }}
                formatter={(value: number, name: string) => [
                  value,
                  name === 'plays' ? '播放次数' : '完成次数',
                ]}
                labelFormatter={(label: string) => `日期: ${label}`}
              />
              <Legend
                formatter={(value: string) =>
                  value === 'plays' ? '播放次数' : '完成次数'
                }
              />
              <Area
                type="monotone"
                dataKey="plays"
                stroke="#1976d2"
                fill="#1976d220"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="completes"
                stroke="#2e7d32"
                fill="#2e7d3220"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
