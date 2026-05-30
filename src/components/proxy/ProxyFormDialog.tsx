import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
} from '@mui/material';
import type { Proxy, ProxyFormData } from '../../types';

interface ProxyFormDialogProps {
  open: boolean;
  proxy: Proxy | null;
  onClose: () => void;
  onSubmit: (data: ProxyFormData) => void;
}

const protocols = ['http', 'https', 'socks5'];

/**
 * ProxyFormDialog - Dialog for adding or editing a proxy.
 */
export default function ProxyFormDialog({ open, proxy, onClose, onSubmit }: ProxyFormDialogProps) {
  const [form, setForm] = useState<ProxyFormData>({
    host: '',
    port: 1080,
    protocol: 'http',
    username: '',
    password: '',
    region: '',
  });

  useEffect(() => {
    if (proxy) {
      setForm({
        host: proxy.host,
        port: proxy.port,
        protocol: proxy.protocol as 'http' | 'https' | 'socks5',
        username: proxy.username || '',
        password: proxy.password || '',
        region: proxy.region || '',
      });
    } else {
      setForm({ host: '', port: 1080, protocol: 'http', username: '', password: '', region: '' });
    }
  }, [proxy, open]);

  const handleSubmit = () => {
    if (!form.host || !form.port) return;
    onSubmit({
      ...form,
      username: form.username || undefined,
      password: form.password || undefined,
      region: form.region || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{proxy ? '编辑代理' : '添加代理'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="主机地址"
              value={form.host}
              onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="端口"
              type="number"
              value={form.port}
              onChange={(e) => setForm((f) => ({ ...f, port: parseInt(e.target.value, 10) || 0 }))}
              required
              size="small"
              sx={{ width: 120 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="协议"
              select
              value={form.protocol}
              onChange={(e) => setForm((f) => ({ ...f, protocol: e.target.value as any }))}
              size="small"
              sx={{ width: 120 }}
            >
              {protocols.map((p) => (
                <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="地区代码"
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              placeholder="如 US, UK, DE"
              size="small"
              fullWidth
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="用户名"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              size="small"
              fullWidth
            />
            <TextField
              label="密码"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              size="small"
              fullWidth
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!form.host || !form.port}>
          {proxy ? '更新' : '添加'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
