import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EarningsTable from '../components/earnings/EarningsTable';
import EarningsChart from '../components/earnings/EarningsChart';
import { useEarningsStore } from '../stores/earningsStore';
import type { Earnings, EarningsFormData } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';

/**
 * EarningsPage - Earnings statistics page with chart, table, and entry dialog.
 */
export default function EarningsPage() {
  const {
    earnings, summary, filters, loading,
    loadEarnings, loadSummary, createEarnings, updateEarnings, setFilters,
  } = useEarningsStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEarning, setEditingEarning] = useState<Earnings | null>(null);
  const [formData, setFormData] = useState<EarningsFormData>({
    date: new Date().toISOString().split('T')[0],
    play_count: 0,
    complete_count: 0,
    earnings_amount: 0,
    currency: 'USD',
    note: '',
  });

  useEffect(() => {
    loadEarnings();
    loadSummary();
  }, [loadEarnings, loadSummary]);

  const handleOpenCreate = () => {
    setEditingEarning(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      play_count: 0,
      complete_count: 0,
      earnings_amount: 0,
      currency: 'USD',
      note: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (earning: Earnings) => {
    setEditingEarning(earning);
    setFormData({
      task_id: earning.task_id || undefined,
      proxy_id: earning.proxy_id || undefined,
      date: earning.date,
      play_count: earning.play_count,
      complete_count: earning.complete_count,
      earnings_amount: earning.earnings_amount,
      currency: earning.currency,
      note: earning.note || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingEarning) {
        await updateEarnings(editingEarning.id, formData);
      } else {
        await createEarnings(formData);
      }
      setDialogOpen(false);
    } catch (err) {
      alert(`保存失败：${(err as Error).message}`);
    }
  };

  // Prepare chart data from earnings
  const chartData = earnings.reduce((acc, e) => {
    const existing = acc.find((d) => d.date === e.date);
    if (existing) {
      existing.total_earnings += e.earnings_amount;
      existing.total_plays += e.play_count;
      existing.total_completes += e.complete_count;
    } else {
      acc.push({
        date: e.date,
        total_earnings: e.earnings_amount,
        total_plays: e.play_count,
        total_completes: e.complete_count,
      });
    }
    return acc;
  }, [] as { date: string; total_earnings: number; total_plays: number; total_completes: number }[])
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          收益统计
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          录入收益
        </Button>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">总收益</Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">
                {formatCurrency(summary?.totalEarnings || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">总播放</Typography>
              <Typography variant="h5" fontWeight={700}>
                {formatNumber(summary?.totalPlays || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">总完成</Typography>
              <Typography variant="h5" fontWeight={700}>
                {formatNumber(summary?.totalCompletes || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Date filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="开始日期"
          type="date"
          value={filters.start_date || ''}
          onChange={(e) => setFilters({ start_date: e.target.value })}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="结束日期"
          type="date"
          value={filters.end_date || ''}
          onChange={(e) => setFilters({ end_date: e.target.value })}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      <EarningsChart data={chartData} />

      <Box sx={{ mt: 3 }}>
        <EarningsTable
          earnings={earnings}
          page={1}
          pageSize={20}
          total={earnings.length}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          onEdit={handleOpenEdit}
        />
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEarning ? '编辑收益' : '录入收益'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="日期"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
              required
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="播放次数"
                type="number"
                value={formData.play_count}
                onChange={(e) => setFormData((f) => ({ ...f, play_count: parseInt(e.target.value, 10) || 0 }))}
                size="small"
                fullWidth
              />
              <TextField
                label="完成次数"
                type="number"
                value={formData.complete_count}
                onChange={(e) => setFormData((f) => ({ ...f, complete_count: parseInt(e.target.value, 10) || 0 }))}
                size="small"
                fullWidth
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="收益金额"
                type="number"
                value={formData.earnings_amount}
                onChange={(e) => setFormData((f) => ({ ...f, earnings_amount: parseFloat(e.target.value) || 0 }))}
                size="small"
                fullWidth
              />
              <TextField
                label="币种"
                value={formData.currency}
                onChange={(e) => setFormData((f) => ({ ...f, currency: e.target.value }))}
                size="small"
                sx={{ width: 100 }}
              />
            </Box>
            <TextField
              label="备注"
              value={formData.note}
              onChange={(e) => setFormData((f) => ({ ...f, note: e.target.value }))}
              size="small"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!formData.date}>
            {editingEarning ? '更新' : '录入'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
