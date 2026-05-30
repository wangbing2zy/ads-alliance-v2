import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Chip, CircularProgress,
} from '@mui/material';
import apiClient from '../api/client';

interface LogEntry {
  id: number;
  [key: string]: any;
}

const LOG_TABS = [
  { label: '代理日志', key: 'proxy', columns: ['id', 'proxy_id', 'task_id', 'action', 'detail', 'error_message', 'created_at'] },
  { label: '任务日志', key: 'task', columns: ['id', 'task_id', 'action', 'detail', 'error_message', 'created_at'] },
  { label: '登录日志', key: 'login', columns: ['id', 'username', 'action', 'ip', 'detail', 'created_at'] },
  { label: 'AI检测日志', key: 'ai', columns: ['id', 'model', 'trigger_event', 'diagnosis', 'action_taken', 'action_result', 'confidence', 'created_at'] },
];

const ACTION_COLORS: Record<string, string> = {
  error: 'error', success: 'success', login: 'info', logout: 'default',
  unavailable: 'error', switched: 'warning', retry: 'info', restart: 'warning',
};

export default function LogPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const currentTab = LOG_TABS[tabIndex];

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/logs/${currentTab.key}`, {
        params: { page: page + 1, pageSize },
      });
      setLogs(res.data.data.items || []);
      setTotal(res.data.data.total || 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [currentTab.key, page, pageSize]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>系统日志</Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabIndex} onChange={(_, i) => { setTabIndex(i); setPage(0); }}>
          {LOG_TABS.map((t, i) => <Tab key={t.key} label={t.label} />)}
        </Tabs>
      </Paper>

      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {currentTab.columns.map((col) => (
                      <TableCell key={col} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{col}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow><TableCell colSpan={currentTab.columns.length} align="center">暂无日志</TableCell></TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} hover>
                        {currentTab.columns.map((col) => {
                          const val = log[col];
                          if (col === 'action' && val) {
                            return <TableCell key={col}><Chip label={val} size="small" color={(ACTION_COLORS[val] as any) || 'default'} /></TableCell>;
                          }
                          if (col === 'confidence' && val !== null && val !== undefined) {
                            return <TableCell key={col}>{(val * 100).toFixed(0)}%</TableCell>;
                          }
                          if (col === 'created_at' && val) {
                            return <TableCell key={col} sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>{val}</TableCell>;
                          }
                          return <TableCell key={col} sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{val ?? '-'}</TableCell>;
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={pageSize}
              rowsPerPageOptions={[pageSize]}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
