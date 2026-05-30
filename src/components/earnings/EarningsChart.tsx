import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface EarningsChartData {
  date: string;
  total_earnings: number;
  total_plays: number;
  total_completes: number;
}

interface EarningsChartProps {
  data: EarningsChartData[];
}

/**
 * EarningsChart - Bar chart showing daily earnings trends.
 */
export default function EarningsChart({ data }: EarningsChartProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          收益趋势
        </Typography>
        <Box sx={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(val: string) => val.substring(5)}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0' }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    total_earnings: '收益金额',
                    total_plays: '播放次数',
                    total_completes: '完成次数',
                  };
                  return [value, labels[name] || name];
                }}
                labelFormatter={(label: string) => `日期: ${label}`}
              />
              <Legend
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    total_earnings: '收益金额',
                    total_plays: '播放次数',
                    total_completes: '完成次数',
                  };
                  return labels[value] || value;
                }}
              />
              <Bar dataKey="total_earnings" fill="#1976d2" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total_plays" fill="#42a5f5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total_completes" fill="#2e7d32" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
