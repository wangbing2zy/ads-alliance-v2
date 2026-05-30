import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import type { ProxyFormData } from '../../types';
import { useProxyStore } from '../../stores/proxyStore';

interface ProxyImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (proxies: ProxyFormData[]) => Promise<{ inserted: number; duplicates: number }>;
}

/**
 * ProxyImportDialog - Dialog for batch importing proxies via text paste.
 * Supports 3 formats with enhanced parsing and result statistics.
 */
export default function ProxyImportDialog({ open, onClose, onSubmit }: ProxyImportDialogProps) {
  const [text, setText] = useState('');
  const [importResult, setImportResult] = useState<{ inserted: number; duplicates: number } | null>(null);
  const [importing, setImporting] = useState(false);

  const parseLines = (input: string): ProxyFormData[] => {
    const lines = input.trim().split('\n').filter((l) => l.trim());
    const proxies: ProxyFormData[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Format: protocol://ip:port:user:pass
      const protocolFullMatch = trimmed.match(/^(https?|socks5):\/\/([^:]+):(\d+):([^:]+):(.+)$/i);
      if (protocolFullMatch) {
        proxies.push({
          protocol: protocolFullMatch[1].toLowerCase() as any,
          host: protocolFullMatch[2],
          port: parseInt(protocolFullMatch[3], 10),
          username: protocolFullMatch[4],
          password: protocolFullMatch[5],
        });
        continue;
      }

      // Format: protocol://user:pass@host:port
      const urlMatch = trimmed.match(/^(https?|socks5):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/i);
      if (urlMatch) {
        proxies.push({
          protocol: urlMatch[1].toLowerCase() as any,
          username: urlMatch[2] || '',
          password: urlMatch[3] || '',
          host: urlMatch[4],
          port: parseInt(urlMatch[5], 10),
        });
        continue;
      }

      // Format: ip:port:user:pass
      const fourPartMatch = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+):([^:]+):(.+)$/);
      if (fourPartMatch) {
        proxies.push({
          host: fourPartMatch[1],
          port: parseInt(fourPartMatch[2], 10),
          username: fourPartMatch[3],
          password: fourPartMatch[4],
          protocol: 'http',
        });
        continue;
      }

      // Format: ip:port
      const simpleMatch = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)$/);
      if (simpleMatch) {
        proxies.push({
          host: simpleMatch[1],
          port: parseInt(simpleMatch[2], 10),
          protocol: 'http',
        });
        continue;
      }
    }

    return proxies;
  };

  const parsedPreview = parseLines(text);
  const totalLines = text.trim().split('\n').filter((l) => l.trim()).length;
  const errorCount = totalLines - parsedPreview.length;

  const handleSubmit = async () => {
    const proxies = parseLines(text);
    if (proxies.length === 0) return;

    setImporting(true);
    try {
      const result = await onSubmit(proxies);
      setImportResult(result);
    } catch (err) {
      // Error handled by parent
    }
    setImporting(false);
  };

  const handleClose = () => {
    setText('');
    setImportResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>批量导入代理</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            支持以下格式（每行一条）：
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
            · ip:port<br />
            · ip:port:username:password<br />
            · protocol://ip:port:username:password
          </Typography>
        </Alert>
        <TextField
          multiline
          rows={8}
          fullWidth
          placeholder="粘贴代理列表，每行一个..."
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setImportResult(null);
          }}
          sx={{ fontFamily: 'monospace' }}
          disabled={importing}
        />

        {/* Parsing statistics */}
        {text.trim() && !importResult && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`解析成功: ${parsedPreview.length}`}
              size="small"
              color="primary"
              variant="outlined"
            />
            {errorCount > 0 && (
              <Chip
                label={`格式错误: ${errorCount}`}
                size="small"
                color="error"
                variant="outlined"
              />
            )}
          </Box>
        )}

        {/* Import result statistics */}
        {importResult && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`成功导入: ${importResult.inserted}`}
              size="small"
              color="success"
            />
            <Chip
              label={`重复跳过: ${importResult.duplicates}`}
              size="small"
              color="warning"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          {importResult ? '关闭' : '取消'}
        </Button>
        {!importResult && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={parsedPreview.length === 0 || importing}
          >
            {importing ? <CircularProgress size={20} color="inherit" /> : `导入 (${parsedPreview.length})`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
