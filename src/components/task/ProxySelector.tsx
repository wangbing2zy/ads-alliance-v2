import React, { useState, useEffect } from 'react';
import {
  Box,
  Checkbox,
  Paper,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import type { Proxy } from '../../types';

interface ProxySelectorProps {
  proxies: Proxy[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
}

/**
 * ProxySelector - Checkbox list for selecting proxies with region filtering.
 * Only shows available proxies.
 */
export default function ProxySelector({ proxies, selectedIds, onSelectionChange }: ProxySelectorProps) {
  const [regionFilter, setRegionFilter] = useState<string>('all');

  const availableProxies = proxies.filter((p) => p.status !== 'unavailable');
  const regions = [...new Set(availableProxies.map((p) => p.region).filter((r): r is string => Boolean(r)))];
  const filteredProxies = regionFilter === 'all'
    ? availableProxies
    : availableProxies.filter((p) => p.region === regionFilter);

  const handleToggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    const filteredIds = filteredProxies.map((p) => p.id);
    if (filteredIds.every((id) => selectedIds.includes(id))) {
      onSelectionChange(selectedIds.filter((id) => !filteredIds.includes(id)));
    } else {
      const newIds = [...new Set([...selectedIds, ...filteredIds])];
      onSelectionChange(newIds);
    }
  };

  return (
    <Paper sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          代理选择
        </Typography>
        <Typography variant="body2" color="text.secondary">
          已选 {selectedIds.length} 个 / 可选 {availableProxies.length} 个（可用 {proxies.filter((p) => p.status === 'available').length}）
        </Typography>
      </Box>

      <FormControl size="small" sx={{ mb: 1, minWidth: 120 }}>
        <InputLabel>地区筛选</InputLabel>
        <Select
          value={regionFilter}
          label="地区筛选"
          onChange={(e) => setRegionFilter(e.target.value)}
        >
          <MenuItem value="all">全部</MenuItem>
          {regions.map((r) => (
            <MenuItem key={r} value={r}>{r}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
        <List dense disablePadding>
          <ListItem disablePadding>
            <ListItemButton onClick={handleSelectAll} dense>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  checked={filteredProxies.length > 0 && filteredProxies.every((p) => selectedIds.includes(p.id))}
                  indeterminate={
                    filteredProxies.some((p) => selectedIds.includes(p.id)) &&
                    !filteredProxies.every((p) => selectedIds.includes(p.id))
                  }
                />
              </ListItemIcon>
              <ListItemText primary="全选" primaryTypographyProps={{ fontSize: 13 }} />
            </ListItemButton>
          </ListItem>
          {filteredProxies.map((proxy) => (
            <ListItem key={proxy.id} disablePadding>
              <ListItemButton onClick={() => handleToggle(proxy.id)} dense>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox checked={selectedIds.includes(proxy.id)} />
                </ListItemIcon>
                <ListItemText
                  primary={`${proxy.host}:${proxy.port}${proxy.status === 'slow' ? ' ⚠️较慢' : ''}`}
                  secondary={`${proxy.protocol.toUpperCase()} | ${proxy.region || '-'} | ${proxy.latency}ms`}
                  primaryTypographyProps={{ fontSize: 13, fontFamily: 'monospace' }}
                  secondaryTypographyProps={{ fontSize: 11 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
          {filteredProxies.length === 0 && (
            <ListItem>
              <ListItemText
                primary="无可用代理"
                secondary="请先添加代理并进行健康检测"
                primaryTypographyProps={{ textAlign: 'center', color: 'text.secondary' }}
                secondaryTypographyProps={{ textAlign: 'center' }}
              />
            </ListItem>
          )}
        </List>
      </Box>
    </Paper>
  );
}
