import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Chip,
  TablePagination,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { formatDate, formatCurrency, formatNumber } from '../../utils/format';
import type { Earnings } from '../../types';

interface EarningsTableProps {
  earnings: Earnings[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEdit: (earning: Earnings) => void;
}

/**
 * EarningsTable - Earnings detail table with pagination.
 */
export default function EarningsTable({
  earnings,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  onEdit,
}: EarningsTableProps) {
  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>日期</TableCell>
              <TableCell>任务ID</TableCell>
              <TableCell>代理ID</TableCell>
              <TableCell align="right">播放次数</TableCell>
              <TableCell align="right">完成次数</TableCell>
              <TableCell align="right">收益</TableCell>
              <TableCell>币种</TableCell>
              <TableCell>备注</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {earnings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">暂无收益数据</Typography>
                </TableCell>
              </TableRow>
            ) : (
              earnings.map((earning) => (
                <TableRow key={earning.id} hover>
                  <TableCell>{earning.date}</TableCell>
                  <TableCell>{earning.task_id || '-'}</TableCell>
                  <TableCell>{earning.proxy_id || '-'}</TableCell>
                  <TableCell align="right">{formatNumber(earning.play_count)}</TableCell>
                  <TableCell align="right">{formatNumber(earning.complete_count)}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={600} color="success.main">
                      {formatCurrency(earning.earnings_amount, earning.currency)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={earning.currency} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{earning.note || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onEdit(earning)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
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
        labelRowsPerPage="每页行数"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
      />
    </Paper>
  );
}
