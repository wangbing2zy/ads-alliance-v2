import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  Box,
  Checkbox,
  Toolbar,
  Tooltip,
  TablePagination,
  CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import { PROXY_STATUS_LABELS, PROXY_STATUS_COLORS } from '../../utils/constants';
import { formatLatency, formatDate, formatProxyUrl } from '../../utils/format';
import type { Proxy } from '../../types';

/** Get country flag emoji from country code */
function getCountryFlag(countryCode: string | null): string {
  if (!countryCode) return '';
  const codePoints = countryCode.toUpperCase().split('').map(
    (char) => 0x1f1e6 + char.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
}

interface ProxyTableProps {
  proxies: Proxy[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEdit: (proxy: Proxy) => void;
  onDelete: (id: number) => void;
  onBatchDelete: (ids: number[]) => void;
  onVerifyIp: (id: number) => void;
  onBatchVerifyIp: (ids: number[]) => void;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  verifyingIds: number[];
}

/**
 * ProxyTable - Proxy list table with selection, pagination, and actions.
 * Includes GeoIP and actual IP columns.
 */
export default function ProxyTable({
  proxies,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onBatchDelete,
  onVerifyIp,
  onBatchVerifyIp,
  selectedIds,
  onSelectionChange,
  verifyingIds,
}: ProxyTableProps) {
  const allSelected = proxies.length > 0 && proxies.every((p) => selectedIds.includes(p.id));

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(proxies.map((p) => p.id));
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <Paper>
      {selectedIds.length > 0 && (
        <Toolbar sx={{ bgcolor: 'primary.50', minHeight: '48px !important' }}>
          <Typography sx={{ flex: 1 }} color="primary" variant="body2">
            已选择 {selectedIds.length} 项
          </Typography>
          <Tooltip title="批量验证IP">
            <IconButton color="primary" onClick={() => onBatchVerifyIp(selectedIds)}>
              <WifiTetheringIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="批量删除">
            <IconButton color="error" onClick={() => onBatchDelete(selectedIds)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedIds.length > 0 && !allSelected}
                  checked={allSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>地址</TableCell>
              <TableCell>协议</TableCell>
              <TableCell>地理位置</TableCell>
              <TableCell>实际IP</TableCell>
              <TableCell>地区</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>延迟</TableCell>
              <TableCell>来源</TableCell>
              <TableCell>最后检测</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {proxies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">暂无代理数据</Typography>
                </TableCell>
              </TableRow>
            ) : (
              proxies.map((proxy) => (
                <TableRow key={proxy.id} hover selected={selectedIds.includes(proxy.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(proxy.id)}
                      onChange={() => handleSelectOne(proxy.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {formatProxyUrl(proxy)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={proxy.protocol.toUpperCase()} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {proxy.country ? (
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {getCountryFlag(proxy.country)} {proxy.country}{proxy.city ? ` / ${proxy.city}` : ''}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {proxy.actual_ip ? (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {proxy.actual_ip}
                      </Typography>
                    ) : (
                      <Chip label="未验证" size="small" sx={{ bgcolor: '#f5f5f5', color: '#999', fontSize: 11 }} />
                    )}
                  </TableCell>
                  <TableCell>{proxy.region || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={PROXY_STATUS_LABELS[proxy.status] || proxy.status}
                      size="small"
                      sx={{
                        bgcolor: `${PROXY_STATUS_COLORS[proxy.status]}20`,
                        color: PROXY_STATUS_COLORS[proxy.status],
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>{formatLatency(proxy.latency)}</TableCell>
                  <TableCell>
                    {proxy.provider === 'kdl' ? '快代理' : '手动'}
                  </TableCell>
                  <TableCell>{formatDate(proxy.last_check_at, 'MM-DD HH:mm')}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="验证IP">
                      <IconButton
                        size="small"
                        onClick={() => onVerifyIp(proxy.id)}
                        disabled={verifyingIds.includes(proxy.id)}
                      >
                        {verifyingIds.includes(proxy.id) ? (
                          <CircularProgress size={16} />
                        ) : (
                          <WifiTetheringIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => onEdit(proxy)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDelete(proxy.id)}>
                      <DeleteIcon fontSize="small" />
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
